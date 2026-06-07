import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Loader2, ChevronDown, Sparkles } from 'lucide-react';

/**
 * AIExplainer — "Tanya AI 🤖" button + streaming explanation drawer for flashcards.
 * Props:
 *   wordId    (number)  — word ID to explain
 *   word      (object)  — { japanese, hiragana, meaning }
 *   aiEnabled (boolean) — hide if false
 */
export default function AIExplainer({ wordId, word, aiEnabled }) {
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [cached, setCached] = useState(false);
  const [fetched, setFetched] = useState(false); // don't refetch on reopen

  const fetchExplanation = useCallback(async () => {
    if (fetched) return; // already loaded
    setLoading(true);
    setExplanation('');

    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/ai/explain-word', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ word_id: wordId }),
      });

      // Check if cached JSON response
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data.cached && data.explanation) {
          setExplanation(data.explanation);
          setCached(true);
          setFetched(true);
        }
        setLoading(false);
        return;
      }

      // SSE streaming
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
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
            if (parsed.token) setExplanation(prev => prev + parsed.token);
          } catch {}
        }
      }
      setFetched(true);
    } catch (err) {
      setExplanation('Gagal memuat penjelasan. Coba lagi nanti.');
    }
    setLoading(false);
  }, [wordId, fetched]);

  const handleOpen = () => {
    setOpen(true);
    fetchExplanation();
  };

  if (!aiEnabled) return null;

  // Render explanation with basic markdown-like formatting
  const renderExplanation = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} className="h-2" />;
      // Bold **text**
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="text-sm text-text-primary leading-relaxed">
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j} className="text-sakura font-semibold">{part}</strong> : part
          )}
        </p>
      );
    });
  };

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
          bg-purple/15 border border-purple/25 text-purple hover:bg-purple/25 transition-all"
      >
        <Sparkles size={13} />
        Tanya AI
      </motion.button>

      {/* Explanation Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 glass rounded-2xl p-4 relative">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple/30 to-sakura/30 flex items-center justify-center">
                    <Bot size={13} className="text-purple" />
                  </div>
                  <span className="text-xs font-semibold text-text-muted">
                    Penjelasan AI — {word?.japanese}
                    {cached && <span className="ml-1 text-success/70">(cache)</span>}
                  </span>
                </div>
                <button onClick={() => setOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-text-muted transition-colors">
                  <X size={14} />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {loading && !explanation && (
                  <div className="flex items-center gap-2 text-text-muted text-sm py-2">
                    <Loader2 size={14} className="animate-spin text-purple" />
                    <span>AI sedang menyiapkan penjelasan...</span>
                  </div>
                )}
                {renderExplanation(explanation)}
                {loading && explanation && (
                  <span className="inline-block w-1.5 h-4 bg-sakura/70 animate-pulse rounded" />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
