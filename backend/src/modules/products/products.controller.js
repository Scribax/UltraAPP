const { z } = require('zod');
const db = require('../../config/db');
const xlsx = require('xlsx');
const { logAudit } = require('../../utils/audit');

const FREE_LIMIT = parseInt(process.env.FREE_PLAN_MAX_PRODUCTS || '100');

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  barcode: z.string().optional(),
  buy_price: z.number().min(0).optional(),
  sell_price: z.number().min(0),
  stock: z.number().int().min(0).default(0),
  min_stock: z.number().int().min(0).default(5),
  max_stock: z.number().int().optional(),
  unit: z.string().default('unidad'),
  category_id: z.string().uuid().optional(),
});

const list = async (req, res, next) => {
  try {
    const { search, category_id, low_stock, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['p.business_id = $1', 'p.deleted_at IS NULL', 'p.is_active = TRUE'];
    const params = [req.business.id];

    if (search) { conditions.push(`p.name ILIKE $${params.length + 1}`); params.push(`%${search}%`); }
    if (category_id) { conditions.push(`p.category_id = $${params.length + 1}`); params.push(category_id); }
    if (low_stock === 'true') conditions.push('p.stock <= p.min_stock');

    const where = conditions.join(' AND ');
    const result = await db.query(
      `SELECT p.*, c.name as category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${where} ORDER BY p.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    const count = await db.query(`SELECT COUNT(*) FROM products p WHERE ${where}`, params);
    res.json({ products: result.rows, total: parseInt(count.rows[0].count), page: parseInt(page) });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    // Verificar límite plan FREE
    if (!req.subscription.isPro) {
      const count = await db.query(
        'SELECT COUNT(*) FROM products WHERE business_id = $1 AND deleted_at IS NULL',
        [req.business.id]
      );
      if (parseInt(count.rows[0].count) >= FREE_LIMIT) {
        return res.status(403).json({ error: 'plan_required', message: `Límite de ${FREE_LIMIT} productos en plan Free` });
      }
    }
    const result = await db.query(
      `INSERT INTO products (business_id, category_id, name, description, barcode, buy_price, sell_price, stock, min_stock, max_stock, unit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.business.id, data.category_id, data.name, data.description, data.barcode,
       data.buy_price, data.sell_price, data.stock, data.min_stock, data.max_stock, data.unit]
    );
    await logAudit(req, 'product.created', 'product', result.rows[0].id, { name: data.name });
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const data = productSchema.partial().parse(req.body);
    const fields = Object.keys(data);
    if (!fields.length) return res.status(400).json({ error: 'Sin campos' });

    // Snapshot antes de editar para audit
    const before = await db.query('SELECT sell_price, stock FROM products WHERE id = $1', [req.params.id]);

    const setClause = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const result = await db.query(
      `UPDATE products SET ${setClause}, updated_at = NOW()
       WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL RETURNING *`,
      [req.params.id, req.business.id, ...fields.map(f => data[f])]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
    await logAudit(req, 'product.updated', 'product', req.params.id, { before: before.rows[0], after: data });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    // Soft delete — mantiene historial de ventas intacto
    const result = await db.query(
      `UPDATE products SET deleted_at = NOW(), is_active = FALSE
       WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL RETURNING name`,
      [req.params.id, req.business.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
    await logAudit(req, 'product.deleted', 'product', req.params.id, { name: result.rows[0].name });
    res.json({ message: 'Producto eliminado' });
  } catch (err) { next(err); }
};

const getByBarcode = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM products WHERE barcode = $1 AND business_id = $2 AND deleted_at IS NULL',
      [req.params.code, req.business.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// Import masivo desde Excel (PRO)
const importExcel = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    let created = 0, errors = [];
    for (const [i, row] of rows.entries()) {
      try {
        const data = productSchema.parse({
          name: row['Nombre'] || row['name'],
          sell_price: parseFloat(row['Precio Venta'] || row['sell_price'] || 0),
          buy_price: parseFloat(row['Precio Compra'] || row['buy_price'] || 0),
          stock: parseInt(row['Stock'] || row['stock'] || 0),
          barcode: row['Codigo Barras'] || row['barcode'],
          unit: row['Unidad'] || row['unit'] || 'unidad',
        });
        await db.query(
          `INSERT INTO products (business_id, name, sell_price, buy_price, stock, barcode, unit)
           VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
          [req.business.id, data.name, data.sell_price, data.buy_price, data.stock, data.barcode, data.unit]
        );
        created++;
      } catch (e) { errors.push({ row: i + 2, error: e.message }); }
    }
    res.json({ created, errors, total: rows.length });
  } catch (err) { next(err); }
};

module.exports = { list, create, update, remove, getByBarcode, importExcel };
