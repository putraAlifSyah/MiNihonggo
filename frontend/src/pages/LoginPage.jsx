import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/auth';

// Floating sakura petal component
function SakuraPetal({ index }) {
  const size = 8 + Math.random() * 12;
  const left = Math.random() * 100;
  const delay = Math.random() * 8;
  const duration = 10 + Math.random() * 10;
  const sway = 30 + Math.random() * 60;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: `${left}%`, top: '-20px' }}
      animate={{
        y: ['0vh', '105vh'],
        x: [0, sway, -sway / 2, sway / 3, 0],
        rotate: [0, 360, 180, 540, 720],
        opacity: [0, 1, 1, 1, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size * 0.6,
          background: `linear-gradient(135deg, rgba(232, 67, 147, ${0.3 + Math.random() * 0.4}), rgba(108, 92, 231, ${0.2 + Math.random() * 0.3}))`,
          filter: 'blur(0.5px)',
        }}
      />
    </motion.div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Login gagal. Periksa email dan password Anda.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="orb w-[500px] h-[500px] bg-sakura/20" style={{ top: '-10%', right: '-10%' }} />
        <div className="orb w-[400px] h-[400px] bg-purple/20" style={{ bottom: '-10%', left: '-10%', animationDelay: '-5s' }} />
        <div className="orb w-[300px] h-[300px] bg-red-jp/15" style={{ top: '40%', left: '50%', animationDelay: '-10s' }} />
      </div>

      {/* Sakura petals */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
          <SakuraPetal key={i} index={i} />
        ))}
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-strong p-8 sm:p-10">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sakura to-purple mb-4 shadow-lg shadow-sakura/20">
              <span className="jp-text text-white text-2xl font-bold">語</span>
            </div>
            <h1 className="jp-text text-3xl font-bold gradient-text mb-1">日本語</h1>
            <p className="text-text-muted text-sm flex items-center justify-center gap-1.5">
              <Sparkles size={14} className="text-sakura" />
              Nihongo Vocab
              <Sparkles size={14} className="text-sakura" />
            </p>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: [0, -5, 5, -3, 3, 0] }}
              transition={{ duration: 0.4 }}
              className="mb-6 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-sm text-text-muted mb-2 font-medium">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/60" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-11"
                  required
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-sm text-text-muted mb-2 font-medium">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/60" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-11 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/5 text-text-muted/60 hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Masuk
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </motion.div>
          </form>

          {/* Register Link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-6 text-sm text-text-muted"
          >
            Belum punya akun?{' '}
            <Link to="/register" className="text-sakura hover:text-sakura/80 font-medium transition-colors">
              Daftar Sekarang
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
