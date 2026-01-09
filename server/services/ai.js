/**
 * AI Service for food analysis and correlation detection
 *
 * Supports both Claude (Anthropic) and OpenAI
 * Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env
 */

const fs = require('fs');

// Determine which AI provider to use
const USE_CLAUDE = !!process.env.ANTHROPIC_API_KEY;
const USE_OPENAI = !!process.env.OPENAI_API_KEY;

let anthropic = null;
let openai = null;

if (USE_CLAUDE) {
  const Anthropic = require('@anthropic-ai/sdk');
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  console.log('AI Service: Using Claude (Anthropic)');
} else if (USE_OPENAI) {
  const OpenAI = require('openai');
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('AI Service: Using OpenAI');
} else {
  console.log('AI Service: Using mock responses (set ANTHROPIC_API_KEY or OPENAI_API_KEY for real AI)');
}

// Food image analysis
async function analyzeFoodImage(imagePath) {
  if (USE_CLAUDE && imagePath) {
    return analyzeWithClaude(imagePath);
  } else if (USE_OPENAI && imagePath) {
    return analyzeWithOpenAI(imagePath);
  }
  return mockFoodAnalysis();
}

// Claude implementation
async function analyzeWithClaude(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const ext = imagePath.split('.').pop().toLowerCase();
    const mediaType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image
              }
            },
            {
              type: 'text',
              text: `Analyze this food image for someone tracking IBS triggers. Extract:
1. All foods visible (be specific: "pepperoni pizza" not just "pizza")
2. Likely ingredients for each food (especially common IBS triggers like dairy, gluten, onion, garlic, etc.)
3. Brand if visible/identifiable
4. Restaurant if identifiable
5. Approximate portion size

Return ONLY valid JSON in this exact format:
{
  "foods": [
    {
      "name": "Food Name",
      "category": "Category (e.g., Dairy, Grains, Protein, Vegetables, etc.)",
      "ingredients": ["ingredient1", "ingredient2"],
      "brand": null,
      "restaurant": null,
      "portion": "portion description",
      "confidence": 0.9
    }
  ],
  "notes": "Any additional observations relevant to IBS"
}`
            }
          ]
        }
      ]
    });

    const content = response.content[0].text;
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Claude analysis error:', error);
    return mockFoodAnalysis();
  }
}

// OpenAI implementation
async function analyzeWithOpenAI(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const ext = imagePath.split('.').pop().toLowerCase();
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this food image for someone tracking IBS triggers. Extract:
1. All foods visible (be specific: "pepperoni pizza" not just "pizza")
2. Likely ingredients for each food (especially common IBS triggers like dairy, gluten, onion, garlic, etc.)
3. Brand if visible/identifiable
4. Restaurant if identifiable
5. Approximate portion size

Return ONLY valid JSON in this exact format:
{
  "foods": [
    {
      "name": "Food Name",
      "category": "Category (e.g., Dairy, Grains, Protein, Vegetables, etc.)",
      "ingredients": ["ingredient1", "ingredient2"],
      "brand": null,
      "restaurant": null,
      "portion": "portion description",
      "confidence": 0.9
    }
  ],
  "notes": "Any additional observations relevant to IBS"
}`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('OpenAI analysis error:', error);
    return mockFoodAnalysis();
  }
}

// Mock food analysis
function mockFoodAnalysis() {
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

  const numItems = Math.floor(Math.random() * 3) + 1;
  return {
    foods: mockFoods.slice(0, numItems),
    notes: 'Mock analysis - set ANTHROPIC_API_KEY or OPENAI_API_KEY in server/.env for real AI'
  };
}

// Correlation analysis
async function analyzeCorrelations(meals, poops) {
  if ((USE_CLAUDE || USE_OPENAI) && meals.length > 0 && poops.length > 0) {
    return analyzeCorrelationsWithAI(meals, poops);
  }
  return mockCorrelationAnalysis(meals);
}

// AI correlation analysis (works with both Claude and OpenAI)
async function analyzeCorrelationsWithAI(meals, poops) {
  const prompt = `Analyze this food and bowel movement data to identify potential IBS trigger foods/ingredients.

MEALS (with timestamps and ingredients):
${JSON.stringify(meals.map(m => ({
  timestamp: m.timestamp,
  foods: m.foods.map(f => ({ name: f.name, ingredients: f.ingredients }))
})), null, 2)}

BOWEL MOVEMENTS (timestamps):
${JSON.stringify(poops.map(p => p.timestamp), null, 2)}

Look for correlations between specific foods/ingredients and bowel movements that occur within 2-24 hours after eating. Consider:
- Frequency of ingredient consumption before bowel movements
- Time patterns between eating and symptoms
- Known IBS trigger categories (FODMAPs, dairy, gluten, caffeine, etc.)

Return ONLY valid JSON:
{
  "triggers": [
    {"name": "ingredient/food name", "confidence": 0.8, "reason": "brief explanation"}
  ],
  "notes": "Summary of findings and recommendations"
}`;

  try {
    let content;

    if (USE_CLAUDE) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: 'You are an expert nutritionist analyzing food diary data to identify IBS triggers. Focus on common triggers like FODMAPs (garlic, onion, wheat, dairy, certain fruits), caffeine, alcohol, fatty foods, and artificial sweeteners.',
        messages: [{ role: 'user', content: prompt }]
      });
      content = response.content[0].text;
    } else {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert nutritionist analyzing food diary data to identify IBS triggers. Focus on common triggers like FODMAPs (garlic, onion, wheat, dairy, certain fruits), caffeine, alcohol, fatty foods, and artificial sweeteners.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000
      });
      content = response.choices[0].message.content;
    }

    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('AI correlation error:', error);
    return mockCorrelationAnalysis(meals);
  }
}

// Mock correlation analysis
function mockCorrelationAnalysis(meals) {
  const ingredientCounts = {};
  meals.forEach(meal => {
    if (meal.foods) {
      meal.foods.forEach(food => {
        if (food.ingredients) {
          food.ingredients.forEach(ingredient => {
            ingredientCounts[ingredient] = (ingredientCounts[ingredient] || 0) + 1;
          });
        }
      });
    }
  });

  const commonIngredients = Object.entries(ingredientCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      confidence: Math.random() * 0.5 + 0.3,
      occurrences: count
    }))
    .sort((a, b) => b.confidence - a.confidence);

  return {
    triggers: commonIngredients.slice(0, 3),
    notes: 'Mock analysis - set ANTHROPIC_API_KEY or OPENAI_API_KEY in server/.env for real AI'
  };
}

module.exports = {
  analyzeFoodImage,
  analyzeCorrelations
};
