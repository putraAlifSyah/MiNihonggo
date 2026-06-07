import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bot, Save, Zap, CheckCircle, XCircle, Lock,
  Eye, EyeOff, ChevronRight, Loader2, ToggleLeft, ToggleRight
} from 'lucide-react';
import api from '../../lib/api';

const PROVIDERS = [
  { id: 'google',    label: 'Google Gemini',  base_url: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash-lite' },
  { id: 'openai',   label: 'OpenAI',          base_url: 'https://api.openai.com/v1',                               model: 'gpt-4o-mini' },
  { id: 'openrouter',label: 'OpenRouter',     base_url: 'https://openrouter.ai/api/v1',                            model: 'meta-llama/llama-3.1-8b-instruct:free' },
  { id: 'anthropic', label: 'Anthropic',      base_url: 'https://api.anthropic.com/v1',                            model: 'claude-haiku-3-5' },
  { id: 'ollama',    label: 'Ollama (Lokal)', base_url: 'http://localhost:11434/v1',                                model: 'llama3' },
];

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export default function AISettingsPage() {
  const [form, setForm] = useState({ is_enabled: false, provider: 'google', base_url: '', api_key: '', model_name: '' });
  const [showKey, setShowKey] = useState(false);
  const [keyMasked, setKeyMasked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | {success, error}
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/ai/settings');
        if (res.data.configured) {
          setForm(f => ({
            ...f,
            is_enabled: res.data.is_enabled,
            provider: res.data.provider || 'google',
            base_url: res.data.base_url || '',
            api_key: res.data.api_key_masked || '',
            model_name: res.data.model_name || '',
          }));
          setKeyMasked(true);
        }
      } catch {}
      setLoading(false);
    };
    fetch();
  }, []);

  const selectProvider = (p) => {
    setForm(f => ({ ...f, provider: p.id, base_url: p.base_url, model_name: p.model }));
    setTestResult(null);
  };

  const handleKeyChange = (val) => {
    setForm(f => ({ ...f, api_key: val }));
    if (keyMasked) setKeyMasked(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/ai/test-connection', {
        base_url: form.base_url,
        api_key: form.api_key,
        model_name: form.model_name,
      });
      setTestResult({ success: true, msg: res.data.response || 'Koneksi berhasil!' });
    } catch (err) {
      setTestResult({ success: false, msg: err.response?.data?.error || err.message });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/ai/settings', {
        is_enabled: form.is_enabled,
        provider: form.provider,
        base_url: form.base_url,
        api_key: keyMasked ? '••••••••' : form.api_key,
        model_name: form.model_name,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Gagal menyimpan: ' + (err.response?.data?.error || err.message));
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-sakura" size={32} />
    </div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple/30 to-sakura/30 flex items-center justify-center">
            <Bot size={20} className="text-purple" />
          </div>
          Pengaturan AI
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Konfigurasi AI untuk generate soal, menilai jawaban, dan menjelaskan kata
        </p>
      </motion.div>

      {/* Enable Toggle */}
      <motion.div variants={fadeUp} className="card flex items-center justify-between">
        <div>
          <p className="font-semibold">Aktifkan Fitur AI</p>
          <p className="text-text-muted text-sm">Generate soal pintar, penilaian kontekstual, AI Tutor</p>
        </div>
        <button onClick={() => setForm(f => ({ ...f, is_enabled: !f.is_enabled }))}
          className="transition-colors">
          {form.is_enabled
            ? <ToggleRight size={36} className="text-sakura" />
            : <ToggleLeft size={36} className="text-text-muted" />}
        </button>
      </motion.div>

      <div className={`space-y-5 transition-opacity duration-300 ${!form.is_enabled ? 'opacity-40 pointer-events-none' : ''}`}>
        {/* Provider Presets */}
        <motion.div variants={fadeUp} className="card">
          <p className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Provider</p>
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map(p => (
              <button key={p.id} onClick={() => selectProvider(p)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  form.provider === p.id
                    ? 'bg-gradient-to-r from-sakura/20 to-purple/20 border-sakura/40 text-sakura'
                    : 'glass border-white/10 text-text-muted hover:text-text-primary hover:border-white/20'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Form Fields */}
        <motion.div variants={fadeUp} className="card space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1.5">
              Base URL
            </label>
            <input type="text" value={form.base_url}
              onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))}
              placeholder="https://api.openai.com/v1"
              className="w-full text-sm" />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1.5">
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={form.api_key}
                onChange={e => handleKeyChange(e.target.value)}
                placeholder={keyMasked ? 'Tersimpan — kosongkan untuk tetap pakai' : 'Masukkan API key...'}
                className="w-full text-sm pr-10" />
              <button onClick={() => setShowKey(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1.5">
              Nama Model
            </label>
            <input type="text" value={form.model_name}
              onChange={e => setForm(f => ({ ...f, model_name: e.target.value }))}
              placeholder="gemini-2.0-flash-lite"
              className="w-full text-sm" />
          </div>
        </motion.div>

        {/* Test Connection */}
        <motion.div variants={fadeUp} className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Test Koneksi</p>
              <p className="text-text-muted text-xs">Kirim permintaan kecil untuk memverifikasi API key</p>
            </div>
            <button onClick={handleTest} disabled={testing || !form.base_url || !form.model_name}
              className="btn-secondary text-sm px-4 py-2 flex items-center gap-2 shrink-0">
              {testing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              {testing ? 'Menguji...' : 'Test'}
            </button>
          </div>

          {testResult && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className={`mt-3 flex items-start gap-2 p-3 rounded-xl text-sm ${
                testResult.success ? 'bg-success/10 border border-success/20 text-success' : 'bg-danger/10 border border-danger/20 text-danger'
              }`}>
              {testResult.success ? <CheckCircle size={16} className="shrink-0 mt-0.5" /> : <XCircle size={16} className="shrink-0 mt-0.5" />}
              <span>{testResult.success ? '✅ ' : '❌ '}{testResult.msg}</span>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Security Note */}
      <motion.div variants={fadeUp} className="flex items-start gap-2 text-xs text-text-muted px-1">
        <Lock size={12} className="shrink-0 mt-0.5 text-purple" />
        <span>API key dienkripsi dengan AES-256 di server. Tidak pernah ditampilkan ke browser setelah tersimpan.</span>
      </motion.div>

      {/* Save */}
      <motion.div variants={fadeUp}>
        <button onClick={handleSave} disabled={saving}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base font-semibold">
          {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <CheckCircle size={18} /> : <Save size={18} />}
          {saving ? 'Menyimpan...' : saved ? 'Tersimpan! ✓' : 'Simpan Pengaturan'}
        </button>
      </motion.div>
    </motion.div>
  );
}
