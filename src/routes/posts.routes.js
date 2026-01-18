const express = require('express');
const router = express.Router();
const postsController = require('../controllers/posts.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');

// Get feed (optional auth to show liked status)
router.get('/', optionalAuth, postsController.getFeed);

// Single post detail
router.get('/:id', optionalAuth, postsController.getPost);

// Protected routes
router.post('/', authenticate, postsController.createPost);
router.put('/:id', authenticate, postsController.updatePost);
router.delete('/:id', authenticate, postsController.deletePost);
router.post('/:id/like', authenticate, postsController.toggleLike);

// Comments
router.get('/:id/comments', postsController.getComments);
router.post('/:id/comments', authenticate, postsController.createComment);
router.delete('/:postId/comments/:commentId', authenticate, postsController.deleteComment);

module.exports = router;
