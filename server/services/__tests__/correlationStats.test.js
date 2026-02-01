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
      const poops = [poop(hoursFrom(BASE, 6))];

      const stats = computeCorrelationStats(meals, poops);
      expect(stats.ingredients.wheat.suspect).toBe(1);
    });

    test('meal exactly at 36h boundary → suspect', () => {
      const meals = [
        meal(hoursFrom(BASE, 0), ['barley']),
        meal(hoursFrom(BASE, 48), ['barley'])
      ];
      const poops = [poop(hoursFrom(BASE, 36))];

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
      const poops = [poop(hoursFrom(BASE, 12))];

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
        poop(hoursFrom(BASE, 12)),
        poop(hoursFrom(BASE, 108))
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
});
