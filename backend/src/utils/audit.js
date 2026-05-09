const db = require('../config/db');

/**
 * Registra una acción en la tabla audit_logs
 * Uso: await logAudit(req, 'product.created', 'product', productId, { name: '...' })
 */
async function logAudit(req, action, entity, entityId, details = {}) {
  try {
    await db.query(
      `INSERT INTO audit_logs (business_id, user_id, action, entity, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.business?.id || null,
        req.user?.id || null,
        action,
        entity,
        entityId || null,
        JSON.stringify(details),
        req.ip,
      ]
    );
  } catch (err) {
    // No interrumpir el flujo principal por fallos de auditoría
    console.error('[AUDIT] Error registrando log:', err.message);
  }
}

module.exports = { logAudit };
