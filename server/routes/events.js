const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const VALID_ACTIONS = [
  'guest_entered',
  'meal_logged',
  'poop_logged',
  'insights_viewed',
  'account_created',
];

// Rate limit: 60 events per 15 min per IP
const eventsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ message: 'Too many events' });
  },
});

router.post('/', eventsLimiter, async (req, res) => {
  try {
    const { action, isGuest, sessionId } = req.body;

    if (!action || !VALID_ACTIONS.includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    await req.prisma.analyticsEvent.create({
      data: {
        action,
        isGuest: Boolean(isGuest),
        sessionId: sessionId ? String(sessionId).slice(0, 64) : null,
      },
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    req.log.error({ err: error }, 'Failed to save analytics event');
    res.status(500).json({ message: 'Failed to save event' });
  }
});

module.exports = router;
