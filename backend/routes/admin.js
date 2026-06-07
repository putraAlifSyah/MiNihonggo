/**
 * Admin routes — content management, Excel upload, dashboard stats.
 *
 * POST   /api/admin/upload-excel     — bulk import from Excel file
 * PUT    /api/admin/levels/:id/toggle — toggle level is_active
 * POST   /api/admin/words            — add a single word
 * PUT    /api/admin/words/:id        — edit a word
 * DELETE /api/admin/words/:id        — delete a word
 * GET    /api/admin/stats            — admin dashboard statistics
 */

const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, adminOnly);

// ─── Multer config — store uploads in backend/uploads/ ─────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx, .xls, and .csv files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ────────────────────────────────────────────────────────────────
// POST /api/admin/upload-excel
//
// Expects a multipart form with a "file" field.
// Reads sheets by name:
//   - Sheets whose name contains "grammar" → grammar_patterns
//   - All other sheets → words table
//
// Column mapping (case-insensitive):
//   Words:   japanese, hiragana, romaji, meaning, example_sentence_jp,
//            example_sentence_id, word_type, onyomi, kunyomi, stroke_count,
//            category_id OR (level_code + category_name)
//   Grammar: pattern, meaning, example_jp, example_id, note,
//            category_id OR (level_code + category_name)
// ────────────────────────────────────────────────────────────────
router.post('/upload-excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const results = {
      words_inserted: 0,
      words_skipped: 0,
      grammar_inserted: 0,
      grammar_skipped: 0,
      errors: [],
      preview: [],
    };

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) continue;

      const isGrammar = sheetName.toLowerCase().includes('grammar');

      for (let i = 0; i < rows.length; i++) {
        const raw = rows[i];
        // Normalise keys to lowercase + trimmed
        const row = {};
        for (const [k, v] of Object.entries(raw)) {
          row[k.toLowerCase().trim()] = typeof v === 'string' ? v.trim() : v;
        }

        try {
          // Resolve category_id
          let categoryId = row.category_id;
          if (!categoryId && row.level_code && row.category_name) {
            const level = db.prepare('SELECT id FROM levels WHERE code = ?').get(row.level_code);
            if (!level) {
              results.errors.push(`Sheet "${sheetName}" row ${i + 2}: unknown level_code "${row.level_code}"`);
              continue;
            }
            const cat = db.prepare(
              'SELECT id FROM categories WHERE level_id = ? AND name = ?'
            ).get(level.id, row.category_name);
            if (!cat) {
              results.errors.push(`Sheet "${sheetName}" row ${i + 2}: unknown category "${row.category_name}" for level ${row.level_code}`);
              continue;
            }
            categoryId = cat.id;
          }

          if (!categoryId) {
            results.errors.push(`Sheet "${sheetName}" row ${i + 2}: missing category_id or level_code+category_name`);
            continue;
          }

          if (isGrammar) {
            // ── Grammar pattern ──
            if (!row.pattern || !row.meaning) {
              results.errors.push(`Sheet "${sheetName}" row ${i + 2}: pattern and meaning are required for grammar`);
              continue;
            }

            // Duplicate detection
            const existing = db.prepare(
              'SELECT id FROM grammar_patterns WHERE pattern = ? AND category_id = ?'
            ).get(row.pattern, categoryId);

            if (existing) {
              results.grammar_skipped++;
              continue;
            }

            db.prepare(
              `INSERT INTO grammar_patterns (category_id, pattern, meaning, example_jp, example_id, note)
               VALUES (?, ?, ?, ?, ?, ?)`
            ).run(categoryId, row.pattern, row.meaning, row.example_jp || null, row.example_id || null, row.note || null);

            results.grammar_inserted++;
          } else {
            // ── Word / Kanji ──
            if (!row.japanese || !row.meaning) {
              results.errors.push(`Sheet "${sheetName}" row ${i + 2}: japanese and meaning are required`);
              continue;
            }

            // Duplicate detection by japanese + category_id
            const existing = db.prepare(
              'SELECT id FROM words WHERE japanese = ? AND category_id = ?'
            ).get(row.japanese, categoryId);

            if (existing) {
              results.words_skipped++;
              continue;
            }

            db.prepare(
              `INSERT INTO words
                 (category_id, japanese, hiragana, romaji, meaning,
                  example_sentence_jp, example_sentence_id, word_type,
                  onyomi, kunyomi, stroke_count)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(
              categoryId,
              row.japanese,
              row.hiragana || null,
              row.romaji || null,
              row.meaning,
              row.example_sentence_jp || null,
              row.example_sentence_id || null,
              row.word_type || null,
              row.onyomi || null,
              row.kunyomi || null,
              row.stroke_count ? parseInt(row.stroke_count, 10) : null
            );

            results.words_inserted++;

            // Keep a preview of the first 10 records
            if (results.preview.length < 10) {
              results.preview.push({
                japanese: row.japanese,
                meaning: row.meaning,
                type: row.word_type || 'vocabulary',
                sheet: sheetName,
              });
            }
          }
        } catch (rowErr) {
          results.errors.push(`Sheet "${sheetName}" row ${i + 2}: ${rowErr.message}`);
        }
      }
    }

    // Clean up uploaded file
    fs.unlink(req.file.path, () => {});

    res.json({
      message: 'Import completed',
      ...results,
    });
  } catch (err) {
    console.error('[admin] upload-excel error:', err);
    // Clean up on error
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: 'Failed to process Excel file' });
  }
});

// ────────────────────────────────────────────────────────────────
// PUT /api/admin/levels/:id/toggle — toggle level is_active
// ────────────────────────────────────────────────────────────────
router.put('/levels/:id/toggle', (req, res) => {
  try {
    const level = db.prepare('SELECT * FROM levels WHERE id = ?').get(req.params.id);
    if (!level) {
      return res.status(404).json({ error: 'Level not found' });
    }

    const newActive = level.is_active ? 0 : 1;
    db.prepare('UPDATE levels SET is_active = ? WHERE id = ?').run(newActive, level.id);

    res.json({
      message: `Level ${level.code} is now ${newActive ? 'active' : 'inactive'}`,
      level: { ...level, is_active: newActive },
    });
  } catch (err) {
    console.error('[admin] toggle level error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/admin/words — add a word manually
// ────────────────────────────────────────────────────────────────
router.post('/words', (req, res) => {
  try {
    const {
      category_id, japanese, hiragana, romaji, meaning,
      example_sentence_jp, example_sentence_id, word_type,
      onyomi, kunyomi, stroke_count,
    } = req.body;

    if (!category_id || !japanese || !meaning) {
      return res.status(400).json({ error: 'category_id, japanese and meaning are required' });
    }

    // Verify category exists
    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
    if (!cat) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Duplicate check
    const existing = db.prepare(
      'SELECT id FROM words WHERE japanese = ? AND category_id = ?'
    ).get(japanese, category_id);
    if (existing) {
      return res.status(409).json({ error: 'Word already exists in this category' });
    }

    const result = db.prepare(
      `INSERT INTO words
         (category_id, japanese, hiragana, romaji, meaning,
          example_sentence_jp, example_sentence_id, word_type,
          onyomi, kunyomi, stroke_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      category_id, japanese,
      hiragana || null, romaji || null, meaning,
      example_sentence_jp || null, example_sentence_id || null,
      word_type || null, onyomi || null, kunyomi || null,
      stroke_count ? parseInt(stroke_count, 10) : null
    );

    const word = db.prepare('SELECT * FROM words WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ message: 'Word created', word });
  } catch (err) {
    console.error('[admin] create word error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────────────────────────
// PUT /api/admin/words/:id — edit a word
// ────────────────────────────────────────────────────────────────
router.put('/words/:id', (req, res) => {
  try {
    const word = db.prepare('SELECT * FROM words WHERE id = ?').get(req.params.id);
    if (!word) {
      return res.status(404).json({ error: 'Word not found' });
    }

    const {
      category_id, japanese, hiragana, romaji, meaning,
      example_sentence_jp, example_sentence_id, word_type,
      onyomi, kunyomi, stroke_count,
    } = req.body;

    db.prepare(
      `UPDATE words SET
         category_id = ?, japanese = ?, hiragana = ?, romaji = ?,
         meaning = ?, example_sentence_jp = ?, example_sentence_id = ?,
         word_type = ?, onyomi = ?, kunyomi = ?, stroke_count = ?
       WHERE id = ?`
    ).run(
      category_id ?? word.category_id,
      japanese ?? word.japanese,
      hiragana !== undefined ? hiragana : word.hiragana,
      romaji !== undefined ? romaji : word.romaji,
      meaning ?? word.meaning,
      example_sentence_jp !== undefined ? example_sentence_jp : word.example_sentence_jp,
      example_sentence_id !== undefined ? example_sentence_id : word.example_sentence_id,
      word_type !== undefined ? word_type : word.word_type,
      onyomi !== undefined ? onyomi : word.onyomi,
      kunyomi !== undefined ? kunyomi : word.kunyomi,
      stroke_count !== undefined ? (stroke_count ? parseInt(stroke_count, 10) : null) : word.stroke_count,
      word.id
    );

    const updated = db.prepare('SELECT * FROM words WHERE id = ?').get(word.id);
    res.json({ message: 'Word updated', word: updated });
  } catch (err) {
    console.error('[admin] update word error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────────────────────────
// DELETE /api/admin/words/:id — delete a word
// ────────────────────────────────────────────────────────────────
router.delete('/words/:id', (req, res) => {
  try {
    const word = db.prepare('SELECT * FROM words WHERE id = ?').get(req.params.id);
    if (!word) {
      return res.status(404).json({ error: 'Word not found' });
    }

    // Also remove any user progress for this word
    db.prepare('DELETE FROM user_word_progress WHERE word_id = ?').run(word.id);
    db.prepare('DELETE FROM test_results WHERE word_id = ?').run(word.id);
    db.prepare('DELETE FROM words WHERE id = ?').run(word.id);

    res.json({ message: 'Word deleted', word });
  } catch (err) {
    console.error('[admin] delete word error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /api/admin/stats — admin dashboard statistics
// ────────────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const totalUsers = db.prepare('SELECT COUNT(*) AS cnt FROM users').get().cnt;

    const totalWords = db.prepare('SELECT COUNT(*) AS cnt FROM words').get().cnt;

    const totalGrammar = db.prepare('SELECT COUNT(*) AS cnt FROM grammar_patterns').get().cnt;

    // Words studied today (across all users)
    const studiedToday = db.prepare(`
      SELECT COALESCE(SUM(words_studied), 0) AS cnt
      FROM daily_sessions
      WHERE session_date = ?
    `).get(today).cnt;

    // Active users today
    const activeToday = db.prepare(`
      SELECT COUNT(DISTINCT user_id) AS cnt
      FROM daily_sessions
      WHERE session_date = ?
    `).get(today).cnt;

    // Words per level
    const wordsPerLevel = db.prepare(`
      SELECT l.code, l.label,
             COUNT(w.id) AS word_count
      FROM levels l
      LEFT JOIN categories c ON c.level_id = l.id
      LEFT JOIN words w ON w.category_id = c.id
      GROUP BY l.id
      ORDER BY l.id
    `).all();

    // Recent registrations (last 7 days)
    const recentUsers = db.prepare(`
      SELECT id, name, email, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    // Total progress entries
    const totalProgress = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END) AS mastered,
        SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) AS reviewing,
        SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END) AS learning
      FROM user_word_progress
    `).get();

    res.json({
      total_users: totalUsers,
      total_words: totalWords,
      total_grammar: totalGrammar,
      studied_today: studiedToday,
      active_users_today: activeToday,
      words_per_level: wordsPerLevel,
      recent_users: recentUsers,
      progress_overview: totalProgress,
    });
  } catch (err) {
    console.error('[admin] stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
