import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, Trash2, BookOpen, Loader2, Settings, Plus } from 'lucide-react';
import api from '../lib/api';

const QUICK_PROMPTS = [
  'Apa bedanya は dan が?',
  'Kapan pakai bentuk て?',
  'Jelaskan pola 〜ている',
  'Tips belajar kanji N5 yang efektif',
];

const HISTORY_KEY = 'ai-tutor-history';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(msgs) {
  const trimmed = msgs.slice(-50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export default function AITutorPage() {
  const navigate = useNavigate();
  const [aiEnabled, setAiEnabled] = useState(null); // null=loading
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  // Check AI enabled
  useEffect(() => {
    api.get('/ai/settings').then(r => setAiEnabled(!!r.data.is_enabled)).catch(() => setAiEnabled(false));
    setMessages(loadHistory());
  }, []);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || streaming) return;

    const userMsg = { role: 'user', content: text.trim(), ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setStreaming(true);

    // Start streaming AI response
    const aiMsg = { role: 'assistant', content: '', ts: Date.now(), streaming: true };
    setMessages(prev => [...prev, aiMsg]);

    const token = localStorage.getItem('token');
    const context = newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: context }),
        signal: abortRef.current?.signal,
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.token) {
              fullText += parsed.token;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullText };
                return updated;
              });
            }
          } catch {}
        }
      }

      // Mark done
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], streaming: false };
        saveHistory(updated);
        return updated;
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: 'Maaf, terjadi kesalahan. Coba lagi.', streaming: false };
          return updated;
        });
      }
    }
    setStreaming(false);
  }, [messages, streaming]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const renderContent = (text) =>
    text.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} className="h-1.5" />;
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <span key={i} className="block leading-relaxed">
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-semibold">{p}</strong> : p)}
        </span>
      );
    });

  // Loading
  if (aiEnabled === null) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-sakura" size={32} />
    </div>
  );

  // AI not enabled
  if (!aiEnabled) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="card text-center max-w-md py-12 px-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple/20 to-sakura/20 flex items-center justify-center mx-auto mb-4">
          <Bot size={28} className="text-purple" />
        </div>
        <h2 className="text-xl font-bold mb-2">AI Belum Aktif</h2>
        <p className="text-text-muted text-sm mb-6">Masukkan API key di Pengaturan AI untuk menggunakan fitur ini.</p>
        <button onClick={() => navigate('/settings/ai')} className="btn-primary flex items-center gap-2 mx-auto">
          <Settings size={16} /> Buka Pengaturan AI
        </button>
      </motion.div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-3xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple/30 to-sakura/30 flex items-center justify-center">
            <Bot size={20} className="text-purple" />
          </div>
          <div>
            <h1 className="font-bold text-lg">AI Tutor</h1>
            <p className="text-text-muted text-xs">Tanya apa saja tentang bahasa Jepang</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory}
            className="p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-danger transition-colors"
            title="Hapus riwayat chat">
            <Trash2 size={18} />
          </button>
        )}
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
        {/* Empty state with quick prompts */}
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8">
            <div className="text-center mb-8">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}
                className="text-5xl mb-3">🤖</motion.div>
              <p className="text-text-muted text-sm">Halo! Tanya aku tentang bahasa Jepang, kosakata, grammar, atau tips belajar JLPT.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_PROMPTS.map((p, i) => (
                <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => sendMessage(p)}
                  className="glass p-3 rounded-xl text-left text-sm text-text-muted hover:text-text-primary hover:bg-white/8 transition-all border border-white/5 hover:border-white/15">
                  <span className="text-purple mr-2">→</span>{p}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Chat messages */}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple/30 to-sakura/30 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={14} className="text-purple" />
                </div>
              )}

              {/* Bubble */}
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`px-4 py-3 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-sakura to-red-jp text-white rounded-tr-sm'
                    : 'glass rounded-tl-sm text-text-primary'
                }`}>
                  {msg.role === 'assistant' ? renderContent(msg.content) : msg.content}
                  {msg.streaming && (
                    <span className="inline-block w-1.5 h-3.5 bg-purple/70 animate-pulse rounded ml-0.5 align-middle" />
                  )}
                </div>
                {msg.ts && (
                  <span className="text-[10px] text-text-muted/50 px-1">{formatTime(msg.ts)}</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="shrink-0 glass rounded-2xl p-3 flex gap-3 items-end border border-white/10">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
          onKeyDown={handleKeyDown}
          placeholder="Tanya tentang bahasa Jepang... (Enter untuk kirim)"
          rows={1}
          disabled={streaming}
          className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-text-primary placeholder-text-muted/50 leading-relaxed"
          style={{ minHeight: '24px', maxHeight: '120px' }}
        />
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || streaming}
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-sakura to-red-jp flex items-center justify-center shrink-0
            disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-lg shadow-sakura/20">
          {streaming ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} className="text-white" />}
        </motion.button>
      </motion.div>
    </div>
  );
}
