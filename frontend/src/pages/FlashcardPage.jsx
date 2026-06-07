import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RotateCcw,
  ChevronLeft,
  PartyPopper,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BookOpen,
  Volume2,
  Info,
} from 'lucide-react';
import api from '../lib/api';
import AIExplainer from '../components/ai/AIExplainer';


// Word type labels in Indonesian
const wordTypeLabel = {
  noun: 'Kata Benda',
  verb: 'Kata Kerja',
  'i-adjective': 'Kata Sifat-i',
  'na-adjective': 'Kata Sifat-na',
  adjective: 'Kata Sifat',
  adverb: 'Kata Keterangan',
  expression: 'Ungkapan',
  particle: 'Partikel',
  conjunction: 'Konjungsi',
  other: 'Lainnya',
};

// Confetti component for session complete
function Confetti() {
  const pieces = useMemo(() => {
    const colors = ['#e84393', '#6c5ce7', '#00b894', '#fdcb6e', '#d63031', '#fff'];
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      rotation: Math.random() * 720,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: -20,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: '2px',
          }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{
            y: '110vh',
            rotate: p.rotation,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  );
}

export default function FlashcardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPractice = new URLSearchParams(location.search).get('mode') === 'practice';

  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [direction, setDirection] = useState(0);
  const [stats, setStats] = useState({ reviewed: 0, easy: 0, medium: 0, hard: 0 });
  const [activePlan, setActivePlan] = useState(null);
  const [meta, setMeta] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const startTime = useRef(Date.now()); // track session start for elapsed time display


  useEffect(() => {
    // Reset state whenever mode changes (normal <-> practice)
    setCards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setDirection(0);
    setStats({ reviewed: 0, easy: 0, medium: 0, hard: 0 });
    setLoading(true);

    const fetchCards = async () => {
      try {
        // Check AI enabled in parallel
        api.get('/ai/settings').then(r => setAiEnabled(!!r.data.is_enabled)).catch(() => {});

        // First get active study plan to know which level
        const plansRes = await api.get('/progress/study-plans');
        const plans = plansRes.data.plans || [];
        const active = plans.find(p => p.is_active === 1);
        setActivePlan(active || null);

        // Fetch cards; practice mode bypasses daily quota
        const modeParam = isPractice ? '&mode=practice' : '';
        const params = active
          ? `?level_id=${active.level_id}${modeParam}`
          : isPractice ? '?mode=practice' : '';
        const res = await api.get(`/progress/today${params}`);
        const data = res.data;

        const reviews = data.reviews || [];
        const newWords = data.new_words || [];
        setMeta(data.meta || null);
        setCards([...reviews, ...newWords]);
      } catch (err) {
        console.error('Failed to fetch flashcards:', err);
        setCards([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [isPractice]); // re-fetch whenever mode changes

  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? ((currentIndex) / cards.length) * 100 : 0;

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleRate = useCallback(async (quality) => {
    // quality: 1=belum hafal, 3=agak hafal, 5=sudah hafal
    const ratingKey = quality === 1 ? 'hard' : quality === 3 ? 'medium' : 'easy';
    setStats((prev) => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      [ratingKey]: prev[ratingKey] + 1,
    }));

    try {
      // Map UI quality to backend 0/1/2
      const qualityMap = { 1: 0, 3: 1, 5: 2 };
      await api.post('/progress/review', {
        word_id: currentCard.id || currentCard.word_id,
        quality: qualityMap[quality],
      });
    } catch (err) {
      console.error('Failed to submit review:', err);
    }

    setIsFlipped(false);
    setShowHint(false);
    setDirection(1);

    setTimeout(() => {
      if (currentIndex + 1 >= cards.length) {
        setSessionComplete(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 200);
  }, [currentCard, currentIndex, cards.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (sessionComplete || loading || cards.length === 0) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          handleFlip();
          break;
        case '1':
          if (isFlipped) handleRate(1);
          break;
        case '2':
          if (isFlipped) handleRate(3);
          break;
        case '3':
          if (isFlipped) handleRate(5);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleRate, isFlipped, sessionComplete, loading, cards.length]);

  const elapsedMinutes = Math.round((Date.now() - startTime.current) / 60000);


  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-sakura border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted">Memuat kartu hari ini...</p>
        </div>
      </div>
    );
  }

  // No study plan
  if (!activePlan && cards.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center min-h-[60vh]"
      >
        <div className="card text-center max-w-md mx-auto py-12 px-8">
          <div className="text-5xl mb-4">📚</div>
          <h2 className="text-xl font-bold mb-2">Belum ada Rencana Belajar</h2>
          <p className="text-text-muted mb-6">Buat rencana belajar terlebih dahulu untuk mulai belajar kosakata.</p>
          <button onClick={() => navigate('/setup/N5')} className="btn-primary">
            Buat Rencana Belajar
          </button>
        </div>
      </motion.div>
    );
  }

  // Empty state (all done for today)
  if (cards.length === 0 && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center min-h-[60vh]"
      >
        <div className="card text-center max-w-md mx-auto py-12 px-8">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="text-6xl mb-4"
          >
            🎉
          </motion.div>
          <h2 className="text-2xl font-bold mb-2 jp-text">おめでとう！</h2>
          <p className="text-text-muted mb-1">Target hari ini sudah selesai!</p>
          <p className="text-xs text-text-muted mb-6">
            Mau latihan lebih? Kamu bisa lanjut berapa kali pun dengan mode latihan bebas.
          </p>
          {meta && (
            <div className="glass-subtle rounded-xl p-4 mb-6 text-sm text-left space-y-1">
              <p className="text-text-muted">📊 Review selesai: <span className="text-sakura font-semibold">{meta.review_count}</span></p>
              <p className="text-text-muted">📖 Kata baru selesai: <span className="text-purple font-semibold">{meta.new_count}</span></p>
              <p className="text-text-muted">🎯 Target hari ini: <span className="text-text-primary font-semibold">{meta.words_per_day}</span> kata</p>
            </div>
          )}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/flashcard?mode=practice')}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 font-semibold"
            >
              🔁 Latihan Lagi (Bebas Target)
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/vocabulary')}
                className="btn-secondary flex-1 py-2.5 text-sm"
              >
                📚 Kosakata Saya
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-secondary flex-1 py-2.5 text-sm"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Session Complete
  if (sessionComplete) {
    return (
      <>
        <Confetti />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="flex items-center justify-center min-h-[60vh]"
        >
          <div className="card text-center max-w-lg mx-auto py-12 px-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
              transition={{ type: 'spring', delay: 0.3 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-success/20 to-success/5 mb-6"
            >
              <PartyPopper size={36} className="text-success" />
            </motion.div>

            <h2 className="text-2xl font-bold mb-2">Sesi Selesai! 🎊</h2>
            <p className="text-text-muted mb-8">Kerja bagus! Terus konsisten ya!</p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="glass-subtle p-4 rounded-xl">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <BookOpen size={16} className="text-sakura" />
                  <span className="text-xs text-text-muted">Direview</span>
                </div>
                <p className="text-2xl font-bold text-sakura">{stats.reviewed}</p>
              </div>
              <div className="glass-subtle p-4 rounded-xl">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock size={16} className="text-purple" />
                  <span className="text-xs text-text-muted">Durasi</span>
                </div>
                <p className="text-2xl font-bold text-purple">{elapsedMinutes || '< 1'} min</p>
              </div>
              <div className="glass-subtle p-4 rounded-xl">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle2 size={16} className="text-success" />
                  <span className="text-xs text-text-muted">Sudah Hafal</span>
                </div>
                <p className="text-2xl font-bold text-success">{stats.easy}</p>
              </div>
              <div className="glass-subtle p-4 rounded-xl">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <XCircle size={16} className="text-danger" />
                  <span className="text-xs text-text-muted">Belum Hafal</span>
                </div>
                <p className="text-2xl font-bold text-danger">{stats.hard}</p>
              </div>
            </div>

            {activePlan && (
              <div className="glass-subtle rounded-xl p-3 mb-6 text-xs text-text-muted text-left">
                <p>📅 Target selesai: <span className="text-sakura">{activePlan.target_date}</span></p>
                <p>🎯 Kata per hari: <span className="text-purple font-semibold">{activePlan.words_per_day}</span></p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => navigate('/flashcard?mode=practice')}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                <span>🔁</span> Latihan Lagi (Semua Kata)
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/vocabulary')}
                  className="btn-secondary flex-1 py-2.5 text-sm"
                >
                  📚 Lihat Kosakata
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn-secondary flex-1 py-2.5 text-sm"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </>
    );
  }

  // Main Flashcard View
  return (
    <div className="max-w-2xl mx-auto">
      {/* Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-muted">
                {currentIndex + 1} / {cards.length}
              </span>
              {activePlan && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-sakura/15 text-sakura font-medium">
                  {activePlan.level_code} · {activePlan.words_per_day}/hari
                </span>
              )}
            </div>
            <span className="text-xs text-text-muted/60">
              Spasi flip · 1/2/3 rating
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="progress-fill h-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors"
        >
          <X size={20} />
        </button>
      </motion.div>

      {/* Category info */}
      {meta && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-3 mb-4 text-xs"
        >
          {meta.review_count > 0 && (
            <span className="px-3 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">
              🔄 {meta.review_count} review SRS
            </span>
          )}
          {meta.new_count > 0 && (
            <span className="px-3 py-1 rounded-full bg-purple/15 text-purple border border-purple/20">
              ✨ {meta.new_count} kata baru
            </span>
          )}
        </motion.div>
      )}

      {/* Flashcard */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: direction >= 0 ? 80 : -80, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: direction >= 0 ? -80 : 80, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        >
          <div
            className={`card-flip ${isFlipped ? 'flipped' : ''} cursor-pointer`}
            onClick={handleFlip}
            style={{ height: '360px' }}
          >
            <div className="card-inner">
              {/* ── FRONT ────────────────────────────────────── */}
              <div className="card-front glass-strong p-8 flex flex-col justify-between">
                {/* Badges */}
                <div className="flex gap-2">
                  {currentCard.word_type && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple/20 text-purple border border-purple/20">
                      {wordTypeLabel[currentCard.word_type] || currentCard.word_type}
                    </span>
                  )}
                  {currentCard.level_code && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-sakura/20 text-sakura border border-sakura/20">
                      {currentCard.level_code}
                    </span>
                  )}
                  {currentCard.status && currentCard.status !== 'unseen' && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/20">
                      🔄 Review
                    </span>
                  )}
                </div>

                {/* Main word */}
                <div className="text-center">
                  <h2 className="jp-text text-6xl sm:text-7xl font-bold text-text-primary mb-3 leading-tight">
                    {currentCard.japanese}
                  </h2>
                  {/* Show hiragana on front too — helps learners connect kanji with reading */}
                  {currentCard.hiragana && currentCard.hiragana !== currentCard.japanese && (
                    <p className="jp-text text-xl text-text-muted/70 mb-1">
                      {currentCard.hiragana}
                    </p>
                  )}
                  {currentCard.romaji && (
                    <p className="text-sm text-text-muted/50">
                      {currentCard.romaji}
                    </p>
                  )}
                </div>

                {/* Flip hint */}
                <p className="text-text-muted/50 text-sm flex items-center justify-center gap-2">
                  <RotateCcw size={14} />
                  Tap untuk melihat arti
                </p>
              </div>

              {/* ── BACK ─────────────────────────────────────── */}
              <div className="card-back glass-strong p-8 overflow-y-auto">
                <div className="space-y-4 h-full flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Japanese + reading */}
                    <div className="text-center pb-3 border-b border-white/10">
                      <p className="jp-text text-4xl font-bold text-text-primary mb-1">
                        {currentCard.japanese}
                      </p>
                      {currentCard.hiragana && (
                        <p className="jp-text text-lg text-purple">{currentCard.hiragana}</p>
                      )}
                      {currentCard.romaji && (
                        <p className="text-xs text-text-muted/60 mt-0.5">{currentCard.romaji}</p>
                      )}
                    </div>

                    {/* Meaning */}
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Arti</p>
                      <p className="text-2xl font-bold text-sakura">
                        {currentCard.meaning}
                      </p>
                    </div>

                    {/* Example sentence */}
                    {currentCard.example_sentence_jp && (
                      <div className="bg-white/3 rounded-xl p-3">
                        <p className="text-xs text-text-muted uppercase tracking-wider mb-1.5">Contoh</p>
                        <p className="jp-text text-sm text-text-primary leading-relaxed">
                          {currentCard.example_sentence_jp}
                        </p>
                        {currentCard.example_sentence_id && (
                          <p className="text-xs text-text-muted mt-1.5 italic">
                            {currentCard.example_sentence_id}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Rating Buttons */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="flex gap-3 mt-6 justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); handleRate(1); }}
              className="flex-1 max-w-[160px] py-4 px-4 rounded-2xl bg-gradient-to-r from-danger/20 to-danger/10 border border-danger/20 hover:border-danger/40 text-danger font-semibold transition-all flex flex-col items-center gap-1.5"
            >
              <XCircle size={22} />
              <span className="text-sm">Belum Hafal</span>
              <span className="text-[10px] opacity-50">tekan 1</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); handleRate(3); }}
              className="flex-1 max-w-[160px] py-4 px-4 rounded-2xl bg-gradient-to-r from-warning/20 to-warning/10 border border-warning/20 hover:border-warning/40 text-warning font-semibold transition-all flex flex-col items-center gap-1.5"
            >
              <AlertCircle size={22} />
              <span className="text-sm">Agak Hafal</span>
              <span className="text-[10px] opacity-50">tekan 2</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); handleRate(5); }}
              className="flex-1 max-w-[160px] py-4 px-4 rounded-2xl bg-gradient-to-r from-success/20 to-success/10 border border-success/20 hover:border-success/40 text-success font-semibold transition-all flex flex-col items-center gap-1.5"
            >
              <CheckCircle2 size={22} />
              <span className="text-sm">Sudah Hafal</span>
              <span className="text-[10px] opacity-50">tekan 3</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap hint when not flipped */}
      {!isFlipped && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-text-muted/40 text-xs mt-4"
        >
          Klik kartu atau tekan Spasi untuk flip
        </motion.p>
      )}

      {/* AI Explainer */}
      {currentCard && (
        <div className="flex justify-center mt-3">
          <AIExplainer wordId={currentCard.id} word={currentCard} aiEnabled={aiEnabled} />
        </div>
      )}
    </div>
  );
}
