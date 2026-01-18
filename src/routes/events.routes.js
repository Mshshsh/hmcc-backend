const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');

// Public/optional auth routes
router.get('/', optionalAuth, eventsController.getEvents);
router.get('/:id', optionalAuth, eventsController.getEvent);

// Protected routes
router.post('/', authenticate, eventsController.createEvent);
router.put('/:id', authenticate, eventsController.updateEvent);
router.delete('/:id', authenticate, eventsController.deleteEvent);
router.post('/:id/interest', authenticate, eventsController.toggleInterest);

module.exports = router;
