/**
 * Standardized API response utilities
 */

class ApiResponse {
  /**
   * Success response
   */
  static success(res, message, data = null, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Error response
   */
  static error(res, message, errors = null, statusCode = 400) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }

  /**
   * Paginated response
   */
  static paginated(res, message, data, pagination, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
      },
    });
  }

  /**
   * Created response (201)
   */
  static created(res, message, data = null) {
    return this.success(res, message, data, 201);
  }

  /**
   * No content response (204)
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Bad request (400)
   */
  static badRequest(res, message, errors = null) {
    return this.error(res, message, errors, 400);
  }

  /**
   * Unauthorized (401)
   */
  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, null, 401);
  }

  /**
   * Forbidden (403)
   */
  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, null, 403);
  }

  /**
   * Not found (404)
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, null, 404);
  }

  /**
   * Internal server error (500)
   */
  static serverError(res, message = 'Internal server error', errors = null) {
    return this.error(res, message, errors, 500);
  }
}

module.exports = ApiResponse;
