const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const { create, list, remove } = require('./expenses.controller');

router.use(auth, tenant);

router.post('/', create);
router.get('/', list);
router.delete('/:id', remove);

module.exports = router;
