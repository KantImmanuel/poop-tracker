const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Subscribe to push notifications
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: 'Invalid subscription object' });
    }

    await req.prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: req.user.userId,
      },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: req.user.userId,
      },
    });

    res.json({ message: 'Subscribed to notifications' });
  } catch (error) {
    req.log.error({ err: error }, 'Failed to save push subscription');
    res.status(500).json({ message: 'Failed to subscribe' });
  }
});

// Unsubscribe from push notifications
router.delete('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint is required' });
    }

    await req.prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId: req.user.userId,
      },
    });

    res.json({ message: 'Unsubscribed from notifications' });
  } catch (error) {
    req.log.error({ err: error }, 'Failed to delete push subscription');
    res.status(500).json({ message: 'Failed to unsubscribe' });
  }
});

// Check subscription status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const count = await req.prisma.pushSubscription.count({
      where: { userId: req.user.userId },
    });
    res.json({ subscribed: count > 0 });
  } catch (error) {
    req.log.error({ err: error }, 'Failed to check subscription status');
    res.status(500).json({ message: 'Failed to check status' });
  }
});

module.exports = router;
