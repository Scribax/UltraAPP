const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const { getCurrent, webhook } = require('./subscriptions.controller');

router.get('/', auth, tenant, getCurrent);
router.post('/webhook', webhook); // webhook externo, sin auth JWT

module.exports = router;
