const express = require('express');
const router = express.Router();
const { getPublicStatus } = require('../controllers/statusController');

router.get('/:slug', getPublicStatus);

module.exports = router;
