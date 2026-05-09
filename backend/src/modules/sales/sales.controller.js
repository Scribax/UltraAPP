const { z } = require('zod');
const db = require('../../config/db');
const { logAudit } = require('../../utils/audit');

const saleSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  payment_method: z.enum(['efectivo', 'tarjeta', 'transferencia', 'otro']).default('efectivo'),
  employee_id: z.string().uuid().optional(),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

const create = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const data = saleSchema.parse(req.body);
    await client.query('BEGIN');

    let subtotal = 0;
    const enrichedItems = [];

    for (const item of data.items) {
      const prod = await client.query(
        'SELECT id, name, sell_price, stock FROM products WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL FOR UPDATE',
        [item.product_id, req.business.id]
      );
      if (!prod.rows[0]) throw Object.assign(new Error(`Producto ${item.product_id} no existe`), { status: 404 });
      if (prod.rows[0].stock < item.quantity) {
        throw Object.assign(new Error(`Stock insuficiente para "${prod.rows[0].name}"`), { status: 400 });
      }
      const lineTotal = parseFloat(prod.rows[0].sell_price) * item.quantity;
      subtotal += lineTotal;
      enrichedItems.push({ ...prod.rows[0], quantity: item.quantity, subtotal: lineTotal });
    }

    const total = Math.max(0, subtotal - data.discount);

    // Insertar venta
    const sale = await client.query(
      `INSERT INTO sales (business_id, user_id, employee_id, total, discount, payment_method, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [req.business.id, req.user.id, data.employee_id, total, data.discount, data.payment_method, data.notes]
    );
    const saleId = sale.rows[0].id;

    // Insertar items + descontar stock + registrar movimiento
    for (const item of enrichedItems) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [saleId, item.id, item.name, item.quantity, item.sell_price, item.subtotal]
      );
      const stockBefore = item.stock;
      const stockAfter = item.stock - item.quantity;
      await client.query(
        'UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2',
        [stockAfter, item.id]
      );
      await client.query(
        `INSERT INTO stock_movements (business_id, product_id, product_name, type, quantity, stock_before, stock_after, reference_id)
         VALUES ($1,$2,$3,'sale',$4,$5,$6,$7)`,
        [req.business.id, item.id, item.name, -item.quantity, stockBefore, stockAfter, saleId]
      );
    }

    await client.query('COMMIT');
    await logAudit(req, 'sale.created', 'sale', saleId, { total, items: enrichedItems.length });
    res.status(201).json({ saleId, total, items: enrichedItems.length });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

const list = async (req, res, next) => {
  try {
    const { from, to, payment_method, page = 1, limit = 30 } = req.query;
    const conditions = ['s.business_id = $1', "s.status = 'completed'"];
    const params = [req.business.id];

    if (from) { conditions.push(`s.created_at >= $${params.length + 1}`); params.push(from); }
    if (to) { conditions.push(`s.created_at <= $${params.length + 1}`); params.push(to + 'T23:59:59'); }
    if (payment_method) { conditions.push(`s.payment_method = $${params.length + 1}`); params.push(payment_method); }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = conditions.join(' AND ');
    const result = await db.query(
      `SELECT s.*, e.name as employee_name
       FROM sales s LEFT JOIN employees e ON e.id = s.employee_id
       WHERE ${where} ORDER BY s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    const count = await db.query(`SELECT COUNT(*), SUM(total) as total_sum FROM sales s WHERE ${where}`, params);
    res.json({ sales: result.rows, total: parseInt(count.rows[0].count), total_revenue: count.rows[0].total_sum });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const sale = await db.query(
      'SELECT * FROM sales WHERE id = $1 AND business_id = $2', [req.params.id, req.business.id]
    );
    if (!sale.rows[0]) return res.status(404).json({ error: 'Venta no encontrada' });
    const items = await db.query('SELECT * FROM sale_items WHERE sale_id = $1', [req.params.id]);
    res.json({ ...sale.rows[0], items: items.rows });
  } catch (err) { next(err); }
};

const cancel = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const sale = await client.query(
      "SELECT * FROM sales WHERE id = $1 AND business_id = $2 AND status = 'completed' FOR UPDATE",
      [req.params.id, req.business.id]
    );
    if (!sale.rows[0]) return res.status(404).json({ error: 'Venta no encontrada o ya anulada' });

    await client.query("UPDATE sales SET status = 'cancelled' WHERE id = $1", [req.params.id]);

    // Devolver stock
    const items = await client.query('SELECT * FROM sale_items WHERE sale_id = $1', [req.params.id]);
    for (const item of items.rows) {
      if (!item.product_id) continue;
      await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
      await client.query(
        `INSERT INTO stock_movements (business_id, product_id, type, quantity, reference_id, notes)
         VALUES ($1,$2,'adjustment',$3,$4,'Anulación de venta')`,
        [req.business.id, item.product_id, item.quantity, req.params.id]
      );
    }
    await client.query('COMMIT');
    await logAudit(req, 'sale.cancelled', 'sale', req.params.id, {});
    res.json({ message: 'Venta anulada' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { create, list, getOne, cancel };
