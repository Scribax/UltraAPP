const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requirePro = require('../../middleware/requirePro');
const { list, create, update, remove, getByBarcode, importExcel } = require('./products.controller');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(auth, tenant);

router.get('/', list);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.get('/barcode/:code', getByBarcode);

// PRO features
router.post('/import', requirePro, upload.single('file'), importExcel);

module.exports = router;
