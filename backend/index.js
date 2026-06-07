/**
 * Nihongo Vocab App — Express.js API entry point.
 *
 * Mounts all route modules and starts the HTTP server.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ─── Middleware ─────────────────────────────────────────────────

// CORS — allow the Vite dev server (and any origin you add later)
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
  ],
  credentials: true,
}));

// Parse JSON request bodies (limit raised for Excel previews)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Database init (runs schema on first require) ──────────────
require('./db');

// ─── Routes ────────────────────────────────────────────────────
const authRoutes     = require('./routes/auth');
const wordsRoutes    = require('./routes/words');
const progressRoutes = require('./routes/progress');
const adminRoutes    = require('./routes/admin');
const aiRoutes       = require('./routes/ai');

app.use('/api/auth',     authRoutes);
app.use('/api',          wordsRoutes);     // /api/levels, /api/categories, /api/words
app.use('/api/progress', progressRoutes);  // /api/progress/today, /review, /stats, /study-plans
app.use('/api/admin',    adminRoutes);
app.use('/api/ai',       aiRoutes);        // /api/ai/settings, /explain-word, /chat, etc.

// ─── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 fallback ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global error handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
  ┌──────────────────────────────────────┐
  │  🇯🇵  Nihongo Vocab API is running   │
  │  → http://localhost:${PORT}             │
  │  → Environment: ${process.env.NODE_ENV || 'development'}       │
  └──────────────────────────────────────┘
  `);
});

module.exports = app;
