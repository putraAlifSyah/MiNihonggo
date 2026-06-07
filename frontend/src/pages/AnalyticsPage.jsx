import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  BookOpen,
  Trophy,
  Flame,
  Target,
  CheckCircle2,
  Clock,
  TrendingUp,
  Calendar,
  Award,
  BarChart3,
  Layers,
  Star,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import api from '../lib/api';

// ─── Animation Variants ──────────────────────────────────────────────────────

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.88 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] },
  },
};

// ─── Badge Definitions ────────────────────────────────────────────────────────

const ALL_BADGES = [
  {
    key: 'first_word',
    label: 'Langkah Pertama',
    description: 'Pelajari kata pertamamu',
    icon: '🌟',
    color: 'from-yellow-400/20 to-orange-400/20',
    border: 'border-yellow-400/30',
    glow: 'shadow-yellow-400/10',
  },
  {
    key: 'first_100',
    label: '100 Kata!',
    description: 'Capai 100 kata dipelajari',
    icon: '🎯',
    color: 'from-sakura/20 to-red-400/20',
    border: 'border-sakura/30',
    glow: 'shadow-sakura/10',
  },
  {
    key: 'first_500',
    label: '500 Kata!',
    description: 'Capai 500 kata dipelajari',
    icon: '💎',
    color: 'from-purple/20 to-blue-500/20',
    border: 'border-purple/30',
    glow: 'shadow-purple/10',
  },
  {
    key: 'streak_7',
    label: 'Streak 7 Hari',
    description: 'Belajar 7 hari berturut-turut',
    icon: '🔥',
    color: 'from-orange-500/20 to-red-500/20',
    border: 'border-orange-500/30',
    glow: 'shadow-orange-500/10',
  },
  {
    key: 'streak_30',
    label: 'Streak 30 Hari',
    description: 'Belajar 30 hari berturut-turut',
    icon: '🏅',
    color: 'from-amber-400/20 to-yellow-500/20',
    border: 'border-amber-400/30',
    glow: 'shadow-amber-400/10',
  },
  {
    key: 'n5_complete',
    label: 'N5 Tuntas',
    description: 'Selesaikan semua kosakata N5',
    icon: '🎌',
    color: 'from-red-500/20 to-sakura/20',
    border: 'border-red-400/30',
    glow: 'shadow-red-400/10',
  },
  {
    key: 'test_perfect',
    label: 'Nilai Sempurna',
    description: 'Raih 100% di sebuah test',
    icon: '⭐',
    color: 'from-yellow-300/20 to-green-400/20',
    border: 'border-yellow-300/30',
    glow: 'shadow-yellow-300/10',
  },
  {
    key: 'speed_demon',
    label: 'Speed Demon',
    description: 'Jawab 10 kata dalam 60 detik',
    icon: '⚡',
    color: 'from-cyan-400/20 to-blue-500/20',
    border: 'border-cyan-400/30',
    glow: 'shadow-cyan-400/10',
  },
];

// ─── Donut Chart Colors ───────────────────────────────────────────────────────

const DONUT_COLORS = {
  unseen: '#4a4a6a',
  learning: '#fdcb6e',
  reviewing: '#6c5ce7',
  mastered: '#00b894',
};

const DONUT_LABELS = {
  unseen: 'Belum Dilihat',
  learning: 'Belajar',
  reviewing: 'Review',
  mastered: 'Dikuasai',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, delay = 0 }) {
  return (
    <motion.div
      variants={scaleIn}
      custom={delay}
      className="card relative overflow-hidden group"
    >
      {/* Subtle glow blob */}
      <div
        className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none ${color}`}
      />
      <div className="relative z-10 flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${color} bg-opacity-20`}
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <Icon size={22} className="opacity-90" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-text-muted font-medium uppercase tracking-wide mb-1">
            {label}
          </p>
          <motion.p
            className="text-3xl font-extrabold text-text-primary leading-none"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.2, duration: 0.5 }}
          >
            {value}
          </motion.p>
          {sub && (
            <p className="text-xs text-text-muted mt-1.5">{sub}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CustomDonutTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    return (
      <div className="glass px-4 py-2.5 text-sm shadow-xl">
        <p className="text-text-muted text-xs mb-0.5">
          {DONUT_LABELS[name] || name}
        </p>
        <p className="text-text-primary font-bold text-base">{value} kata</p>
      </div>
    );
  }
  return null;
}

function DonutLegendItem({ color, label, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-3 h-3 rounded-full shrink-0"
        style={{ background: color }}
      />
      <span className="text-text-muted text-sm flex-1">{label}</span>
      <span className="text-text-primary text-sm font-semibold tabular-nums">
        {count}
      </span>
      <span className="text-text-muted text-xs w-10 text-right tabular-nums">
        {pct}%
      </span>
    </div>
  );
}

function ProgressBar({ value, max, label, className = '' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-2">
        {label && (
          <span className="text-xs text-text-muted">{label}</span>
        )}
        <span className="text-xs font-semibold text-text-primary ml-auto">
          {value} / {max}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
        />
      </div>
      <p className="text-right text-xs text-text-muted mt-1">{pct.toFixed(0)}%</p>
    </div>
  );
}

function BadgeCard({ badge, earnedAt }) {
  const isEarned = !!earnedAt;
  const earnedDate = earnedAt
    ? new Date(earnedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <motion.div
      variants={fadeUp}
      className={`
        relative rounded-2xl p-5 border transition-all duration-300 group
        bg-gradient-to-br ${badge.color} ${badge.border}
        ${isEarned
          ? `shadow-lg ${badge.glow} hover:shadow-xl`
          : 'opacity-40 grayscale'
        }
      `}
    >
      {isEarned && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 size={14} className="text-success" />
        </div>
      )}
      <div className="text-4xl mb-3">{badge.icon}</div>
      <h4 className="text-sm font-bold text-text-primary mb-1">
        {badge.label}
      </h4>
      <p className="text-xs text-text-muted leading-relaxed">
        {badge.description}
      </p>
      {isEarned && earnedDate && (
        <p className="text-xs text-success mt-2 font-medium">
          ✓ {earnedDate}
        </p>
      )}
      {!isEarned && (
        <p className="text-xs text-text-muted/50 mt-2">Belum terbuka</p>
      )}
    </motion.div>
  );
}

function StudyPlanCard({ plan, index }) {
  const pct =
    plan.total_words > 0
      ? Math.min((plan.words_learned / plan.total_words) * 100, 100)
      : 0;

  const today = new Date();
  const target = plan.target_date ? new Date(plan.target_date) : null;
  const daysLeft = target
    ? Math.max(0, Math.ceil((target - today) / (1000 * 60 * 60 * 24)))
    : null;
  const isOverdue = target && target < today && pct < 100;
  const isComplete = pct >= 100;

  const levelColors = {
    N5: 'from-green-400/20 to-emerald-500/20 border-green-400/30',
    N4: 'from-blue-400/20 to-cyan-500/20 border-blue-400/30',
    N3: 'from-yellow-400/20 to-amber-500/20 border-yellow-400/30',
    N2: 'from-orange-400/20 to-red-500/20 border-orange-400/30',
    N1: 'from-sakura/20 to-purple/20 border-sakura/30',
  };
  const levelColor =
    levelColors[plan.level_code] || 'from-purple/20 to-sakura/20 border-purple/30';

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      className={`card bg-gradient-to-br ${levelColor} mb-4 last:mb-0`}
    >
      <div className="flex flex-wrap items-start gap-3 mb-4">
        {/* Level Badge */}
        <span className="px-3 py-1 rounded-xl bg-white/10 text-text-primary font-extrabold text-sm jp-text">
          {plan.level_code}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 text-xs text-text-muted items-center">
            {plan.words_per_day && (
              <span className="flex items-center gap-1">
                <Target size={11} />
                {plan.words_per_day} kata/hari
              </span>
            )}
            {target && (
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                Target:{' '}
                {target.toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>

        {/* Status pill */}
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            isComplete
              ? 'bg-success/20 text-success border border-success/30'
              : isOverdue
              ? 'bg-danger/20 text-danger border border-danger/30'
              : 'bg-purple/20 text-purple border border-purple/30'
          }`}
        >
          {isComplete
            ? '✓ Selesai'
            : isOverdue
            ? '⚠ Terlambat'
            : 'Aktif'}
        </span>
      </div>

      {/* Progress bar */}
      <ProgressBar
        value={plan.words_learned || 0}
        max={plan.total_words || 0}
      />

      {/* Days remaining */}
      {daysLeft !== null && !isComplete && (
        <p
          className={`text-xs mt-2 flex items-center gap-1 ${
            isOverdue ? 'text-danger' : 'text-text-muted'
          }`}
        >
          <Clock size={11} />
          {isOverdue
            ? `Melebihi target oleh ${Math.abs(daysLeft)} hari`
            : daysLeft === 0
            ? 'Target hari ini!'
            : `${daysLeft} hari lagi`}
        </p>
      )}
    </motion.div>
  );
}

// ─── History Table ────────────────────────────────────────────────────────────

function PlanHistoryTable({ plans }) {
  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <Layers size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">Belum ada rencana belajar</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-text-muted text-xs uppercase tracking-wide">
            <th className="text-left pb-3 pr-4 font-medium">Level</th>
            <th className="text-left pb-3 pr-4 font-medium">Progress</th>
            <th className="text-left pb-3 pr-4 font-medium">Kata/Hari</th>
            <th className="text-left pb-3 pr-4 font-medium">Target</th>
            <th className="text-left pb-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {plans.map((plan, i) => {
            const pct =
              plan.total_words > 0
                ? Math.min(
                    Math.round((plan.words_learned / plan.total_words) * 100),
                    100
                  )
                : 0;
            const isActive = plan.is_active ?? plan.isActive ?? false;
            return (
              <tr
                key={plan.id || i}
                className="hover:bg-white/3 transition-colors"
              >
                <td className="py-3 pr-4">
                  <span className="font-bold gradient-text jp-text">
                    {plan.level_code}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full progress-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted tabular-nums">
                      {pct}%
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-text-muted">
                  {plan.words_per_day ?? '—'}
                </td>
                <td className="py-3 pr-4 text-text-muted">
                  {plan.target_date
                    ? new Date(plan.target_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </td>
                <td className="py-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      pct >= 100
                        ? 'bg-success/15 text-success'
                        : isActive
                        ? 'bg-purple/15 text-purple'
                        : 'bg-white/5 text-text-muted'
                    }`}
                  >
                    {pct >= 100 ? '✓ Selesai' : isActive ? '● Aktif' : 'Tidak Aktif'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Shimmer Skeleton ─────────────────────────────────────────────────────────

function SkeletonBlock({ className }) {
  return <div className={`shimmer rounded-2xl ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-9 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonBlock key={i} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonBlock className="h-72" />
        <SkeletonBlock className="h-72" />
      </div>
      <SkeletonBlock className="h-52" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [allPlans, setAllPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, plansRes] = await Promise.allSettled([
          api.get('/progress/stats'),
          api.get('/progress/study-plans'),
        ]);

        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value.data);
        } else {
          throw new Error('Gagal memuat statistik');
        }

        if (plansRes.status === 'fulfilled') {
          setAllPlans(plansRes.value.data?.plans || []);
        }
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setError('Gagal memuat data analitik. Coba lagi nanti.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <AlertCircle size={48} className="text-danger opacity-60" />
        <p className="text-text-muted">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-secondary text-sm px-6 py-2"
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const wordStatus = stats?.word_status || {};
  const unseen = wordStatus.unseen || 0;
  const learning = wordStatus.learning || 0;
  const reviewing = wordStatus.reviewing || 0;
  const mastered = wordStatus.mastered || 0;
  const totalWords = unseen + learning + reviewing + mastered;

  const totalReviewed = stats?.total_reviewed || 0;
  const currentStreak = stats?.streak?.current_streak || 0;
  const longestStreak = stats?.streak?.longest_streak || 0;
  const wordsStudiedToday = stats?.today_session?.words_studied || 0;
  const correctToday = stats?.today_session?.correct_count || 0;
  const accuracyToday =
    wordsStudiedToday > 0
      ? Math.round((correctToday / wordsStudiedToday) * 100)
      : 0;

  const activePlans = stats?.active_plans || [];
  const earnedBadges = stats?.badges || [];
  const earnedMap = Object.fromEntries(
    earnedBadges.map((b) => [b.key, b.earned_at])
  );

  const donutData = [
    { name: 'unseen', value: unseen },
    { name: 'learning', value: learning },
    { name: 'reviewing', value: reviewing },
    { name: 'mastered', value: mastered },
  ].filter((d) => d.value > 0);

  const earnedCount = ALL_BADGES.filter((b) => earnedMap[b.key]).length;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-3 mb-1">
          <BarChart3 size={28} className="text-sakura" />
          <h1 className="text-2xl sm:text-3xl font-extrabold gradient-text">
            Analitik Belajar
          </h1>
        </div>
        <p className="text-text-muted text-sm">
          Pantau perkembangan kosakata Jepang kamu secara mendetail 📊
        </p>
      </motion.div>

      {/* ── Section 1: Header Stats Row ─────────────────────────────────── */}
      <motion.div
        variants={stagger}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          icon={BookOpen}
          label="Total Dipelajari"
          value={totalReviewed.toLocaleString('id-ID')}
          sub="kata telah di-review"
          color="text-purple"
          delay={0}
        />
        <StatCard
          icon={Trophy}
          label="Kata Dikuasai"
          value={mastered.toLocaleString('id-ID')}
          sub={totalWords > 0 ? `${Math.round((mastered / totalWords) * 100)}% dari total` : 'belum ada kata'}
          color="text-success"
          delay={0.05}
        />
        <StatCard
          icon={Flame}
          label="Streak Saat Ini"
          value={`${currentStreak}🔥`}
          sub={`Terpanjang: ${longestStreak} hari`}
          color="text-orange-400"
          delay={0.1}
        />
        <StatCard
          icon={Target}
          label="Akurasi Hari Ini"
          value={`${accuracyToday}%`}
          sub={
            wordsStudiedToday > 0
              ? `${correctToday}/${wordsStudiedToday} benar`
              : 'Belum ada sesi hari ini'
          }
          color="text-sakura"
          delay={0.15}
        />
      </motion.div>

      {/* ── Section 2 & 3: Donut Chart + Active Plans ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Vocabulary Donut Chart */}
        <motion.div variants={fadeUp} className="card">
          <h2 className="text-base font-bold mb-1 flex items-center gap-2">
            <Layers size={18} className="text-purple" />
            Status Kosakata
          </h2>
          <p className="text-xs text-text-muted mb-5">
            {totalWords.toLocaleString('id-ID')} total kata dalam sistem
          </p>

          {totalWords === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-text-muted gap-3">
              <BookOpen size={36} className="opacity-25" />
              <p className="text-sm">Belum ada data kosakata</p>
            </div>
          ) : (
            <>
              {/* Donut */}
              <div className="h-52 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                      isAnimationActive
                      animationBegin={300}
                      animationDuration={1000}
                    >
                      {donutData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={DONUT_COLORS[entry.name]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomDonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-extrabold text-text-primary">
                    {mastered}
                  </span>
                  <span className="text-xs text-text-muted">dikuasai</span>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 space-y-2.5 px-1">
                {Object.entries(DONUT_COLORS).map(([key, color]) => (
                  <DonutLegendItem
                    key={key}
                    color={color}
                    label={DONUT_LABELS[key]}
                    count={wordStatus[key] || 0}
                    total={totalWords}
                  />
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Active Study Plans */}
        <motion.div variants={fadeUp} className="card">
          <h2 className="text-base font-bold mb-1 flex items-center gap-2">
            <TrendingUp size={18} className="text-sakura" />
            Rencana Belajar Aktif
          </h2>
          <p className="text-xs text-text-muted mb-5">
            {activePlans.length > 0
              ? `${activePlans.length} rencana sedang berjalan`
              : 'Tidak ada rencana aktif saat ini'}
          </p>

          {activePlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-text-muted gap-3">
              <Target size={36} className="opacity-25" />
              <p className="text-sm">Belum ada rencana belajar aktif</p>
              <p className="text-xs text-center max-w-48 leading-relaxed">
                Buat rencana belajar dari halaman Dashboard
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {activePlans.map((plan, i) => (
                <StudyPlanCard key={plan.id || i} plan={plan} index={i} />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Section 4: Badges ────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Award size={18} className="text-warning" />
              Lencana &amp; Pencapaian
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {earnedCount} / {ALL_BADGES.length} lencana diraih
            </p>
          </div>
          {/* Progress pill */}
          <div className="flex items-center gap-2">
            <div className="h-2 w-32 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full progress-fill"
                initial={{ width: 0 }}
                animate={{
                  width: `${(earnedCount / ALL_BADGES.length) * 100}%`,
                }}
                transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: 0.5 }}
              />
            </div>
            <span className="text-xs text-text-muted tabular-nums">
              {Math.round((earnedCount / ALL_BADGES.length) * 100)}%
            </span>
          </div>
        </div>

        <motion.div
          variants={stagger}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {ALL_BADGES.map((badge) => (
            <BadgeCard
              key={badge.key}
              badge={badge}
              earnedAt={earnedMap[badge.key] || null}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* ── Section 5: Study Plan History ───────────────────────────────── */}
      <motion.div variants={fadeUp} className="card">
        <div className="flex items-center gap-2 mb-5">
          <Star size={18} className="text-purple" />
          <div>
            <h2 className="text-base font-bold">Riwayat Rencana Belajar</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Semua rencana belajar (aktif &amp; selesai)
            </p>
          </div>
        </div>
        <PlanHistoryTable plans={allPlans} />
      </motion.div>

      {/* ── Footer micro-copy ────────────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="text-center pb-4 text-xs text-text-muted/50 flex items-center justify-center gap-2"
      >
        <span className="jp-text">頑張ってください</span>
        <span>— Terus semangat belajar! 🌸</span>
      </motion.div>
    </motion.div>
  );
}
