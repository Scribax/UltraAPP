const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const { create, list, remove } = require('./expenses.controller');

router.post('/', auth, tenant, create);
router.get('/', auth, tenant, list);
router.delete('/:id', auth, tenant, remove);

module.exports = router;
