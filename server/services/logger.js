const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV === 'test' && !process.env.LOG_LEVEL
    ? { level: 'silent' }
    : {})
});

module.exports = logger;
