const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const { create, list, getOne, cancel } = require('./sales.controller');

router.use(auth, tenant);
router.post('/', create);
router.get('/', list);
router.get('/:id', getOne);
router.patch('/:id/cancel', cancel);

module.exports = router;
