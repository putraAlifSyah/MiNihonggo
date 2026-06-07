import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  BookOpen,
  Layers,
  TrendingUp,
  Upload,
  UserCog,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import api from '../../lib/api';

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
};

function StatCard({ icon: Icon, label, value, trend, color, gradient }) {
  return (
    <motion.div variants={fadeUp} className="card relative overflow-hidden group">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center`}>
            <Icon size={20} className="text-white" />
          </div>
          {trend && (
            <span className="flex items-center gap-1 text-xs text-success font-medium">
              <ArrowUpRight size={14} />
              {trend}
            </span>
          )}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-text-muted mt-0.5">{label}</p>
      </div>
    </motion.div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWords: 0,
    activeLevels: 0,
    todayStudied: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');
        const data = res.data.data || res.data || {};
        setStats({
          totalUsers: data.totalUsers || data.total_users || 0,
          totalWords: data.totalWords || data.total_words || 0,
          activeLevels: data.activeLevels || data.active_levels || 0,
          todayStudied: data.todayStudied || data.today_studied || 0,
        });
        setRecentActivity(data.recentActivity || data.recent_activity || []);
      } catch (err) {
        console.error('Failed to fetch admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 shimmer rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-text-muted mt-1">Kelola konten dan pantau aktivitas pengguna</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Pengguna"
          value={stats.totalUsers.toLocaleString()}
          trend="+12%"
          color="bg-gradient-to-br from-sakura to-red-jp"
          gradient="from-sakura/5 to-transparent"
        />
        <StatCard
          icon={BookOpen}
          label="Total Kata"
          value={stats.totalWords.toLocaleString()}
          color="bg-gradient-to-br from-purple to-sakura"
          gradient="from-purple/5 to-transparent"
        />
        <StatCard
          icon={Layers}
          label="Level Aktif"
          value={stats.activeLevels}
          color="bg-gradient-to-br from-success to-teal-500"
          gradient="from-success/5 to-transparent"
        />
        <StatCard
          icon={TrendingUp}
          label="Dipelajari Hari Ini"
          value={stats.todayStudied.toLocaleString()}
          trend="+8%"
          color="bg-gradient-to-br from-warning to-orange-500"
          gradient="from-warning/5 to-transparent"
        />
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <motion.div variants={fadeUp} className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity size={18} className="text-sakura" />
            Quick Actions
          </h2>
          <div className="space-y-3">
            <motion.a
              href="/admin/content"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/3 hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple to-sakura flex items-center justify-center">
                <Upload size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium">Upload Excel</p>
                <p className="text-xs text-text-muted">Upload file kosakata baru</p>
              </div>
              <ArrowUpRight size={16} className="ml-auto text-text-muted" />
            </motion.a>

            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/3 hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sakura to-red-jp flex items-center justify-center">
                <UserCog size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium">Manage Users</p>
                <p className="text-xs text-text-muted">Kelola pengguna dan peran</p>
              </div>
              <ArrowUpRight size={16} className="ml-auto text-text-muted" />
            </motion.div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={fadeUp} className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity size={18} className="text-purple" />
            Aktivitas Terakhir
          </h2>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5"
                >
                  <div className="w-8 h-8 rounded-full bg-sakura/10 flex items-center justify-center text-sakura text-sm font-bold">
                    {activity.user?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{activity.message || activity.action}</p>
                    <p className="text-xs text-text-muted">{activity.time || activity.created_at}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity size={36} className="mx-auto text-text-muted/30 mb-3" />
              <p className="text-sm text-text-muted">Belum ada aktivitas terbaru</p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
