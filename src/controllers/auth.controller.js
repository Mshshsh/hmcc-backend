const authService = require('../services/auth.service');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);

      logger.info(`New user registered: ${result.user.email} (${result.user.role})`);

      return ApiResponse.created(
        res,
        'Registration successful. Your account is pending approval.',
        result
      );
    } catch (error) {
      if (error.message === 'User with this email already exists') {
        return ApiResponse.badRequest(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      logger.info(`User logged in: ${email}`);

      return ApiResponse.success(res, 'Login successful', result);
    } catch (error) {
      if (
        error.message === 'Invalid credentials' ||
        error.message.includes('Account is not active')
      ) {
        return ApiResponse.unauthorized(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Get current user
   * GET /api/auth/me
   */
  async getCurrentUser(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.id);

      return ApiResponse.success(res, 'User retrieved successfully', user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  async updateProfile(req, res, next) {
    try {
      const user = await authService.updateProfile(req.user.id, req.body);

      logger.info(`User updated profile: ${req.user.email}`);

      return ApiResponse.success(res, 'Profile updated successfully', user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return ApiResponse.badRequest(res, 'Refresh token is required');
      }

      const tokens = await authService.refreshToken(refreshToken);

      return ApiResponse.success(res, 'Token refreshed successfully', tokens);
    } catch (error) {
      return ApiResponse.unauthorized(res, 'Invalid refresh token');
    }
  }

  /**
   * Logout user (client-side token removal)
   * POST /api/auth/logout
   */
  async logout(req, res, next) {
    try {
      logger.info(`User logged out: ${req.user.email}`);

      return ApiResponse.success(res, 'Logout successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Forgot password - send reset email
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return ApiResponse.badRequest(res, 'Email is required');
      }

      const result = await authService.forgotPassword(email);

      return ApiResponse.success(res, 'Password reset email sent successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return ApiResponse.badRequest(res, 'Token and new password are required');
      }

      if (newPassword.length < 6) {
        return ApiResponse.badRequest(res, 'Password must be at least 6 characters');
      }

      const result = await authService.resetPassword(token, newPassword);

      logger.info('Password reset successful');

      return ApiResponse.success(res, 'Password reset successful', result);
    } catch (error) {
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return ApiResponse.badRequest(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Change password (authenticated)
   * PUT /api/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return ApiResponse.badRequest(res, 'Current password and new password are required');
      }

      if (newPassword.length < 6) {
        return ApiResponse.badRequest(res, 'New password must be at least 6 characters');
      }

      const result = await authService.changePassword(req.user.id, currentPassword, newPassword);

      logger.info(`User changed password: ${req.user.email}`);

      return ApiResponse.success(res, 'Password changed successfully', result);
    } catch (error) {
      if (error.message === 'Current password is incorrect') {
        return ApiResponse.badRequest(res, error.message);
      }
      next(error);
    }
  }
}

module.exports = new AuthController();
