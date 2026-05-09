const { z } = require('zod');
const db = require('../../config/db');
const { logAudit } = require('../../utils/audit');

const employeeSchema = z.object({
  name: z.string().min(2).max(200),
  role: z.enum(['owner', 'manager', 'cashier']).default('cashier'),
  pin_code: z.string().min(4).max(10).regex(/^\d+$/, 'El PIN debe ser numérico'),
});

const list = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, role, is_active, created_at FROM employees
       WHERE business_id = $1 ORDER BY name`,
      [req.business.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    // Requiere plan PRO (verificado en ruta)
    const data = employeeSchema.parse(req.body);
    const result = await db.query(
      'INSERT INTO employees (business_id, name, role, pin_code) VALUES ($1,$2,$3,$4) RETURNING id, name, role, is_active',
      [req.business.id, data.name, data.role, data.pin_code]
    );
    await logAudit(req, 'employee.created', 'employee', result.rows[0].id, { name: data.name });
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const data = employeeSchema.partial().parse(req.body);
    const fields = Object.keys(data);
    if (!fields.length) return res.status(400).json({ error: 'Sin campos' });
    const setClause = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const result = await db.query(
      `UPDATE employees SET ${setClause}, updated_at = NOW()
       WHERE id = $1 AND business_id = $2 RETURNING id, name, role, is_active`,
      [req.params.id, req.business.id, ...fields.map(f => data[f])]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const toggleActive = async (req, res, next) => {
  try {
    const result = await db.query(
      'UPDATE employees SET is_active = NOT is_active WHERE id = $1 AND business_id = $2 RETURNING id, name, is_active',
      [req.params.id, req.business.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// Login por PIN en modo POS (no requiere JWT completo — solo business_id en header)
const pinLogin = async (req, res, next) => {
  try {
    const { pin_code } = req.body;
    if (!pin_code) return res.status(400).json({ error: 'PIN requerido' });
    const result = await db.query(
      `SELECT id, name, role FROM employees
       WHERE business_id = $1 AND pin_code = $2 AND is_active = TRUE`,
      [req.business.id, pin_code]
    );
    if (!result.rows[0]) return res.status(401).json({ error: 'PIN incorrecto' });
    res.json({ employee: result.rows[0] });
  } catch (err) { next(err); }
};

module.exports = { list, create, update, toggleActive, pinLogin };
