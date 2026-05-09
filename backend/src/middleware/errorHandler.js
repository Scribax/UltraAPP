// Error handler global — debe ser el último middleware en app.js
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Errores de validación Zod
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'validation_error',
      details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  // Errores de PostgreSQL
  if (err.code === '23505') { // unique_violation
    return res.status(409).json({ error: 'Registro duplicado' });
  }
  if (err.code === '23503') { // foreign_key_violation
    return res.status(400).json({ error: 'Referencia inválida' });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
  });
};

module.exports = errorHandler;
