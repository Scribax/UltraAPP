const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requirePro = require('../../middleware/requirePro');
const { dashboard, salesByPeriod, topProducts, exportExcel } = require('./reports.controller');

router.use(auth, tenant);
router.get('/dashboard', dashboard);
router.get('/sales', salesByPeriod);
router.get('/top-products', topProducts);
router.get('/export/excel', requirePro, exportExcel);

module.exports = router;
