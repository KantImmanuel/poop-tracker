/**
 * Determines whether a user has logged enough data to run AI analysis.
 *
 * Ready when:
 *   (mealsCount >= 3 AND poopsCount >= 2)
 *   OR
 *   (daysCovered >= 2 AND mealsCount >= 2 AND poopsCount >= 1)
 */
export function isReadyForInsights({ mealsCount = 0, poopsCount = 0, daysCovered = 0 } = {}) {
  return (
    (mealsCount >= 3 && poopsCount >= 2) ||
    (daysCovered >= 2 && mealsCount >= 2 && poopsCount >= 1)
  );
}

/**
 * Returns a progress-aware message after logging, or null if no message needed.
 * @param {'meal'|'poop'} logType - what was just logged
 * @param {{ mealsCount, poopsCount, daysCovered }} counts - current totals (after the log)
 * @param {boolean} hasAnalyzed - whether user has already run analysis at least once
 */
export function getProgressMessage(logType, { mealsCount = 0, poopsCount = 0, daysCovered = 0 } = {}, hasAnalyzed = false) {
  if (hasAnalyzed) return null;

  const ready = isReadyForInsights({ mealsCount, poopsCount, daysCovered });

  if (ready) {
    return 'You\'re ready! Head to Insights to see your analysis';
  }

  // Check if close (1–2 items away from the primary threshold: 3 meals + 2 poops)
  const mealsNeeded = Math.max(0, 3 - mealsCount);
  const poopsNeeded = Math.max(0, 2 - poopsCount);
  const totalNeeded = mealsNeeded + poopsNeeded;

  if (totalNeeded <= 2 && totalNeeded > 0) {
    const parts = [];
    if (mealsNeeded > 0) parts.push(`${mealsNeeded} more meal${mealsNeeded > 1 ? 's' : ''}`);
    if (poopsNeeded > 0) parts.push(`${poopsNeeded} more poop${poopsNeeded > 1 ? 's' : ''}`);
    return `Almost there! Just ${parts.join(' and ')} to unlock your insights`;
  }

  // General progress
  if (logType === 'meal') {
    return `Logged! ${mealsCount} of 3 meals toward your first insight`;
  }
  return `Logged! ${poopsCount} of 2 poops toward your first insight`;
}
