const db = require('../../config/db');
const xlsx = require('xlsx');

// Resumen del dashboard (hoy)
const dashboard = async (req, res, next) => {
  try {
    const bizId = req.business.id;
    const tz = 'America/Argentina/Buenos_Aires';

    const [todaySales, lowStock, topProduct, weekSales] = await Promise.all([
      // Ventas de hoy
      db.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(total),0) as revenue
         FROM sales WHERE business_id = $1 AND status = 'completed'
         AND created_at >= NOW() AT TIME ZONE $2 - INTERVAL '1 day'
         AND DATE(created_at AT TIME ZONE $2) = CURRENT_DATE AT TIME ZONE $2`,
        [bizId, tz]
      ),
      // Productos con stock bajo
      db.query(
        `SELECT id, name, stock, min_stock FROM products
         WHERE business_id = $1 AND deleted_at IS NULL AND stock <= min_stock AND is_active = TRUE
         ORDER BY stock ASC LIMIT 10`,
        [bizId]
      ),
      // Producto más vendido (este mes)
      db.query(
        `SELECT si.product_name, SUM(si.quantity) as sold
         FROM sale_items si JOIN sales s ON s.id = si.sale_id
         WHERE s.business_id = $1 AND s.status = 'completed'
         AND s.created_at >= DATE_TRUNC('month', NOW())
         GROUP BY si.product_name ORDER BY sold DESC LIMIT 1`,
        [bizId]
      ),
      // Ventas últimos 7 días
      db.query(
        `SELECT DATE(created_at) as day, COUNT(*) as count, SUM(total) as revenue
         FROM sales WHERE business_id = $1 AND status = 'completed'
         AND created_at >= NOW() - INTERVAL '7 days'
         GROUP BY day ORDER BY day`,
        [bizId]
      ),
    ]);

    res.json({
      today: { count: parseInt(todaySales.rows[0]?.count || 0), revenue: parseFloat(todaySales.rows[0]?.revenue || 0) },
      low_stock: lowStock.rows,
      top_product: topProduct.rows[0] || null,
      week_chart: weekSales.rows,
    });
  } catch (err) { next(err); }
};

// Reporte por período
const salesByPeriod = async (req, res, next) => {
  try {
    const { period = 'day' } = req.query;
    const truncMap = { day: 'hour', week: 'day', month: 'day', year: 'month' };
    const intervalMap = { day: '1 day', week: '7 days', month: '30 days', year: '365 days' };
    const trunc = truncMap[period] || 'day';
    const interval = intervalMap[period] || '30 days';

    const result = await db.query(
      `SELECT DATE_TRUNC($1, created_at) as period, COUNT(*) as count, COALESCE(SUM(total),0) as revenue
       FROM sales WHERE business_id = $2 AND status = 'completed'
       AND created_at >= NOW() - INTERVAL '${interval}'
       GROUP BY period ORDER BY period`,
      [trunc, req.business.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// Top productos
const topProducts = async (req, res, next) => {
  try {
    const { limit = 10, from, to } = req.query;
    const conditions = ["s.business_id = $1 AND s.status = 'completed'"];
    const params = [req.business.id];
    if (from) { conditions.push(`s.created_at >= $${params.length + 1}`); params.push(from); }
    if (to) { conditions.push(`s.created_at <= $${params.length + 1}`); params.push(to); }

    const result = await db.query(
      `SELECT si.product_name, SUM(si.quantity) as units_sold, SUM(si.subtotal) as revenue
       FROM sale_items si JOIN sales s ON s.id = si.sale_id
       WHERE ${conditions.join(' AND ')}
       GROUP BY si.product_name ORDER BY units_sold DESC LIMIT $${params.length + 1}`,
      [...params, limit]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// Export Excel (PRO)
const exportExcel = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const conditions = ["s.business_id = $1 AND s.status = 'completed'"];
    const params = [req.business.id];
    if (from) { conditions.push(`s.created_at >= $${params.length + 1}`); params.push(from); }
    if (to) { conditions.push(`s.created_at <= $${params.length + 1}`); params.push(to + 'T23:59:59'); }

    const sales = await db.query(
      `SELECT s.created_at, s.total, s.payment_method, s.notes,
              e.name as employee, COUNT(si.id) as items
       FROM sales s
       LEFT JOIN employees e ON e.id = s.employee_id
       LEFT JOIN sale_items si ON si.sale_id = s.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY s.id, e.name ORDER BY s.created_at DESC`,
      params
    );

    const data = sales.rows.map(r => ({
      Fecha: new Date(r.created_at).toLocaleString('es-AR'),
      Total: parseFloat(r.total),
      'Método de Pago': r.payment_method,
      Empleado: r.employee || 'Dueño',
      Productos: parseInt(r.items),
      Notas: r.notes || '',
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, 'Ventas');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="ventas-${req.business.id}.xlsx"`,
    });
    res.send(buffer);
  } catch (err) { next(err); }
};

module.exports = { dashboard, salesByPeriod, topProducts, exportExcel };
