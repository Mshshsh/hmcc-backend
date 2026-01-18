const express = require('express');
const router = express.Router();
const discoverController = require('../controllers/discover.controller');

// Get discover stats
router.get('/stats', discoverController.getStats);

module.exports = router;
