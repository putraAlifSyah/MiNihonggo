/**
 * AI Routes — all AI-related endpoints.
 *
 * GET  /api/ai/settings          — get current user AI config (key masked)
 * PUT  /api/ai/settings          — save/update AI config (encrypts key)
 * POST /api/ai/test-connection   — test API key validity
 * POST /api/ai/explain-word      — stream word explanation (SSE)
 * POST /api/ai/generate-sentences— generate 3 example sentences
 * POST /api/ai/generate-test     — generate test questions for a word list
 * POST /api/ai/grade-answer      — grade an open-ended answer
 * POST /api/ai/analyze-mistakes  — analyze post-session wrong answers
 * POST /api/ai/chat              — AI Tutor chat (streaming SSE)
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { encrypt, decrypt } = require('../services/encryption');
const { getAISettings, callAI, streamAI, callAIRaw } = require('../services/ai');

// ─── GET /api/ai/settings ─────────────────────────────────────────
router.get('/settings', authenticate, (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM ai_settings WHERE user_id = ?').get(req.user.id);
    if (!row) return res.json({ configured: false });

    res.json({
      configured: true,
      is_enabled: !!row.is_enabled,
      provider: row.provider,
      base_url: row.base_url,
      api_key_masked: row.api_key ? '••••••••' + (row.api_key.slice(-4) || '') : '',
      model_name: row.model_name,
      updated_at: row.updated_at,
    });
  } catch (err) {
    console.error('[ai] settings GET error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/ai/settings ─────────────────────────────────────────
router.put('/settings', authenticate, (req, res) => {
  try {
    const { is_enabled, provider, base_url, api_key, model_name } = req.body;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT id, api_key FROM ai_settings WHERE user_id = ?').get(req.user.id);

    // Encrypt the API key only if a new one was provided
    let encryptedKey = existing?.api_key || null;
    if (api_key && api_key !== '••••••••') {
      encryptedKey = encrypt(api_key);
    }

    if (existing) {
      db.prepare(`
        UPDATE ai_settings
        SET is_enabled = ?, provider = ?, base_url = ?, api_key = ?, model_name = ?, updated_at = ?
        WHERE user_id = ?
      `).run(is_enabled ? 1 : 0, provider, base_url, encryptedKey, model_name, now, req.user.id);
    } else {
      db.prepare(`
        INSERT INTO ai_settings (user_id, is_enabled, provider, base_url, api_key, model_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(req.user.id, is_enabled ? 1 : 0, provider, base_url, encryptedKey, model_name, now, now);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[ai] settings PUT error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/ai/test-connection ────────────────────────────────
router.post('/test-connection', authenticate, async (req, res) => {
  try {
    const { base_url, api_key, model_name } = req.body;
    if (!base_url || !api_key || !model_name) {
      return res.status(400).json({ error: 'base_url, api_key, model_name required' });
    }

    // Decrypt if it's a masked key (use stored key instead)
    let resolvedKey = api_key;
    if (api_key === '••••••••' || !api_key.trim()) {
      const stored = db.prepare('SELECT api_key FROM ai_settings WHERE user_id = ?').get(req.user.id);
      if (!stored?.api_key) return res.status(400).json({ error: 'No API key stored' });
      resolvedKey = decrypt(stored.api_key);
    }

    const text = await callAIRaw(
      { base_url, api_key: resolvedKey, model_name },
      [{ role: 'user', content: 'Reply with exactly: OK' }],
      'You are a helpful assistant.'
    );

    res.json({ success: true, response: text.trim() });
  } catch (err) {
    console.error('[ai] test-connection error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── POST /api/ai/explain-word (SSE streaming) ────────────────────
router.post('/explain-word', authenticate, async (req, res) => {
  const { word_id } = req.body;
  if (!word_id) return res.status(400).json({ error: 'word_id required' });

  // Check cache first
  const cached = db.prepare(
    'SELECT explanation FROM ai_word_cache WHERE word_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(word_id, req.user.id);

  if (cached) {
    return res.json({ cached: true, explanation: cached.explanation });
  }

  const word = db.prepare(`
    SELECT w.*, c.name AS category_name, l.code AS level_code
    FROM words w
    JOIN categories c ON w.category_id = c.id
    JOIN levels l ON c.level_id = l.id
    WHERE w.id = ?
  `).get(word_id);

  if (!word) return res.status(404).json({ error: 'Word not found' });

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const systemPrompt = `Kamu adalah tutor bahasa Jepang yang membantu pelajar Indonesia belajar JLPT ${word.level_code}.
Jelaskan kata dalam bahasa Indonesia. Format respons:
1. **Nuansa penggunaan**: kapan & situasi apa kata ini dipakai (formal/informal, dll)
2. **Kata mirip**: bedakan dengan kata serupa jika ada
3. **Tips menghafal**: mnemonic atau asosiasi yang mudah diingat
4. **Contoh kalimat**: 2 contoh kalimat natural (JP + terjemahan ID)
Singkat dan jelas, maksimal 300 kata.`;

  const userMsg = `Jelaskan kata ini:
- Kanji: ${word.japanese}
- Hiragana: ${word.hiragana}
- Romaji: ${word.romaji}
- Arti: ${word.meaning}
- Tipe: ${word.word_type}
- Contoh: ${word.example_sentence_jp || 'tidak ada'}`;

  // Collect full text for caching
  let fullText = '';
  const origWrite = res.write.bind(res);
  res.write = function (chunk) {
    try {
      const str = chunk.toString();
      const match = str.match(/data: (.+)\n/);
      if (match && match[1] !== '[DONE]') {
        const parsed = JSON.parse(match[1]);
        if (parsed.token) fullText += parsed.token;
      }
    } catch {}
    return origWrite(chunk);
  };

  await streamAI(req.user.id, [{ role: 'user', content: userMsg }], systemPrompt, res);

  // Cache the response
  if (fullText) {
    db.prepare(
      'INSERT INTO ai_word_cache (word_id, user_id, explanation) VALUES (?, ?, ?)'
    ).run(word_id, req.user.id, fullText);
  }
});

// ─── POST /api/ai/generate-sentences ─────────────────────────────
router.post('/generate-sentences', authenticate, async (req, res) => {
  try {
    const { word_id } = req.body;
    const word = db.prepare('SELECT * FROM words WHERE id = ?').get(word_id);
    if (!word) return res.status(404).json({ error: 'Word not found' });

    const systemPrompt = 'Kamu adalah tutor bahasa Jepang. Buat contoh kalimat natural dalam bahasa Jepang.';
    const userMsg = `Buat 3 contoh kalimat natural menggunakan kata "${word.japanese}" (${word.meaning}).
Setiap kalimat: kalimat Jepang, lalu terjemahan Indonesia.
Format JSON: [{"jp": "...", "id": "..."}]
Hanya JSON, tanpa penjelasan lain.`;

    const text = await callAI(req.user.id, [{ role: 'user', content: userMsg }], systemPrompt);

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const sentences = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    res.json({ sentences });
  } catch (err) {
    if (err.message === 'AI_DISABLED') return res.status(403).json({ error: 'AI not enabled', code: 'AI_DISABLED' });
    console.error('[ai] generate-sentences error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/ai/generate-test ──────────────────────────────────
router.post('/generate-test', authenticate, async (req, res) => {
  try {
    const { word_ids, level_code = 'N5' } = req.body;
    if (!word_ids || word_ids.length === 0) {
      return res.status(400).json({ error: 'word_ids required' });
    }

    // Fetch words
    const placeholders = word_ids.map(() => '?').join(',');
    const words = db.prepare(`
      SELECT w.*, c.name AS category_name, l.code AS level_code
      FROM words w
      JOIN categories c ON w.category_id = c.id
      JOIN levels l ON c.level_id = l.id
      WHERE w.id IN (${placeholders})
    `).all(...word_ids);

    if (words.length === 0) return res.status(400).json({ error: 'No words found' });

    const wordList = words.map(w =>
      `ID:${w.id} | ${w.japanese} (${w.hiragana}) = ${w.meaning} [${w.word_type}]`
    ).join('\n');

    const systemPrompt = `Kamu adalah pembuat soal bahasa Jepang untuk pelajar JLPT ${level_code}.
Buat soal bervariasi dan natural. Output HANYA JSON valid.`;

    const userMsg = `Buat soal test dari daftar kata berikut. Variasikan tipe soal.
Tipe soal yang tersedia:
- "translation_jp_id": tampilkan kata Jepang, user terjemahkan ke Indonesia
- "translation_id_jp": tampilkan arti Indonesia, user tulis dalam romaji/hiragana
- "reading": tampilkan kanji dalam konteks kalimat, user baca/terjemahkan
- "essay": buat paragraf pendek (2-3 kalimat) menggunakan beberapa kata, user jawab pertanyaan pemahaman

Daftar kata:
${wordList}

Buat ${Math.min(words.length, 10)} soal. Untuk tipe "matching", buat 1 set dengan 5 pasangan.
Format JSON:
[
  {
    "word_id": <id angka>,
    "question_type": "translation_jp_id",
    "question_text": "Apa arti dari kata 食べる?",
    "correct_answer": "makan",
    "context": null
  },
  {
    "word_id": null,
    "question_type": "matching",
    "question_text": "Pasangkan kata Jepang dengan artinya",
    "correct_answer": null,
    "context": {
      "pairs": [
        {"word_id": <id>, "japanese": "...", "hiragana": "...", "meaning": "..."},
        ...
      ]
    }
  }
]
Hanya JSON array, tanpa penjelasan.`;

    const text = await callAI(req.user.id, [{ role: 'user', content: userMsg }], systemPrompt);

    // Extract JSON
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI returned invalid JSON', raw: text });

    const questions = JSON.parse(jsonMatch[0]);

    // Save questions to DB for tracking
    const saved = [];
    for (const q of questions) {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO ai_test_questions
          (id, user_id, word_id, question_type, question_text, correct_answer, context)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        req.user.id,
        q.word_id || null,
        q.question_type,
        q.question_text,
        q.correct_answer || null,
        q.context ? JSON.stringify(q.context) : null
      );
      saved.push({ ...q, id, context: q.context });
    }

    res.json({ questions: saved });
  } catch (err) {
    if (err.message === 'AI_DISABLED') return res.status(403).json({ error: 'AI not enabled', code: 'AI_DISABLED' });
    console.error('[ai] generate-test error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/ai/grade-answer ───────────────────────────────────
router.post('/grade-answer', authenticate, async (req, res) => {
  try {
    const { question_id, question_text, correct_answer, user_answer, question_type } = req.body;

    const systemPrompt = `Kamu adalah penilai soal bahasa Jepang. Nilai jawaban pelajar dengan bijaksana.
Terima sinonim, variasi penulisan, dan transliterasi yang masuk akal.
Jawab HANYA JSON.`;

    const userMsg = `Nilai jawaban ini:
Tipe soal: ${question_type}
Soal: ${question_text}
Jawaban yang diharapkan: ${correct_answer}
Jawaban pelajar: ${user_answer}

Berikan JSON: { "correct": true/false, "score": 0.0-1.0, "feedback": "penjelasan singkat dalam bahasa Indonesia" }`;

    const text = await callAI(req.user.id, [{ role: 'user', content: userMsg }], systemPrompt);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI returned invalid response' });

    const result = JSON.parse(jsonMatch[0]);

    // Update question tracking
    if (question_id) {
      const q = db.prepare('SELECT * FROM ai_test_questions WHERE id = ? AND user_id = ?').get(question_id, req.user.id);
      if (q) {
        if (result.correct) {
          db.prepare(`
            UPDATE ai_test_questions
            SET times_correct = times_correct + 1, is_resolved = 1, last_answered_at = datetime('now')
            WHERE id = ?
          `).run(question_id);
        } else {
          db.prepare(`
            UPDATE ai_test_questions
            SET times_wrong = times_wrong + 1, is_resolved = 0, last_answered_at = datetime('now')
            WHERE id = ?
          `).run(question_id);
        }
      }
    }

    res.json(result);
  } catch (err) {
    if (err.message === 'AI_DISABLED') return res.status(403).json({ error: 'AI not enabled', code: 'AI_DISABLED' });
    console.error('[ai] grade-answer error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/ai/analyze-mistakes ───────────────────────────────
router.post('/analyze-mistakes', authenticate, async (req, res) => {
  try {
    const { wrong_word_ids } = req.body;
    if (!wrong_word_ids || wrong_word_ids.length === 0) {
      return res.status(400).json({ error: 'wrong_word_ids required' });
    }

    const placeholders = wrong_word_ids.map(() => '?').join(',');
    const words = db.prepare(
      `SELECT japanese, hiragana, meaning, word_type FROM words WHERE id IN (${placeholders})`
    ).all(...wrong_word_ids);

    const wordList = words.map(w => `${w.japanese} (${w.hiragana}) = ${w.meaning} [${w.word_type}]`).join('\n');

    const systemPrompt = 'Kamu adalah tutor bahasa Jepang yang membantu pelajar Indonesia.';
    const userMsg = `Pelajar salah menjawab kata-kata ini dalam sesi test:
${wordList}

Berikan analisis singkat dalam bahasa Indonesia:
1. Pola kesalahan (jika ada)
2. Tips belajar spesifik untuk kata-kata ini
3. Rekomendasi fokus untuk sesi berikutnya
Maksimal 200 kata.`;

    // Stream the analysis
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    await streamAI(req.user.id, [{ role: 'user', content: userMsg }], systemPrompt, res);
  } catch (err) {
    if (err.message === 'AI_DISABLED') return res.status(403).json({ error: 'AI not enabled', code: 'AI_DISABLED' });
    console.error('[ai] analyze-mistakes error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/ai/pending-questions ───────────────────────────────
// Returns unresolved wrong questions for this user (for next session)
router.get('/pending-questions', authenticate, (req, res) => {
  try {
    const questions = db.prepare(`
      SELECT aq.*, w.japanese, w.hiragana, w.meaning, w.word_type
      FROM ai_test_questions aq
      LEFT JOIN words w ON aq.word_id = w.id
      WHERE aq.user_id = ? AND aq.is_resolved = 0 AND aq.times_wrong > 0
      ORDER BY aq.times_wrong DESC, aq.last_answered_at ASC
      LIMIT 5
    `).all(req.user.id);

    const parsed = questions.map(q => ({
      ...q,
      context: q.context ? JSON.parse(q.context) : null,
    }));

    res.json({ questions: parsed });
  } catch (err) {
    console.error('[ai] pending-questions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/ai/chat (SSE streaming) ───────────────────────────
router.post('/chat', authenticate, async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const systemPrompt = `Kamu adalah tutor bahasa Jepang yang ramah dan sabar untuk pelajar Indonesia.
Fokus pada: kosakata, grammar, kanji, tips belajar JLPT, dan budaya Jepang.
Jawab dalam bahasa Indonesia, sertakan contoh dalam bahasa Jepang (dengan furigana jika perlu).
Bersikap seperti teman belajar yang menyenangkan.`;

  await streamAI(req.user.id, messages, systemPrompt, res);
});

module.exports = router;
