import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, BookOpen, Star, TrendingUp, Brain, Eye, EyeOff,
  ChevronLeft, ChevronRight, Filter, X, Layers, Zap
} from 'lucide-react';
import api from '../lib/api';

const STATUS_TABS = [
  { key: 'all',       label: 'Semua',           color: 'text-text-primary',   bg: 'bg-white/10',       border: 'border-white/20'     },
  { key: 'mastered',  label: 'Dikuasai',         color: 'text-success',        bg: 'bg-success/15',     border: 'border-success/30'   },
  { key: 'reviewing', label: 'Sedang Diulas',    color: 'text-purple',         bg: 'bg-purple/15',      border: 'border-purple/30'    },
  { key: 'learning',  label: 'Sedang Belajar',   color: 'text-warning',        bg: 'bg-warning/15',     border: 'border-warning/30'   },
  { key: 'unseen',    label: 'Belum Dilihat',    color: 'text-text-muted',     bg: 'bg-white/5',        border: 'border-white/10'     },
];

const MASTERY_CONFIG = {
  mastered:  { label: 'Dikuasai',       color: 'text-success',   bg: 'bg-success/15  border-success/30',  dot: 'bg-success',  icon: '⭐' },
  reviewing: { label: 'Sedang Diulas',  color: 'text-purple',    bg: 'bg-purple/15   border-purple/30',   dot: 'bg-purple',   icon: '🔄' },
  learning:  { label: 'Sedang Belajar', color: 'text-warning',   bg: 'bg-warning/15  border-warning/30',  dot: 'bg-warning',  icon: '📖' },
  unseen:    { label: 'Belum Dilihat',  color: 'text-text-muted', bg: 'bg-white/5    border-white/10',    dot: 'bg-white/30', icon: '👁️' },
};

const WORD_TYPE_ID = {
  noun: 'Kata Benda', verb: 'Kata Kerja', adjective: 'Kata Sifat',
  'i-adjective': 'Kata Sifat-i', 'na-adjective': 'Kata Sifat-na',
  adverb: 'Kata Keterangan', expression: 'Ungkapan', particle: 'Partikel',
  conjunction: 'Konjungsi', other: 'Lainnya',
};

function WordCard({ word, index }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = MASTERY_CONFIG[word.mastery] || MASTERY_CONFIG.unseen;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025 }}
      className="glass rounded-2xl overflow-hidden"
    >
      {/* Main row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full p-4 text-left flex items-center gap-4 hover:bg-white/3 transition-colors"
      >
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />

        {/* Japanese */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="jp-text text-xl font-bold text-text-primary">{word.japanese}</span>
            {word.hiragana && word.hiragana !== word.japanese && (
              <span className="jp-text text-sm text-text-muted">{word.hiragana}</span>
            )}
            {word.romaji && (
              <span className="text-xs text-text-muted/60">{word.romaji}</span>
            )}
          </div>
          <p className="text-sm text-text-muted mt-0.5 truncate">{word.meaning}</p>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {word.word_type && (
            <span className="hidden sm:block text-xs px-2 py-0.5 rounded-lg bg-white/5 text-text-muted/70">
              {WORD_TYPE_ID[word.word_type] || word.word_type}
            </span>
          )}
          <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${cfg.bg} ${cfg.color}`}>
            {cfg.icon} {cfg.label}
          </span>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} className="text-text-muted/50">
            <ChevronRight size={14} />
          </motion.div>
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-white/5 space-y-3">
              {/* SRS info */}
              <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                {word.repetitions > 0 && (
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} />
                    {word.repetitions}x diulang
                  </span>
                )}
                {word.interval_days > 0 && (
                  <span className="flex items-center gap-1">
                    <Brain size={12} />
                    Interval {word.interval_days} hari
                  </span>
                )}
                {word.next_review_date && (
                  <span>
                    Review: {new Date(word.next_review_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
                {word.last_reviewed_at && (
                  <span>
                    Terakhir: {new Date(word.last_reviewed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>

              {/* Example sentences */}
              {word.example_sentence_jp && (
                <div className="bg-white/3 rounded-xl p-3 space-y-1">
                  <p className="jp-text text-sm text-text-primary">{word.example_sentence_jp}</p>
                  {word.example_sentence_id && (
                    <p className="text-xs text-text-muted">{word.example_sentence_id}</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

export default function VocabularyPage() {
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [counts, setCounts] = useState({ total: 0, mastered: 0, reviewing: 0, learning: 0, unseen: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [levels, setLevels] = useState([]);
  const [levelId, setLevelId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 40;

  // Load levels for filter
  useEffect(() => {
    api.get('/levels').then(r => setLevels(r.data.levels || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, page, limit: LIMIT });
      if (levelId) params.set('level_id', levelId);
      if (search) params.set('search', search);
      const res = await api.get(`/progress/vocabulary?${params}`);
      setWords(res.data.words || []);
      setTotal(res.data.total || 0);
      setCounts(res.data.counts || {});
    } catch {}
    setLoading(false);
  }, [status, page, levelId, search]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleTabChange = (key) => { setStatus(key); setPage(1); };

  const totalPages = Math.ceil(total / LIMIT);
  const masterPct = counts.total > 0 ? Math.round(((counts.mastered || 0) / counts.total) * 100) : 0;

  return (
    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
      className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen size={22} className="text-sakura" /> Kosakata Saya
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            Lihat semua kata dan tingkat penguasaanmu
          </p>
        </div>
      </motion.div>

      {/* Stats cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Dikuasai',       value: counts.mastered  || 0, color: 'text-success',   bg: 'from-success/10 to-success/5',   icon: '⭐' },
          { label: 'Sedang Diulas',  value: counts.reviewing || 0, color: 'text-purple',    bg: 'from-purple/10  to-purple/5',    icon: '🔄' },
          { label: 'Sedang Belajar', value: counts.learning  || 0, color: 'text-warning',   bg: 'from-warning/10 to-warning/5',   icon: '📖' },
          { label: 'Belum Dilihat',  value: counts.unseen    || 0, color: 'text-text-muted', bg: 'from-white/5  to-white/2',      icon: '👁️' },
        ].map((s, i) => (
          <motion.button key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => handleTabChange(['mastered','reviewing','learning','unseen'][i])}
            className={`card text-left bg-gradient-to-br ${s.bg} p-4`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</div>
            <div className="text-xs text-text-muted mt-0.5">{s.label}</div>
          </motion.button>
        ))}
      </motion.div>

      {/* Overall progress bar */}
      <motion.div variants={fadeUp} className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress Keseluruhan</span>
          <span className="text-sm font-bold text-success">{masterPct}% dikuasai</span>
        </div>
        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-success to-success/60 rounded-full"
            initial={{ width: 0 }} animate={{ width: `${masterPct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }} />
        </div>
        <p className="text-xs text-text-muted mt-2">{counts.total || 0} kata total dalam level yang dipilih</p>
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-text-muted/60">
          <span>⭐ Dikuasai = 2× benar berurutan</span>
          <span>🔄 Sedang Diulas = pernah benar</span>
          <span>📖 Belajar = baru mulai</span>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="space-y-3">
        {/* Search + Level filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/50" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Cari kata, hiragana, atau arti..."
              className="w-full pl-9 text-sm" />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                <X size={14} />
              </button>
            )}
          </div>
          <select value={levelId} onChange={e => { setLevelId(e.target.value); setPage(1); }}
            className="px-3 py-2 glass rounded-xl text-sm border border-white/10 bg-transparent text-text-primary">
            <option value="">Semua Level</option>
            {levels.map(l => <option key={l.id} value={l.id}>{l.code}</option>)}
          </select>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                status === tab.key
                  ? `${tab.bg} ${tab.border} ${tab.color}`
                  : 'glass border-white/10 text-text-muted hover:text-text-primary hover:border-white/20'
              }`}>
              {tab.label}
              {tab.key !== 'all' && counts[tab.key] != null && (
                <span className="ml-1.5 opacity-60">({counts[tab.key] || 0})</span>
              )}
              {tab.key === 'all' && <span className="ml-1.5 opacity-60">({counts.total || 0})</span>}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Word list */}
      <motion.div variants={fadeUp} className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[68px] glass rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : words.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-text-muted">Tidak ada kata ditemukan</p>
            {search && (
              <button onClick={() => setSearchInput('')} className="btn-secondary text-sm mt-4 px-5 py-2">
                Hapus filter pencarian
              </button>
            )}
          </div>
        ) : (
          words.map((word, i) => <WordCard key={word.id} word={word} index={i} />)
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-secondary p-2 disabled:opacity-30">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-text-muted">
            Hal {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="btn-secondary p-2 disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
