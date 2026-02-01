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

const { normalizeIngredient } = require('./ingredientNormalizer');

const WINDOW_MIN_H = 6;
const WINDOW_MAX_H = 36;
const MS_PER_H = 60 * 60 * 1000;

function computeCorrelationStats(meals, poops) {
  const ingredientMap = {}; // name → { suspect, safe, severeSuspect, lowConfidence, lags[], bristolTypes[], symptoms[] }

  const mealTimes = meals.map(m => {
    const extracted = extractIngredients(m);
    return {
      ts: new Date(m.timestamp).getTime(),
      ingredients: extracted.ingredients,
      confidence: extracted.confidence
    };
  });

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

        const isSevere = poop.bristol && parseInt(poop.bristol) >= 5;

        for (const ing of mt.ingredients) {
          if (!ingredientMap[ing]) {
            ingredientMap[ing] = { suspect: 0, safe: 0, severeSuspect: 0, lowConfidence: 0, lags: [], bristolTypes: [], symptoms: [] };
          }
          ingredientMap[ing].suspect++;
          if (isSevere) ingredientMap[ing].severeSuspect++;
          if (mt.confidence < 0.7) ingredientMap[ing].lowConfidence++;
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
          ingredientMap[ing] = { suspect: 0, safe: 0, severeSuspect: 0, lowConfidence: 0, lags: [], bristolTypes: [], symptoms: [] };
        }
        ingredientMap[ing].safe++;
        if (mealTimes[i].confidence < 0.7) ingredientMap[ing].lowConfidence++;
      }
    }
  }

  // Build final stats — only include ingredients seen at least twice
  const ingredients = {};
  for (const [name, data] of Object.entries(ingredientMap)) {
    const total = data.suspect + data.safe;
    if (total < 2) continue;

    const { category } = normalizeIngredient(name);

    const entry = {
      total,
      suspect: data.suspect,
      safe: data.safe,
      suspectRate: +(data.suspect / total).toFixed(2),
      severeSuspect: data.severeSuspect,
      severeSuspectRate: +(data.severeSuspect / total).toFixed(2),
      avgLagHours: data.lags.length > 0
        ? +median(data.lags).toFixed(1)
        : null,
      category,
      lowConfidenceCount: data.lowConfidence
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

  // Temporal trend: split at chronological midpoint
  let temporalTrend = null;
  const sortedTimes = [...allTimes].sort((a, b) => a - b);
  if (sortedTimes.length >= 4 && spanDays >= 4) {
    const midTs = sortedTimes[Math.floor(sortedTimes.length / 2)];

    const computeHalfStats = (filterPoops, filterMeals) => {
      const halfBristol = {};
      const halfSymptoms = {};
      let bristolSum = 0;
      let bristolCount = 0;
      for (const p of filterPoops) {
        if (p.bristol) {
          halfBristol[p.bristol] = (halfBristol[p.bristol] || 0) + 1;
          bristolSum += parseInt(p.bristol);
          bristolCount++;
        }
        for (const s of p.symptoms) {
          halfSymptoms[s] = (halfSymptoms[s] || 0) + 1;
        }
      }
      const halfTimes = [...filterMeals.map(m => m.ts), ...filterPoops.map(p => p.ts)];
      const halfDays = halfTimes.length >= 2
        ? Math.max(1, Math.ceil((Math.max(...halfTimes) - Math.min(...halfTimes)) / (24 * MS_PER_H)))
        : 1;
      return {
        poopCount: filterPoops.length,
        mealCount: filterMeals.length,
        days: halfDays,
        poopsPerDay: +(filterPoops.length / halfDays).toFixed(1),
        avgBristol: bristolCount > 0 ? +(bristolSum / bristolCount).toFixed(1) : null,
        bristolDistribution: Object.keys(halfBristol).length > 0 ? halfBristol : null,
        symptomCounts: Object.keys(halfSymptoms).length > 0 ? halfSymptoms : null
      };
    };

    const firstHalfPoops = poopData.filter(p => p.ts < midTs);
    const secondHalfPoops = poopData.filter(p => p.ts >= midTs);
    const firstHalfMeals = mealTimes.filter(m => m.ts < midTs);
    const secondHalfMeals = mealTimes.filter(m => m.ts >= midTs);

    temporalTrend = {
      firstHalf: computeHalfStats(firstHalfPoops, firstHalfMeals),
      secondHalf: computeHalfStats(secondHalfPoops, secondHalfMeals),
      midpointDate: new Date(midTs).toISOString().slice(0, 10)
    };
  }

  return {
    ingredients,
    totalMeals: meals.length,
    totalPoops: poops.length,
    spanDays,
    poopsPerDay: spanDays > 0 ? +(poops.length / spanDays).toFixed(1) : null,
    bristolDistribution: Object.keys(bristolDist).length > 0 ? bristolDist : null,
    symptomDistribution: Object.keys(symptomDist).length > 0 ? symptomDist : null,
    temporalTrend
  };
}

function extractIngredients(meal) {
  const set = new Set();
  let minConfidence = 1.0;
  if (meal.foods) {
    for (const food of meal.foods) {
      if (food.confidence != null && food.confidence < minConfidence) {
        minConfidence = food.confidence;
      }
      if (food.ingredients && Array.isArray(food.ingredients)) {
        for (const ing of food.ingredients) {
          const { canonical } = normalizeIngredient(ing);
          set.add(canonical);
        }
      }
    }
  }
  return { ingredients: [...set], confidence: minConfidence };
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
