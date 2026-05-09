const { createClient } = require('redis');

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: { reconnectStrategy: (retries) => Math.min(retries * 100, 3000) },
});

redis.on('error', (err) => console.error('[Redis] Error:', err.message));
redis.on('connect', () => console.log('[Redis] Conectado'));

// Conectar al iniciar
redis.connect().catch(console.error);

// ── Helpers ────────────────────────────────────────────────────────

/** Guardar valor con TTL (segundos). Serializa objetos automáticamente */
async function setCache(key, value, ttlSeconds = 60) {
  await redis.setEx(key, ttlSeconds, JSON.stringify(value));
}

/** Obtener valor cacheado. Retorna null si no existe */
async function getCache(key) {
  const val = await redis.get(key);
  return val ? JSON.parse(val) : null;
}

/** Invalidar cache por key exacta o patrón (ej: 'products:biz123:*') */
async function invalidateCache(pattern) {
  if (pattern.includes('*')) {
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(keys);
  } else {
    await redis.del(pattern);
  }
}

module.exports = { redis, setCache, getCache, invalidateCache };
