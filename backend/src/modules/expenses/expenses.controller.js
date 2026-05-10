const { z } = require('zod');
const db = require('../../config/db');

const expenseSchema = z.object({
  category: z.string().min(2),
  description: z.string().min(3),
  amount: z.number().positive(),
  date: z.string().optional(), // ISO date
});

const create = async (req, res, next) => {
  try {
    const data = expenseSchema.parse(req.body);
    const result = await db.query(
      `INSERT INTO expenses (business_id, category, description, amount, date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.business.id, data.category, data.description, data.amount, data.date || new Date()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const { from, to, category } = req.query;
    const conditions = ['business_id = $1'];
    const params = [req.business.id];

    if (from) { conditions.push(`date >= $${params.length + 1}`); params.push(from); }
    if (to) { conditions.push(`date <= $${params.length + 1}`); params.push(to + ' 23:59:59'); }
    if (category) { conditions.push(`category = $${params.length + 1}`); params.push(category); }

    const where = conditions.join(' AND ');
    const result = await db.query(
      `SELECT * FROM expenses WHERE ${where} ORDER BY date DESC`,
      params
    );
    
    const summary = await db.query(
      `SELECT SUM(amount) as total FROM expenses WHERE ${where}`,
      params
    );

    res.json({ expenses: result.rows, total: parseFloat(summary.rows[0].total || 0) });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await db.query('DELETE FROM expenses WHERE id = $1 AND business_id = $2', [req.params.id, req.business.id]);
    res.json({ message: 'Gasto eliminado' });
  } catch (err) { next(err); }
};

module.exports = { create, list, remove };
