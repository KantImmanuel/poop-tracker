/**
 * AI Service for food analysis and correlation detection
 *
 * Supports both OpenAI (GPT-4V) and Claude (Anthropic)
 * GPT-4V is preferred for image analysis (better accuracy)
 * Set OPENAI_API_KEY and/or ANTHROPIC_API_KEY in .env
 */

const fs = require('fs');

// Determine which AI provider to use
const USE_OPENAI = !!process.env.OPENAI_API_KEY;
const USE_CLAUDE = !!process.env.ANTHROPIC_API_KEY;

let openai = null;
let anthropic = null;

if (USE_OPENAI) {
  const OpenAI = require('openai');
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('AI Service: Using OpenAI GPT-4V for image analysis');
}

if (USE_CLAUDE) {
  const Anthropic = require('@anthropic-ai/sdk');
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  if (!USE_OPENAI) {
    console.log('AI Service: Using Claude for image analysis');
  } else {
    console.log('AI Service: Claude available as backup');
  }
}

if (!USE_OPENAI && !USE_CLAUDE) {
  console.log('AI Service: Using mock responses (set OPENAI_API_KEY or ANTHROPIC_API_KEY for real AI)');
}

// Enhanced prompt that asks for alternatives when uncertain
const FOOD_ANALYSIS_PROMPT = `Analyze this food image for someone tracking IBS triggers. Be careful and accurate.

For EACH food item visible:
1. Identify the food specifically (e.g., "pepperoni pizza" not just "pizza")
2. List likely ingredients (especially IBS triggers: dairy, gluten, onion, garlic, FODMAPs)
3. Note brand/restaurant if visible
4. Estimate portion size
5. Rate your confidence (0.0 to 1.0)
6. If confidence < 0.8, provide 2-3 alternative guesses

IMPORTANT:
- Don't include inedible parts (peels, seeds, etc.) as separate foods
- If multiple foods are visible, list each separately
- Be specific about meat types (turkey vs ham, beef vs pork)

Return ONLY valid JSON:
{
  "foods": [
    {
      "name": "Food Name",
      "category": "Category",
      "ingredients": ["ingredient1", "ingredient2"],
      "brand": null,
      "restaurant": null,
      "portion": "portion description",
      "confidence": 0.9,
      "alternatives": ["Alternative 1", "Alternative 2"]
    }
  ],
  "notes": "Any observations relevant to IBS"
}`;

// Food image analysis - prefer GPT-4V
async function analyzeFoodImage(imagePath) {
  if (USE_OPENAI && imagePath) {
    return analyzeWithOpenAI(imagePath);
  } else if (USE_CLAUDE && imagePath) {
    return analyzeWithClaude(imagePath);
  }
  return mockFoodAnalysis();
}

// OpenAI GPT-4V implementation (preferred)
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
              text: FOOD_ANALYSIS_PROMPT
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 1500
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('OpenAI analysis error:', error);
    // Fall back to Claude if available
    if (USE_CLAUDE) {
      console.log('Falling back to Claude...');
      return analyzeWithClaude(imagePath);
    }
    return mockFoodAnalysis();
  }
}

// Claude implementation (fallback)
async function analyzeWithClaude(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const ext = imagePath.split('.').pop().toLowerCase();
    const mediaType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
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
              text: FOOD_ANALYSIS_PROMPT
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

// Mock food analysis
function mockFoodAnalysis() {
  const mockFoods = [
    {
      name: 'Mixed Salad',
      category: 'Vegetables',
      ingredients: ['lettuce', 'tomatoes', 'cucumber', 'olive oil', 'vinegar'],
      confidence: 0.85,
      alternatives: []
    },
    {
      name: 'Grilled Chicken',
      category: 'Protein',
      ingredients: ['chicken breast', 'olive oil', 'garlic', 'herbs'],
      confidence: 0.9,
      alternatives: []
    }
  ];

  return {
    foods: mockFoods,
    notes: 'Mock analysis - set OPENAI_API_KEY in server/.env for real AI (GPT-4V recommended)'
  };
}

// Correlation analysis
async function analyzeCorrelations(meals, poops) {
  if ((USE_CLAUDE || USE_OPENAI) && meals.length > 0 && poops.length > 0) {
    return analyzeCorrelationsWithAI(meals, poops);
  }
  return mockCorrelationAnalysis(meals);
}

// AI correlation analysis
async function analyzeCorrelationsWithAI(meals, poops) {
  const prompt = `Analyze this food and bowel movement data to identify potential IBS trigger foods/ingredients.

MEALS (with timestamps and ingredients):
${JSON.stringify(meals.map(m => ({
  timestamp: m.timestamp,
  foods: m.foods.map(f => ({ name: f.name, ingredients: f.ingredients }))
})), null, 2)}

BOWEL MOVEMENTS (timestamps and severity):
${JSON.stringify(poops.map(p => ({ timestamp: p.timestamp, severity: p.severity })), null, 2)}

Look for correlations between specific foods/ingredients and bowel movements that occur within 2-24 hours after eating. Consider:
- Frequency of ingredient consumption before bowel movements
- Time patterns between eating and symptoms
- Severity patterns (do certain foods cause more severe symptoms?)
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

    // Prefer Claude for text analysis (better reasoning)
    if (USE_CLAUDE) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: 'You are an expert nutritionist analyzing food diary data to identify IBS triggers. Focus on common triggers like FODMAPs (garlic, onion, wheat, dairy, certain fruits), caffeine, alcohol, fatty foods, and artificial sweeteners. Pay attention to severity patterns.',
        messages: [{ role: 'user', content: prompt }]
      });
      content = response.content[0].text;
    } else if (USE_OPENAI) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert nutritionist analyzing food diary data to identify IBS triggers. Focus on common triggers like FODMAPs (garlic, onion, wheat, dairy, certain fruits), caffeine, alcohol, fatty foods, and artificial sweeteners. Pay attention to severity patterns.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500
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
    notes: 'Mock analysis - set OPENAI_API_KEY or ANTHROPIC_API_KEY in server/.env for real AI'
  };
}

module.exports = {
  analyzeFoodImage,
  analyzeCorrelations
};
