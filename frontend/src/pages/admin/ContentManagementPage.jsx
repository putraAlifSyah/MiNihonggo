import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileSpreadsheet,
  Search,
  Trash2,
  Edit3,
  Plus,
  X,
  Check,
  AlertTriangle,
  Download,
  Save,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import api from '../../lib/api';
import { BookOpen } from 'lucide-react';

const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
};

export default function ContentManagementPage() {
  const [levelsList, setLevelsList] = useState([]);
  const [activeLevel, setActiveLevel] = useState(null); // level object
  const [words, setWords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Add/Edit form state
  const [formData, setFormData] = useState({
    japanese: '',
    hiragana: '',
    romaji: '',
    meaning: '',
    word_type: 'noun',
    example_sentence_jp: '',
    example_sentence_id: '',
  });

  // Fetch levels on mount
  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const res = await api.get('/levels');
        const levels = res.data.levels || [];
        setLevelsList(levels);
        if (levels.length > 0) setActiveLevel(levels[0]);
      } catch (err) {
        console.error('Failed to fetch levels:', err);
      }
    };
    fetchLevels();
  }, []);

  // Fetch words for selected level
  useEffect(() => {
    if (!activeLevel) return;
    const fetchWords = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/words?level_id=${activeLevel.id}&limit=200`);
        const data = res.data.words || [];
        setWords(data);
      } catch (err) {
        console.error('Failed to fetch words:', err);
        setWords([]);
      } finally {
        setLoading(false);
      }
    };
    fetchWords();
  }, [activeLevel]);

  // File upload handler
  const handleFileUpload = async (file) => {
    if (!file || !activeLevel) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('level_id', activeLevel.id);

    setUploading(true);
    setUploadProgress(0);

    try {
      const res = await api.post('/admin/upload-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / e.total);
          setUploadProgress(pct);
        },
      });

      const data = res.data || {};
      // After upload, refresh word list
      setPreviewData({
        inserted: data.inserted || 0,
        skipped: data.skipped || 0,
        total: data.total || 0,
        message: data.message || 'Upload selesai',
      });
      // Refresh words
      const wordsRes = await api.get(`/words?level_id=${activeLevel.id}&limit=200`);
      setWords(wordsRes.data.words || []);
      // Refresh levels
      const levelsRes = await api.get('/levels');
      const newLevels = levelsRes.data.levels || [];
      setLevelsList(newLevels);
      const updated = newLevels.find(l => l.id === activeLevel.id);
      if (updated) setActiveLevel(updated);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload gagal: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleSavePreview = async () => {
    setSaving(true);
    try {
      await api.post('/admin/words/batch', {
        level: activeLevel,
        words: previewData.rows,
      });
      setPreviewData(null);
      // Refresh words
      const res = await api.get(`/words?level=${activeLevel}`);
      const data = res.data.data || res.data.words || res.data || [];
      setWords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Gagal menyimpan: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWord = async (wordId) => {
    if (!confirm('Hapus kata ini?')) return;
    try {
      await api.delete(`/admin/words/${wordId}`);
      setWords((prev) => prev.filter((w) => w.id !== wordId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const openEditModal = (word) => {
    setEditingWord(word);
    setFormData({
      japanese: word.japanese || '',
      hiragana: word.hiragana || '',
      romaji: word.romaji || '',
      meaning: word.meaning || '',
      word_type: word.word_type || 'noun',
      example_sentence_jp: word.example_sentence_jp || '',
      example_sentence_id: word.example_sentence_id || '',
    });
    setShowAddModal(true);
  };

  const openAddModal = () => {
    setEditingWord(null);
    setFormData({
      japanese: '',
      hiragana: '',
      romaji: '',
      meaning: '',
      word_type: 'noun',
      example_sentence_jp: '',
      example_sentence_id: '',
    });
    setShowAddModal(true);
  };

  const handleSaveWord = async () => {
    if (!activeLevel) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        category_id: null, // will be resolved by backend
        level_id: activeLevel.id,
      };
      if (editingWord) {
        await api.put(`/admin/words/${editingWord.id}`, payload);
      } else {
        await api.post('/admin/words', payload);
      }
      // Refresh
      const res = await api.get(`/words?level_id=${activeLevel.id}&limit=200`);
      setWords(res.data.words || []);
      setShowAddModal(false);
    } catch (err) {
      console.error('Save word failed:', err);
      alert('Gagal menyimpan kata: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const filteredWords = words.filter((w) => {
    const q = searchQuery.toLowerCase();
    return (
      (w.japanese || '').toLowerCase().includes(q) ||
      (w.hiragana || '').toLowerCase().includes(q) ||
      (w.romaji || '').toLowerCase().includes(q) ||
      (w.meaning || '').toLowerCase().includes(q)
    );
  });

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold">Manajemen Konten</h1>
        <p className="text-text-muted mt-1">Kelola kosakata untuk setiap level JLPT</p>
      </motion.div>

      {/* Level Tabs */}
      <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto pb-1">
        {levelsList.map((level) => (
          <button
            key={level.code}
            onClick={() => { setActiveLevel(level); setPreviewData(null); }}
            className={`
              px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shrink-0
              ${activeLevel?.id === level.id
                ? 'bg-gradient-to-r from-sakura to-red-jp text-white shadow-lg shadow-sakura/20'
                : 'glass hover:bg-white/8 text-text-muted hover:text-text-primary'
              }
            `}
          >
            {level.code}
            <span className="ml-1.5 text-xs opacity-70">({level.word_count})</span>
          </button>
        ))}
      </motion.div>

      {/* Upload Section */}
      <motion.div variants={fadeUp} className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload size={18} className="text-sakura" />
          Upload Kosakata
        </h2>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300
            ${dragOver
              ? 'border-sakura bg-sakura/5 scale-[1.01]'
              : 'border-white/10 hover:border-white/20 hover:bg-white/3'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => handleFileUpload(e.target.files[0])}
            className="hidden"
          />

          {uploading ? (
            <div className="space-y-3">
              <div className="w-12 h-12 border-2 border-sakura border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-text-muted">Mengupload... {uploadProgress}%</p>
              <div className="h-2 bg-white/5 rounded-full max-w-xs mx-auto overflow-hidden">
                <div className="progress-fill h-full" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          ) : (
            <>
              <FileSpreadsheet size={40} className={`mx-auto mb-3 ${dragOver ? 'text-sakura' : 'text-text-muted/40'}`} />
              <p className="text-sm font-medium mb-1">
                {dragOver ? 'Lepaskan file di sini' : 'Drop file Excel di sini'}
              </p>
              <p className="text-xs text-text-muted">atau klik untuk memilih file (.xlsx, .xls, .csv)</p>
            </>
          )}
        </div>
      </motion.div>

      {/* Preview Section */}
      <AnimatePresence>
        {previewData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Download size={18} className="text-purple" />
                Preview Data ({previewData.total || previewData.rows?.length || 0} baris)
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewData(null)}
                  className="btn-secondary text-xs px-3 py-2"
                >
                  Batal
                </button>
                <button
                  onClick={handleSavePreview}
                  disabled={saving}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Simpan ke Database
                </button>
              </div>
            </div>

            {previewData.duplicates?.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-warning/10 border border-warning/20 flex items-center gap-2">
                <AlertTriangle size={16} className="text-warning shrink-0" />
                <span className="text-sm text-warning">
                  {previewData.duplicates.length} kata duplikat terdeteksi (ditandai orange)
                </span>
              </div>
            )}

            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-2 text-text-muted font-medium">Japanese</th>
                    <th className="text-left py-3 px-2 text-text-muted font-medium">Hiragana</th>
                    <th className="text-left py-3 px-2 text-text-muted font-medium">Romaji</th>
                    <th className="text-left py-3 px-2 text-text-muted font-medium">Meaning</th>
                    <th className="text-left py-3 px-2 text-text-muted font-medium">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {(previewData.rows || []).slice(0, 50).map((row, i) => {
                    const isDuplicate = previewData.duplicates?.includes(i) ||
                      previewData.duplicates?.some((d) => d.index === i);

                    return (
                      <tr
                        key={i}
                        className={`border-b border-white/5 ${isDuplicate ? 'bg-warning/10' : 'hover:bg-white/3'}`}
                      >
                        <td className="py-2.5 px-2 jp-text font-medium">{row.japanese || row.word}</td>
                        <td className="py-2.5 px-2 jp-text text-text-muted">{row.hiragana || row.reading}</td>
                        <td className="py-2.5 px-2 text-text-muted">{row.romaji}</td>
                        <td className="py-2.5 px-2">{row.meaning || row.indonesian}</td>
                        <td className="py-2.5 px-2">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-purple/15 text-purple">
                            {row.type || row.word_type}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {(previewData.rows || []).length > 50 && (
                <p className="text-xs text-text-muted text-center py-3">
                  Menampilkan 50 dari {previewData.rows.length} baris...
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={fadeUp} className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen size={18} className="text-purple" />
            Daftar Kata {activeLevel?.code}
            <span className="text-sm font-normal text-text-muted">({filteredWords.length})</span>
          </h2>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/60" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kata..."
                className="pl-9 text-sm py-2.5 w-full sm:w-56"
              />
            </div>
            <button onClick={openAddModal} className="btn-primary text-sm px-4 py-2.5 flex items-center gap-1.5 shrink-0">
              <Plus size={16} />
              Tambah
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 shimmer rounded-xl" />
            ))}
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen size={40} className="mx-auto text-text-muted/20 mb-3" />
            <p className="text-text-muted">
              {searchQuery ? 'Tidak ada kata yang cocok' : 'Belum ada kata untuk level ini'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-2 text-text-muted font-medium">Japanese</th>
                  <th className="text-left py-3 px-2 text-text-muted font-medium hidden sm:table-cell">Hiragana</th>
                  <th className="text-left py-3 px-2 text-text-muted font-medium hidden md:table-cell">Romaji</th>
                  <th className="text-left py-3 px-2 text-text-muted font-medium">Meaning</th>
                  <th className="text-left py-3 px-2 text-text-muted font-medium hidden sm:table-cell">Type</th>
                  <th className="text-right py-3 px-2 text-text-muted font-medium w-24">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredWords.slice(0, 100).map((word, i) => (
                  <motion.tr
                    key={word.id || word._id || i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors"
                  >
                    <td className="py-2.5 px-2 jp-text font-medium">{word.japanese || word.word}</td>
                    <td className="py-2.5 px-2 jp-text text-text-muted hidden sm:table-cell">{word.hiragana || word.reading}</td>
                    <td className="py-2.5 px-2 text-text-muted hidden md:table-cell">{word.romaji}</td>
                    <td className="py-2.5 px-2">{word.meaning || word.indonesian}</td>
                    <td className="py-2.5 px-2 hidden sm:table-cell">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-purple/15 text-purple">
                        {word.type || word.word_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(word)}
                          className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-purple transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteWord(word.id || word._id)}
                          className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-danger transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filteredWords.length > 100 && (
              <p className="text-xs text-text-muted text-center py-3">
                Menampilkan 100 dari {filteredWords.length} kata...
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">
                  {editingWord ? 'Edit Kata' : 'Tambah Kata Baru'}
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-lg hover:bg-white/5 text-text-muted"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-1.5 font-medium">Japanese</label>
                    <input
                      type="text"
                      value={formData.japanese}
                      onChange={(e) => setFormData({ ...formData, japanese: e.target.value })}
                      placeholder="食べる"
                      className="jp-text"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1.5 font-medium">Hiragana</label>
                    <input
                      type="text"
                      value={formData.hiragana}
                      onChange={(e) => setFormData({ ...formData, hiragana: e.target.value })}
                      placeholder="たべる"
                      className="jp-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-1.5 font-medium">Romaji</label>
                    <input
                      type="text"
                      value={formData.romaji}
                      onChange={(e) => setFormData({ ...formData, romaji: e.target.value })}
                      placeholder="taberu"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1.5 font-medium">Tipe</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="noun">Kata Benda (名詞)</option>
                      <option value="verb">Kata Kerja (動詞)</option>
                      <option value="i-adjective">Kata Sifat-i (い形容詞)</option>
                      <option value="na-adjective">Kata Sifat-na (な形容詞)</option>
                      <option value="adverb">Kata Keterangan (副詞)</option>
                      <option value="expression">Ungkapan (表現)</option>
                      <option value="particle">Partikel (助詞)</option>
                      <option value="other">Lainnya</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-text-muted mb-1.5 font-medium">Arti (Indonesia)</label>
                  <input
                    type="text"
                    value={formData.meaning}
                    onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                    placeholder="makan"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-muted mb-1.5 font-medium">Contoh Kalimat (JP)</label>
                  <input
                    type="text"
                    value={formData.example_sentence}
                    onChange={(e) => setFormData({ ...formData, example_sentence: e.target.value })}
                    placeholder="私はりんごを食べます"
                    className="jp-text"
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-muted mb-1.5 font-medium">Arti Contoh (ID)</label>
                  <input
                    type="text"
                    value={formData.example_meaning}
                    onChange={(e) => setFormData({ ...formData, example_meaning: e.target.value })}
                    placeholder="Saya makan apel"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveWord}
                    disabled={saving || !formData.japanese || !formData.meaning}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check size={16} />
                        {editingWord ? 'Simpan' : 'Tambah'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
