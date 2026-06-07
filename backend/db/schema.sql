-- ============================================================
-- Nihongo Vocab App — Full SQLite Schema
-- Uses IF NOT EXISTS so it's safe to run on every startup
-- ============================================================

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,            -- UUID v4
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'user', -- 'user' | 'admin'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Levels (JLPT N5–N1) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS levels (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  code      TEXT NOT NULL UNIQUE,          -- e.g. 'N5'
  label     TEXT NOT NULL,                 -- e.g. 'JLPT N5'
  is_active INTEGER NOT NULL DEFAULT 0     -- 0 = locked, 1 = active
);

-- ── Categories (per level) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  level_id INTEGER NOT NULL,
  name     TEXT NOT NULL,                  -- e.g. 'Kata Benda'
  type     TEXT NOT NULL,                  -- 'vocabulary' | 'kanji' | 'grammar'
  FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
);

-- ── Words / Vocabulary / Kanji ───────────────────────────────
CREATE TABLE IF NOT EXISTS words (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id         INTEGER NOT NULL,
  japanese            TEXT NOT NULL,        -- kanji or kana form
  hiragana            TEXT,                 -- reading in hiragana
  romaji              TEXT,                 -- romanised reading
  meaning             TEXT NOT NULL,        -- Indonesian translation
  example_sentence_jp TEXT,                 -- example in Japanese
  example_sentence_id TEXT,                 -- example in Indonesian
  word_type           TEXT,                 -- 'vocabulary' | 'kanji'
  onyomi              TEXT,                 -- on'yomi (kanji only)
  kunyomi             TEXT,                 -- kun'yomi (kanji only)
  stroke_count        INTEGER,             -- stroke count (kanji only)
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- ── Grammar Patterns ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grammar_patterns (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  pattern     TEXT NOT NULL,               -- e.g. '〜ている'
  meaning     TEXT NOT NULL,               -- Indonesian explanation
  example_jp  TEXT,                         -- example in Japanese
  example_id  TEXT,                         -- example in Indonesian
  note        TEXT,                         -- extra notes
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- ── Study Plans ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_plans (
  id            TEXT PRIMARY KEY,           -- UUID v4
  user_id       TEXT NOT NULL,
  level_id      INTEGER NOT NULL,
  target_date   TEXT NOT NULL,              -- ISO date string
  words_per_day INTEGER NOT NULL DEFAULT 10,
  total_words   INTEGER NOT NULL DEFAULT 0,
  started_at    TEXT NOT NULL DEFAULT (datetime('now')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
);

-- ── User Word Progress (SRS tracking) ────────────────────────
CREATE TABLE IF NOT EXISTS user_word_progress (
  id               TEXT PRIMARY KEY,        -- UUID v4
  user_id          TEXT NOT NULL,
  word_id          INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'unseen', -- unseen|learning|reviewing|mastered
  ease_factor      REAL NOT NULL DEFAULT 2.5,
  interval_days    INTEGER NOT NULL DEFAULT 1,
  repetitions      INTEGER NOT NULL DEFAULT 0,
  next_review_date TEXT,                    -- ISO date
  last_reviewed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
  UNIQUE(user_id, word_id)
);

-- ── Daily Sessions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_sessions (
  id               TEXT PRIMARY KEY,        -- UUID v4
  user_id          TEXT NOT NULL,
  session_date     TEXT NOT NULL,            -- YYYY-MM-DD
  words_studied    INTEGER NOT NULL DEFAULT 0,
  words_tested     INTEGER NOT NULL DEFAULT 0,
  correct_count    INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  completed        INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Test Results ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_results (
  id            TEXT PRIMARY KEY,            -- UUID v4
  user_id       TEXT NOT NULL,
  word_id       INTEGER NOT NULL,
  session_id    TEXT,
  question_type TEXT,                        -- e.g. 'meaning', 'reading', 'kanji'
  is_correct    INTEGER NOT NULL DEFAULT 0,  -- 0 or 1
  answered_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id)    REFERENCES users(id)           ON DELETE CASCADE,
  FOREIGN KEY (word_id)    REFERENCES words(id)           ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES daily_sessions(id)  ON DELETE SET NULL
);

-- ── Streaks ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS streaks (
  user_id          TEXT PRIMARY KEY,
  current_streak   INTEGER NOT NULL DEFAULT 0,
  longest_streak   INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,                     -- YYYY-MM-DD
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Badges ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badges (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  key         TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  description TEXT,
  icon        TEXT                            -- emoji or icon name
);

-- ── User Badges (join table) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS user_badges (
  user_id   TEXT NOT NULL,
  badge_id  INTEGER NOT NULL,
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, badge_id),
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
);

-- ── AI Settings (per user) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_settings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL UNIQUE,
  is_enabled INTEGER NOT NULL DEFAULT 0,
  provider   TEXT,                           -- e.g. 'openai', 'anthropic'
  base_url   TEXT,
  api_key    TEXT,                           -- encrypted at app level
  model_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── AI Word Explanation Cache ─────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_word_cache (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id     INTEGER NOT NULL,
  user_id     TEXT NOT NULL,
  explanation TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── AI Generated Test Questions ───────────────────────────────
CREATE TABLE IF NOT EXISTS ai_test_questions (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  word_id          INTEGER,
  question_type    TEXT NOT NULL,
  question_text    TEXT NOT NULL,
  correct_answer   TEXT,
  context          TEXT,
  times_wrong      INTEGER NOT NULL DEFAULT 0,
  times_correct    INTEGER NOT NULL DEFAULT 0,
  last_answered_at TEXT,
  is_resolved      INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE SET NULL
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- ── Levels ───────────────────────────────────────────────────
INSERT OR IGNORE INTO levels (code, label, is_active) VALUES
  ('N5', 'JLPT N5', 0),
  ('N4', 'JLPT N4', 0),
  ('N3', 'JLPT N3', 0),
  ('N2', 'JLPT N2', 0),
  ('N1', 'JLPT N1', 0);

-- ── Categories for each level ────────────────────────────────
-- We use a CTE to generate the cross‑product so this stays DRY.
-- SQLite doesn't have generate_series out of the box, so we do it
-- the explicit way — one INSERT per (level, category) pair.

-- N5 categories
INSERT OR IGNORE INTO categories (level_id, name, type)
  SELECT l.id, c.name, c.type
  FROM levels l,
       (SELECT 'Kata Benda' AS name, 'vocabulary' AS type
        UNION ALL SELECT 'Kata Kerja',  'vocabulary'
        UNION ALL SELECT 'Kata Sifat',  'vocabulary'
        UNION ALL SELECT 'Lainnya',     'vocabulary'
        UNION ALL SELECT 'Kanji',       'kanji'
        UNION ALL SELECT 'Grammar',     'grammar') c
  WHERE l.code = 'N5'
  AND NOT EXISTS (
    SELECT 1 FROM categories cat
    WHERE cat.level_id = l.id AND cat.name = c.name
  );

-- N4 categories
INSERT OR IGNORE INTO categories (level_id, name, type)
  SELECT l.id, c.name, c.type
  FROM levels l,
       (SELECT 'Kata Benda' AS name, 'vocabulary' AS type
        UNION ALL SELECT 'Kata Kerja',  'vocabulary'
        UNION ALL SELECT 'Kata Sifat',  'vocabulary'
        UNION ALL SELECT 'Lainnya',     'vocabulary'
        UNION ALL SELECT 'Kanji',       'kanji'
        UNION ALL SELECT 'Grammar',     'grammar') c
  WHERE l.code = 'N4'
  AND NOT EXISTS (
    SELECT 1 FROM categories cat
    WHERE cat.level_id = l.id AND cat.name = c.name
  );

-- N3 categories
INSERT OR IGNORE INTO categories (level_id, name, type)
  SELECT l.id, c.name, c.type
  FROM levels l,
       (SELECT 'Kata Benda' AS name, 'vocabulary' AS type
        UNION ALL SELECT 'Kata Kerja',  'vocabulary'
        UNION ALL SELECT 'Kata Sifat',  'vocabulary'
        UNION ALL SELECT 'Lainnya',     'vocabulary'
        UNION ALL SELECT 'Kanji',       'kanji'
        UNION ALL SELECT 'Grammar',     'grammar') c
  WHERE l.code = 'N3'
  AND NOT EXISTS (
    SELECT 1 FROM categories cat
    WHERE cat.level_id = l.id AND cat.name = c.name
  );

-- N2 categories
INSERT OR IGNORE INTO categories (level_id, name, type)
  SELECT l.id, c.name, c.type
  FROM levels l,
       (SELECT 'Kata Benda' AS name, 'vocabulary' AS type
        UNION ALL SELECT 'Kata Kerja',  'vocabulary'
        UNION ALL SELECT 'Kata Sifat',  'vocabulary'
        UNION ALL SELECT 'Lainnya',     'vocabulary'
        UNION ALL SELECT 'Kanji',       'kanji'
        UNION ALL SELECT 'Grammar',     'grammar') c
  WHERE l.code = 'N2'
  AND NOT EXISTS (
    SELECT 1 FROM categories cat
    WHERE cat.level_id = l.id AND cat.name = c.name
  );

-- N1 categories
INSERT OR IGNORE INTO categories (level_id, name, type)
  SELECT l.id, c.name, c.type
  FROM levels l,
       (SELECT 'Kata Benda' AS name, 'vocabulary' AS type
        UNION ALL SELECT 'Kata Kerja',  'vocabulary'
        UNION ALL SELECT 'Kata Sifat',  'vocabulary'
        UNION ALL SELECT 'Lainnya',     'vocabulary'
        UNION ALL SELECT 'Kanji',       'kanji'
        UNION ALL SELECT 'Grammar',     'grammar') c
  WHERE l.code = 'N1'
  AND NOT EXISTS (
    SELECT 1 FROM categories cat
    WHERE cat.level_id = l.id AND cat.name = c.name
  );

-- ── Badges ───────────────────────────────────────────────────
INSERT OR IGNORE INTO badges (key, label, description, icon) VALUES
  ('first_word',   'First Step',       'Studied your very first word',                     '🎯'),
  ('first_100',    'Century',          'Studied 100 words',                                '💯'),
  ('first_500',    'Half Thousand',    'Studied 500 words',                                '🔥'),
  ('streak_7',     'Week Warrior',     'Maintained a 7‑day study streak',                  '📅'),
  ('streak_30',    'Monthly Master',   'Maintained a 30‑day study streak',                 '🏆'),
  ('n5_complete',  'N5 Graduate',      'Completed all N5 words',                           '🎓'),
  ('test_perfect', 'Perfect Score',    'Got 100 % on a test session',                      '⭐'),
  ('speed_demon',  'Speed Demon',      'Completed a session in under 2 minutes',           '⚡');
