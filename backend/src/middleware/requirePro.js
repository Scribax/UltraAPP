// Middleware que verifica si el negocio tiene plan PRO activo
// Usar como: router.get('/export', auth, tenant, requirePro, handler)
const requirePro = (req, res, next) => {
  if (!req.subscription?.isPro) {
    return res.status(403).json({
      error: 'plan_required',
      message: 'Esta función requiere el plan PRO',
      upgrade_url: '/upgrade',
    });
  }
  next();
};

module.exports = requirePro;
