import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  BookOpen,
  Tag,
  Calendar,
  Rocket,
  Target,
  Sparkles,
} from 'lucide-react';
import api from '../lib/api';

const steps = [
  { id: 1, label: 'Pilih Level', icon: BookOpen },
  { id: 2, label: 'Kategori', icon: Tag },
  { id: 3, label: 'Target', icon: Calendar },
];

const fadeSlide = {
  initial: (dir) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -60 : 60, transition: { duration: 0.25 } }),
};

export default function StudyPlanSetupPage() {
  const { levelCode } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [levels, setLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(levelCode || '');
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [targetDate, setTargetDate] = useState('');
  const [totalWords, setTotalWords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch levels
  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const res = await api.get('/levels');
        const levelsArray = res.data.levels || [];
        setLevels(levelsArray);

        if (levelCode) {
          setSelectedLevel(levelCode);
        }
      } catch (err) {
        console.error('Failed to fetch levels:', err);
        setLevels([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLevels();
  }, [levelCode]);

  // Fetch categories when level is selected
  useEffect(() => {
    if (!selectedLevel) return;

    const fetchCategories = async () => {
      try {
        // Find the level ID from the selected level code
        const selectedLevelObj = levels.find(l => l.code === selectedLevel);
        const levelId = selectedLevelObj?.id;
        if (!levelId) return;

        const res = await api.get(`/categories?level_id=${levelId}`);
        const cats = res.data.categories || [];
        // Filter to only show categories that have words
        const catsWithWords = cats.filter(c => c.word_count > 0);
        setCategories(catsWithWords.length > 0 ? catsWithWords : cats);
        setSelectedCategories((catsWithWords.length > 0 ? catsWithWords : cats).map((c) => c.id));

        // Total words from the level
        setTotalWords(selectedLevelObj?.word_count || 0);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setCategories([]);
        setSelectedCategories([]);
        setTotalWords(0);
      }
    };
    fetchCategories();
  }, [selectedLevel, levels]);

  const selectedWordCount = categories
    .filter((c) => selectedCategories.includes(c.id || c.name))
    .reduce((sum, c) => sum + (c.wordCount || c.word_count || 0), 0);

  const daysUntilTarget = targetDate
    ? Math.max(1, Math.ceil((new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  const wordsPerDay = daysUntilTarget > 0 ? Math.ceil(selectedWordCount / daysUntilTarget) : 0;

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  };

  const toggleCategory = (catId) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const toggleAll = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map((c) => c.id || c.name));
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const selectedLevelObj = levels.find(l => l.code === selectedLevel);
      await api.post('/progress/study-plans', {
        level_id: selectedLevelObj?.id,
        target_date: targetDate,
        category_ids: selectedCategories,
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to create study plan:', err);
      navigate('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  // Set default target date (30 days from now)
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setTargetDate(d.toISOString().split('T')[0]);
  }, []);

  const canProceedStep1 = selectedLevel !== '';
  const canProceedStep2 = selectedCategories.length > 0;
  const canProceedStep3 = targetDate !== '' && daysUntilTarget > 0;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-8 w-48 shimmer rounded-xl" />
        <div className="h-20 shimmer rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 shimmer rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step Indicator */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-0 mb-10"
      >
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <motion.div
                animate={{
                  scale: step === s.id ? 1.1 : 1,
                  backgroundColor: step >= s.id
                    ? 'rgba(232, 67, 147, 0.2)'
                    : 'rgba(255, 255, 255, 0.05)',
                }}
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors duration-300
                  ${step >= s.id ? 'border-sakura text-sakura' : 'border-white/10 text-text-muted'}
                  ${step > s.id ? 'bg-sakura/20' : ''}
                `}
              >
                {step > s.id ? (
                  <Check size={20} />
                ) : (
                  <s.icon size={18} />
                )}
              </motion.div>
              <span className={`text-xs mt-2 font-medium ${step >= s.id ? 'text-sakura' : 'text-text-muted/60'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-16 sm:w-24 h-0.5 mx-2 mt-[-18px] rounded-full transition-colors duration-500 ${step > s.id ? 'bg-sakura' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </motion.div>

      {/* Step Content */}
      <AnimatePresence mode="wait" custom={direction}>
        {step === 1 && (
          <motion.div
            key="step1"
            custom={direction}
            variants={fadeSlide}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <h2 className="text-xl font-bold mb-2">Pilih Level JLPT</h2>
            <p className="text-text-muted text-sm mb-6">Pilih level yang ingin kamu pelajari</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {levels.filter(l => l.is_active).map((level) => {
                const code = level.code || level.level_code;
                const isSelected = selectedLevel === code;

                return (
                  <motion.button
                    key={code}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedLevel(code)}
                    className={`
                      card text-left relative overflow-hidden transition-all duration-300
                      ${isSelected
                        ? 'border-sakura/50 shadow-lg shadow-sakura/10 bg-sakura/5'
                        : 'hover:border-white/15'
                      }
                    `}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="level-selected"
                        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-sakura flex items-center justify-center"
                      >
                        <Check size={14} className="text-white" />
                      </motion.div>
                    )}
                    <span className="text-3xl font-extrabold gradient-text">{code}</span>
                    <p className="text-sm text-text-muted mt-1">{level.name}</p>
                    <p className="text-xs text-text-muted/70 mt-2 flex items-center gap-1">
                      <BookOpen size={12} />
                      {level.wordCount || level.word_count || 0} kata
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            custom={direction}
            variants={fadeSlide}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Pilih Kategori</h2>
                <p className="text-text-muted text-sm">Pilih jenis kata yang ingin dipelajari</p>
              </div>
              <button
                onClick={toggleAll}
                className="btn-secondary text-xs px-4 py-2"
              >
                {selectedCategories.length === categories.length ? 'Hapus Semua' : 'Pilih Semua'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => {
                const catId = cat.id || cat.name;
                const isSelected = selectedCategories.includes(catId);

                return (
                  <motion.button
                    key={catId}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleCategory(catId)}
                    className={`
                      card text-left flex items-center gap-3 py-4 transition-all duration-300
                      ${isSelected
                        ? 'border-purple/50 bg-purple/5'
                        : 'hover:border-white/15'
                      }
                    `}
                  >
                    <div className={`
                      w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all
                      ${isSelected
                        ? 'bg-purple text-white'
                        : 'bg-white/5 border border-white/10'
                      }
                    `}>
                      {isSelected && <Check size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cat.name}</p>
                      <p className="text-xs text-text-muted">{cat.wordCount || cat.word_count || 0} kata</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-4 text-sm text-text-muted text-center">
              <span className="text-sakura font-semibold">{selectedWordCount}</span> kata dipilih dari{' '}
              <span className="text-text-primary font-semibold">{selectedCategories.length}</span> kategori
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            custom={direction}
            variants={fadeSlide}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <h2 className="text-xl font-bold mb-1">Tentukan Target</h2>
            <p className="text-text-muted text-sm mb-6">Kapan kamu ingin menyelesaikan semua kata?</p>

            <div className="card mb-6">
              <label className="block text-sm text-text-muted mb-3 font-medium">
                <Calendar size={14} className="inline mr-2" />
                Tanggal Target
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                className="max-w-xs"
              />
            </div>

            {/* Calculation Display */}
            {daysUntilTarget > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card bg-gradient-to-br from-sakura/5 to-purple/5 border-sakura/20"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Target size={18} className="text-sakura" />
                  <h3 className="font-semibold">Perhitungan</h3>
                </div>

                <div className="flex items-center justify-center gap-3 text-center py-4">
                  <div className="glass-subtle px-4 py-3 rounded-xl">
                    <p className="text-2xl font-bold text-sakura">{selectedWordCount}</p>
                    <p className="text-xs text-text-muted">kata</p>
                  </div>
                  <span className="text-text-muted text-lg">÷</span>
                  <div className="glass-subtle px-4 py-3 rounded-xl">
                    <p className="text-2xl font-bold text-purple">{daysUntilTarget}</p>
                    <p className="text-xs text-text-muted">hari</p>
                  </div>
                  <span className="text-text-muted text-lg">=</span>
                  <div className="glass-subtle px-4 py-3 rounded-xl border border-sakura/20">
                    <p className="text-2xl font-bold gradient-text">{wordsPerDay}</p>
                    <p className="text-xs text-text-muted">kata/hari</p>
                  </div>
                </div>

                <p className="text-center text-sm text-text-muted mt-2">
                  Kamu perlu belajar <span className="text-sakura font-semibold">{wordsPerDay} kata</span> setiap hari
                </p>
              </motion.div>
            )}

            {/* Summary Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="card mt-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-sakura" />
                <h3 className="font-semibold">Ringkasan Rencana</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Level</span>
                  <span className="font-medium text-sakura">{selectedLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Kategori</span>
                  <span className="font-medium">{selectedCategories.length} kategori</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Total kata</span>
                  <span className="font-medium">{selectedWordCount} kata</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Target selesai</span>
                  <span className="font-medium">{targetDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Kata per hari</span>
                  <span className="font-semibold gradient-text">{wordsPerDay}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-between mt-8 pt-6 border-t border-white/5"
      >
        <button
          onClick={step === 1 ? () => navigate('/dashboard') : goBack}
          className="btn-secondary flex items-center gap-2"
        >
          <ChevronLeft size={18} />
          {step === 1 ? 'Kembali' : 'Sebelumnya'}
        </button>

        {step < 3 ? (
          <button
            onClick={goNext}
            disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
            className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            Selanjutnya
            <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canProceedStep3 || submitting}
            className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Mulai Belajar!
                <Rocket size={18} />
              </>
            )}
          </button>
        )}
      </motion.div>
    </div>
  );
}
