const ApiResponse = require('../utils/response');

/**
 * Role-Based Access Control middleware
 * Usage: requireRole(['SUPER_ADMIN', 'CONTENT_ADMIN'])
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return ApiResponse.forbidden(
        res,
        'You do not have permission to access this resource'
      );
    }

    next();
  };
};

/**
 * Check if user is admin (any admin role)
 */
const requireAdmin = requireRole([
  'SUPER_ADMIN',
  'CONTENT_ADMIN',
  'USER_ADMIN',
  'ANALYTICS_ADMIN',
]);

/**
 * Check if user is super admin
 */
const requireSuperAdmin = requireRole(['SUPER_ADMIN']);

/**
 * Check if user is content admin or super admin
 */
const requireContentAdmin = requireRole(['SUPER_ADMIN', 'CONTENT_ADMIN']);

/**
 * Check if user is user admin or super admin
 */
const requireUserAdmin = requireRole(['SUPER_ADMIN', 'USER_ADMIN']);

/**
 * Check if user is analytics admin or super admin
 */
const requireAnalyticsAdmin = requireRole(['SUPER_ADMIN', 'ANALYTICS_ADMIN']);

/**
 * Check if user is mentor
 */
const requireMentor = requireRole(['MENTOR']);

/**
 * Check if user is community admin
 */
const requireCommunityAdmin = requireRole(['COMMUNITY_ADMIN']);

/**
 * Check if user owns the resource or is admin
 */
const requireOwnerOrAdmin = (userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    const isAdmin = [
      'SUPER_ADMIN',
      'CONTENT_ADMIN',
      'USER_ADMIN',
      'ANALYTICS_ADMIN',
    ].includes(req.user.role);

    const resourceUserId = parseInt(req.params[userIdField] || req.body[userIdField]);
    const isOwner = req.user.id === resourceUserId;

    if (!isOwner && !isAdmin) {
      return ApiResponse.forbidden(res, 'Access denied');
    }

    next();
  };
};

module.exports = {
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireContentAdmin,
  requireUserAdmin,
  requireAnalyticsAdmin,
  requireMentor,
  requireCommunityAdmin,
  requireOwnerOrAdmin,
};
