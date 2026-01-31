const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// POST /api/migrate/guest-data
// Accepts guest meals and poops from IndexedDB and creates them in the DB
router.post('/guest-data', authenticateToken, async (req, res) => {
  try {
    const { meals, poops } = req.body;
    const userId = req.user.id;

    let mealsCreated = 0;
    let poopsCreated = 0;

    // Import meals
    if (meals && Array.isArray(meals)) {
      for (const meal of meals) {
        const foods = meal.foods || [];
        await req.prisma.meal.create({
          data: {
            userId,
            timestamp: meal.timestamp ? new Date(meal.timestamp) : new Date(),
            foods: {
              create: foods.map(f => ({
                name: f.name || 'Unknown',
                ingredients: Array.isArray(f.ingredients) ? f.ingredients.join(', ') : (f.ingredients || ''),
                confidence: 1.0
              }))
            }
          }
        });
        mealsCreated++;
      }
    }

    // Import poops
    if (poops && Array.isArray(poops)) {
      for (const poop of poops) {
        await req.prisma.poopLog.create({
          data: {
            userId,
            timestamp: poop.timestamp ? new Date(poop.timestamp) : new Date(),
            severity: poop.severity || null,
            symptoms: Array.isArray(poop.symptoms) ? JSON.stringify(poop.symptoms) : (poop.symptoms || '[]')
          }
        });
        poopsCreated++;
      }
    }

    res.json({ mealsCreated, poopsCreated });
  } catch (error) {
    console.error('Guest data migration error:', error);
    res.status(500).json({ message: 'Failed to migrate guest data' });
  }
});

module.exports = router;
