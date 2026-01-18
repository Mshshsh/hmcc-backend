const express = require('express');
const router = express.Router();
const mentorsController = require('../controllers/mentors.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');
const { requireMentor } = require('../middlewares/rbac.middleware');

// Public/optional auth routes
router.get('/', optionalAuth, mentorsController.getMentors);
router.get('/:id', optionalAuth, mentorsController.getMentor);

// Protected routes
router.post('/:id/follow', authenticate, mentorsController.toggleFollow);
router.post('/:id/book', authenticate, mentorsController.bookSession);

// Mentor-only routes
router.put('/availability', authenticate, requireMentor, mentorsController.updateAvailability);
router.get('/sessions', authenticate, requireMentor, mentorsController.getMentorSessions);

module.exports = router;
