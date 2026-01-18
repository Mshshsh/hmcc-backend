const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');
const {
  requireAdmin,
  requireSuperAdmin,
} = require('../middlewares/rbac.middleware');

// Get user statistics (Admin only)
router.get('/stats', authenticate, requireAdmin, usersController.getUserStats);

// Get profile stats (Authenticated user)
router.get('/profile-stats', authenticate, usersController.getProfileStats);

// Get pending users for approval (Admin only)
router.get('/pending', authenticate, requireAdmin, usersController.getPendingUsers);

// Device token management (Push notifications)
router.post('/device-token', authenticate, usersController.registerDeviceToken);
router.delete('/device-token', authenticate, usersController.removeDeviceToken);

// Get all users with pagination and filtering (Admin only)
router.get('/', authenticate, requireAdmin, usersController.getUsers);

// Public user profile (anyone can view)
router.get('/:id/profile', optionalAuth, usersController.getPublicProfile);

// User content endpoints (public)
router.get('/:id/posts', optionalAuth, usersController.getUserPosts);
router.get('/:id/communities', optionalAuth, usersController.getUserCommunities);
router.get('/:id/events', optionalAuth, usersController.getUserEvents);

// User follow system
router.post('/:id/follow', authenticate, usersController.toggleFollow);
router.get('/:id/followers', optionalAuth, usersController.getFollowers);
router.get('/:id/following', optionalAuth, usersController.getFollowing);

// Get specific user by ID (Admin only)
router.get('/:id', authenticate, requireAdmin, usersController.getUser);

// Approve pending user (Admin only)
router.post('/:id/approve', authenticate, requireAdmin, usersController.approveUser);

// Reject pending user (Admin only)
router.post('/:id/reject', authenticate, requireAdmin, usersController.rejectUser);

// Update user status (Admin only)
router.put('/:id/status', authenticate, requireAdmin, usersController.updateStatus);

// Update user role (Super Admin only)
router.put('/:id/role', authenticate, requireSuperAdmin, usersController.updateRole);

// Delete user (Super Admin only)
router.delete('/:id', authenticate, requireSuperAdmin, usersController.deleteUser);

module.exports = router;
