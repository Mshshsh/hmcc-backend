const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Get user notifications
router.get('/', notificationsController.getNotifications);

// Get unread count
router.get('/unread-count', notificationsController.getUnreadCount);

// Mark all as read
router.put('/mark-all-read', notificationsController.markAllAsRead);

// Mark single notification as read
router.put('/:id/read', notificationsController.markAsRead);

// Delete notification
router.delete('/:id', notificationsController.deleteNotification);

module.exports = router;
