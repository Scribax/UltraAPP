const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('../../config/db');

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function generateTokens(user) {
  const payload = { id: user.id, email: user.email };
  const access = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  const refresh = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
  return { access, refresh };
}

const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const exists = await db.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (exists.rows[0]) return res.status(409).json({ error: 'Email ya registrado' });

    const hash = await bcrypt.hash(data.password, 12);
    const user = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [data.name, data.email, hash]
    );
    const tokens = generateTokens(user.rows[0]);
    res.status(201).json({ user: user.rows[0], ...tokens });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await db.query('SELECT id, name, email, password_hash FROM users WHERE email = $1', [data.email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const { password_hash, ...safeUser } = user;
    const tokens = generateTokens(safeUser);
    res.json({ user: safeUser, ...tokens });
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token requerido' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.query('SELECT id, name, email FROM users WHERE id = $1', [decoded.id]);
    if (!user.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    const tokens = generateTokens(user.rows[0]);
    res.json(tokens);
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Token inválido' });
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1', [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

module.exports = { register, login, refresh, me };
