const NotificationModel = require('../models/notification.model');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class NotificationsController {
  /**
   * Get user notifications
   * GET /api/notifications
   */
  async getNotifications(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const { isRead } = req.query;

      const where = {
        userId: req.user.id,
        ...(isRead !== undefined && { isRead: isRead === 'true' }),
      };

      const [notifications, total] = await Promise.all([
        NotificationModel.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        NotificationModel.count({ where }),
      ]);

      return ApiResponse.paginated(
        res,
        'Notifications retrieved successfully',
        notifications,
        { page, limit, total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark notification as read
   * PUT /api/notifications/:id/read
   */
  async markAsRead(req, res, next) {
    try {
      const notificationId = parseInt(req.params.id);

      const notification = await NotificationModel.findById(notificationId);

      if (!notification) {
        return ApiResponse.notFound(res, 'Notification not found');
      }

      // Check if notification belongs to user
      if (notification.userId !== req.user.id) {
        return ApiResponse.forbidden(res, 'Access denied');
      }

      await NotificationModel.update(notificationId, { isRead: true });

      return ApiResponse.success(res, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all notifications as read
   * PUT /api/notifications/mark-all-read
   */
  async markAllAsRead(req, res, next) {
    try {
      await NotificationModel.updateMany({
        where: {
          userId: req.user.id,
          isRead: false,
        },
        data: { isRead: true },
      });

      return ApiResponse.success(res, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unread count
   * GET /api/notifications/unread-count
   */
  async getUnreadCount(req, res, next) {
    try {
      const count = await NotificationModel.count({
        where: {
          userId: req.user.id,
          isRead: false,
        },
      });

      return ApiResponse.success(res, 'Unread count retrieved', { count });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete notification
   * DELETE /api/notifications/:id
   */
  async deleteNotification(req, res, next) {
    try {
      const notificationId = parseInt(req.params.id);

      const notification = await NotificationModel.findById(notificationId);

      if (!notification) {
        return ApiResponse.notFound(res, 'Notification not found');
      }

      // Check if notification belongs to user
      if (notification.userId !== req.user.id) {
        return ApiResponse.forbidden(res, 'Access denied');
      }

      await NotificationModel.delete(notificationId);

      logger.info(`Notification ${notificationId} deleted by user ${req.user.id}`);

      return ApiResponse.success(res, 'Notification deleted');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create notification (helper for other controllers)
   * This can be used internally by other services
   */
  async createNotification(userId, type, title, message, data = null) {
    try {
      const notification = await NotificationModel.create({
        userId,
        type,
        title,
        message,
        data,
      });

      // If Socket.IO is available, emit real-time notification
      const io = require('../app').get('io');
      if (io) {
        io.to(`user_${userId}`).emit('new_notification', notification);
      }

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }
}

module.exports = new NotificationsController();
