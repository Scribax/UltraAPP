const db = require('../config/db');

// Valida que el business_id del header pertenece al usuario autenticado
// Inyecta req.business y req.subscription para uso posterior
const tenantMiddleware = async (req, res, next) => {
  const businessId = req.headers['x-business-id'];
  if (!businessId) {
    return res.status(400).json({ error: 'Header X-Business-Id requerido' });
  }

  try {
    const result = await db.query(
      `SELECT b.id, b.name, b.slug, b.currency,
              s.plan, s.status as sub_status, s.expires_at
       FROM businesses b
       LEFT JOIN subscriptions s ON s.business_id = b.id
       WHERE b.id = $1 AND b.owner_id = $2 AND b.is_active = TRUE
       LIMIT 1`,
      [businessId, req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(403).json({ error: 'Acceso denegado a este negocio' });
    }

    const row = result.rows[0];
    req.business = { id: row.id, name: row.name, slug: row.slug, currency: row.currency };
    req.subscription = {
      plan: row.plan || 'free',
      status: row.sub_status || 'active',
      isPro: row.plan === 'pro' && row.sub_status === 'active',
    };
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = tenantMiddleware;
