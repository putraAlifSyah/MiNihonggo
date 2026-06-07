/**
 * Spaced Repetition System — SM-2 algorithm implementation.
 *
 * Quality scale used in this app:
 *   0 = forgot   (complete blackout)
 *   1 = fuzzy     (recalled with difficulty)
 *   2 = known     (recalled easily)
 *
 * The classic SM-2 uses 0-5.  We map our 0-2 scale:
 *   app 0 → SM-2 quality 1  (complete failure)
 *   app 1 → SM-2 quality 3  (correct with difficulty)
 *   app 2 → SM-2 quality 5  (perfect recall)
 */

/**
 * Map app quality (0/1/2) to SM-2 quality (0-5).
 */
function mapQuality(q) {
  const map = { 0: 1, 1: 3, 2: 5 };
  return map[q] ?? 1;
}

/**
 * Update SRS parameters based on a review.
 *
 * @param {Object} progress — current progress record
 *   { ease_factor, interval_days, repetitions }
 * @param {number} quality — 0 (forgot), 1 (fuzzy), 2 (known)
 * @returns {Object} updated { ease_factor, interval_days, repetitions, next_review_date, status }
 */
function updateSRS(progress, quality) {
  const q = mapQuality(quality);
  let { ease_factor, interval_days, repetitions } = progress;

  // Ensure sensible defaults
  ease_factor = ease_factor || 2.5;
  interval_days = interval_days || 1;
  repetitions = repetitions || 0;

  if (q < 3) {
    // Failed — reset repetitions, short interval
    repetitions = 0;
    interval_days = 1;
  } else {
    // Successful recall
    repetitions += 1;

    if (repetitions === 1) {
      interval_days = 1;
    } else if (repetitions === 2) {
      interval_days = 3;
    } else {
      interval_days = Math.round(interval_days * ease_factor);
    }
  }

  // Update ease factor (SM-2 formula)
  ease_factor = ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  // Clamp ease factor — never go below 1.3
  if (ease_factor < 1.3) ease_factor = 1.3;

  // Round ease_factor to 2 decimal places
  ease_factor = Math.round(ease_factor * 100) / 100;

  // Calculate next review date
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + interval_days);
  const next_review_date = next.toISOString().slice(0, 10); // YYYY-MM-DD

  // Derive human-friendly status from interval
  const status = getStatusFromInterval(interval_days);

  return {
    ease_factor,
    interval_days,
    repetitions,
    next_review_date,
    status,
  };
}

/**
 * Derive a word's study status from its current interval.
 *
 * @param {number} interval — interval in days
 * @returns {'learning'|'reviewing'|'mastered'}
 */
function getStatusFromInterval(interval) {
  if (interval <= 1) return 'learning';
  if (interval < 21) return 'reviewing';
  return 'mastered'; // 21+ days → considered mastered
}

/**
 * Calculate a reasonable words-per-day target given a total word
 * count and a target completion date.
 *
 * @param {number} totalWords — number of words to learn
 * @param {string} targetDate — ISO date string (YYYY-MM-DD)
 * @returns {number} words per day (minimum 1)
 */
function calculateWordsPerDay(totalWords, targetDate) {
  const now = new Date();
  const target = new Date(targetDate);

  // Days remaining (at least 1 to avoid division by zero)
  const diffMs = target.getTime() - now.getTime();
  const daysRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  // We want to see each word ~3 times on average before mastery,
  // so divide total by days, rounding up, with a minimum of 1.
  const perDay = Math.max(1, Math.ceil(totalWords / daysRemaining));
  return perDay;
}

module.exports = {
  updateSRS,
  calculateWordsPerDay,
  getStatusFromInterval,
};
