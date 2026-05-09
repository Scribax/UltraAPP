const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requirePro = require('../../middleware/requirePro');
const { list, create, update, remove, getByBarcode, importExcel } = require('./products.controller');

const uploadMem = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const path = require('path');
const crypto = require('crypto');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = crypto.randomBytes(8).toString('hex');
    cb(null, `${id}${ext}`);
  }
});
const uploadDisk = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
router.use(auth, tenant);

router.get('/', list);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.get('/barcode/:code', getByBarcode);

// Subida de imagen para producto
router.post('/upload-image', uploadDisk.single('image'), require('./products.controller').uploadImage);

// PRO features
router.post('/import', requirePro, uploadMem.single('file'), importExcel);

module.exports = router;
