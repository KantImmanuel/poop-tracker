/**
 * AI Service for food analysis and correlation detection
 *
 * Image Analysis Priority:
 * 1. Google Cloud Vision (for object detection) + Claude (for ingredient analysis)
 * 2. Claude alone (fallback)
 * 3. Mock responses (no API keys)
 *
 * Set GOOGLE_CLOUD_API_KEY and ANTHROPIC_API_KEY in .env
 */

const fs = require('fs');
const sharp = require('sharp');

// Determine which AI providers to use
const USE_GOOGLE_VISION = !!process.env.GOOGLE_CLOUD_API_KEY;
const USE_CLAUDE = !!process.env.ANTHROPIC_API_KEY;
const USE_OPENAI = !!process.env.OPENAI_API_KEY;

let anthropic = null;
let openai = null;

if (USE_GOOGLE_VISION) {
  console.log('AI Service: Using Google Cloud Vision for image analysis');
}

if (USE_CLAUDE) {
  const Anthropic = require('@anthropic-ai/sdk');
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  console.log('AI Service: Using Claude for food/ingredient analysis');
}

if (USE_OPENAI) {
  const OpenAI = require('openai');
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  if (!USE_CLAUDE) {
    console.log('AI Service: Using OpenAI for analysis');
  }
}

if (!USE_GOOGLE_VISION && !USE_CLAUDE && !USE_OPENAI) {
  console.log('AI Service: Using mock responses (set GOOGLE_CLOUD_API_KEY + ANTHROPIC_API_KEY for real AI)');
}

// Compress image to stay under Claude's 5 MB base64 limit (~3.75 MB raw)
async function compressForAI(imagePath) {
  const buffer = await sharp(imagePath)
    .resize(1536, 1536, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return { base64: buffer.toString('base64'), mediaType: 'image/jpeg' };
}

// Food image analysis
async function analyzeFoodImage(imagePath) {
  if (USE_GOOGLE_VISION && USE_CLAUDE && imagePath) {
    return analyzeWithGoogleVisionAndClaude(imagePath);
  } else if (USE_CLAUDE && imagePath) {
    return analyzeWithClaude(imagePath);
  } else if (USE_OPENAI && imagePath) {
    return analyzeWithOpenAI(imagePath);
  }
  return mockFoodAnalysis();
}

// Google Cloud Vision + Claude hybrid approach
async function analyzeWithGoogleVisionAndClaude(imagePath) {
  try {
    // Step 1: Use Google Vision to detect objects/labels
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Image },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 20 },
              { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
              { type: 'TEXT_DETECTION', maxResults: 5 },
              { type: 'LOGO_DETECTION', maxResults: 5 }
            ]
          }]
        })
      }
    );

    const visionData = await visionResponse.json();

    if (visionData.error) {
      console.error('Google Vision error:', visionData.error);
      return analyzeWithClaude(imagePath);
    }

    const result = visionData.responses[0];

    // Extract labels, objects, text, and logos
    const labels = (result.labelAnnotations || []).map(l => ({
      name: l.description,
      confidence: l.score
    }));

    const objects = (result.localizedObjectAnnotations || []).map(o => ({
      name: o.name,
      confidence: o.score
    }));

    const texts = (result.textAnnotations || []).slice(0, 3).map(t => t.description);
    const logos = (result.logoAnnotations || []).map(l => l.description);

    // Step 2: Use Claude to interpret the vision results and extract food details
    const compressed = await compressForAI(imagePath);

    const claudeResponse = await anthropic.messages.create({
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
                media_type: compressed.mediaType,
                data: compressed.base64
              }
            },
            {
              type: 'text',
              text: `I'm tracking IBS triggers. Google Vision detected these in my food photo:

LABELS: ${labels.map(l => `${l.name} (${Math.round(l.confidence * 100)}%)`).join(', ')}

OBJECTS: ${objects.map(o => `${o.name} (${Math.round(o.confidence * 100)}%)`).join(', ')}

TEXT VISIBLE: ${texts.join(', ') || 'none'}

BRANDS/LOGOS: ${logos.join(', ') || 'none'}

Based on this AND the image, identify each food item with:
1. Specific name (e.g., "turkey sandwich" not just "sandwich")
2. Likely ingredients (especially IBS triggers: dairy, gluten, onion, garlic, FODMAPs)
3. Brand/restaurant if identifiable
4. Your confidence (0.0-1.0)
5. If uncertain, provide 2-3 alternatives

IMPORTANT:
- Don't list inedible parts (peels, etc.) as foods
- Be specific about meat types
- Multiple foods should be listed separately

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
      "alternatives": ["Alt1", "Alt2"]
    }
  ],
  "notes": "Any IBS-relevant observations"
}`
            }
          ]
        }
      ]
    });

    const content = claudeResponse.content[0].text;
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error('Google Vision + Claude error:', error);
    // Fall back to Claude-only
    if (USE_CLAUDE) {
      return analyzeWithClaude(imagePath);
    }
    return mockFoodAnalysis();
  }
}

// Claude-only implementation (fallback)
async function analyzeWithClaude(imagePath) {
  try {
    const compressed = await compressForAI(imagePath);

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
                media_type: compressed.mediaType,
                data: compressed.base64
              }
            },
            {
              type: 'text',
              text: `Analyze this food image for someone tracking IBS triggers. Be careful and accurate.

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

// OpenAI implementation (secondary fallback)
async function analyzeWithOpenAI(imagePath) {
  try {
    const compressed = await compressForAI(imagePath);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this food image for someone tracking IBS triggers. Return ONLY valid JSON with foods array containing name, category, ingredients, brand, restaurant, portion, confidence, and alternatives.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${compressed.mediaType};base64,${compressed.base64}`,
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
    return mockFoodAnalysis();
  }
}

// Mock food analysis
function mockFoodAnalysis() {
  return {
    foods: [
      {
        name: 'Sample Food',
        category: 'Unknown',
        ingredients: ['unknown'],
        confidence: 0.5,
        alternatives: []
      }
    ],
    notes: 'Mock analysis - set GOOGLE_CLOUD_API_KEY + ANTHROPIC_API_KEY for real AI'
  };
}

// Correlation analysis (uses Claude)
async function analyzeCorrelations(meals, poops) {
  if (USE_CLAUDE && meals.length > 0 && poops.length > 0) {
    return analyzeCorrelationsWithClaude(meals, poops);
  } else if (USE_OPENAI && meals.length > 0 && poops.length > 0) {
    return analyzeCorrelationsWithOpenAI(meals, poops);
  }
  return mockCorrelationAnalysis(meals);
}

// Claude correlation analysis
async function analyzeCorrelationsWithClaude(meals, poops) {
  const prompt = `Analyze this food and bowel movement data to identify potential IBS trigger foods/ingredients.

MEALS (with timestamps and ingredients):
${JSON.stringify(meals.map(m => ({
  timestamp: m.timestamp,
  foods: m.foods.map(f => ({ name: f.name, ingredients: f.ingredients }))
})), null, 2)}

BOWEL MOVEMENTS (timestamps, severity, and symptoms):
${JSON.stringify(poops.map(p => ({ timestamp: p.timestamp, severity: p.severity, symptoms: p.symptoms || [] })), null, 2)}

Look for correlations between specific foods/ingredients and bowel movements/symptoms that occur within 2-24 hours after eating. Consider:
- Frequency of ingredient consumption before bowel movements
- Time patterns between eating and symptoms
- Severity patterns (do certain foods cause more severe symptoms?)
- Symptom patterns (do certain foods trigger specific symptoms like bloating, cramps, gas, nausea, urgency, or fatigue?)
- Known IBS trigger categories (FODMAPs, dairy, gluten, caffeine, etc.)

Return ONLY valid JSON:
{
  "triggers": [
    {"name": "ingredient/food name", "confidence": 0.8, "reason": "brief explanation"}
  ],
  "notes": "Summary of findings and recommendations"
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: 'You are an expert nutritionist analyzing food diary data to identify IBS triggers. Focus on common triggers like FODMAPs (garlic, onion, wheat, dairy, certain fruits), caffeine, alcohol, fatty foods, and artificial sweeteners. Pay attention to severity patterns and symptom correlations (bloating, cramps, gas, nausea, urgency, fatigue).',
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0].text;
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Claude correlation error:', error);
    return mockCorrelationAnalysis(meals);
  }
}

// OpenAI correlation analysis (fallback)
async function analyzeCorrelationsWithOpenAI(meals, poops) {
  const prompt = `Analyze this food and bowel movement data for IBS triggers. Return JSON with triggers array and notes.

MEALS: ${JSON.stringify(meals.map(m => ({ timestamp: m.timestamp, foods: m.foods.map(f => ({ name: f.name, ingredients: f.ingredients })) })))}

BOWEL MOVEMENTS: ${JSON.stringify(poops.map(p => ({ timestamp: p.timestamp, severity: p.severity, symptoms: p.symptoms || [] })))}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert nutritionist analyzing food diary data to identify IBS triggers.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('OpenAI correlation error:', error);
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
    .slice(0, 3)
    .map(([name, count]) => ({
      name,
      confidence: 0.5,
      reason: `Appeared ${count} times in your meals`
    }));

  return {
    triggers: commonIngredients,
    notes: 'Mock analysis - configure API keys for real AI analysis'
  };
}

module.exports = {
  analyzeFoodImage,
  analyzeCorrelations
};
