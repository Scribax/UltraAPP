const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const { registerMovement, getStatus, getShiftReport } = require('./cash.controller');

router.use(auth, tenant);

router.post('/', registerMovement);
router.get('/status', getStatus);
router.get('/shift-report', getShiftReport);

module.exports = router;
