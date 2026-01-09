/**
 * AI Service for food analysis and correlation detection
 *
 * Currently uses mock responses. To enable real AI:
 * 1. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env
 * 2. Install the SDK: npm install openai or npm install @anthropic-ai/sdk
 * 3. Uncomment the real implementation below
 */

// Mock food analysis - returns realistic-looking data
async function analyzeFoodImage(imagePath) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock responses for common foods
  const mockFoods = [
    {
      name: 'Mixed Salad',
      category: 'Vegetables',
      ingredients: ['lettuce', 'tomatoes', 'cucumber', 'olive oil', 'vinegar'],
      confidence: 0.85
    },
    {
      name: 'Grilled Chicken',
      category: 'Protein',
      ingredients: ['chicken breast', 'olive oil', 'garlic', 'herbs'],
      confidence: 0.9
    },
    {
      name: 'Rice',
      category: 'Grains',
      ingredients: ['white rice'],
      confidence: 0.95
    }
  ];

  // Return 1-3 random items
  const numItems = Math.floor(Math.random() * 3) + 1;
  const foods = mockFoods.slice(0, numItems);

  return {
    foods,
    notes: 'AI analysis mock - configure API key for real analysis'
  };
}

// Mock correlation analysis
async function analyzeCorrelations(meals, poops) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Extract all ingredients from meals
  const ingredientCounts = {};
  meals.forEach(meal => {
    meal.foods.forEach(food => {
      food.ingredients.forEach(ingredient => {
        ingredientCounts[ingredient] = (ingredientCounts[ingredient] || 0) + 1;
      });
    });
  });

  // Mock: pick top ingredients and assign random correlation scores
  const commonIngredients = Object.entries(ingredientCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      confidence: Math.random() * 0.5 + 0.3, // 0.3 to 0.8
      occurrences: count
    }))
    .sort((a, b) => b.confidence - a.confidence);

  return {
    triggers: commonIngredients.slice(0, 3),
    notes: 'Based on your logged data, these ingredients appear most frequently before bowel movements. This is a mock analysis - configure an AI API key for real pattern detection.'
  };
}

/*
// Real OpenAI implementation (uncomment when ready)

const OpenAI = require('openai');
const fs = require('fs');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function analyzeFoodImage(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this food image and extract:
1. Foods visible (be specific: "pepperoni pizza" not just "pizza")
2. Likely ingredients for each food
3. Brand if visible/identifiable
4. Restaurant if identifiable
5. Approximate portion size

Return ONLY valid JSON in this exact format:
{
  "foods": [
    {
      "name": "Food Name",
      "category": "Category",
      "ingredients": ["ingredient1", "ingredient2"],
      "brand": null,
      "restaurant": null,
      "portion": "portion description",
      "confidence": 0.9
    }
  ],
  "notes": "Any additional observations"
}`
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      }
    ],
    max_tokens: 1000
  });

  const content = response.choices[0].message.content;
  return JSON.parse(content);
}

async function analyzeCorrelations(meals, poops) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are an expert nutritionist analyzing food diary data to identify IBS triggers.'
      },
      {
        role: 'user',
        content: `Analyze this food and bowel movement data to identify potential trigger foods/ingredients.

MEALS (with timestamps and ingredients):
${JSON.stringify(meals, null, 2)}

BOWEL MOVEMENTS (timestamps):
${JSON.stringify(poops, null, 2)}

Look for correlations between specific foods/ingredients and bowel movements that occur within 2-24 hours after eating.

Return ONLY valid JSON:
{
  "triggers": [
    {"name": "ingredient/food name", "confidence": 0.8}
  ],
  "notes": "Brief explanation of findings"
}`
      }
    ],
    max_tokens: 1000
  });

  const content = response.choices[0].message.content;
  return JSON.parse(content);
}
*/

module.exports = {
  analyzeFoodImage,
  analyzeCorrelations
};
