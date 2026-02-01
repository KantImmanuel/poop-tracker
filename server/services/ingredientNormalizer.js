/**
 * Ingredient normalization for correlation analysis.
 *
 * Maps ingredient variants to canonical names so that
 * "whole milk", "2% milk", "skim milk" all count as "milk".
 *
 * Raw data in the database stays unchanged — normalization
 * only happens in the stats pipeline.
 */

// canonical name → category
const INGREDIENT_CATEGORIES = {
  // Dairy
  milk: 'dairy',
  cream: 'dairy',
  butter: 'dairy',
  cheese: 'dairy',
  yogurt: 'dairy',
  'ice cream': 'dairy',
  whey: 'dairy',
  ghee: 'dairy',

  // Alliums
  garlic: 'alliums',
  onion: 'alliums',
  scallion: 'alliums',
  shallot: 'alliums',
  leek: 'alliums',
  chives: 'alliums',

  // Gluten grains
  wheat: 'gluten grains',
  flour: 'gluten grains',
  breadcrumbs: 'gluten grains',
  semolina: 'gluten grains',
  barley: 'gluten grains',
  rye: 'gluten grains',

  // Spicy
  'hot sauce': 'spicy',
  cayenne: 'spicy',
  'chili pepper': 'spicy',
  'chili flakes': 'spicy',
  jalapeño: 'spicy',
  habanero: 'spicy',
  sriracha: 'spicy',
  tabasco: 'spicy',
  'chili powder': 'spicy',

  // Nightshades
  tomato: 'nightshades',
  'bell pepper': 'nightshades',
  eggplant: 'nightshades',

  // Legumes
  beans: 'legumes',
  chickpeas: 'legumes',
  lentils: 'legumes',
  hummus: 'legumes',

  // Nuts
  peanut: 'nuts',
  almond: 'nuts',
  cashew: 'nuts',
  walnut: 'nuts',
  pistachio: 'nuts',
  'peanut butter': 'nuts',
  'almond butter': 'nuts',
};

// variant → canonical name
const CANONICAL_MAP = {
  // Dairy variants → canonical
  'whole milk': 'milk',
  '2% milk': 'milk',
  '2 milk': 'milk', // after percent sign removal
  'skim milk': 'milk',
  'oat milk': 'oat milk', // not dairy — pass through
  'almond milk': 'almond milk', // not dairy
  'coconut milk': 'coconut milk', // not dairy
  'soy milk': 'soy milk', // not dairy
  'heavy cream': 'cream',
  'sour cream': 'cream',
  'whipping cream': 'cream',
  'double cream': 'cream',
  'light cream': 'cream',
  'half and half': 'cream',
  'half & half': 'cream',
  'cheddar cheese': 'cheese',
  'cheddar': 'cheese',
  'mozzarella cheese': 'cheese',
  'mozzarella': 'cheese',
  'parmesan cheese': 'cheese',
  'parmesan': 'cheese',
  'parmigiano reggiano': 'cheese',
  'feta cheese': 'cheese',
  'feta': 'cheese',
  'brie': 'cheese',
  'gouda': 'cheese',
  'cream cheese': 'cheese',
  'cottage cheese': 'cheese',
  'swiss cheese': 'cheese',
  'provolone': 'cheese',
  'ricotta': 'cheese',
  'gruyere': 'cheese',
  'gruyère': 'cheese',
  'monterey jack': 'cheese',
  'pepper jack': 'cheese',
  'american cheese': 'cheese',
  'colby jack': 'cheese',
  'havarti': 'cheese',
  'manchego': 'cheese',
  'mascarpone': 'cheese',
  'burrata': 'cheese',
  'greek yogurt': 'yogurt',
  'plain yogurt': 'yogurt',
  'vanilla yogurt': 'yogurt',

  // Allium variants
  'roasted garlic': 'garlic',
  'garlic powder': 'garlic',
  'minced garlic': 'garlic',
  'garlic cloves': 'garlic',
  'crushed garlic': 'garlic',
  'garlic paste': 'garlic',
  'red onion': 'onion',
  'white onion': 'onion',
  'yellow onion': 'onion',
  'sweet onion': 'onion',
  'vidalia onion': 'onion',
  'onion powder': 'onion',
  'diced onion': 'onion',
  'caramelized onion': 'onion',
  'caramelized onions': 'onion',
  'green onion': 'scallion',
  'spring onion': 'scallion',
  'green onions': 'scallion',
  'spring onions': 'scallion',

  // Gluten grain variants
  'all purpose flour': 'flour',
  'bread flour': 'flour',
  'whole wheat flour': 'flour',
  'wheat flour': 'flour',
  'white flour': 'flour',
  'self rising flour': 'flour',
  'cake flour': 'flour',
  'pastry flour': 'flour',
  'panko breadcrumbs': 'breadcrumbs',
  'panko': 'breadcrumbs',

  // Spicy variants
  'red pepper flakes': 'chili flakes',
  'crushed red pepper': 'chili flakes',
  'cayenne pepper': 'cayenne',
  'chili peppers': 'chili pepper',
  'jalapeño pepper': 'jalapeño',
  'jalapeno': 'jalapeño',
  'jalapeno pepper': 'jalapeño',
  'serrano pepper': 'chili pepper',
  'thai chili': 'chili pepper',

  // Nightshade variants
  'tomatoes': 'tomato',
  'cherry tomatoes': 'tomato',
  'grape tomatoes': 'tomato',
  'roma tomatoes': 'tomato',
  'plum tomatoes': 'tomato',
  'heirloom tomatoes': 'tomato',
  'tomato sauce': 'tomato',
  'tomato paste': 'tomato',
  'tomato puree': 'tomato',
  'diced tomatoes': 'tomato',
  'crushed tomatoes': 'tomato',
  'sun dried tomatoes': 'tomato',
  'canned tomatoes': 'tomato',
  'stewed tomatoes': 'tomato',
  'marinara sauce': 'tomato',
  'marinara': 'tomato',
  'red pepper': 'bell pepper',
  'green pepper': 'bell pepper',
  'yellow pepper': 'bell pepper',
  'orange pepper': 'bell pepper',
  'red bell pepper': 'bell pepper',
  'green bell pepper': 'bell pepper',
  'yellow bell pepper': 'bell pepper',
  'roasted red pepper': 'bell pepper',
  'roasted red peppers': 'bell pepper',

  // Legume variants
  'black beans': 'beans',
  'kidney beans': 'beans',
  'pinto beans': 'beans',
  'navy beans': 'beans',
  'cannellini beans': 'beans',
  'white beans': 'beans',
  'lima beans': 'beans',
  'great northern beans': 'beans',
  'garbanzo beans': 'chickpeas',
  'red lentils': 'lentils',
  'green lentils': 'lentils',
  'brown lentils': 'lentils',

  // Nut variants
  'peanuts': 'peanut',
  'almonds': 'almond',
  'cashews': 'cashew',
  'walnuts': 'walnut',
  'pistachios': 'pistachio',
  'roasted peanuts': 'peanut',
  'roasted almonds': 'almond',
  'sliced almonds': 'almond',
  'slivered almonds': 'almond',
  'chopped walnuts': 'walnut',
  'crushed peanuts': 'peanut',
};

// Common cooking prefixes to strip before lookup
const PREP_PREFIXES = [
  'fresh', 'dried', 'dry', 'frozen', 'raw', 'cooked',
  'chopped', 'diced', 'minced', 'sliced', 'grated', 'shredded',
  'ground', 'crushed', 'toasted', 'roasted', 'grilled', 'fried',
  'steamed', 'baked', 'sauteed', 'sautéed', 'blanched',
  'organic', 'extra virgin', 'virgin', 'unsalted', 'salted',
  'low fat', 'nonfat', 'non fat', 'fat free', 'reduced fat',
  'whole', 'large', 'small', 'medium', 'baby',
];

/**
 * Clean and normalize a raw string for lookup.
 * Handles: case, whitespace, hyphens, percent signs, common prep words.
 */
function cleanForLookup(raw) {
  let s = (raw || '').toLowerCase().trim();

  // Replace hyphens and underscores with spaces
  s = s.replace(/[-_]/g, ' ');

  // Remove percent signs (so "2%milk" → "2 milk", "2% milk" → "2 milk")
  s = s.replace(/%/g, ' ');

  // Collapse multiple spaces
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Try stripping common prep prefixes to find a match.
 * e.g., "shredded cheddar cheese" → "cheddar cheese" → hits canonical map
 */
function stripPrefixes(s) {
  for (const prefix of PREP_PREFIXES) {
    if (s.startsWith(prefix + ' ')) {
      return s.slice(prefix.length + 1).trim();
    }
  }
  return null; // no prefix matched
}

/**
 * Normalize a raw ingredient string to its canonical form.
 * @param {string} raw - raw ingredient name from AI analysis
 * @returns {{ canonical: string, category: string|null }}
 */
function normalizeIngredient(raw) {
  const key = cleanForLookup(raw);
  if (!key) return { canonical: key, category: null };

  // 1. Direct lookup in canonical map
  if (CANONICAL_MAP[key]) {
    const canonical = CANONICAL_MAP[key];
    return { canonical, category: INGREDIENT_CATEGORIES[canonical] || null };
  }

  // 2. Direct lookup in categories (already canonical)
  if (INGREDIENT_CATEGORIES[key]) {
    return { canonical: key, category: INGREDIENT_CATEGORIES[key] };
  }

  // 3. Try stripping prep prefixes and re-lookup
  const stripped = stripPrefixes(key);
  if (stripped) {
    if (CANONICAL_MAP[stripped]) {
      const canonical = CANONICAL_MAP[stripped];
      return { canonical, category: INGREDIENT_CATEGORIES[canonical] || null };
    }
    if (INGREDIENT_CATEGORIES[stripped]) {
      return { canonical: stripped, category: INGREDIENT_CATEGORIES[stripped] };
    }
  }

  // 4. Try removing trailing 's' for simple plurals
  if (key.endsWith('s') && key.length > 3) {
    const singular = key.slice(0, -1);
    if (CANONICAL_MAP[singular]) {
      const canonical = CANONICAL_MAP[singular];
      return { canonical, category: INGREDIENT_CATEGORIES[canonical] || null };
    }
    if (INGREDIENT_CATEGORIES[singular]) {
      return { canonical: singular, category: INGREDIENT_CATEGORIES[singular] };
    }
  }

  // 5. No match — pass through as-is (cleaned)
  return { canonical: key, category: null };
}

module.exports = { normalizeIngredient, INGREDIENT_CATEGORIES };
