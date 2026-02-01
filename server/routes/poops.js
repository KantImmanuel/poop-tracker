const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const VALID_SYMPTOMS = ['bloating', 'cramps', 'gas', 'nausea', 'urgency', 'fatigue', 'blood', 'mucus'];

// Get all poop logs (optionally filtered by date)
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

    const poops = await req.prisma.poopLog.findMany({
      where,
      orderBy: { timestamp: 'desc' }
    });

    res.json(poops);
  } catch (error) {
    req.log.error({ err: error }, 'Failed to fetch poop logs');
    res.status(500).json({ message: 'Failed to fetch poop logs' });
  }
});

// Log a poop (with optional severity)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { severity, symptoms } = req.body;

    const poop = await req.prisma.poopLog.create({
      data: {
        userId: req.user.userId,
        severity: severity || null,
        symptoms: Array.isArray(symptoms) && symptoms.length > 0
          ? JSON.stringify(symptoms.filter(s => VALID_SYMPTOMS.includes(s)))
          : null
      }
    });

    res.status(201).json(poop);
  } catch (error) {
    req.log.error({ err: error }, 'Failed to create poop log');
    res.status(500).json({ message: 'Failed to log poop' });
  }
});

// Update poop severity and symptoms
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { severity, symptoms } = req.body;
    const valid = ['1', '2', '3', '4', '5', '6', '7', 'mild', 'moderate', 'severe', null];
    if (severity !== undefined && !valid.includes(severity)) {
      return res.status(400).json({ message: 'Invalid severity' });
    }

    const poop = await req.prisma.poopLog.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId
      }
    });

    if (!poop) {
      return res.status(404).json({ message: 'Poop log not found' });
    }

    const data = { severity: severity || null };
    if (symptoms !== undefined) {
      data.symptoms = Array.isArray(symptoms) && symptoms.length > 0
        ? JSON.stringify(symptoms.filter(s => VALID_SYMPTOMS.includes(s)))
        : null;
    }

    const updated = await req.prisma.poopLog.update({
      where: { id: req.params.id },
      data
    });

    res.json(updated);
  } catch (error) {
    req.log.error({ err: error }, 'Failed to update poop log');
    res.status(500).json({ message: 'Failed to update poop log' });
  }
});

// Delete a poop log
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const poop = await req.prisma.poopLog.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId
      }
    });

    if (!poop) {
      return res.status(404).json({ message: 'Poop log not found' });
    }

    await req.prisma.poopLog.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Poop log deleted' });
  } catch (error) {
    req.log.error({ err: error }, 'Failed to delete poop log');
    res.status(500).json({ message: 'Failed to delete poop log' });
  }
});

module.exports = router;
