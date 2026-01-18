const express = require('express');
const router = express.Router();
const announcementsController = require('../controllers/announcements.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');

// Public routes
router.get('/', announcementsController.getAnnouncements);
router.get('/:id', announcementsController.getAnnouncementById);

// Protected routes (admin only)
router.post('/', authenticate, announcementsController.createAnnouncement);
router.put('/:id', authenticate, announcementsController.updateAnnouncement);
router.delete('/:id', authenticate, announcementsController.deleteAnnouncement);

module.exports = router;
