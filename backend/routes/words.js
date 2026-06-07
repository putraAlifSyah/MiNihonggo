/**
 * Words & content routes — levels, categories, words.
 *
 * GET /api/levels
 * GET /api/categories
 * GET /api/words
 * GET /api/words/:id
 */

const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ────────────────────────────────────────────────────────────────
// GET /api/levels — list all JLPT levels
// ────────────────────────────────────────────────────────────────
router.get('/levels', authenticate, (req, res) => {
  try {
    const levels = db.prepare(`
      SELECT l.*,
             (SELECT COUNT(*) FROM categories WHERE level_id = l.id) AS category_count,
             (SELECT COUNT(*) FROM words w
              JOIN categories c ON w.category_id = c.id
              WHERE c.level_id = l.id) AS word_count
      FROM levels l
      ORDER BY l.id
    `).all();

    res.json({ levels });
  } catch (err) {
    console.error('[words] levels error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /api/categories — list categories, optional ?level_id filter
// ────────────────────────────────────────────────────────────────
router.get('/categories', authenticate, (req, res) => {
  try {
    const { level_id } = req.query;
    let sql = `
      SELECT c.*,
             l.code AS level_code,
             l.label AS level_label,
             (SELECT COUNT(*) FROM words WHERE category_id = c.id) AS word_count,
             (SELECT COUNT(*) FROM grammar_patterns WHERE category_id = c.id) AS grammar_count
      FROM categories c
      JOIN levels l ON c.level_id = l.id
    `;
    const params = [];

    if (level_id) {
      sql += ' WHERE c.level_id = ?';
      params.push(level_id);
    }

    sql += ' ORDER BY c.level_id, c.id';

    const categories = db.prepare(sql).all(...params);
    res.json({ categories });
  } catch (err) {
    console.error('[words] categories error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /api/words — paginated word list with optional filters
//   ?level_id=  — filter by JLPT level
//   ?category_id= — filter by category
//   ?word_type= — filter by word_type (vocabulary / kanji)
//   ?page=      — page number (default 1)
//   ?limit=     — items per page (default 50, max 200)
// ────────────────────────────────────────────────────────────────
router.get('/words', authenticate, (req, res) => {
  try {
    const { level_id, category_id, word_type } = req.query;
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 50;

    if (page < 1) page = 1;
    if (limit < 1) limit = 1;
    if (limit > 200) limit = 200;

    const conditions = [];
    const params = [];

    if (category_id) {
      conditions.push('w.category_id = ?');
      params.push(category_id);
    }

    if (level_id) {
      conditions.push('c.level_id = ?');
      params.push(level_id);
    }

    if (word_type) {
      conditions.push('w.word_type = ?');
      params.push(word_type);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Total count for pagination metadata
    const countSql = `
      SELECT COUNT(*) AS total
      FROM words w
      JOIN categories c ON w.category_id = c.id
      ${where}
    `;
    const { total } = db.prepare(countSql).get(...params);

    const offset = (page - 1) * limit;

    const dataSql = `
      SELECT w.*,
             c.name AS category_name,
             c.type AS category_type,
             l.code AS level_code,
             l.label AS level_label
      FROM words w
      JOIN categories c ON w.category_id = c.id
      JOIN levels l ON c.level_id = l.id
      ${where}
      ORDER BY w.id
      LIMIT ? OFFSET ?
    `;

    const words = db.prepare(dataSql).all(...params, limit, offset);

    res.json({
      words,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[words] list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /api/words/:id — single word with category & level info
// ────────────────────────────────────────────────────────────────
router.get('/words/:id', authenticate, (req, res) => {
  try {
    const word = db.prepare(`
      SELECT w.*,
             c.name AS category_name,
             c.type AS category_type,
             c.level_id,
             l.code AS level_code,
             l.label AS level_label
      FROM words w
      JOIN categories c ON w.category_id = c.id
      JOIN levels l ON c.level_id = l.id
      WHERE w.id = ?
    `).get(req.params.id);

    if (!word) {
      return res.status(404).json({ error: 'Word not found' });
    }

    res.json({ word });
  } catch (err) {
    console.error('[words] get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
