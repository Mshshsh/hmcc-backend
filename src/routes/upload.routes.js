const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { upload } = require('../middlewares/upload.middleware');
const { uploadLimiter } = require('../middlewares/rateLimiter.middleware');

// Get upload configuration status
router.get('/status', authenticate, uploadController.getStatus);

// Upload routes (require authentication and rate limiting)
router.post('/', authenticate, uploadLimiter, upload.single('file'), uploadController.uploadFile);
router.post('/multiple', authenticate, uploadLimiter, upload.array('files', 5), uploadController.uploadMultiple);

module.exports = router;
