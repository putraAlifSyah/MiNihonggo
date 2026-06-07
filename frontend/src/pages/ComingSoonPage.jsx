import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Construction, ChevronLeft } from 'lucide-react';

export default function ComingSoonPage({ title, icon: Icon = Construction, description }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center justify-center min-h-[60vh]"
    >
      <div className="card text-center max-w-md mx-auto py-12 px-8">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple/20 to-sakura/20 mb-6"
        >
          <Icon size={36} className="text-purple" />
        </motion.div>

        <h2 className="text-2xl font-bold mb-2">{title || 'Segera Hadir'}</h2>
        <p className="text-text-muted mb-6">
          {description || 'Fitur ini sedang dalam pengembangan. Nantikan update selanjutnya! 🚀'}
        </p>

        <button
          onClick={() => navigate('/dashboard')}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <ChevronLeft size={18} />
          Kembali ke Dashboard
        </button>
      </div>
    </motion.div>
  );
}
