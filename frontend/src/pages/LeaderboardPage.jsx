import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Flame,
  BookOpen,
  Star,
  Zap,
  Users,
  RefreshCw,
  ChevronUp,
  Award,
  Target,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import api from '../lib/api';

// ─── Animation Variants ────────────────────────────────────────────────────
const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
};

const podiumAnim = (delay = 0) => ({
  hidden: { opacity: 0, y: 40, scale: 0.9 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1], delay },
  },
});

// ─── Helpers ───────────────────────────────────────────────────────────────
function getInitial(name = '') {
  return name.trim().charAt(0).toUpperCase() || '?';
}

const AVATAR_COLORS = [
  'from-sakura to-purple',
  'from-purple to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-orange-400 to-amber-500',
  'from-pink-400 to-rose-500',
  'from-indigo-400 to-violet-500',
];

function getAvatarColor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-yellow-400 font-black text-lg">🥇</span>;
  if (rank === 2) return <span className="text-slate-300 font-black text-lg">🥈</span>;
  if (rank === 3) return <span className="text-amber-600 font-black text-lg">🥉</span>;
  return (
    <span className="text-text-muted font-semibold text-sm w-6 text-center tabular-nums">
      {rank}
    </span>
  );
}

// ─── Podium Slot ────────────────────────────────────────────────────────────
function PodiumSlot({ user, rank, colorClass, heightClass, delay, isCurrentUser }) {
  const podiumLabel = rank === 1 ? '#1' : rank === 2 ? '#2' : '#3';

  const glowMap = {
    1: 'shadow-yellow-400/30',
    2: 'shadow-slate-400/20',
    3: 'shadow-amber-600/20',
  };

  const borderMap = {
    1: 'border-yellow-400/50',
    2: 'border-slate-400/30',
    3: 'border-amber-600/30',
  };

  const gradientMap = {
    1: 'from-yellow-400/20 via-amber-300/10 to-transparent',
    2: 'from-slate-400/15 via-slate-300/8 to-transparent',
    3: 'from-amber-700/15 via-amber-600/8 to-transparent',
  };

  return (
    <motion.div
      variants={podiumAnim(delay)}
      className="flex flex-col items-center gap-2"
    >
      {/* Crown for #1 */}
      {rank === 1 && (
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-3xl"
        >
          👑
        </motion.div>
      )}

      {/* Avatar */}
      <div className="relative">
        <motion.div
          whileHover={{ scale: 1.08 }}
          className={`
            w-16 h-16 rounded-full bg-gradient-to-br ${getAvatarColor(rank - 1)}
            flex items-center justify-center text-white font-bold text-xl
            shadow-lg ${glowMap[rank]}
            border-2 ${borderMap[rank]}
            ${isCurrentUser ? 'ring-2 ring-sakura ring-offset-2 ring-offset-transparent' : ''}
          `}
        >
          {user ? getInitial(user.name) : '?'}
        </motion.div>
        {isCurrentUser && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-sakura flex items-center justify-center shadow-md">
            <Star size={10} className="text-white fill-white" />
          </div>
        )}
      </div>

      {/* Name */}
      <div className="text-center max-w-[80px]">
        <p className="text-text-primary font-semibold text-sm leading-tight truncate">
          {user?.name || '—'}
        </p>
        <p className="text-text-muted text-xs mt-0.5">
          {user?.words_learned ?? 0} kata
        </p>
      </div>

      {/* Podium Block */}
      <div
        className={`
          w-20 ${heightClass} rounded-t-2xl relative overflow-hidden
          bg-gradient-to-t ${gradientMap[rank]}
          border-t border-x ${borderMap[rank]}
          flex items-center justify-center
        `}
      >
        <span className="text-lg font-black text-text-muted/50">{podiumLabel}</span>
      </div>
    </motion.div>
  );
}

// ─── Ranking Row ────────────────────────────────────────────────────────────
function RankingRow({ user, rank, isCurrentUser, colorIndex, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`
        flex items-center gap-3 p-3 rounded-2xl transition-all
        ${isCurrentUser
          ? 'bg-gradient-to-r from-sakura/10 to-purple/10 border border-sakura/30 shadow-md shadow-sakura/10'
          : 'glass-subtle hover:bg-white/5'
        }
      `}
    >
      {/* Rank */}
      <div className="w-8 flex justify-center shrink-0">
        <RankBadge rank={rank} />
      </div>

      {/* Avatar */}
      <div
        className={`
          w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(colorIndex)}
          flex items-center justify-center text-white font-bold text-sm shrink-0
          ${isCurrentUser ? 'ring-2 ring-sakura ring-offset-1 ring-offset-transparent' : ''}
        `}
      >
        {getInitial(user.name)}
      </div>

      {/* Name + subtitle */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`font-semibold text-sm truncate ${isCurrentUser ? 'text-sakura' : 'text-text-primary'}`}>
            {user.name}
          </p>
          {isCurrentUser && (
            <span className="text-[10px] bg-sakura/20 text-sakura px-1.5 py-0.5 rounded-full font-medium shrink-0">
              Kamu
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted">
          🔥 {user.current_streak} hari streak
        </p>
      </div>

      {/* Stats */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className="text-text-primary font-bold text-sm tabular-nums">
          {user.words_learned}
        </span>
        <span className="text-text-muted text-xs">kata</span>
      </div>

      <div className="flex flex-col items-end gap-0.5 shrink-0 w-14">
        <span className={`font-semibold text-sm tabular-nums ${user.studied_today > 0 ? 'text-success' : 'text-text-muted'}`}>
          +{user.studied_today}
        </span>
        <span className="text-text-muted text-xs">hari ini</span>
      </div>
    </motion.div>
  );
}

// ─── My Stats Card ──────────────────────────────────────────────────────────
function MyStatsCard({ stats, userName }) {
  const wordStatus = stats?.word_status || {};
  const streak = stats?.streak || {};
  const todaySession = stats?.today_session || {};
  const badges = stats?.badges || [];

  const totalLearned = (wordStatus.learning || 0) + (wordStatus.reviewing || 0) + (wordStatus.mastered || 0);
  const mastered = wordStatus.mastered || 0;

  const statItems = [
    {
      icon: <BookOpen size={18} className="text-purple" />,
      label: 'Dipelajari',
      value: totalLearned,
      suffix: 'kata',
      color: 'text-purple',
    },
    {
      icon: <Star size={18} className="text-yellow-400" />,
      label: 'Dikuasai',
      value: mastered,
      suffix: 'kata',
      color: 'text-yellow-400',
    },
    {
      icon: <Flame size={18} className="text-orange-400" />,
      label: 'Streak Saat Ini',
      value: streak.current_streak || 0,
      suffix: 'hari',
      color: 'text-orange-400',
    },
    {
      icon: <Trophy size={18} className="text-yellow-500" />,
      label: 'Streak Terpanjang',
      value: streak.longest_streak || 0,
      suffix: 'hari',
      color: 'text-yellow-500',
    },
    {
      icon: <Target size={18} className="text-sakura" />,
      label: 'Dipelajari Hari Ini',
      value: todaySession.words_studied || 0,
      suffix: 'kata',
      color: 'text-sakura',
    },
    {
      icon: <Zap size={18} className="text-success" />,
      label: 'Akurasi Hari Ini',
      value: todaySession.words_studied > 0
        ? Math.round((todaySession.correct_count / todaySession.words_studied) * 100)
        : 0,
      suffix: '%',
      color: 'text-success',
    },
  ];

  return (
    <motion.div variants={fadeUp} className="card border-sakura/20 bg-gradient-to-br from-sakura/5 to-purple/5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sakura to-purple flex items-center justify-center shadow-lg shadow-sakura/20">
          <Award size={20} className="text-white" />
        </div>
        <div>
          <h3 className="font-bold text-text-primary">Statistik Saya</h3>
          <p className="text-xs text-text-muted">{userName || 'Pengguna'}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {statItems.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * i, duration: 0.4 }}
            className="glass-subtle rounded-xl p-3 flex flex-col gap-1"
          >
            <div className="flex items-center gap-1.5">
              {item.icon}
              <span className="text-xs text-text-muted">{item.label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black ${item.color} tabular-nums`}>
                {item.value}
              </span>
              <span className="text-xs text-text-muted">{item.suffix}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div>
          <p className="text-xs text-text-muted mb-2 flex items-center gap-1.5">
            <Trophy size={12} className="text-warning" />
            Badge Diperoleh ({badges.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge, i) => (
              <motion.span
                key={badge.id || i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * i, type: 'spring', stiffness: 200 }}
                title={badge.description || badge.name}
                className="px-2.5 py-1 rounded-full text-xs font-medium glass border-warning/20 text-warning flex items-center gap-1"
              >
                <span>{badge.icon || '🏅'}</span>
                <span>{badge.name}</span>
              </motion.span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-56 shimmer rounded-xl" />
      <div className="flex items-end justify-center gap-6 h-56">
        <div className="w-20 h-44 shimmer rounded-t-2xl" />
        <div className="w-20 h-56 shimmer rounded-t-2xl" />
        <div className="w-20 h-36 shimmer rounded-t-2xl" />
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 shimmer rounded-2xl" />
        ))}
      </div>
      <div className="h-48 shimmer rounded-2xl" />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const [lbRes, statsRes] = await Promise.allSettled([
        api.get('/progress/leaderboard'),
        api.get('/progress/stats'),
      ]);

      if (lbRes.status === 'fulfilled') {
        setLeaderboard(lbRes.value.data.users || []);
        setError(null);
      } else {
        setError('Gagal memuat leaderboard.');
      }

      if (statsRes.status === 'fulfilled') {
        setMyStats(statsRes.value.data);
      }
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError('Terjadi kesalahan saat memuat data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingSkeleton />;

  // Determine podium users (top 3)
  const podiumOrder = [
    leaderboard[1] ?? null, // #2 — left
    leaderboard[0] ?? null, // #1 — center
    leaderboard[2] ?? null, // #3 — right
  ];
  const podiumRanks = [2, 1, 3];
  const podiumHeights = ['h-24', 'h-36', 'h-16'];
  const podiumDelays = [0.2, 0.1, 0.3];

  const isCurrentUser = (u) => u && user && (u.id === user.id || u.name === user.name);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 pb-10">

      {/* ── Header ── */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Trophy size={28} className="text-yellow-400" />
            <span className="gradient-text">Leaderboard</span>
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Siapa yang paling rajin belajar? 🌸
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2 !py-2 !px-4 !text-sm"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </motion.button>
      </motion.div>

      {/* ── Family Note Banner ── */}
      <motion.div
        variants={fadeUp}
        className="glass-subtle rounded-2xl px-4 py-3 flex items-start gap-3 border border-purple/20"
      >
        <Users size={18} className="text-purple shrink-0 mt-0.5" />
        <p className="text-sm text-text-muted leading-relaxed">
          <span className="text-purple font-semibold">Leaderboard Keluarga</span> — Peringkat diperbarui secara otomatis saat anggota keluarga bergabung dan mulai belajar. Ajak mereka sekarang! 🎌
        </p>
      </motion.div>

      {/* ── Error Banner ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass rounded-xl px-4 py-3 border border-danger/30 text-danger text-sm"
          >
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {leaderboard.length === 0 && !error ? (
        /* ── Empty State ── */
        <motion.div variants={fadeUp} className="card flex flex-col items-center justify-center py-16 gap-4">
          <div className="text-6xl">🏆</div>
          <h3 className="text-xl font-bold text-text-primary">Jadilah yang Pertama!</h3>
          <p className="text-text-muted text-sm text-center max-w-xs">
            Belum ada data peringkat. Mulailah belajar dan jadilah yang pertama di leaderboard!
          </p>
        </motion.div>
      ) : (
        <>
          {/* ── Podium ── */}
          {leaderboard.length >= 1 && (
            <motion.div variants={fadeUp} className="card overflow-hidden relative">
              {/* Ambient glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-yellow-400/5 blur-3xl pointer-events-none rounded-full" />
              <div className="absolute top-0 left-1/4 w-32 h-24 bg-slate-400/5 blur-3xl pointer-events-none rounded-full" />
              <div className="absolute top-0 right-1/4 w-32 h-24 bg-amber-700/5 blur-3xl pointer-events-none rounded-full" />

              <h2 className="text-sm font-semibold text-text-muted text-center mb-6 flex items-center justify-center gap-2">
                <Trophy size={14} className="text-yellow-400" />
                Top 3 Peringkat
              </h2>

              <div className="flex items-end justify-center gap-4 sm:gap-8 relative">
                {podiumOrder.map((u, i) => (
                  <PodiumSlot
                    key={podiumRanks[i]}
                    user={u}
                    rank={podiumRanks[i]}
                    heightClass={podiumHeights[i]}
                    delay={podiumDelays[i]}
                    isCurrentUser={isCurrentUser(u)}
                  />
                ))}
              </div>

              {/* Podium base line */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-0" />
            </motion.div>
          )}

          {/* ── Full Rankings ── */}
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <ChevronUp size={18} className="text-sakura" />
                Semua Peringkat
              </h2>
              <span className="text-xs text-text-muted">
                {leaderboard.length} pengguna
              </span>
            </div>

            {/* Table header */}
            <div className="flex items-center gap-3 px-3 mb-2">
              <div className="w-8" />
              <div className="w-10 shrink-0" />
              <div className="flex-1 text-xs text-text-muted font-medium">Nama</div>
              <div className="shrink-0 text-xs text-text-muted font-medium text-right">Kata</div>
              <div className="w-14 shrink-0 text-xs text-text-muted font-medium text-right">Hari ini</div>
            </div>

            <div className="space-y-2">
              {leaderboard.map((u, i) => (
                <RankingRow
                  key={u.id || i}
                  user={u}
                  rank={i + 1}
                  isCurrentUser={isCurrentUser(u)}
                  colorIndex={i}
                  delay={i * 0.05}
                />
              ))}
            </div>
          </motion.div>
        </>
      )}

      {/* ── My Stats Card ── */}
      {myStats && (
        <MyStatsCard stats={myStats} userName={user?.name} />
      )}

      {/* ── Footer note ── */}
      <motion.p
        variants={fadeUp}
        className="text-center text-xs text-text-muted/50"
      >
        Peringkat berdasarkan total kata yang dipelajari · Diperbarui real-time 🌸
      </motion.p>
    </motion.div>
  );
}
