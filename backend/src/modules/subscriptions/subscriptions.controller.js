const db = require('../../config/db');

const getCurrent = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT s.plan, s.status, s.expires_at, s.created_at
       FROM subscriptions s WHERE s.business_id = $1 ORDER BY s.created_at DESC LIMIT 1`,
      [req.business.id]
    );
    const sub = result.rows[0] || { plan: 'free', status: 'active', expires_at: null };
    res.json({
      ...sub,
      isPro: sub.plan === 'pro' && sub.status === 'active',
      features: {
        max_products: sub.plan === 'pro' ? null : parseInt(process.env.FREE_PLAN_MAX_PRODUCTS || '100'),
        employees: sub.plan === 'pro',
        export_excel: sub.plan === 'pro',
        barcode_scanner: sub.plan === 'pro',
        advanced_reports: sub.plan === 'pro',
        cloud_backup: sub.plan === 'pro',
      },
    });
  } catch (err) { next(err); }
};

// Webhook de pago (MercadoPago / Stripe / etc)
// En producción validar la firma del webhook
const webhook = async (req, res, next) => {
  try {
    const { business_id, plan, status, payment_ref, expires_at } = req.body;
    if (!business_id || !plan) return res.status(400).json({ error: 'Datos incompletos' });

    // Upsert suscripción
    await db.query(
      `INSERT INTO subscriptions (business_id, plan, status, payment_ref, expires_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (business_id) DO UPDATE
       SET plan = $2, status = $3, payment_ref = $4, expires_at = $5, updated_at = NOW()`,
      [business_id, plan, status || 'active', payment_ref, expires_at]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
};

module.exports = { getCurrent, webhook };
