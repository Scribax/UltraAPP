const { z } = require('zod');
const db = require('../../config/db');

const businessSchema = z.object({
  name: z.string().min(2),
  type: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  currency: z.string().length(3).default('ARS'),
  timezone: z.string().default('America/Argentina/Buenos_Aires'),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Solo letras, números y guiones').optional(),
});

// Generar slug único desde nombre
function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
}

const create = async (req, res, next) => {
  try {
    const data = businessSchema.parse(req.body);
    // Generar slug automático si no se proporciona
    let slug = data.slug || slugify(data.name);
    const slugExists = await db.query('SELECT id FROM businesses WHERE slug = $1', [slug]);
    if (slugExists.rows[0]) slug = `${slug}-${Date.now().toString(36)}`;

    const result = await db.query(
      `INSERT INTO businesses (owner_id, name, type, address, phone, currency, timezone, slug)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, data.name, data.type, data.address, data.phone, data.currency, data.timezone, slug]
    );
    // Crear suscripción gratuita automáticamente
    await db.query(
      'INSERT INTO subscriptions (business_id, plan, status) VALUES ($1, $2, $3)',
      [result.rows[0].id, 'free', 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT b.*, s.plan, s.status as sub_status
       FROM businesses b
       LEFT JOIN subscriptions s ON s.business_id = b.id
       WHERE b.owner_id = $1 AND b.is_active = TRUE
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT b.*, s.plan, s.status as sub_status, s.expires_at
       FROM businesses b
       LEFT JOIN subscriptions s ON s.business_id = b.id
       WHERE b.id = $1 AND b.owner_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Negocio no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const data = businessSchema.partial().parse(req.body);
    const fields = Object.keys(data).filter(k => k !== 'slug');
    if (!fields.length) return res.status(400).json({ error: 'Sin campos para actualizar' });

    const setClause = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const values = fields.map(f => data[f]);

    const result = await db.query(
      `UPDATE businesses SET ${setClause}, updated_at = NOW()
       WHERE id = $1 AND owner_id = $2 RETURNING *`,
      [req.params.id, req.user.id, ...values]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Negocio no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// Catálogo público (sin auth)
const publicCatalog = async (req, res, next) => {
  try {
    const biz = await db.query(
      `SELECT b.id, b.name, b.type, b.address, b.phone, b.logo_url, b.currency, b.opening_hours
       FROM businesses b WHERE b.slug = $1 AND b.is_active = TRUE`,
      [req.params.slug]
    );
    if (!biz.rows[0]) return res.status(404).json({ error: 'Comercio no encontrado' });
    const { id, ...bizData } = biz.rows[0];

    const products = await db.query(
      `SELECT name, description, sell_price, unit, category_id
       FROM products WHERE business_id = $1 AND is_active = TRUE AND deleted_at IS NULL AND stock > 0
       ORDER BY name`,
      [id]
    );
    res.json({ business: bizData, products: products.rows });
  } catch (err) { next(err); }
};

module.exports = { create, list, getOne, update, publicCatalog };
