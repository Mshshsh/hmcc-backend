const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

// General search endpoint
router.get('/', optionalAuth, searchController.search);

module.exports = router;
