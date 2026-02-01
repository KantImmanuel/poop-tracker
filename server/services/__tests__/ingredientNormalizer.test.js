const { normalizeIngredient, INGREDIENT_CATEGORIES } = require('../ingredientNormalizer');

describe('normalizeIngredient', () => {
  // Direct canonical matches
  test('maps "whole milk" to milk/dairy', () => {
    expect(normalizeIngredient('whole milk')).toEqual({ canonical: 'milk', category: 'dairy' });
  });

  test('maps "cheddar cheese" to cheese/dairy', () => {
    expect(normalizeIngredient('cheddar cheese')).toEqual({ canonical: 'cheese', category: 'dairy' });
  });

  test('maps "red onion" to onion/alliums', () => {
    expect(normalizeIngredient('red onion')).toEqual({ canonical: 'onion', category: 'alliums' });
  });

  // Case insensitive
  test('handles uppercase: "Whole Milk" → milk', () => {
    expect(normalizeIngredient('Whole Milk')).toEqual({ canonical: 'milk', category: 'dairy' });
  });

  test('handles mixed case: "CHEDDAR CHEESE" → cheese', () => {
    expect(normalizeIngredient('CHEDDAR CHEESE')).toEqual({ canonical: 'cheese', category: 'dairy' });
  });

  // Whitespace handling
  test('trims whitespace: "  garlic  " → garlic', () => {
    expect(normalizeIngredient('  garlic  ')).toEqual({ canonical: 'garlic', category: 'alliums' });
  });

  test('collapses multiple spaces: "red   onion" → onion', () => {
    expect(normalizeIngredient('red   onion')).toEqual({ canonical: 'onion', category: 'alliums' });
  });

  // Percent sign handling
  test('handles "2%milk" (no space) → milk', () => {
    expect(normalizeIngredient('2%milk')).toEqual({ canonical: 'milk', category: 'dairy' });
  });

  test('handles "2% milk" → milk', () => {
    expect(normalizeIngredient('2% milk')).toEqual({ canonical: 'milk', category: 'dairy' });
  });

  // Hyphen handling
  test('handles "all-purpose flour" → flour', () => {
    expect(normalizeIngredient('all-purpose flour')).toEqual({ canonical: 'flour', category: 'gluten grains' });
  });

  test('handles "sun-dried tomatoes" → tomato', () => {
    expect(normalizeIngredient('sun-dried tomatoes')).toEqual({ canonical: 'tomato', category: 'nightshades' });
  });

  // Prep prefix stripping
  test('strips "fresh" prefix: "fresh garlic" → garlic', () => {
    expect(normalizeIngredient('fresh garlic')).toEqual({ canonical: 'garlic', category: 'alliums' });
  });

  test('strips "shredded" prefix: "shredded cheddar cheese" → cheese', () => {
    expect(normalizeIngredient('shredded cheddar cheese')).toEqual({ canonical: 'cheese', category: 'dairy' });
  });

  test('strips "grated" prefix: "grated parmesan" → cheese', () => {
    expect(normalizeIngredient('grated parmesan')).toEqual({ canonical: 'cheese', category: 'dairy' });
  });

  test('strips "diced" prefix: "diced tomatoes" → tomato (via canonical map)', () => {
    // "diced tomatoes" is in canonical map directly
    expect(normalizeIngredient('diced tomatoes')).toEqual({ canonical: 'tomato', category: 'nightshades' });
  });

  test('strips "chopped" prefix: "chopped garlic" → garlic', () => {
    expect(normalizeIngredient('chopped garlic')).toEqual({ canonical: 'garlic', category: 'alliums' });
  });

  // Simple plural handling
  test('handles plural "leeks" → leek', () => {
    expect(normalizeIngredient('leeks')).toEqual({ canonical: 'leek', category: 'alliums' });
  });

  test('handles plural "shallots" → shallot', () => {
    expect(normalizeIngredient('shallots')).toEqual({ canonical: 'shallot', category: 'alliums' });
  });

  // Non-dairy milks should NOT map to dairy
  test('"oat milk" passes through as oat milk, not dairy', () => {
    expect(normalizeIngredient('oat milk')).toEqual({ canonical: 'oat milk', category: null });
  });

  test('"almond milk" passes through, not dairy', () => {
    expect(normalizeIngredient('almond milk')).toEqual({ canonical: 'almond milk', category: null });
  });

  // Unknown ingredients pass through
  test('unknown ingredient "quinoa" passes through with null category', () => {
    expect(normalizeIngredient('quinoa')).toEqual({ canonical: 'quinoa', category: null });
  });

  test('unknown ingredient "chicken breast" passes through', () => {
    expect(normalizeIngredient('chicken breast')).toEqual({ canonical: 'chicken breast', category: null });
  });

  // Edge cases
  test('empty string returns empty with null category', () => {
    expect(normalizeIngredient('')).toEqual({ canonical: '', category: null });
  });

  test('null returns empty with null category', () => {
    expect(normalizeIngredient(null)).toEqual({ canonical: '', category: null });
  });

  test('undefined returns empty with null category', () => {
    expect(normalizeIngredient(undefined)).toEqual({ canonical: '', category: null });
  });

  // Category coverage
  test('each category has at least one ingredient', () => {
    const categories = new Set(Object.values(INGREDIENT_CATEGORIES));
    expect(categories.size).toBeGreaterThanOrEqual(7);
    expect(categories.has('dairy')).toBe(true);
    expect(categories.has('alliums')).toBe(true);
    expect(categories.has('gluten grains')).toBe(true);
    expect(categories.has('spicy')).toBe(true);
    expect(categories.has('nightshades')).toBe(true);
    expect(categories.has('legumes')).toBe(true);
    expect(categories.has('nuts')).toBe(true);
  });

  // Spicy category
  test('maps "jalapeno" (no accent) to jalapeño/spicy', () => {
    expect(normalizeIngredient('jalapeno')).toEqual({ canonical: 'jalapeño', category: 'spicy' });
  });

  test('maps "red pepper flakes" to chili flakes/spicy', () => {
    expect(normalizeIngredient('red pepper flakes')).toEqual({ canonical: 'chili flakes', category: 'spicy' });
  });
});
