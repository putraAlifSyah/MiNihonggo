/**
 * Progress & study plan routes.
 *
 * GET  /api/progress/today      — today's flashcard queue (SRS reviews + new words)
 * POST /api/progress/review     — submit a review (updates SRS)
 * GET  /api/progress/stats      — user statistics
 * GET  /api/study-plans         — user's study plans
 * POST /api/study-plans         — create a study plan
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { updateSRS, calculateWordsPerDay } = require('../services/srs');

const router = express.Router();

/**
 * Helper: today's date as YYYY-MM-DD in local timezone.
 */
function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/**
 * Helper: update the user's streak.
 * Called after each review.
 */
function updateStreak(userId) {
  const today = todayStr();
  const streak = db.prepare('SELECT * FROM streaks WHERE user_id = ?').get(userId);

  if (!streak) {
    // First ever activity
    db.prepare(
      `INSERT INTO streaks (user_id, current_streak, longest_streak, last_active_date)
       VALUES (?, 1, 1, ?)`
    ).run(userId, today);
    return;
  }

  if (streak.last_active_date === today) {
    // Already logged today — nothing to update
    return;
  }

  // Check if yesterday was the last active date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  let newCurrent;
  if (streak.last_active_date === yesterdayStr) {
    // Consecutive day — extend streak
    newCurrent = streak.current_streak + 1;
  } else {
    // Streak broken — reset to 1
    newCurrent = 1;
  }

  const newLongest = Math.max(streak.longest_streak, newCurrent);

  db.prepare(
    `UPDATE streaks
     SET current_streak = ?, longest_streak = ?, last_active_date = ?
     WHERE user_id = ?`
  ).run(newCurrent, newLongest, today, userId);

  // ── Badge checks ──────────────────────────────────────────
  awardBadgeIfEligible(userId, 'streak_7', newCurrent >= 7);
  awardBadgeIfEligible(userId, 'streak_30', newCurrent >= 30);
}

/**
 * Helper: award a badge to a user if a condition is met and they
 * don't already have it.
 */
function awardBadgeIfEligible(userId, badgeKey, condition) {
  if (!condition) return;

  const badge = db.prepare('SELECT id FROM badges WHERE key = ?').get(badgeKey);
  if (!badge) return;

  const already = db.prepare(
    'SELECT 1 FROM user_badges WHERE user_id = ? AND badge_id = ?'
  ).get(userId, badge.id);

  if (!already) {
    db.prepare(
      'INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)'
    ).run(userId, badge.id);
  }
}

// ────────────────────────────────────────────────────────────────
// GET /api/progress/today?level_id=
// Returns the flashcard queue for today:
//   1. Words with next_review_date <= today (SRS reviews due)
//   2. New (unseen) words up to the daily quota
// ────────────────────────────────────────────────────────────────
router.get('/today', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const { level_id } = req.query;
    const today = todayStr();

    // Determine words_per_day from the active study plan for this level
    let wordsPerDay = 10; // sensible default
    if (level_id) {
      const plan = db.prepare(
        `SELECT words_per_day FROM study_plans
         WHERE user_id = ? AND level_id = ? AND is_active = 1
         ORDER BY started_at DESC LIMIT 1`
      ).get(userId, level_id);
      if (plan) wordsPerDay = plan.words_per_day;
    }

    // 1. Due reviews — words the user has seen that are up for review
    let reviewSql = `
      SELECT w.*, uwp.status, uwp.ease_factor, uwp.interval_days,
             uwp.repetitions, uwp.next_review_date, uwp.last_reviewed_at,
             uwp.id AS progress_id,
             c.name AS category_name, c.type AS category_type,
             l.code AS level_code
      FROM user_word_progress uwp
      JOIN words w ON uwp.word_id = w.id
      JOIN categories c ON w.category_id = c.id
      JOIN levels l ON c.level_id = l.id
      WHERE uwp.user_id = ?
        AND uwp.next_review_date <= ?
        AND uwp.status != 'unseen'
    `;
    const reviewParams = [userId, today];

    if (level_id) {
      reviewSql += ' AND c.level_id = ?';
      reviewParams.push(level_id);
    }

    reviewSql += ' ORDER BY uwp.next_review_date ASC';
    const reviews = db.prepare(reviewSql).all(...reviewParams);

    // 2. Count how many new words the user already studied today
    const studiedToday = db.prepare(`
      SELECT COUNT(*) AS cnt FROM user_word_progress
      WHERE user_id = ? AND last_reviewed_at >= ?
        AND repetitions = 1
    `).get(userId, today + 'T00:00:00').cnt;

    const newWordQuota = Math.max(0, wordsPerDay - studiedToday);

    // 3. Unseen words (no progress record yet)
    let unseenSql = `
      SELECT w.*,
             'unseen' AS status,
             c.name AS category_name, c.type AS category_type,
             l.code AS level_code
      FROM words w
      JOIN categories c ON w.category_id = c.id
      JOIN levels l ON c.level_id = l.id
      WHERE w.id NOT IN (
        SELECT word_id FROM user_word_progress WHERE user_id = ?
      )
    `;
    const unseenParams = [userId];

    if (level_id) {
      unseenSql += ' AND c.level_id = ?';
      unseenParams.push(level_id);
    }

    unseenSql += ' ORDER BY w.id LIMIT ?';
    unseenParams.push(newWordQuota);

    const unseen = db.prepare(unseenSql).all(...unseenParams);

    res.json({
      reviews,
      new_words: unseen,
      meta: {
        review_count: reviews.length,
        new_count: unseen.length,
        words_per_day: wordsPerDay,
        studied_today: studiedToday,
      },
    });
  } catch (err) {
    console.error('[progress] today error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/progress/review
// Body: { word_id, quality }   quality: 0=forgot, 1=fuzzy, 2=known
// ────────────────────────────────────────────────────────────────
router.post('/review', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const { word_id, quality } = req.body;

    if (word_id == null || quality == null) {
      return res.status(400).json({ error: 'word_id and quality are required' });
    }

    if (![0, 1, 2].includes(quality)) {
      return res.status(400).json({ error: 'quality must be 0, 1, or 2' });
    }

    // Verify the word exists
    const word = db.prepare('SELECT id FROM words WHERE id = ?').get(word_id);
    if (!word) {
      return res.status(404).json({ error: 'Word not found' });
    }

    // Get or create progress record
    let progress = db.prepare(
      'SELECT * FROM user_word_progress WHERE user_id = ? AND word_id = ?'
    ).get(userId, word_id);

    const now = new Date().toISOString();

    if (!progress) {
      // First time seeing this word — create the record
      const id = uuidv4();
      db.prepare(
        `INSERT INTO user_word_progress
           (id, user_id, word_id, status, ease_factor, interval_days, repetitions)
         VALUES (?, ?, ?, 'unseen', 2.5, 1, 0)`
      ).run(id, userId, word_id);
      progress = db.prepare('SELECT * FROM user_word_progress WHERE id = ?').get(id);
    }

    // Run SM-2
    const updated = updateSRS(progress, quality);

    db.prepare(
      `UPDATE user_word_progress
       SET status = ?, ease_factor = ?, interval_days = ?,
           repetitions = ?, next_review_date = ?, last_reviewed_at = ?
       WHERE id = ?`
    ).run(
      updated.status,
      updated.ease_factor,
      updated.interval_days,
      updated.repetitions,
      updated.next_review_date,
      now,
      progress.id
    );

    // Update streak
    updateStreak(userId);

    // Badge: first_word
    const totalReviewed = db.prepare(
      `SELECT COUNT(*) AS cnt FROM user_word_progress
       WHERE user_id = ? AND status != 'unseen'`
    ).get(userId).cnt;

    awardBadgeIfEligible(userId, 'first_word', totalReviewed >= 1);
    awardBadgeIfEligible(userId, 'first_100', totalReviewed >= 100);
    awardBadgeIfEligible(userId, 'first_500', totalReviewed >= 500);

    // Update daily session
    const today = todayStr();
    let session = db.prepare(
      'SELECT * FROM daily_sessions WHERE user_id = ? AND session_date = ?'
    ).get(userId, today);

    if (!session) {
      const sessionId = uuidv4();
      db.prepare(
        `INSERT INTO daily_sessions (id, user_id, session_date)
         VALUES (?, ?, ?)`
      ).run(sessionId, userId, today);
      session = db.prepare('SELECT * FROM daily_sessions WHERE id = ?').get(sessionId);
    }

    db.prepare(
      `UPDATE daily_sessions
       SET words_studied = words_studied + 1,
           correct_count = correct_count + ?
       WHERE id = ?`
    ).run(quality === 2 ? 1 : 0, session.id);

    res.json({
      message: 'Review recorded',
      progress: {
        word_id,
        status: updated.status,
        ease_factor: updated.ease_factor,
        interval_days: updated.interval_days,
        repetitions: updated.repetitions,
        next_review_date: updated.next_review_date,
      },
    });
  } catch (err) {
    console.error('[progress] review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /api/progress/stats
// User statistics: word counts by status, streak, plan progress
// ────────────────────────────────────────────────────────────────
router.get('/stats', authenticate, (req, res) => {
  try {
    const userId = req.user.id;

    // Word status counts
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) AS count
      FROM user_word_progress
      WHERE user_id = ?
      GROUP BY status
    `).all(userId);

    const statusMap = { unseen: 0, learning: 0, reviewing: 0, mastered: 0 };
    for (const row of statusCounts) {
      statusMap[row.status] = row.count;
    }

    // Streak info
    const streak = db.prepare('SELECT * FROM streaks WHERE user_id = ?').get(userId);

    // Today's session
    const today = todayStr();
    const todaySession = db.prepare(
      'SELECT * FROM daily_sessions WHERE user_id = ? AND session_date = ?'
    ).get(userId, today);

    // Active study plans with progress
    const plans = db.prepare(`
      SELECT sp.*,
             l.code AS level_code,
             l.label AS level_label,
             (SELECT COUNT(*) FROM user_word_progress uwp
              JOIN words w ON uwp.word_id = w.id
              JOIN categories c ON w.category_id = c.id
              WHERE uwp.user_id = sp.user_id
                AND c.level_id = sp.level_id
                AND uwp.status != 'unseen') AS words_learned
      FROM study_plans sp
      JOIN levels l ON sp.level_id = l.id
      WHERE sp.user_id = ? AND sp.is_active = 1
    `).all(userId);

    // Badges earned
    const badges = db.prepare(`
      SELECT b.*, ub.earned_at
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
      ORDER BY ub.earned_at DESC
    `).all(userId);

    // Total words reviewed ever
    const totalReviewed = db.prepare(`
      SELECT COUNT(*) AS cnt FROM user_word_progress
      WHERE user_id = ? AND status != 'unseen'
    `).get(userId).cnt;

    res.json({
      word_status: statusMap,
      total_reviewed: totalReviewed,
      streak: streak || { current_streak: 0, longest_streak: 0, last_active_date: null },
      today_session: todaySession || {
        words_studied: 0,
        words_tested: 0,
        correct_count: 0,
        duration_seconds: null,
        completed: 0,
      },
      active_plans: plans,
      badges,
    });
  } catch (err) {
    console.error('[progress] stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /api/study-plans
// ────────────────────────────────────────────────────────────────
router.get('/study-plans', authenticate, (req, res) => {
  try {
    const userId = req.user.id;

    const plans = db.prepare(`
      SELECT sp.*,
             l.code AS level_code,
             l.label AS level_label,
             (SELECT COUNT(*) FROM words w
              JOIN categories c ON w.category_id = c.id
              WHERE c.level_id = sp.level_id) AS total_available_words,
             (SELECT COUNT(*) FROM user_word_progress uwp
              JOIN words w ON uwp.word_id = w.id
              JOIN categories c ON w.category_id = c.id
              WHERE uwp.user_id = sp.user_id
                AND c.level_id = sp.level_id
                AND uwp.status != 'unseen') AS words_learned
      FROM study_plans sp
      JOIN levels l ON sp.level_id = l.id
      WHERE sp.user_id = ?
      ORDER BY sp.is_active DESC, sp.started_at DESC
    `).all(userId);

    res.json({ plans });
  } catch (err) {
    console.error('[progress] study-plans error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/study-plans
// Body: { level_id, target_date, category_ids? }
// ────────────────────────────────────────────────────────────────
router.post('/study-plans', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const { level_id, target_date, category_ids } = req.body;

    if (!level_id || !target_date) {
      return res.status(400).json({ error: 'level_id and target_date are required' });
    }

    // Verify level exists
    const level = db.prepare('SELECT * FROM levels WHERE id = ?').get(level_id);
    if (!level) {
      return res.status(404).json({ error: 'Level not found' });
    }

    // Count total words for this level (optionally filtered by categories)
    let wordCountSql = `
      SELECT COUNT(*) AS cnt FROM words w
      JOIN categories c ON w.category_id = c.id
      WHERE c.level_id = ?
    `;
    const wordCountParams = [level_id];

    if (category_ids && category_ids.length > 0) {
      const placeholders = category_ids.map(() => '?').join(', ');
      wordCountSql += ` AND c.id IN (${placeholders})`;
      wordCountParams.push(...category_ids);
    }

    const totalWords = db.prepare(wordCountSql).get(...wordCountParams).cnt;
    const wordsPerDay = calculateWordsPerDay(totalWords, target_date);

    // Deactivate other active plans for the same level
    db.prepare(
      `UPDATE study_plans SET is_active = 0
       WHERE user_id = ? AND level_id = ? AND is_active = 1`
    ).run(userId, level_id);

    const id = uuidv4();
    db.prepare(
      `INSERT INTO study_plans (id, user_id, level_id, target_date, words_per_day, total_words)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, userId, level_id, target_date, wordsPerDay, totalWords);

    const plan = db.prepare('SELECT * FROM study_plans WHERE id = ?').get(id);

    res.status(201).json({
      message: 'Study plan created',
      plan: {
        ...plan,
        level_code: level.code,
        level_label: level.label,
      },
    });
  } catch (err) {
    console.error('[progress] create study-plan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/progress/leaderboard — simple rankings
router.get('/leaderboard', authenticate, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.name,
             COALESCE(s.current_streak, 0) AS current_streak,
             COALESCE(s.longest_streak, 0) AS longest_streak,
             COALESCE((SELECT COUNT(*) FROM user_word_progress WHERE user_id = u.id AND status != 'unseen'), 0) AS words_learned,
             COALESCE((SELECT COUNT(*) FROM user_word_progress WHERE user_id = u.id AND status = 'mastered'), 0) AS words_mastered,
             COALESCE((SELECT words_studied FROM daily_sessions WHERE user_id = u.id AND session_date = date('now') LIMIT 1), 0) AS studied_today
      FROM users u
      LEFT JOIN streaks s ON s.user_id = u.id
      ORDER BY words_learned DESC, current_streak DESC
    `).all();
    res.json({ users });
  } catch (err) {
    console.error('[progress] leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
