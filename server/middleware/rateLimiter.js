const rateLimit = require('express-rate-limit');

// Shared 429 handler — matches the app's { message: "..." } error format
const rateLimitHandler = (req, res) => {
  res.status(429).json({ message: 'Too many requests. Please try again later.' });
};

// Tier 1: Strict — auth endpoints (login/register)
// 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Tier 2: AI — expensive endpoints (meal image analysis, insights analysis)
// 10 requests per hour per user
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ message: 'AI analysis limit reached. Please try again in an hour.' });
  },
  keyGenerator: (req) => req.user?.userId || req.ip,
  validate: { keyGeneratorIpFallback: false },
});

// Tier 3: General — all API routes
// 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

module.exports = { authLimiter, aiLimiter, generalLimiter };
