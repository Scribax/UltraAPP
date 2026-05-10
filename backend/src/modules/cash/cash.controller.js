const { z } = require('zod');
const db = require('../../config/db');

const movementSchema = z.object({
  type: z.enum(['open', 'close', 'in', 'out']),
  amount: z.number().min(0),
  notes: z.string().optional(),
});

// Registrar un movimiento en caja (Apertura, Cierre, Ingreso, Retiro)
const registerMovement = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const data = movementSchema.parse(req.body);
    await client.query('BEGIN');

    // Obtener balance actual (el último registrado)
    const lastMov = await client.query(
      `SELECT balance, type FROM cash_register 
       WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [req.business.id]
    );

    let currentBalance = 0;
    if (lastMov.rows[0]) {
      currentBalance = parseFloat(lastMov.rows[0].balance);
      
      // Si ya está cerrada, solo se puede abrir
      if (lastMov.rows[0].type === 'close' && data.type !== 'open') {
        throw Object.assign(new Error('La caja está cerrada. Debes abrirla primero.'), { status: 400 });
      }
      // Si ya está abierta, no se puede volver a abrir
      if (lastMov.rows[0].type !== 'close' && data.type === 'open') {
        throw Object.assign(new Error('La caja ya se encuentra abierta.'), { status: 400 });
      }
    } else if (data.type !== 'open') {
      throw Object.assign(new Error('Nunca se ha abierto la caja. Debes abrirla primero con un monto inicial.'), { status: 400 });
    }

    // Calcular nuevo balance
    let newBalance = currentBalance;
    if (data.type === 'open') {
      // Al abrir, el balance es el monto de apertura (no se suma al anterior porque se asume que el cierre sacó la plata)
      newBalance = data.amount;
    } else if (data.type === 'in') {
      newBalance += data.amount;
    } else if (data.type === 'out') {
      newBalance -= data.amount;
      if (newBalance < 0) throw Object.assign(new Error('No hay suficiente dinero en caja para retirar esa cantidad.'), { status: 400 });
    } else if (data.type === 'close') {
      // El monto enviado es lo que REALMENTE hay físicamente.
      // Aquí se podría calcular el descuadre y registrarlo en notes, pero el balance finaliza en 0 o en lo que queda para el día siguiente.
      // Generalmente, al cerrar caja, se "retira" el dinero y el balance queda en 0.
      newBalance = 0; 
      data.notes = (data.notes ? data.notes + '. ' : '') + `Cierre de caja. Efectivo real declarado: $${data.amount}. Esperado: $${currentBalance}. Diferencia: $${data.amount - currentBalance}`;
    }

    const result = await client.query(
      `INSERT INTO cash_register (business_id, user_id, type, amount, balance, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.business.id, req.user.id, data.type, data.amount, newBalance, data.notes]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// Obtener estado actual de la caja
const getStatus = async (req, res, next) => {
  try {
    const lastMov = await db.query(
      `SELECT * FROM cash_register 
       WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.business.id]
    );
    
    if (!lastMov.rows[0]) {
      return res.json({ isOpen: false, balance: 0, lastMovement: null });
    }
    
    const isOpen = lastMov.rows[0].type !== 'close';
    const balance = parseFloat(lastMov.rows[0].balance);
    
    // Si está abierta, calcular también el efectivo ingresado por ventas desde la apertura
    let cashSales = 0;
    if (isOpen) {
      const sales = await db.query(
        `SELECT COALESCE(SUM(total), 0) as total FROM sales 
         WHERE business_id = $1 AND payment_method = 'efectivo' AND status = 'completed' AND created_at > $2`,
        [req.business.id, lastMov.rows[0].created_at] // Ojo: debería buscar la fecha de 'open' más reciente, pero si está abierta, la fecha del lastMov está bien si asumimos que es el 'open' u otro mov. 
        // Mejor buscamos la fecha del último 'open':
      );
      // Wait, let's get the last 'open' explicitly
      const lastOpen = await db.query(
        `SELECT created_at FROM cash_register WHERE business_id = $1 AND type = 'open' ORDER BY created_at DESC LIMIT 1`,
        [req.business.id]
      );
      if (lastOpen.rows[0]) {
         const salesData = await db.query(
           `SELECT COALESCE(SUM(total), 0) as total FROM sales 
            WHERE business_id = $1 AND payment_method = 'efectivo' AND status = 'completed' AND created_at > $2`,
           [req.business.id, lastOpen.rows[0].created_at]
         );
         cashSales = parseFloat(salesData.rows[0].total);
      }
    }

    res.json({
      isOpen,
      balance: balance, // Balance base (apertura + ingresos extra - retiros)
      cashSales, // Ventas en efectivo durante el turno
      expectedCash: balance + cashSales, // Lo que debería haber físicamente
      lastMovement: lastMov.rows[0]
    });
  } catch (err) { next(err); }
};

// Obtener historial de caja del turno actual
const getShiftReport = async (req, res, next) => {
  try {
    const lastOpen = await db.query(
      `SELECT created_at FROM cash_register WHERE business_id = $1 AND type = 'open' ORDER BY created_at DESC LIMIT 1`,
      [req.business.id]
    );

    if (!lastOpen.rows[0]) return res.json({ error: 'No hay turno activo' });

    const startTime = lastOpen.rows[0].created_at;

    // 1. Movimientos de caja manuales
    const movements = await db.query(
      `SELECT * FROM cash_register WHERE business_id = $1 AND created_at >= $2 ORDER BY created_at DESC`,
      [req.business.id, startTime]
    );

    // 2. Ventas desglosadas
    const salesAggr = await db.query(
      `SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total), 0) as total 
       FROM sales 
       WHERE business_id = $1 AND status = 'completed' AND created_at >= $2
       GROUP BY payment_method`,
      [req.business.id, startTime]
    );

    // 3. Top Productos vendidos en el turno
    const topProducts = await db.query(
      `SELECT si.product_name, SUM(si.quantity) as qty, SUM(si.subtotal) as revenue
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.business_id = $1 AND s.status = 'completed' AND s.created_at >= $2
       GROUP BY si.product_name
       ORDER BY qty DESC LIMIT 5`,
      [req.business.id, startTime]
    );

    res.json({
      startTime,
      movements: movements.rows,
      sales: salesAggr.rows,
      topProducts: topProducts.rows
    });
  } catch (err) { next(err); }
};

module.exports = { registerMovement, getStatus, getShiftReport };
