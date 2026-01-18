const express = require('express');
const router = express.Router();
const communitiesController = require('../controllers/communities.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');
const { requireAdmin, requireUserAdmin, requireSuperAdmin } = require('../middlewares/rbac.middleware');

// Admin routes - must come before :id routes to avoid conflicts
router.get('/admin/stats', authenticate, requireAdmin, communitiesController.getCommunityStats);
router.get('/admin/pending', authenticate, requireAdmin, communitiesController.getPendingCommunities);
router.get('/admin/all', authenticate, requireAdmin, communitiesController.getAllCommunitiesAdmin);

// Public/optional auth routes
router.get('/', optionalAuth, communitiesController.getCommunities);
router.get('/:id', optionalAuth, communitiesController.getCommunity);

// Protected routes
router.post('/', authenticate, communitiesController.createCommunity);
router.put('/:id', authenticate, communitiesController.updateCommunity);
router.delete('/:id', authenticate, requireSuperAdmin, communitiesController.deleteCommunity);
router.post('/:id/follow', authenticate, communitiesController.toggleFollow);

// Admin action routes
router.post('/:id/approve', authenticate, requireAdmin, communitiesController.approveCommunity);
router.post('/:id/reject', authenticate, requireAdmin, communitiesController.rejectCommunity);
router.put('/:id/status', authenticate, requireUserAdmin, communitiesController.updateStatus);

module.exports = router;
