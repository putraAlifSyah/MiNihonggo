import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, CheckCircle2, XCircle, AlertCircle,
  Loader2, Star, RotateCcw, Zap, BookmarkCheck, Brain,
  Languages, FileText, Shuffle, PartyPopper
} from 'lucide-react';
import api from '../lib/api';

/* ── helpers ─────────────────────────────────────────────────────── */
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const QUESTION_TYPE_LABELS = {
  multiple_choice:    { label: 'Pilihan Ganda', icon: '🎯', color: 'text-purple' },
  translation_jp_id:  { label: 'Terjemahkan JP→ID', icon: '🇯🇵', color: 'text-sakura' },
  translation_id_jp:  { label: 'Terjemahkan ID→JP', icon: '🗾', color: 'text-blue-400' },
  reading:            { label: 'Baca Kanji', icon: '📖', color: 'text-warning' },
  matching:           { label: 'Cocok-Cocokan', icon: '🔗', color: 'text-success' },
  essay:              { label: 'Pemahaman Teks', icon: '📝', color: 'text-orange-400' },
};

/* ── confetti ────────────────────────────────────────────────────── */
function Confetti() {
  const pieces = useMemo(() => {
    const colors = ['#e84393', '#6c5ce7', '#00b894', '#fdcb6e'];
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i, x: Math.random() * 100, color: colors[i % 4],
      size: 6 + Math.random() * 6, delay: Math.random() * 1.5,
      duration: 1.8 + Math.random() * 1.2, rotation: Math.random() * 720,
    }));
  }, []);
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <motion.div key={p.id} className="absolute rounded-sm"
          style={{ left: `${p.x}%`, top: -12, width: p.size, height: p.size * 0.55, backgroundColor: p.color }}
          initial={{ y: -12, rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', rotate: p.rotation, opacity: [1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }} />
      ))}
    </div>
  );
}

/* ── MatchingQuestion ─────────────────────────────────────────────── */
function MatchingQuestion({ pairs, onComplete }) {
  // pairs: [{ word_id, japanese, hiragana, meaning }]
  const [connections, setConnections] = useState({}); // { word_id: meaning }
  const [dragging, setDragging] = useState(null);
  const [result, setResult] = useState(null); // null | { correct: [], wrong: [] }
  const shuffledMeanings = useMemo(() => shuffle(pairs.map(p => p.meaning)), [pairs]);

  const handleDragStart = (e, wordId) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragging(wordId);
  };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e, meaning) => {
    e.preventDefault();
    if (dragging !== null) {
      setConnections(prev => ({ ...prev, [dragging]: meaning }));
      setDragging(null);
    }
  };
  const handleDragEnd = () => setDragging(null);

  const checkAll = () => {
    const correct = [], wrong = [];
    pairs.forEach(p => {
      if (connections[p.word_id] === p.meaning) correct.push(p.word_id);
      else wrong.push(p.word_id);
    });
    setResult({ correct, wrong });
    if (wrong.length === 0) setTimeout(() => onComplete(correct, []), 800);
  };

  const allConnected = pairs.every(p => connections[p.word_id]);
  const checked = !!result;

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted text-center">Seret kata Jepang ke artinya yang tepat</p>
      <div className="grid grid-cols-2 gap-3">
        {/* Left: Japanese words (draggable) */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-muted/60 uppercase tracking-wider text-center mb-2">Kata Jepang</p>
          {pairs.map(p => {
            const isCorrect = checked && result.correct.includes(p.word_id);
            const isWrong   = checked && result.wrong.includes(p.word_id);
            return (
              <motion.div key={p.word_id}
                draggable animate={isWrong ? { x: [-4, 4, -4, 4, 0] } : {}}
                transition={{ duration: 0.4 }}
                onDragStart={e => handleDragStart(e, p.word_id)}
                onDragEnd={handleDragEnd}
                className={`
                  p-3 rounded-xl border text-center cursor-grab active:cursor-grabbing transition-all select-none
                  ${dragging === p.word_id ? 'opacity-50 scale-95' : ''}
                  ${isCorrect ? 'bg-success/15 border-success/40 text-success' : ''}
                  ${isWrong   ? 'bg-danger/15 border-danger/40 text-danger' : ''}
                  ${!checked  ? 'glass border-white/10 hover:border-sakura/30' : ''}
                `}>
                <p className="jp-text font-bold text-lg">{p.japanese}</p>
                <p className="text-xs text-text-muted mt-0.5">{p.hiragana}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Right: Meanings (drop targets) */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-muted/60 uppercase tracking-wider text-center mb-2">Arti</p>
          {shuffledMeanings.map((meaning, i) => {
            const connectedWordId = Object.entries(connections).find(([, m]) => m === meaning)?.[0];
            const isCorrect = checked && connectedWordId && result.correct.includes(Number(connectedWordId));
            const isWrong   = checked && connectedWordId && result.wrong.includes(Number(connectedWordId));
            return (
              <div key={i}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, meaning)}
                className={`
                  p-3 rounded-xl border text-center transition-all min-h-[62px] flex items-center justify-center
                  ${isCorrect ? 'bg-success/15 border-success/40' : ''}
                  ${isWrong   ? 'bg-danger/15 border-danger/40' : ''}
                  ${!checked && connectedWordId ? 'border-sakura/40 bg-sakura/10' : ''}
                  ${!checked && !connectedWordId ? 'border-dashed border-white/15 hover:border-sakura/40' : ''}
                `}>
                <p className="text-sm font-medium">{meaning}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Check / Retry button */}
      {!checked && (
        <button onClick={checkAll} disabled={!allConnected}
          className="btn-primary w-full py-3 disabled:opacity-40">
          Periksa Semua
        </button>
      )}
      {checked && result.wrong.length > 0 && (
        <div className="space-y-2">
          <p className="text-center text-danger text-sm">
            {result.wrong.length} pasangan salah. Coba lagi atau lanjut.
          </p>
          <div className="flex gap-2">
            <button onClick={() => { setConnections({}); setResult(null); }} className="btn-secondary flex-1 py-2.5 text-sm">
              <RotateCcw size={14} className="inline mr-1.5" />Ulangi
            </button>
            <button onClick={() => onComplete(result.correct, result.wrong)} className="btn-primary flex-1 py-2.5 text-sm">
              Lanjut <ChevronRight size={14} className="inline ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── StreamingAnalysis ───────────────────────────────────────────── */
function StreamingAnalysis({ wrongWordIds, onClose }) {
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!wrongWordIds.length) { setText('Tidak ada kata yang salah! 🎉'); setDone(true); return; }
    const token = localStorage.getItem('token');
    (async () => {
      try {
        const res = await fetch('/api/ai/analyze-mistakes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ wrong_word_ids: wrongWordIds }),
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
          const { done: d, value } = await reader.read();
          if (d) break;
          buf += decoder.decode(value, { stream: true });
          for (const line of buf.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') { setDone(true); continue; }
            try {
              const { token: t } = JSON.parse(data);
              if (t) setText(p => p + t);
            } catch {}
          }
          buf = buf.split('\n').pop();
        }
        setDone(true);
      } catch { setDone(true); }
    })();
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={16} className="text-purple" />
        <p className="font-semibold text-sm">Analisis AI</p>
        {!done && <Loader2 size={14} className="animate-spin text-text-muted ml-auto" />}
      </div>
      <div className="text-sm text-text-primary leading-relaxed space-y-1 max-h-48 overflow-y-auto">
        {text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
        {!done && <span className="inline-block w-1.5 h-3.5 bg-purple/70 animate-pulse rounded" />}
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function TestPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('loading'); // loading|quiz|complete|noPlan|empty
  const [aiEnabled, setAiEnabled] = useState(false);
  const [activePlan, setActivePlan] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [wrongWordIds, setWrongWordIds] = useState([]);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Per-question state
  const [qState, setQState] = useState('idle'); // idle|answered|grading
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [answerResult, setAnswerResult] = useState(null); // {correct, score, feedback}
  const [textInput, setTextInput] = useState('');

  // ── Load data ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // 1. Check AI
        const aiRes = await api.get('/ai/settings');
        const ai = !!aiRes.data.is_enabled;
        setAiEnabled(ai);

        // 2. Active plan
        const plansRes = await api.get('/progress/study-plans');
        const plan = (plansRes.data.plans || []).find(p => p.is_active === 1);
        if (!plan) { setPhase('noPlan'); return; }
        setActivePlan(plan);

        // 3. Today's words
        const todayRes = await api.get(`/progress/today?level_id=${plan.level_id}`);
        const words = [...(todayRes.data.reviews || []), ...(todayRes.data.new_words || [])];

        if (words.length === 0) { setPhase('empty'); return; }

        // 4. Pending wrong questions
        let pendingQs = [];
        if (ai) {
          try {
            const pRes = await api.get('/ai/pending-questions');
            pendingQs = pRes.data.questions || [];
          } catch {}
        }

        // 5. Word pool for wrong choices
        let wordPool = [];
        try {
          const poolRes = await api.get(`/words?level_id=${plan.level_id}&limit=100`);
          wordPool = poolRes.data.words || [];
        } catch {}

        // 6. Generate questions
        let aiQuestions = [];
        if (ai && words.length > 0) {
          try {
            const ids = words.slice(0, 10).map(w => w.id);
            const genRes = await api.post('/ai/generate-test', {
              word_ids: ids,
              level_code: plan.level_code || 'N5',
            });
            aiQuestions = genRes.data.questions || [];
          } catch {}
        }

        // 7. Fallback multiple-choice for words without AI questions
        const coveredIds = new Set(aiQuestions.map(q => q.word_id).filter(Boolean));
        const fallbackWords = words.filter(w => !coveredIds.has(w.id)).slice(0, 10 - aiQuestions.length);
        const fallbackQs = fallbackWords.map(w => {
          const wrongs = shuffle(wordPool.filter(p => p.id !== w.id && p.meaning !== w.meaning)).slice(0, 3);
          return {
            id: `fallback-${w.id}`,
            word_id: w.id,
            question_type: 'multiple_choice',
            question_text: `Apa arti dari kata ini?`,
            correct_answer: w.meaning,
            context: null,
            _word: w,
            _choices: shuffle([w.meaning, ...wrongs.map(r => r.meaning)]),
          };
        });

        // Attach word data to AI questions
        const enriched = aiQuestions.map(q => {
          const word = words.find(w => w.id === q.word_id);
          return {
            ...q,
            _word: word || null,
            _choices: q.question_type === 'multiple_choice'
              ? shuffle([q.correct_answer, ...shuffle(wordPool.filter(p => p.meaning !== q.correct_answer)).slice(0, 3).map(p => p.meaning)])
              : [],
          };
        });

        // Pending questions first, then AI, then fallback
        const pendingEnriched = pendingQs.map(q => ({
          ...q,
          context: q.context ? (typeof q.context === 'string' ? JSON.parse(q.context) : q.context) : null,
          _pending: true,
          _word: words.find(w => w.id === q.word_id) || null,
          _choices: q.question_type === 'multiple_choice'
            ? shuffle([q.correct_answer, ...shuffle(wordPool.filter(p => p.meaning !== q.correct_answer)).slice(0, 3).map(p => p.meaning)])
            : [],
        }));

        const allQuestions = [...pendingEnriched, ...enriched, ...fallbackQs];
        setQuestions(allQuestions);
        setPhase('quiz');
      } catch (err) {
        console.error('TestPage load error:', err);
        setPhase('noPlan');
      }
    })();
  }, []);

  const q = questions[current];

  // ── Answer handlers ───────────────────────────────────────────
  const submitSRS = useCallback(async (wordId, isCorrect) => {
    if (!wordId) return;
    try {
      await api.post('/progress/review', { word_id: wordId, quality: isCorrect ? 2 : 0 });
    } catch {}
  }, []);

  const handleMultipleChoice = async (choice) => {
    if (qState !== 'idle') return;
    setSelectedChoice(choice);
    setQState('answered');
    const correct = choice === q.correct_answer;
    setAnswerResult({ correct, feedback: correct ? 'Benar! 🎉' : `Jawaban yang benar: ${q.correct_answer}` });
    setScore(prev => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
    if (!correct && q.word_id) setWrongWordIds(prev => [...prev, q.word_id]);
    await submitSRS(q.word_id, correct);
  };

  const handleTextSubmit = async () => {
    if (qState !== 'idle' || !textInput.trim()) return;
    setQState('grading');
    try {
      const res = await api.post('/ai/grade-answer', {
        question_id: q.id,
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        user_answer: textInput.trim(),
        question_type: q.question_type,
      });
      const result = res.data;
      setAnswerResult(result);
      setScore(prev => ({ correct: prev.correct + (result.correct ? 1 : 0), total: prev.total + 1 }));
      if (!result.correct && q.word_id) setWrongWordIds(prev => [...prev, q.word_id]);
      await submitSRS(q.word_id, result.correct);
    } catch (err) {
      setAnswerResult({ correct: false, feedback: 'Gagal menilai. Lanjut ke soal berikutnya.' });
    }
    setQState('answered');
  };

  const handleMatchingComplete = async (correctIds, wrongIds) => {
    for (const id of correctIds) await submitSRS(id, true);
    for (const id of wrongIds) { await submitSRS(id, false); setWrongWordIds(prev => [...prev, id]); }
    setScore(prev => ({ correct: prev.correct + correctIds.length, total: prev.total + correctIds.length + wrongIds.length }));
    nextQuestion();
  };

  const nextQuestion = () => {
    setQState('idle');
    setSelectedChoice(null);
    setAnswerResult(null);
    setTextInput('');
    if (current + 1 >= questions.length) setPhase('complete');
    else setCurrent(prev => prev + 1);
  };

  const pct = questions.length > 0 ? Math.round(((current) / questions.length) * 100) : 0;
  const scorePct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
  const stars = scorePct >= 90 ? 3 : scorePct >= 60 ? 2 : scorePct >= 30 ? 1 : 0;

  /* ── Phases ── */
  if (phase === 'loading') return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-2 border-sakura border-t-transparent rounded-full animate-spin" />
      <p className="text-text-muted text-sm">Menyiapkan soal{aiEnabled ? ' dengan AI ⚡' : ''}...</p>
    </div>
  );

  if (phase === 'noPlan') return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card text-center max-w-sm py-10 px-8">
        <div className="text-5xl mb-4">📚</div>
        <h2 className="text-xl font-bold mb-2">Buat Rencana Belajar Dulu</h2>
        <p className="text-text-muted text-sm mb-6">Test hanya tersedia setelah kamu punya rencana belajar aktif.</p>
        <button onClick={() => navigate('/setup/N5')} className="btn-primary">Buat Rencana Belajar</button>
      </motion.div>
    </div>
  );

  if (phase === 'empty') return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card text-center max-w-sm py-10 px-8">
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-5xl mb-4">🎉</motion.div>
        <h2 className="text-xl font-bold jp-text mb-2">おめでとう！</h2>
        <p className="text-text-muted text-sm mb-6">Tidak ada kata untuk ditest hari ini. Kerjakan flashcard dulu!</p>
        <button onClick={() => navigate('/flashcard')} className="btn-primary">Buka Flashcard</button>
      </motion.div>
    </div>
  );

  if (phase === 'complete') return (
    <>
      {stars > 0 && <Confetti />}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto">
        <div className="card text-center py-10 px-8">
          <div className="text-5xl mb-4">{stars === 3 ? '🏆' : stars === 2 ? '🎯' : '📖'}</div>
          <h2 className="text-2xl font-bold mb-1">Sesi Selesai!</h2>

          {/* Score ring */}
          <div className="relative w-28 h-28 mx-auto my-6">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
              <motion.circle cx="50" cy="50" r="42" fill="none"
                stroke={scorePct >= 70 ? '#00b894' : scorePct >= 40 ? '#fdcb6e' : '#e17055'}
                strokeWidth="10" strokeLinecap="round"
                initial={{ strokeDasharray: '0 264' }}
                animate={{ strokeDasharray: `${(scorePct / 100) * 264} 264` }}
                transition={{ duration: 1.2, ease: 'easeOut' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{score.correct}</span>
              <span className="text-xs text-text-muted">/ {score.total}</span>
            </div>
          </div>

          {/* Stars */}
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3].map(s => (
              <motion.div key={s} initial={{ scale: 0 }} animate={{ scale: s <= stars ? 1 : 0.5 }}
                transition={{ delay: 0.8 + s * 0.15, type: 'spring' }}>
                <Star size={28} className={s <= stars ? 'text-warning fill-warning' : 'text-white/10'} />
              </motion.div>
            ))}
          </div>

          <p className="text-text-muted text-sm mb-6">{scorePct}% benar</p>

          {/* AI Analysis */}
          {aiEnabled && wrongWordIds.length > 0 && !showAnalysis && (
            <button onClick={() => setShowAnalysis(true)}
              className="btn-secondary text-sm px-6 py-2.5 flex items-center gap-2 mx-auto mb-4">
              <Brain size={16} />Analisis Kesalahan AI 🤖
            </button>
          )}
          {showAnalysis && <StreamingAnalysis wrongWordIds={wrongWordIds} />}

          <div className="space-y-2 mt-6">
            <button onClick={() => window.location.reload()} className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold">
              <RotateCcw size={14} />Latihan Lagi
            </button>
            <div className="flex gap-2">
              <button onClick={() => navigate('/vocabulary')} className="btn-secondary flex-1 py-2.5 text-sm">
                📚 Kosakata Saya
              </button>
              <button onClick={() => navigate('/dashboard')} className="btn-secondary flex-1 py-2.5 text-sm">
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );

  /* ── Quiz ── */
  if (!q) return null;
  const typeInfo = QUESTION_TYPE_LABELS[q.question_type] || QUESTION_TYPE_LABELS.multiple_choice;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Top bar */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl hover:bg-white/5 text-text-muted transition-colors">
          <X size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-text-muted">{current + 1} / {questions.length}</span>
            <div className="flex items-center gap-3">
              {aiEnabled && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple/15 text-purple border border-purple/25 flex items-center gap-1">
                  <Zap size={10} />AI
                </span>
              )}
              <span className="text-sm font-semibold">
                <CheckCircle2 size={13} className="inline text-success mr-1" />{score.correct} benar
              </span>
            </div>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div className="progress-fill h-full" style={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>
      </motion.div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div key={current}
          initial={{ opacity: 0, x: 60, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -60, scale: 0.97 }}
          transition={{ duration: 0.3 }}>
          <div className="card space-y-5">
            {/* Question type badge */}
            <div className="flex items-center gap-2">
              <span className="text-lg">{typeInfo.icon}</span>
              <span className={`text-xs font-semibold uppercase tracking-wider ${typeInfo.color}`}>{typeInfo.label}</span>
              {q._pending && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/25">
                  📌 Soal Ulang
                </span>
              )}
            </div>

            {/* ── multiple_choice ── */}
            {q.question_type === 'multiple_choice' && (
              <>
                <div className="text-center py-2">
                  {q._word && (
                    <>
                      <p className="jp-text text-5xl font-bold mb-2">{q._word.japanese}</p>
                      {q._word.hiragana && q._word.hiragana !== q._word.japanese && (
                        <p className="jp-text text-lg text-text-muted">{q._word.hiragana}</p>
                      )}
                    </>
                  )}
                  <p className="text-text-muted text-sm mt-3">{q.question_text}</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {(q._choices || []).map((choice, i) => {
                    const isSelected = selectedChoice === choice;
                    const isCorrect  = qState === 'answered' && choice === q.correct_answer;
                    const isWrong    = qState === 'answered' && isSelected && !isCorrect;
                    return (
                      <motion.button key={i} whileHover={qState === 'idle' ? { scale: 1.02 } : {}} whileTap={{ scale: 0.98 }}
                        onClick={() => handleMultipleChoice(choice)} disabled={qState !== 'idle'}
                        className={`p-3.5 rounded-xl border text-sm font-medium text-left transition-all
                          ${isCorrect ? 'bg-success/20 border-success/50 text-success' : ''}
                          ${isWrong   ? 'bg-danger/20  border-danger/50  text-danger'  : ''}
                          ${!isCorrect && !isWrong ? 'glass border-white/10 hover:border-sakura/30 hover:bg-sakura/5 text-text-primary' : ''}
                        `}>
                        <span className="w-6 h-6 rounded-lg bg-white/10 inline-flex items-center justify-center text-xs mr-2">
                          {['A','B','C','D'][i]}
                        </span>
                        {choice}
                      </motion.button>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── translation types ── */}
            {['translation_jp_id', 'translation_id_jp', 'reading'].includes(q.question_type) && (
              <>
                <div className="text-center py-2">
                  {q._word && (
                    <>
                      {q.question_type === 'translation_id_jp'
                        ? <p className="text-3xl font-bold text-sakura mb-2">{q._word.meaning}</p>
                        : <p className="jp-text text-5xl font-bold mb-2">{q._word.japanese}</p>
                      }
                      {q.question_type === 'reading' && q._word.example_sentence_jp && (
                        <p className="jp-text text-base text-text-muted mt-2">{q._word.example_sentence_jp}</p>
                      )}
                    </>
                  )}
                  <p className="text-text-muted text-sm mt-3">{q.question_text}</p>
                </div>
                {qState === 'idle' && (
                  <div className="flex gap-2">
                    <input type="text" value={textInput} onChange={e => setTextInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                      placeholder="Tulis jawabanmu..."
                      className="flex-1 text-sm" autoFocus />
                    <button onClick={handleTextSubmit} disabled={!textInput.trim()}
                      className="btn-primary px-5 text-sm disabled:opacity-40">Jawab</button>
                  </div>
                )}
                {qState === 'grading' && (
                  <div className="flex items-center gap-2 text-text-muted text-sm py-2">
                    <Loader2 size={16} className="animate-spin text-purple" />AI sedang menilai jawaban...
                  </div>
                )}
              </>
            )}

            {/* ── matching ── */}
            {q.question_type === 'matching' && q.context?.pairs && (
              <MatchingQuestion pairs={q.context.pairs} onComplete={handleMatchingComplete} />
            )}

            {/* ── essay ── */}
            {q.question_type === 'essay' && (
              <>
                {q.context?.paragraph && (
                  <div className="glass-subtle p-4 rounded-xl jp-text text-sm leading-relaxed">
                    {q.context.paragraph}
                  </div>
                )}
                <p className="text-text-primary font-medium">{q.question_text}</p>
                {qState === 'idle' && (
                  <div className="space-y-2">
                    <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
                      placeholder="Tulis jawabanmu..." rows={3}
                      className="w-full text-sm resize-none" />
                    <button onClick={handleTextSubmit} disabled={!textInput.trim()}
                      className="btn-primary w-full py-2.5 text-sm disabled:opacity-40">Kirim Jawaban</button>
                  </div>
                )}
                {qState === 'grading' && (
                  <div className="flex items-center gap-2 text-text-muted text-sm">
                    <Loader2 size={16} className="animate-spin text-purple" />Menilai dengan AI...
                  </div>
                )}
              </>
            )}

            {/* Feedback */}
            <AnimatePresence>
              {answerResult && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className={`p-3.5 rounded-xl border text-sm ${
                    answerResult.correct
                      ? 'bg-success/10 border-success/25 text-success'
                      : 'bg-danger/10  border-danger/25  text-danger'
                  }`}>
                  <div className="flex items-start gap-2">
                    {answerResult.correct ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <XCircle size={16} className="shrink-0 mt-0.5" />}
                    <p>{answerResult.feedback}</p>
                  </div>
                  {answerResult.score !== undefined && !answerResult.correct && (
                    <p className="text-xs mt-1 opacity-70">Jawaban yang diharapkan: {q.correct_answer}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next button — only for non-matching types after answering */}
            {qState === 'answered' && q.question_type !== 'matching' && (
              <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                onClick={nextQuestion} className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2">
                {current + 1 >= questions.length ? 'Lihat Hasil' : 'Lanjut'}
                <ChevronRight size={16} />
              </motion.button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
