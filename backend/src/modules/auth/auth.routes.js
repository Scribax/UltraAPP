const express = require('express');
const router = express.Router();
const { register, login, refresh, me } = require('./auth.controller');
const auth = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.get('/me', auth, me);

module.exports = router;
