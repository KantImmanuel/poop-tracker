const { computeCorrelationStats } = require('../correlationStats');

// Helper: create a meal object
function meal(timestamp, ingredients, confidence = 1.0) {
  return {
    timestamp,
    foods: [{
      name: 'test food',
      ingredients,
      confidence
    }]
  };
}

// Helper: create a poop object
function poop(timestamp, severity = '4', symptoms = []) {
  return { timestamp, severity, symptoms };
}

// Helper: date offset from base
function hoursFrom(base, h) {
  return new Date(base.getTime() + h * 60 * 60 * 1000).toISOString();
}

const BASE = new Date('2025-01-15T08:00:00Z');

describe('computeCorrelationStats', () => {
  describe('suspect/safe classification', () => {
    test('meal followed by poop 12h later → ingredient is suspect', () => {
      const meals = [meal(hoursFrom(BASE, 0), ['milk', 'rice'])];
      const poops = [poop(hoursFrom(BASE, 12), '5', ['bloating'])];

      // Need at least 2 occurrences for stats, add a safe meal
      meals.push(meal(hoursFrom(BASE, 72), ['milk', 'rice']));

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.milk.suspect).toBe(1);
      expect(stats.ingredients.milk.safe).toBe(1);
      expect(stats.ingredients.milk.suspectRate).toBe(0.5);
    });

    test('meal + poop 4h later (< 6h min) → ingredient is safe', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['garlic']),
        meal(hoursFrom(BASE, 48), ['garlic'])
      ];
      const poops = [poop(hoursFrom(BASE, 4))]; // only 4h later

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.garlic.suspect).toBe(0);
      expect(stats.ingredients.garlic.safe).toBe(2);
    });

    test('meal + poop 40h later (> 36h max) → ingredient is safe', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['onion']),
        meal(hoursFrom(BASE, 48), ['onion'])
      ];
      const poops = [poop(hoursFrom(BASE, 40))]; // 40h > 36h max

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.onion.suspect).toBe(0);
      expect(stats.ingredients.onion.safe).toBe(2);
    });

    test('meal exactly at 6h boundary → suspect', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['wheat']),
        meal(hoursFrom(BASE, 48), ['wheat'])
      ];
      const poops = [poop(hoursFrom(BASE, 6), '5', ['bloating'])];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.wheat.suspect).toBe(1);
    });

    test('meal exactly at 36h boundary → suspect', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['barley']),
        meal(hoursFrom(BASE, 48), ['barley'])
      ];
      const poops = [poop(hoursFrom(BASE, 36), '6', ['cramps'])];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.barley.suspect).toBe(1);
    });
  });

  describe('severity-weighted scoring', () => {
    test('Bristol 6 poop → severeSuspect increments', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['cream']),
        meal(hoursFrom(BASE, 48), ['cream'])
      ];
      const poops = [poop(hoursFrom(BASE, 12), '6', ['cramps'])];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.cream.severeSuspect).toBe(1);
      expect(stats.ingredients.cream.severeSuspectRate).toBe(0.5);
    });

    test('Bristol 3 poop → severeSuspect does NOT increment', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['butter']),
        meal(hoursFrom(BASE, 48), ['butter'])
      ];
      const poops = [poop(hoursFrom(BASE, 12), '3')];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.butter.severeSuspect).toBe(0);
      expect(stats.ingredients.butter.severeSuspectRate).toBe(0);
    });

    test('Bristol 5 is the threshold for severe', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['cheese']),
        meal(hoursFrom(BASE, 48), ['cheese'])
      ];
      const poops = [poop(hoursFrom(BASE, 12), '5')];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.cheese.severeSuspect).toBe(1);
    });
  });

  describe('ingredient normalization', () => {
    test('normalizes "cheddar cheese" and "mozzarella" both to cheese', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['cheddar cheese']),
        meal(hoursFrom(BASE, 48), ['mozzarella'])
      ];
      const poops = [
        poop(hoursFrom(BASE, 12), '5'),
        poop(hoursFrom(BASE, 60), '6')
      ];

      const stats = computeCorrelationStats(meals, poops);
      // Both should be merged into "cheese"
      expect(stats.ingredients.cheese).toBeDefined();
      expect(stats.ingredients.cheese.total).toBe(2);
      expect(stats.ingredients['cheddar cheese']).toBeUndefined();
      expect(stats.ingredients['mozzarella']).toBeUndefined();
    });

    test('normalizes "2%milk" (no space) to milk', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['2%milk']),
        meal(hoursFrom(BASE, 48), ['milk'])
      ];
      const poops = [poop(hoursFrom(BASE, 12), '5')];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.milk).toBeDefined();
      expect(stats.ingredients.milk.total).toBe(2);
    });
  });

  describe('threshold filtering', () => {
    test('ingredient eaten only once → excluded from results', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['rice', 'rare-spice']),
        meal(hoursFrom(BASE, 24), ['rice'])
      ];
      const poops = [poop(hoursFrom(BASE, 12))];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.rice).toBeDefined();
      expect(stats.ingredients['rare-spice']).toBeUndefined(); // only 1 occurrence
    });
  });

  describe('ingredient deduplication', () => {
    test('same ingredient in two foods of one meal → counted once', () => {
      const meals = [
        {
          timestamp: hoursFrom(BASE, 0),
          foods: [
            { name: 'pasta', ingredients: ['wheat', 'salt'], confidence: 1.0 },
            { name: 'bread', ingredients: ['wheat', 'yeast'], confidence: 1.0 }
          ]
        },
        meal(hoursFrom(BASE, 48), ['wheat'])
      ];
      const poops = [poop(hoursFrom(BASE, 12), '5', ['bloating'])];

      const stats = computeCorrelationStats(meals, poops);
      // wheat appears in both foods of meal 1, but should count as 1 suspect
      expect(stats.ingredients.wheat.suspect).toBe(1);
      expect(stats.ingredients.wheat.total).toBe(2);
    });
  });

  describe('Bristol breakdown', () => {
    test('tracks per-ingredient Bristol type distribution', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['garlic']),
        meal(hoursFrom(BASE, 48), ['garlic']),
        meal(hoursFrom(BASE, 96), ['garlic'])
      ];
      const poops = [
        poop(hoursFrom(BASE, 12), '5'),
        poop(hoursFrom(BASE, 60), '6')
      ];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.garlic.bristolBreakdown).toEqual({ '5': 1, '6': 1 });
    });
  });

  describe('symptom tracking', () => {
    test('tracks top 3 symptoms per ingredient', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['onion']),
        meal(hoursFrom(BASE, 48), ['onion']),
        meal(hoursFrom(BASE, 96), ['onion'])
      ];
      const poops = [
        poop(hoursFrom(BASE, 12), '5', ['bloating', 'cramps', 'gas', 'nausea']),
        poop(hoursFrom(BASE, 60), '6', ['bloating', 'cramps'])
      ];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.onion.topSymptoms).toHaveLength(3);
      expect(stats.ingredients.onion.topSymptoms[0].name).toBe('bloating');
      expect(stats.ingredients.onion.topSymptoms[0].count).toBe(2);
    });
  });

  describe('category tracking', () => {
    test('includes category from normalizer', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['garlic']),
        meal(hoursFrom(BASE, 48), ['garlic'])
      ];
      const poops = [poop(hoursFrom(BASE, 12))];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.garlic.category).toBe('alliums');
    });

    test('unknown ingredients have null category', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['rice']),
        meal(hoursFrom(BASE, 48), ['rice'])
      ];
      const poops = [poop(hoursFrom(BASE, 12))];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.rice.category).toBeNull();
    });
  });

  describe('confidence tracking', () => {
    test('tracks low confidence count for uncertain photos', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['milk'], 0.5),   // low confidence
        meal(hoursFrom(BASE, 48), ['milk'], 0.9),   // high confidence
        meal(hoursFrom(BASE, 96), ['milk'], 0.3)    // low confidence
      ];
      const poops = [
        poop(hoursFrom(BASE, 12), '5'),
        poop(hoursFrom(BASE, 60), '4')
      ];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.milk.lowConfidenceCount).toBe(2); // 2 meals < 0.7
    });

    test('high confidence meals have 0 low confidence count', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['rice'], 0.95),
        meal(hoursFrom(BASE, 48), ['rice'], 0.8)
      ];
      const poops = [poop(hoursFrom(BASE, 12))];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.rice.lowConfidenceCount).toBe(0);
    });
  });

  describe('overall stats', () => {
    test('poopsPerDay computed correctly', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['rice']),
        meal(hoursFrom(BASE, 48), ['rice'])
      ];
      const poops = [
        poop(hoursFrom(BASE, 12)),
        poop(hoursFrom(BASE, 36)),
        poop(hoursFrom(BASE, 60))
      ];

      const stats = computeCorrelationStats(meals, poops);
      // 3 poops over ~60h ≈ 2.5 days → ~1.2/day
      expect(stats.poopsPerDay).toBeGreaterThan(0);
      expect(stats.totalPoops).toBe(3);
      expect(stats.totalMeals).toBe(2);
    });

    test('Bristol distribution is overall', () => {
      const meals = [meal(hoursFrom(BASE, 0), ['rice']), meal(hoursFrom(BASE, 48), ['rice'])];
      const poops = [
        poop(hoursFrom(BASE, 12), '4'),
        poop(hoursFrom(BASE, 36), '5'),
        poop(hoursFrom(BASE, 60), '4')
      ];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.bristolDistribution).toEqual({ '4': 2, '5': 1 });
    });
  });

  describe('temporal trend', () => {
    test('populates temporalTrend when data spans 4+ days with enough events', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['rice']),     // day 1
        meal(hoursFrom(BASE, 24), ['rice']),    // day 2
        meal(hoursFrom(BASE, 120), ['rice']),   // day 6
        meal(hoursFrom(BASE, 144), ['rice'])    // day 7
      ];
      const poops = [
        poop(hoursFrom(BASE, 12), '6', ['cramps']),
        poop(hoursFrom(BASE, 36), '5', ['bloating']),
        poop(hoursFrom(BASE, 132), '3'),
        poop(hoursFrom(BASE, 156), '4')
      ];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.temporalTrend).not.toBeNull();
      expect(stats.temporalTrend.firstHalf).toBeDefined();
      expect(stats.temporalTrend.secondHalf).toBeDefined();
      expect(stats.temporalTrend.midpointDate).toBeDefined();
    });

    test('temporalTrend is null with too little data', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['rice']),
        meal(hoursFrom(BASE, 12), ['rice'])
      ];
      const poops = [poop(hoursFrom(BASE, 8))];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.temporalTrend).toBeNull();
    });
  });

  describe('edge cases', () => {
    test('empty meals and poops', () => {
      const stats = computeCorrelationStats([], []);
      expect(stats.ingredients).toEqual({});
      expect(stats.totalMeals).toBe(0);
      expect(stats.totalPoops).toBe(0);
    });

    test('meals with no ingredients', () => {
      const meals = [{ timestamp: hoursFrom(BASE, 0), foods: [{ name: 'unknown', ingredients: [], confidence: 0.3 }] }];
      const poops = [poop(hoursFrom(BASE, 12))];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients).toEqual({});
    });
  });

  describe('co-occurrence tracking', () => {
    test('two ingredients in same meal have co-occurrence tracked', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['garlic', 'cheese']),
        meal(hoursFrom(BASE, 48), ['garlic', 'cheese']),
        meal(hoursFrom(BASE, 96), ['garlic', 'rice'])
      ];
      const poops = [
        poop(hoursFrom(BASE, 12)),
        poop(hoursFrom(BASE, 60))
      ];

      const stats = computeCorrelationStats(meals, poops);
      const garlicCo = stats.ingredients.garlic.topCoOccurrences;
      expect(garlicCo).toBeDefined();
      const cheeseEntry = garlicCo.find(c => c.ingredient === 'cheese');
      expect(cheeseEntry).toBeDefined();
      expect(cheeseEntry.sharedMeals).toBe(2);
    });

    test('co-occurrence tracks suspect meals separately from total', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['garlic', 'cheese']),   // suspect (poop at 12h)
        meal(hoursFrom(BASE, 48), ['garlic', 'cheese']),  // safe (no poop in window)
        meal(hoursFrom(BASE, 96), ['garlic', 'cheese'])   // suspect (poop at 108h)
      ];
      const poops = [
        poop(hoursFrom(BASE, 12), '6', ['cramps']),
        poop(hoursFrom(BASE, 108), '5', ['bloating'])
      ];

      const stats = computeCorrelationStats(meals, poops);
      const cheeseEntry = stats.ingredients.garlic.topCoOccurrences.find(c => c.ingredient === 'cheese');
      expect(cheeseEntry.sharedMeals).toBe(3);
      expect(cheeseEntry.sharedSuspectMeals).toBe(2);
    });

    test('single ingredient meal has no co-occurrences', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['rice']),
        meal(hoursFrom(BASE, 48), ['rice'])
      ];
      const poops = [poop(hoursFrom(BASE, 12))];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.rice.topCoOccurrences).toBeUndefined();
    });

    test('co-occurrence limited to top 5', () => {
      const ings = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
      const meals = [
        meal(hoursFrom(BASE, 0), ings),
        meal(hoursFrom(BASE, 48), ings)
      ];
      const poops = [poop(hoursFrom(BASE, 12))];

      const stats = computeCorrelationStats(meals, poops);
      // Each ingredient co-occurs with 6 others, but should only show top 5
      for (const ing of ings) {
        if (stats.ingredients[ing]?.topCoOccurrences) {
          expect(stats.ingredients[ing].topCoOccurrences.length).toBeLessThanOrEqual(5);
        }
      }
    });

    test('deduplication: wheat in two foods counts as 1 co-occurrence', () => {
      const meals = [
        {
          timestamp: hoursFrom(BASE, 0),
          foods: [
            { name: 'pasta', ingredients: ['wheat', 'garlic'], confidence: 1.0 },
            { name: 'bread', ingredients: ['wheat', 'garlic'], confidence: 1.0 }
          ]
        },
        meal(hoursFrom(BASE, 48), ['wheat', 'garlic'])
      ];
      const poops = [poop(hoursFrom(BASE, 12))];

      const stats = computeCorrelationStats(meals, poops);
      const wheatCo = stats.ingredients.wheat.topCoOccurrences;
      const garlicEntry = wheatCo.find(c => c.ingredient === 'garlic');
      expect(garlicEntry.sharedMeals).toBe(2); // not 3 (deduped per meal)
    });
  });

  describe('frequency spike detection', () => {
    // NOTE: BASE = 2025-01-15T08:00:00Z. To keep poops on the same UTC day,
    // place them between +0h and +15h from day start (08:00-23:00 UTC).

    test('4 poops in one day = spike day, meals in window are freq-suspect', () => {
      // Meal at hour 0 (Jan 15 08:00 UTC)
      // 4 poops at hours 8-11 (Jan 15 16:00-19:00 UTC) — all on Jan 15
      // 1 poop on a different day for baseline contrast
      const meals = [
        meal(hoursFrom(BASE, 0), ['milk', 'cheese']),
        meal(hoursFrom(BASE, 72), ['milk', 'cheese'])   // 2nd occurrence
      ];
      const poops = [
        poop(hoursFrom(BASE, 8), '3'),    // Jan 15 16:00 UTC
        poop(hoursFrom(BASE, 9), '4'),    // Jan 15 17:00 UTC
        poop(hoursFrom(BASE, 10), '3'),   // Jan 15 18:00 UTC
        poop(hoursFrom(BASE, 11), '4'),   // Jan 15 19:00 UTC
        poop(hoursFrom(BASE, 80), '3'),   // Jan 18 16:00 UTC (normal day)
      ];

      const stats = computeCorrelationStats(meals, poops);

      // Quality suspect should be 0 since all poops are Bristol 3-4, no symptoms
      expect(stats.ingredients.milk.suspect).toBe(0);
      // Frequency: Jan 15 has 4 poops, baseline median([4, 1]) = 2.5 → 4 > 3 and 4 > 2.5 → spike
      expect(stats.frequencyAnalysis.totalSpikeDays).toBe(1);
      expect(stats.ingredients.milk.frequencySuspect).toBeGreaterThan(0);
    });

    test('spike day with 5 poops flags meals in 6-36h window as freq-suspect', () => {
      // Meal at hour 0 (Jan 15 08:00 UTC)
      // 5 poops at hours 8-12 (Jan 15 16:00-20:00 UTC) — all on Jan 15
      // Meal at hour 72 + 1 poop at hour 80 (Jan 18, normal day)
      const meals = [
        meal(hoursFrom(BASE, 0), ['garlic', 'onion']),
        meal(hoursFrom(BASE, 72), ['garlic', 'onion'])
      ];
      const poops = [
        poop(hoursFrom(BASE, 8), '3'),
        poop(hoursFrom(BASE, 9), '3'),
        poop(hoursFrom(BASE, 10), '4'),
        poop(hoursFrom(BASE, 11), '3'),
        poop(hoursFrom(BASE, 12), '4'),
        poop(hoursFrom(BASE, 80), '3'),   // Jan 18 (normal day)
      ];

      const stats = computeCorrelationStats(meals, poops);

      // Quality: all Bristol 3-4, no symptoms → no quality suspects
      expect(stats.ingredients.garlic.suspect).toBe(0);

      // Frequency: Jan 15 has 5 poops, median([5, 1]) = 3, 5 > 3 → spike
      expect(stats.frequencyAnalysis.totalSpikeDays).toBe(1);

      // garlic/onion should be freq-suspect because meal was in window of spike day poops
      expect(stats.ingredients.garlic.frequencySuspect).toBeGreaterThan(0);
      expect(stats.ingredients.onion.frequencySuspect).toBeGreaterThan(0);
    });

    test('3 poops/day is NOT a spike (within healthy range)', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['rice']),
        meal(hoursFrom(BASE, 48), ['rice'])
      ];
      // 3 poops on Jan 15 (within healthy range of 1-3)
      const poops = [
        poop(hoursFrom(BASE, 8), '3'),
        poop(hoursFrom(BASE, 10), '3'),
        poop(hoursFrom(BASE, 12), '3'),
      ];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.rice.frequencySuspect).toBe(0);
      expect(stats.frequencyAnalysis.totalSpikeDays).toBe(0);
    });

    test('high baseline user (5/day) only flags days above their baseline', () => {
      // User poops ~5 times every day. Day with 7 = spike. Day with 5 = normal for them.
      const meals = [];
      const poops = [];

      // Days 0-3: 5 poops each day, spaced within UTC daytime (hours 0-8 offset per day)
      for (let day = 0; day < 4; day++) {
        meals.push(meal(hoursFrom(BASE, day * 24), ['rice', 'chicken']));
        for (let p = 0; p < 5; p++) {
          poops.push(poop(hoursFrom(BASE, day * 24 + 2 + p * 2), '3'));
        }
      }
      // Day 4: trigger meal + 7 poops spaced 1h apart (stay within same UTC day)
      meals.push(meal(hoursFrom(BASE, 96), ['dairy', 'cream']));
      meals.push(meal(hoursFrom(BASE, 0), ['dairy', 'cream'])); // 2nd occurrence
      for (let p = 0; p < 7; p++) {
        poops.push(poop(hoursFrom(BASE, 96 + 2 + p), '3'));
      }

      const stats = computeCorrelationStats(meals, poops);

      expect(stats.frequencyAnalysis.highBaseline).toBe(true);
      expect(stats.frequencyAnalysis.baselineFrequency).toBeGreaterThan(3);
      // Day 4 with 7 poops should be a spike above baseline of 5
      expect(stats.frequencyAnalysis.totalSpikeDays).toBeGreaterThanOrEqual(1);
    });

    test('frequencyAnalysis contains correct structure', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['rice']),
        meal(hoursFrom(BASE, 48), ['rice'])
      ];
      const poops = [
        poop(hoursFrom(BASE, 8), '4'),
        poop(hoursFrom(BASE, 56), '3'),
      ];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.frequencyAnalysis).toEqual(expect.objectContaining({
        baselineFrequency: expect.any(Number),
        highBaseline: expect.any(Boolean),
        spikeDays: expect.any(Array),
        totalSpikeDays: expect.any(Number),
        daysTracked: expect.any(Number),
        maxDaily: expect.any(Number),
        minDaily: expect.any(Number),
      }));
    });

    test('frequencyAnalysis is null with no poops', () => {
      const meals = [meal(hoursFrom(BASE, 0), ['rice'])];
      const stats = computeCorrelationStats(meals, []);
      expect(stats.frequencyAnalysis).toBeNull();
    });

    test('frequency suspect does not double-count meals within same spike day', () => {
      // Meal at hour 0, 5 poops at hours 8-12 (all Jan 15 UTC)
      // Second meal + 1 poop on different day for baseline contrast
      const meals = [
        meal(hoursFrom(BASE, 0), ['garlic']),
        meal(hoursFrom(BASE, 48), ['garlic'])
      ];
      const poops = [
        poop(hoursFrom(BASE, 8), '3'),
        poop(hoursFrom(BASE, 9), '3'),
        poop(hoursFrom(BASE, 10), '3'),
        poop(hoursFrom(BASE, 11), '3'),
        poop(hoursFrom(BASE, 12), '3'),
        poop(hoursFrom(BASE, 56), '3'),   // Jan 17 (normal day)
      ];

      const stats = computeCorrelationStats(meals, poops);
      // Should be 1 (one spike day), not 5 (one per poop)
      expect(stats.ingredients.garlic.frequencySuspect).toBe(1);
    });

    test('ingredient with both quality and frequency suspect', () => {
      // Meal at hour 0, 5 poops at hours 8-12 (some Bristol 5+) — all Jan 15 UTC
      // Second meal + 1 poop on different day for baseline contrast
      const meals = [
        meal(hoursFrom(BASE, 0), ['milk']),
        meal(hoursFrom(BASE, 72), ['milk'])
      ];
      const poops = [
        poop(hoursFrom(BASE, 8), '6', ['cramps']),
        poop(hoursFrom(BASE, 9), '5'),
        poop(hoursFrom(BASE, 10), '3'),
        poop(hoursFrom(BASE, 11), '4'),
        poop(hoursFrom(BASE, 12), '3'),
        poop(hoursFrom(BASE, 80), '3'),   // Jan 18 (normal day)
      ];

      const stats = computeCorrelationStats(meals, poops);
      // Quality suspect: poops at 8h (Bristol 6) and 9h (Bristol 5) are abnormal
      expect(stats.ingredients.milk.suspect).toBeGreaterThan(0);
      expect(stats.ingredients.milk.severeSuspect).toBeGreaterThan(0);
      // Frequency suspect: Jan 15 has 5 poops → spike
      expect(stats.ingredients.milk.frequencySuspect).toBeGreaterThan(0);
    });

    test('per-ingredient frequencySuspectRate is computed correctly', () => {
      // Meal 0: before spike day. Meal 1: before normal day. Meal 2: no poops after.
      const meals = [
        meal(hoursFrom(BASE, 0), ['garlic']),
        meal(hoursFrom(BASE, 48), ['garlic']),
        meal(hoursFrom(BASE, 96), ['garlic'])
      ];
      // 5 poops on Jan 15 (hours 8-12), 1 on Jan 17
      const poops = [
        poop(hoursFrom(BASE, 8), '3'),
        poop(hoursFrom(BASE, 9), '3'),
        poop(hoursFrom(BASE, 10), '3'),
        poop(hoursFrom(BASE, 11), '3'),
        poop(hoursFrom(BASE, 12), '3'),
        poop(hoursFrom(BASE, 56), '3'),   // Jan 17 (normal day)
      ];

      const stats = computeCorrelationStats(meals, poops);
      // garlic eaten 3 times, freq-suspect 1 time → rate 0.33
      expect(stats.ingredients.garlic.frequencySuspect).toBe(1);
      expect(stats.ingredients.garlic.frequencySuspectRate).toBeCloseTo(0.33, 1);
    });
  });
});
