require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// ── Módulos ────────────────────────────────────────────────
const authRoutes         = require('./modules/auth/auth.routes');
const businessRoutes     = require('./modules/business/business.routes');
const productRoutes      = require('./modules/products/products.routes');
const salesRoutes        = require('./modules/sales/sales.routes');
const reportRoutes       = require('./modules/reports/reports.routes');
const categoryRoutes     = require('./modules/categories/categories.routes');
const employeeRoutes     = require('./modules/employees/employees.routes');
const subscriptionRoutes = require('./modules/subscriptions/subscriptions.routes');
const errorHandler       = require('./middleware/errorHandler');

const app = express();

// ── Seguridad ──────────────────────────────────────────────
app.use(helmet());
app.set('trust proxy', 1); // Nginx reverse proxy

app.use(cors({
  origin: (origin, cb) => {
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
    if (!origin || allowed.includes(origin) || allowed.includes('*')) return cb(null, true);
    cb(new Error('CORS no permitido'));
  },
  credentials: true,
}));

// Rate limiting global con memoria (cambiar a Redis en producción)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Demasiadas solicitudes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Demasiados intentos de autenticación' },
});

app.use(globalLimiter);

// ── Body parsing ───────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

// ── Health check ───────────────────────────────────────────
app.get('/health', async (req, res) => {
  const db = require('./config/db');
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// ── Rutas API ──────────────────────────────────────────────
app.use('/api/auth',         authLimiter, authRoutes);
app.use('/api/business',     businessRoutes);
app.use('/api/products',     productRoutes);
app.use('/api/sales',        salesRoutes);
app.use('/api/reports',      reportRoutes);
app.use('/api/categories',   categoryRoutes);
app.use('/api/employees',    employeeRoutes);
app.use('/api/subscription', subscriptionRoutes);

// ── 404 ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ruta ${req.method} ${req.path} no encontrada` });
});

// ── Error handler global ───────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 MI APP Backend → http://localhost:${PORT}`);
  console.log(`📋 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
