import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Layers,
  ClipboardCheck,
  Flame,
  TrendingUp,
  BookOpen,
  Star,
  ChevronRight,
  Target,
  Zap,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../lib/auth';
import api from '../lib/api';

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
};

// Circular Progress Ring
function ProgressRing({ progress, size = 160, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progress-gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
        />
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e84393" />
            <stop offset="100%" stopColor="#6c5ce7" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold text-text-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {Math.round(progress)}%
        </motion.span>
        <span className="text-xs text-text-muted mt-1">Hari Ini</span>
      </div>
    </div>
  );
}

// Custom tooltip for chart
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="glass px-3 py-2 text-sm">
        <p className="text-text-muted">{label}</p>
        <p className="text-sakura font-semibold">{payload[0].value} kata</p>
      </div>
    );
  }
  return null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [levels, setLevels] = useState([]);
  const [todayStats, setTodayStats] = useState({ studied: 0, target: 10 });
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [levelsRes, statsRes] = await Promise.allSettled([
          api.get('/levels'),
          api.get('/progress/stats'),
        ]);

        if (levelsRes.status === 'fulfilled') {
          const levelsData = levelsRes.value.data.levels || [];
          setLevels(levelsData);
        }

        if (statsRes.status === 'fulfilled') {
          const data = statsRes.value.data;
          setTodayStats({
            studied: data.today_session?.words_studied || 0,
            target: data.active_plans?.[0]?.words_per_day || 10,
          });
          setStreak({
            current: data.streak?.current_streak || 0,
            longest: data.streak?.longest_streak || 0,
          });
          setWeeklyData(data.weekly_data || generateMockWeekly());
        } else {
          setWeeklyData(generateMockWeekly());
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setWeeklyData(generateMockWeekly());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  function generateMockWeekly() {
    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    return days.map((day) => ({ day, words: 0 }));
  }

  const todayProgress = todayStats.target > 0
    ? Math.min((todayStats.studied / todayStats.target) * 100, 100)
    : 0;

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'おはよう' : hour < 18 ? 'こんにちは' : 'こんばんは';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 shimmer rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 shimmer rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 shimmer rounded-2xl" />
          <div className="h-64 shimmer rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl sm:text-3xl font-bold">
          <span className="jp-text">{greeting}</span>、{user?.name || 'User'}! <span className="inline-block animate-bounce">🌸</span>
        </h1>
        <p className="text-text-muted mt-1">Ayo lanjutkan belajar bahasa Jepang hari ini!</p>
      </motion.div>

      {/* Level Cards */}
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <BookOpen size={20} className="text-purple" />
          Level JLPT
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
          {(levels.length > 0 ? levels : []).map((level, i) => (
            <motion.div
              key={level.code || level.level_code || i}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/setup/${level.code || level.level_code}`)}
              className={`
                snap-start shrink-0 w-40 cursor-pointer card relative overflow-hidden group
                ${(level.isActive || level.is_active)
                  ? 'border-sakura/30 shadow-lg shadow-sakura/5'
                  : 'opacity-60'
                }
              `}
            >
              {(level.isActive || level.is_active) && (
                <div className="absolute inset-0 bg-gradient-to-br from-sakura/5 to-transparent pointer-events-none" />
              )}
              <div className="relative z-10">
                <span className="text-2xl font-bold gradient-text">{level.code || level.level_code}</span>
                <p className="text-xs text-text-muted mt-1">{level.wordCount || level.word_count || 0} kata</p>
                {(level.isActive || level.is_active) && (
                  <div className="flex items-center gap-1 mt-2">
                    <Zap size={12} className="text-sakura" />
                    <span className="text-[10px] text-sakura font-medium">Aktif</span>
                  </div>
                )}
              </div>
              <ChevronRight
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted/40 group-hover:text-text-muted transition-colors"
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Progress */}
        <motion.div variants={fadeUp} className="card flex flex-col items-center justify-center py-8">
          <h3 className="text-sm font-medium text-text-muted mb-4 flex items-center gap-2">
            <Target size={16} className="text-sakura" />
            Progress Hari Ini
          </h3>
          <ProgressRing progress={todayProgress} />
          <p className="mt-4 text-sm text-text-muted">
            <span className="text-text-primary font-semibold">{todayStats.studied}</span> / {todayStats.target} kata
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp} className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/flashcard')}
            className="w-full p-6 rounded-2xl bg-gradient-to-r from-sakura/20 to-purple/20 border border-sakura/20 hover:border-sakura/40 transition-all group text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sakura to-purple flex items-center justify-center shadow-lg shadow-sakura/20 group-hover:shadow-sakura/40 transition-shadow">
                <Layers size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  📚 Flashcard
                  <ChevronRight size={18} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-sm text-text-muted mt-0.5">Latihan kartu kosakata</p>
              </div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/test')}
            className="w-full p-6 rounded-2xl bg-gradient-to-r from-purple/20 to-sakura/20 border border-purple/20 hover:border-purple/40 transition-all group text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple to-sakura flex items-center justify-center shadow-lg shadow-purple/20 group-hover:shadow-purple/40 transition-shadow">
                <ClipboardCheck size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  📝 Test Hari Ini
                  <ChevronRight size={18} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-sm text-text-muted mt-0.5">Uji pemahaman kamu</p>
              </div>
            </div>
          </motion.button>
        </motion.div>

        {/* Streak Card */}
        <motion.div
          variants={fadeUp}
          className="card bg-gradient-to-br from-orange-500/10 to-red-jp/10 border-orange-500/20 flex flex-col items-center justify-center py-8"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="text-5xl mb-2"
          >
            🔥
          </motion.div>
          <motion.span
            className="text-5xl font-extrabold text-orange-400"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
          >
            {streak.current}
          </motion.span>
          <p className="text-sm text-text-muted mt-1">hari berturut-turut</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-text-muted/70">
            <Star size={12} className="text-warning" />
            <span>Terpanjang: {streak.longest} hari</span>
          </div>
        </motion.div>
      </div>

      {/* Weekly Summary Chart */}
      <motion.div variants={fadeUp} className="card">
        <h3 className="text-sm font-medium text-text-muted mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-purple" />
          Ringkasan Minggu Ini
        </h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} barCategoryGap="25%">
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8888a0', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8888a0', fontSize: 12 }}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="words" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {weeklyData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={index === weeklyData.length - 1 ? '#e84393' : 'rgba(232, 67, 147, 0.3)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
}
