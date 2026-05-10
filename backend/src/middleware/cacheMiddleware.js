const redisClient = require('../config/redis');

// Middleware de caché para endpoints GET (usando Redis)
const cacheMiddleware = (durationInSeconds = 60) => {
  return async (req, res, next) => {
    // Solo para métodos GET
    if (req.method !== 'GET') return next();

    // Crear una clave de caché única basada en el business_id, el path y los query params
    const key = `cache:${req.business.id}:${req.originalUrl || req.url}`;

    try {
      const cachedResponse = await redisClient.get(key);
      if (cachedResponse) {
        return res.json(JSON.parse(cachedResponse));
      } else {
        // Interceptar res.json para guardar la respuesta en caché antes de enviarla
        const originalJson = res.json;
        res.json = function(body) {
          redisClient.setEx(key, durationInSeconds, JSON.stringify(body))
            .catch(err => console.error('Error guardando en caché Redis:', err));
          
          return originalJson.call(this, body);
        };
        next();
      }
    } catch (err) {
      console.error('Error leyendo de caché Redis:', err);
      next();
    }
  };
};

module.exports = cacheMiddleware;
