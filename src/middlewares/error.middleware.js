const logger = require('../utils/logger');
const ApiResponse = require('../utils/response');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack, url: req.url });

  // MySQL errors (mysql2)
  if (err.code) {
    switch (err.code) {
      case 'ER_DUP_ENTRY':
      case 'P2002': // Legacy Prisma error code
        return ApiResponse.badRequest(res, 'Duplicate entry found', {
          field: err.meta?.target || err.sqlMessage,
        });
      case 'ER_NO_REFERENCED_ROW':
      case 'ER_NO_REFERENCED_ROW_2':
      case 'P2003': // Legacy Prisma error code
        return ApiResponse.badRequest(res, 'Foreign key constraint failed');
      case 'ER_ROW_IS_REFERENCED':
      case 'ER_ROW_IS_REFERENCED_2':
        return ApiResponse.badRequest(res, 'Cannot delete: record is referenced by other records');
      case 'P2025': // Legacy Prisma error code
        return ApiResponse.notFound(res, 'Record not found');
      default:
        logger.error('Database error:', err);
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Token expired');
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return ApiResponse.badRequest(res, 'Validation failed', err.details);
  }

  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ApiResponse.badRequest(res, 'File size too large');
    }
    return ApiResponse.badRequest(res, err.message);
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  return ApiResponse.error(res, message, null, statusCode);
};

/**
 * 404 handler
 */
const notFoundHandler = (req, res, next) => {
  return ApiResponse.notFound(res, `Route ${req.originalUrl} not found`);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
