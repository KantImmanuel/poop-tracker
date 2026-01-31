const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { aiLimiter, guestAiLimiter } = require('../middleware/rateLimiter');
const { analyzeFoodImage } = require('../services/ai');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|heic/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Guest: analyze image only (no DB save, no auth required)
router.post('/analyze-guest', guestAiLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }
    const aiResult = await analyzeFoodImage(req.file.path);
    fs.unlink(req.file.path, () => {});
    res.json(aiResult);
  } catch (error) {
    console.error('Guest analyze error:', error);
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ message: 'Failed to analyze meal' });
  }
});

// Get all meals (optionally filtered by date)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    let where = { userId: req.user.userId };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.timestamp = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    const meals = await req.prisma.meal.findMany({
      where,
      include: { foods: true },
      orderBy: { timestamp: 'desc' }
    });

    res.json(meals);
  } catch (error) {
    console.error('Get meals error:', error);
    res.status(500).json({ message: 'Failed to fetch meals' });
  }
});

// Get single meal
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const meal = await req.prisma.meal.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId
      },
      include: { foods: true }
    });

    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    res.json(meal);
  } catch (error) {
    console.error('Get meal error:', error);
    res.status(500).json({ message: 'Failed to fetch meal' });
  }
});

// Create meal with image
router.post('/', authenticateToken, aiLimiter, upload.single('image'), async (req, res) => {
  try {
    // Analyze image with AI
    let aiResult = { foods: [] };
    if (req.file) {
      aiResult = await analyzeFoodImage(req.file.path);
      // Delete the image — we only needed it for AI analysis
      fs.unlink(req.file.path, () => {});
    }

    // Create meal with foods
    const meal = await req.prisma.meal.create({
      data: {
        userId: req.user.userId,
        rawAiResponse: JSON.stringify(aiResult),
        foods: {
          create: aiResult.foods.map(food => ({
            name: food.name,
            category: food.category || null,
            ingredients: food.ingredients ? JSON.stringify(food.ingredients) : null,
            brand: food.brand || null,
            restaurant: food.restaurant || null,
            confidence: food.confidence || null
          }))
        }
      },
      include: { foods: true }
    });

    // Parse ingredients back for response
    const response = {
      ...meal,
      foods: meal.foods.map(f => ({
        ...f,
        ingredients: f.ingredients ? JSON.parse(f.ingredients) : []
      }))
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create meal error:', error);
    res.status(500).json({ message: 'Failed to create meal' });
  }
});

// Create manual meal (without image)
router.post('/manual', authenticateToken, async (req, res) => {
  try {
    const { foods } = req.body;

    if (!foods || !Array.isArray(foods) || foods.length === 0) {
      return res.status(400).json({ message: 'At least one food item is required' });
    }

    const meal = await req.prisma.meal.create({
      data: {
        userId: req.user.userId,
        rawAiResponse: JSON.stringify({ foods, manual: true }),
        foods: {
          create: foods.map(food => ({
            name: food.name,
            category: food.category || null,
            ingredients: food.ingredients ? JSON.stringify(food.ingredients) : null,
            brand: food.brand || null,
            restaurant: food.restaurant || null,
            confidence: 1.0 // Manual entry = full confidence
          }))
        }
      },
      include: { foods: true }
    });

    const response = {
      ...meal,
      foods: meal.foods.map(f => ({
        ...f,
        ingredients: f.ingredients ? JSON.parse(f.ingredients) : []
      }))
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create manual meal error:', error);
    res.status(500).json({ message: 'Failed to create meal' });
  }
});

// Clarify/correct a food item
router.put('/:id/clarify', authenticateToken, async (req, res) => {
  try {
    const { foodIndex, correctedName } = req.body;

    const meal = await req.prisma.meal.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId
      },
      include: { foods: true }
    });

    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    if (foodIndex >= meal.foods.length) {
      return res.status(400).json({ message: 'Invalid food index' });
    }

    const foodToUpdate = meal.foods[foodIndex];

    await req.prisma.food.update({
      where: { id: foodToUpdate.id },
      data: {
        name: correctedName,
        confidence: 1.0 // User corrected = full confidence
      }
    });

    res.json({ message: 'Food updated' });
  } catch (error) {
    console.error('Clarify food error:', error);
    res.status(500).json({ message: 'Failed to update food' });
  }
});

// Update confirmed ingredients after concealed-food review
router.put('/:id/ingredients', authenticateToken, async (req, res) => {
  try {
    const { foods } = req.body;

    if (!Array.isArray(foods)) {
      return res.status(400).json({ message: 'foods array is required' });
    }

    const meal = await req.prisma.meal.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId
      },
      include: { foods: true }
    });

    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    for (const f of foods) {
      if (f.foodIndex != null && Array.isArray(f.ingredients) && f.foodIndex < meal.foods.length) {
        const foodToUpdate = meal.foods[f.foodIndex];
        await req.prisma.food.update({
          where: { id: foodToUpdate.id },
          data: { ingredients: JSON.stringify(f.ingredients) }
        });
      }
    }

    const updated = await req.prisma.meal.findFirst({
      where: { id: req.params.id },
      include: { foods: true }
    });

    res.json({
      ...updated,
      foods: updated.foods.map(f => ({
        ...f,
        ingredients: f.ingredients ? JSON.parse(f.ingredients) : []
      }))
    });
  } catch (error) {
    console.error('Update ingredients error:', error);
    res.status(500).json({ message: 'Failed to update ingredients' });
  }
});

// Update meal food names
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { foods } = req.body;

    const meal = await req.prisma.meal.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId
      },
      include: { foods: true }
    });

    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    if (foods && Array.isArray(foods)) {
      for (const f of foods) {
        if (f.id && f.name) {
          await req.prisma.food.update({
            where: { id: f.id },
            data: { name: f.name }
          });
        }
      }
    }

    const updated = await req.prisma.meal.findFirst({
      where: { id: req.params.id },
      include: { foods: true }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update meal error:', error);
    res.status(500).json({ message: 'Failed to update meal' });
  }
});

// Delete meal
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const meal = await req.prisma.meal.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId
      }
    });

    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    await req.prisma.meal.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Meal deleted' });
  } catch (error) {
    console.error('Delete meal error:', error);
    res.status(500).json({ message: 'Failed to delete meal' });
  }
});

module.exports = router;
