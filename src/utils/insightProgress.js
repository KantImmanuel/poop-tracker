import api from '../services/api';
import { getGuestStats } from '../services/guestStorage';

/**
 * Fetches current insight progress (counts + whether user has already analyzed).
 * Uses localStorage to short-circuit once the user has run their first analysis.
 *
 * @param {boolean} isGuest
 * @returns {Promise<{ mealsCount, poopsCount, daysCovered, hasAnalyzed }>}
 */
export async function fetchInsightProgress(isGuest) {
  // Short-circuit if we already know they've analyzed
  if (localStorage.getItem('insightsGenerated') === 'true') {
    return { mealsCount: 0, poopsCount: 0, daysCovered: 0, hasAnalyzed: true };
  }

  try {
    if (isGuest) {
      const stats = await getGuestStats();
      return {
        mealsCount: stats.totalMeals || 0,
        poopsCount: stats.totalPoops || 0,
        daysCovered: stats.daysCovered || 0,
        hasAnalyzed: false,
      };
    }

    const response = await api.get('/insights/correlations');
    const data = response.data;

    if (data.lastAnalyzed) {
      localStorage.setItem('insightsGenerated', 'true');
      return { mealsCount: 0, poopsCount: 0, daysCovered: 0, hasAnalyzed: true };
    }

    return {
      mealsCount: data.totalMeals || 0,
      poopsCount: data.totalPoops || 0,
      daysCovered: data.daysCovered || 0,
      hasAnalyzed: false,
    };
  } catch {
    // If the fetch fails, just don't show a progress message
    return { mealsCount: 0, poopsCount: 0, daysCovered: 0, hasAnalyzed: true };
  }
}
