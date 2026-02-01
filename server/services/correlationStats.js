/**
 * Pre-compute ingredient-level correlation statistics.
 *
 * For each poop, look backward 6-36 hours for meals.
 * Ingredients in those meals get a "suspect" tally.
 * Meals NOT followed by a poop within 6-36h mark their ingredients as "safe".
 *
 * This runs before sending anything to the LLM so the AI
 * receives numbers, not raw data — reducing hallucination.
 */

const WINDOW_MIN_H = 6;
const WINDOW_MAX_H = 36;
const MS_PER_H = 60 * 60 * 1000;

function computeCorrelationStats(meals, poops) {
  const ingredientMap = {}; // name → { suspect, safe, lags[], bristolTypes[], symptoms[] }

  const mealTimes = meals.map(m => ({
    ts: new Date(m.timestamp).getTime(),
    ingredients: extractIngredients(m)
  }));

  const poopData = poops.map(p => ({
    ts: new Date(p.timestamp).getTime(),
    bristol: p.severity || null,
    symptoms: Array.isArray(p.symptoms) ? p.symptoms
      : (typeof p.symptoms === 'string' ? (() => { try { return JSON.parse(p.symptoms); } catch { return []; } })() : [])
  }));

  const poopTimes = poopData.map(p => p.ts);

  // Track which meals are "suspect" (followed by poop in window)
  const suspectMealIdx = new Set();

  for (const poop of poopData) {
    const windowStart = poop.ts - WINDOW_MAX_H * MS_PER_H;
    const windowEnd = poop.ts - WINDOW_MIN_H * MS_PER_H;

    for (let i = 0; i < mealTimes.length; i++) {
      const mt = mealTimes[i];
      if (mt.ts >= windowStart && mt.ts <= windowEnd) {
        suspectMealIdx.add(i);
        const lagH = (poop.ts - mt.ts) / MS_PER_H;

        for (const ing of mt.ingredients) {
          if (!ingredientMap[ing]) {
            ingredientMap[ing] = { suspect: 0, safe: 0, lags: [], bristolTypes: [], symptoms: [] };
          }
          ingredientMap[ing].suspect++;
          ingredientMap[ing].lags.push(lagH);
          if (poop.bristol) ingredientMap[ing].bristolTypes.push(poop.bristol);
          if (poop.symptoms.length > 0) ingredientMap[ing].symptoms.push(...poop.symptoms);
        }
      }
    }
  }

  // Mark remaining meals as safe
  for (let i = 0; i < mealTimes.length; i++) {
    if (!suspectMealIdx.has(i)) {
      for (const ing of mealTimes[i].ingredients) {
        if (!ingredientMap[ing]) {
          ingredientMap[ing] = { suspect: 0, safe: 0, lags: [], bristolTypes: [], symptoms: [] };
        }
        ingredientMap[ing].safe++;
      }
    }
  }

  // Build final stats — only include ingredients seen at least twice
  const ingredients = {};
  for (const [name, data] of Object.entries(ingredientMap)) {
    const total = data.suspect + data.safe;
    if (total < 2) continue;

    const entry = {
      total,
      suspect: data.suspect,
      safe: data.safe,
      suspectRate: +(data.suspect / total).toFixed(2),
      avgLagHours: data.lags.length > 0
        ? +median(data.lags).toFixed(1)
        : null
    };

    // Include Bristol type breakdown if available
    if (data.bristolTypes.length > 0) {
      const bristolCounts = {};
      for (const t of data.bristolTypes) {
        bristolCounts[t] = (bristolCounts[t] || 0) + 1;
      }
      entry.bristolBreakdown = bristolCounts;
    }

    // Include top symptoms if available
    if (data.symptoms.length > 0) {
      const symptomCounts = {};
      for (const s of data.symptoms) {
        symptomCounts[s] = (symptomCounts[s] || 0) + 1;
      }
      // Sort by count descending, take top 3
      entry.topSymptoms = Object.entries(symptomCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));
    }

    ingredients[name] = entry;
  }

  // Overall Bristol distribution
  const bristolDist = {};
  const symptomDist = {};
  for (const p of poopData) {
    if (p.bristol) bristolDist[p.bristol] = (bristolDist[p.bristol] || 0) + 1;
    for (const s of p.symptoms) {
      symptomDist[s] = (symptomDist[s] || 0) + 1;
    }
  }

  // Span in days
  const allTimes = [
    ...mealTimes.map(m => m.ts),
    ...poopTimes
  ];
  const spanDays = allTimes.length >= 2
    ? Math.ceil((Math.max(...allTimes) - Math.min(...allTimes)) / (24 * MS_PER_H))
    : 0;

  return {
    ingredients,
    totalMeals: meals.length,
    totalPoops: poops.length,
    spanDays,
    bristolDistribution: Object.keys(bristolDist).length > 0 ? bristolDist : null,
    symptomDistribution: Object.keys(symptomDist).length > 0 ? symptomDist : null
  };
}

function extractIngredients(meal) {
  const set = new Set();
  if (meal.foods) {
    for (const food of meal.foods) {
      if (food.ingredients && Array.isArray(food.ingredients)) {
        for (const ing of food.ingredients) {
          set.add(ing.toLowerCase().trim());
        }
      }
    }
  }
  return [...set];
}

function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

module.exports = { computeCorrelationStats };
