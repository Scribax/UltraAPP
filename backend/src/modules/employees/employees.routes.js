const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requirePro = require('../../middleware/requirePro');
const { list, create, update, toggleActive, pinLogin } = require('./employees.controller');

router.use(auth, tenant);

// PIN login para POS (solo necesita x-business-id + JWT del dueño)
router.post('/pin-login', pinLogin);

// CRUD requiere plan PRO
router.get('/', requirePro, list);
router.post('/', requirePro, create);
router.put('/:id', requirePro, update);
router.patch('/:id/toggle', requirePro, toggleActive);

module.exports = router;
