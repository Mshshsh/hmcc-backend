const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');

// Import controllers
const {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getPendingUsers,
  getStatistics,
} = require('../controllers/admin.controller');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorizeRoles(['SUPER_ADMIN', 'USER_ADMIN']));

// Statistics
router.get('/statistics', getStatistics);

// User management
router.get('/users', getAllUsers);
router.get('/users/pending', getPendingUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/status', updateUserStatus);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

module.exports = router;
