const { z } = require('zod');
const db = require('../../config/db');
const { logAudit } = require('../../utils/audit');

const categorySchema = z.object({
  name: z.string().min(1).max(150),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), // hex color
  icon: z.string().max(50).optional(),
});

const list = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.deleted_at IS NULL
       WHERE c.business_id = $1
       GROUP BY c.id ORDER BY c.name`,
      [req.business.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = categorySchema.parse(req.body);
    const result = await db.query(
      'INSERT INTO categories (business_id, name, color, icon) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.business.id, data.name, data.color, data.icon]
    );
    await logAudit(req, 'category.created', 'category', result.rows[0].id, { name: data.name });
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const data = categorySchema.partial().parse(req.body);
    const fields = Object.keys(data);
    if (!fields.length) return res.status(400).json({ error: 'Sin campos' });
    const setClause = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const result = await db.query(
      `UPDATE categories SET ${setClause} WHERE id = $1 AND business_id = $2 RETURNING *`,
      [req.params.id, req.business.id, ...fields.map(f => data[f])]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    // Verificar que no tenga productos activos
    const check = await db.query(
      'SELECT COUNT(*) FROM products WHERE category_id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (parseInt(check.rows[0].count) > 0) {
      return res.status(409).json({ error: 'La categoría tiene productos activos. Reasigna o elimina los productos primero.' });
    }
    const result = await db.query(
      'DELETE FROM categories WHERE id = $1 AND business_id = $2 RETURNING name',
      [req.params.id, req.business.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json({ message: 'Categoría eliminada' });
  } catch (err) { next(err); }
};

module.exports = { list, create, update, remove };
