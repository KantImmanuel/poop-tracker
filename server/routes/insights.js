const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { aiLimiter, guestAiLimiter } = require('../middleware/rateLimiter');
const { analyzeCorrelations } = require('../services/ai');
const { computeCorrelationStats } = require('../services/correlationStats');

const router = express.Router();

// Get correlation insights (returns saved analysis if available)
router.get('/correlations', authenticateToken, async (req, res) => {
  try {
    const [savedReport, mealDates, poopDates] = await Promise.all([
      req.prisma.insightReport.findUnique({
        where: { userId: req.user.userId }
      }),
      req.prisma.meal.findMany({
        where: { userId: req.user.userId },
        select: { timestamp: true },
        orderBy: { timestamp: 'asc' }
      }),
      req.prisma.poopLog.findMany({
        where: { userId: req.user.userId },
        select: { timestamp: true }
      })
    ]);

    const totalMeals = mealDates.length;
    const totalPoops = poopDates.length;

    let daysTracked = 0;
    if (mealDates.length > 0) {
      const msPerDay = 24 * 60 * 60 * 1000;
      daysTracked = Math.ceil((Date.now() - new Date(mealDates[0].timestamp).getTime()) / msPerDay);
    }

    const uniqueDays = new Set([
      ...mealDates.map(m => m.timestamp.toISOString().slice(0, 10)),
      ...poopDates.map(p => p.timestamp.toISOString().slice(0, 10))
    ]);
    const daysCovered = uniqueDays.size;

    // If we have a saved analysis, return it with fresh stats
    if (savedReport) {
      const report = JSON.parse(savedReport.report);
      return res.json({
        totalMeals,
        totalPoops,
        daysTracked,
        daysCovered,
        ...report,
        lastAnalyzed: savedReport.updatedAt
      });
    }

    res.json({
      totalMeals,
      totalPoops,
      daysTracked,
      daysCovered,
      triggers: []
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

    // Check readiness using same logic as frontend
    const uniqueAnalyzeDays = new Set([
      ...meals.map(m => m.timestamp.toISOString().slice(0, 10)),
      ...poops.map(p => p.timestamp.toISOString().slice(0, 10))
    ]);
    const daysCovered = uniqueAnalyzeDays.size;
    const readyForInsights =
      (meals.length >= 3 && poops.length >= 2) ||
      (daysCovered >= 2 && meals.length >= 2 && poops.length >= 1);

    if (!readyForInsights) {
      return res.json({
        totalMeals: meals.length,
        totalPoops: poops.length,
        daysTracked: 0,
        daysCovered,
        triggers: []
      });
    }

    // Prepare data for stats computation
    const mealData = meals.map(m => ({
      timestamp: m.timestamp,
      foods: m.foods.map(f => ({
        name: f.name,
        ingredients: f.ingredients ? JSON.parse(f.ingredients) : [],
        confidence: f.confidence
      }))
    }));

    const poopData = poops.map(p => ({
      timestamp: p.timestamp,
      severity: p.severity,
      symptoms: p.symptoms ? JSON.parse(p.symptoms) : []
    }));

    // Pre-compute ingredient stats server-side, then send numbers to AI
    const stats = computeCorrelationStats(mealData, poopData);
    const analysis = await analyzeCorrelations(stats);

    // Calculate days tracked
    let daysTracked = 0;
    if (meals.length > 0) {
      const msPerDay = 24 * 60 * 60 * 1000;
      daysTracked = Math.ceil((Date.now() - new Date(meals[0].timestamp).getTime()) / msPerDay);
    }

    // Save the analysis to the database
    await req.prisma.insightReport.upsert({
      where: { userId: req.user.userId },
      update: { report: JSON.stringify(analysis) },
      create: { userId: req.user.userId, report: JSON.stringify(analysis) }
    });

    res.json({
      totalMeals: meals.length,
      totalPoops: poops.length,
      daysTracked,
      daysCovered,
      ...analysis,
      lastAnalyzed: new Date()
    });
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({ message: 'Failed to analyze data' });
  }
});

// Guest: analyze data without auth (client sends raw data, no DB save)
router.post('/analyze-guest', guestAiLimiter, async (req, res) => {
  try {
    const { meals, poops } = req.body;

    if (!Array.isArray(meals) || !Array.isArray(poops)) {
      return res.status(400).json({ message: 'Meals and poops arrays are required' });
    }

    const uniqueDays = new Set([
      ...meals.map(m => new Date(m.timestamp).toISOString().slice(0, 10)),
      ...poops.map(p => new Date(p.timestamp).toISOString().slice(0, 10))
    ]);
    const daysCovered = uniqueDays.size;
    const readyForInsights =
      (meals.length >= 3 && poops.length >= 2) ||
      (daysCovered >= 2 && meals.length >= 2 && poops.length >= 1);

    if (!readyForInsights) {
      return res.json({
        totalMeals: meals.length,
        totalPoops: poops.length,
        daysTracked: daysCovered,
        daysCovered,
        triggers: []
      });
    }

    const mealData = meals.map(m => ({
      timestamp: m.timestamp,
      foods: (m.foods || []).map(f => ({
        name: f.name,
        ingredients: Array.isArray(f.ingredients) ? f.ingredients : [],
        confidence: f.confidence != null ? f.confidence : 1.0
      }))
    }));

    const poopData = poops.map(p => ({
      timestamp: p.timestamp,
      severity: p.severity,
      symptoms: Array.isArray(p.symptoms) ? p.symptoms : []
    }));

    const stats = computeCorrelationStats(mealData, poopData);
    const analysis = await analyzeCorrelations(stats);

    let daysTracked = 0;
    if (meals.length > 0) {
      const msPerDay = 24 * 60 * 60 * 1000;
      const timestamps = meals.map(m => new Date(m.timestamp).getTime());
      daysTracked = Math.ceil((Date.now() - Math.min(...timestamps)) / msPerDay);
    }

    res.json({
      totalMeals: meals.length,
      totalPoops: poops.length,
      daysTracked,
      daysCovered,
      ...analysis,
      lastAnalyzed: new Date()
    });
  } catch (error) {
    console.error('Guest analyze error:', error);
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
