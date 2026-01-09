const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

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
    console.error('Get poops error:', error);
    res.status(500).json({ message: 'Failed to fetch poop logs' });
  }
});

// Log a poop (one tap!)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const poop = await req.prisma.poopLog.create({
      data: {
        userId: req.user.userId
      }
    });

    res.status(201).json(poop);
  } catch (error) {
    console.error('Create poop error:', error);
    res.status(500).json({ message: 'Failed to log poop' });
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
    console.error('Delete poop error:', error);
    res.status(500).json({ message: 'Failed to delete poop log' });
  }
});

module.exports = router;
