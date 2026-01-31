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
