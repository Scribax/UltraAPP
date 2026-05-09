const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redis } = require('../config/redis');

/**
 * Rate limiter usando Redis como store
 * Persiste los contadores entre reinicios del servidor
 */
const redisRateLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: { error: message || 'Demasiadas solicitudes, intenta más tarde' },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redis.sendCommand(args),
    }),
  });

module.exports = redisRateLimiter;
