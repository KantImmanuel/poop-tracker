require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pinoHttp = require('pino-http');
const { PrismaClient } = require('@prisma/client');
const logger = require('./services/logger');

const { authLimiter, generalLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/auth');
const mealsRoutes = require('./routes/meals');
const poopsRoutes = require('./routes/poops');
const insightsRoutes = require('./routes/insights');
const historyRoutes = require('./routes/history');
const migrateRoutes = require('./routes/migrate');

const app = express();
app.set('trust proxy', 1);
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware - CORS
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',')
  : ['http://localhost:3000'];
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));

// Make prisma available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Rate limiting
app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/poops', poopsRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/migrate', migrateRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});
