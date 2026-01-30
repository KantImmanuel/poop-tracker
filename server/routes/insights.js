const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { analyzeCorrelations } = require('../services/ai');

const router = express.Router();

// Get correlation insights
router.get('/correlations', authenticateToken, async (req, res) => {
  try {
    // Get basic stats
    const [meals, poops, firstMeal] = await Promise.all([
      req.prisma.meal.count({ where: { userId: req.user.userId } }),
      req.prisma.poopLog.count({ where: { userId: req.user.userId } }),
      req.prisma.meal.findFirst({
        where: { userId: req.user.userId },
        orderBy: { timestamp: 'asc' }
      })
    ]);

    // Calculate days tracked
    let daysTracked = 0;
    if (firstMeal) {
      const msPerDay = 24 * 60 * 60 * 1000;
      daysTracked = Math.ceil((Date.now() - new Date(firstMeal.timestamp).getTime()) / msPerDay);
    }

    res.json({
      totalMeals: meals,
      totalPoops: poops,
      daysTracked,
      triggers: [] // Will be populated by analyze endpoint
    });
  } catch (error) {
    console.error('Get correlations error:', error);
    res.status(500).json({ message: 'Failed to fetch insights' });
  }
});

// Analyze data for correlations (triggers AI analysis)
router.post('/analyze', authenticateToken, aiLimiter, async (req, res) => {
  try {
    // Only analyze the last 30 days to keep prompt size and costs down
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [meals, poops] = await Promise.all([
      req.prisma.meal.findMany({
        where: { userId: req.user.userId, timestamp: { gte: thirtyDaysAgo } },
        include: { foods: true },
        orderBy: { timestamp: 'asc' }
      }),
      req.prisma.poopLog.findMany({
        where: { userId: req.user.userId, timestamp: { gte: thirtyDaysAgo } },
        orderBy: { timestamp: 'asc' }
      })
    ]);

    if (meals.length < 3 || poops.length < 3) {
      return res.json({
        totalMeals: meals.length,
        totalPoops: poops.length,
        daysTracked: 0,
        triggers: [],
        notes: 'Need more data to analyze. Keep logging for at least a week!'
      });
    }

    // Prepare data for AI analysis
    const mealData = meals.map(m => ({
      timestamp: m.timestamp,
      foods: m.foods.map(f => ({
        name: f.name,
        ingredients: f.ingredients ? JSON.parse(f.ingredients) : []
      }))
    }));

    const poopData = poops.map(p => ({
      timestamp: p.timestamp,
      severity: p.severity,
      symptoms: p.symptoms ? JSON.parse(p.symptoms) : []
    }));

    // Run AI correlation analysis
    const analysis = await analyzeCorrelations(mealData, poopData);

    // Calculate days tracked
    let daysTracked = 0;
    if (meals.length > 0) {
      const msPerDay = 24 * 60 * 60 * 1000;
      daysTracked = Math.ceil((Date.now() - new Date(meals[0].timestamp).getTime()) / msPerDay);
    }

    res.json({
      totalMeals: meals.length,
      totalPoops: poops.length,
      daysTracked,
      ...analysis
    });
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({ message: 'Failed to analyze data' });
  }
});

// Get timeline view
router.get('/timeline', authenticateToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [meals, poops] = await Promise.all([
      req.prisma.meal.findMany({
        where: {
          userId: req.user.userId,
          timestamp: { gte: startDate }
        },
        include: { foods: true },
        orderBy: { timestamp: 'desc' }
      }),
      req.prisma.poopLog.findMany({
        where: {
          userId: req.user.userId,
          timestamp: { gte: startDate }
        },
        orderBy: { timestamp: 'desc' }
      })
    ]);

    // Combine and sort by timestamp
    const timeline = [
      ...meals.map(m => ({ ...m, type: 'meal' })),
      ...poops.map(p => ({ ...p, type: 'poop' }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(timeline);
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({ message: 'Failed to fetch timeline' });
  }
});

module.exports = router;
