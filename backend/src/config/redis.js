const { createClient } = require('redis');

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'miapp_redis'}:${process.env.REDIS_PORT || 6379}`
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis conectado exitosamente'));

// Iniciar la conexión
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Error inicializando Redis:', err);
  }
})();

module.exports = redisClient;
