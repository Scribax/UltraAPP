const express = require('express');
const router = express.Router();
const { create, list, getOne, update, publicCatalog } = require('./business.controller');
const auth = require('../../middleware/auth');

// Público - catálogo del comercio
router.get('/store/:slug', publicCatalog);

// Protegido
router.use(auth);
router.post('/', create);
router.get('/', list);
router.get('/:id', getOne);
router.put('/:id', update);

module.exports = router;
