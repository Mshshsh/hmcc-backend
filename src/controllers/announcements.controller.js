const AnnouncementModel = require('../models/announcement.model');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class AnnouncementsController {
  /**
   * Get announcements with filters
   * GET /api/announcements
   * Query params: status, type, communityId, limit, page
   */
  async getAnnouncements(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const { status, type, communityId } = req.query;

      // Build where clause
      const where = {};

      if (status) {
        where.status = status.toUpperCase();
      } else {
        // Default: only show published announcements for public
        where.status = 'PUBLISHED';
      }

      if (type) {
        where.type = type;
      }

      if (communityId) {
        where.communityId = parseInt(communityId);
      }

      const [announcements, total] = await Promise.all([
        AnnouncementModel.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { community: true },
        }),
        AnnouncementModel.count({ where }),
      ]);

      // Transform announcements
      const transformedAnnouncements = announcements.map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        summary: announcement.summary,
        type: announcement.type,
        category: announcement.category,
        status: announcement.status,
        communityId: announcement.communityId,
        community: announcement.community,
        views: announcement.viewCount,
        createdAt: announcement.createdAt instanceof Date ? announcement.createdAt.toISOString() : announcement.createdAt,
        updatedAt: announcement.updatedAt instanceof Date ? announcement.updatedAt.toISOString() : announcement.updatedAt,
        publishedAt: announcement.publishedAt ? (announcement.publishedAt instanceof Date ? announcement.publishedAt.toISOString() : announcement.publishedAt) : null,
      }));

      return ApiResponse.paginated(
        res,
        'Announcements retrieved successfully',
        transformedAnnouncements,
        { page, limit, total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get announcement by ID
   * GET /api/announcements/:id
   */
  async getAnnouncementById(req, res, next) {
    try {
      const announcementId = parseInt(req.params.id);

      const announcement = await AnnouncementModel.findById(announcementId, {
        include: { community: true },
      });

      if (!announcement) {
        return ApiResponse.notFound(res, 'Announcement not found');
      }

      // Increment view count
      await AnnouncementModel.incrementViewCount(announcementId);

      const transformedAnnouncement = {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        summary: announcement.summary,
        type: announcement.type,
        category: announcement.category,
        status: announcement.status,
        communityId: announcement.communityId,
        community: announcement.community,
        views: announcement.viewCount + 1,
        createdAt: announcement.createdAt instanceof Date ? announcement.createdAt.toISOString() : announcement.createdAt,
        updatedAt: announcement.updatedAt instanceof Date ? announcement.updatedAt.toISOString() : announcement.updatedAt,
        publishedAt: announcement.publishedAt ? (announcement.publishedAt instanceof Date ? announcement.publishedAt.toISOString() : announcement.publishedAt) : null,
      };

      return ApiResponse.success(
        res,
        'Announcement retrieved successfully',
        transformedAnnouncement
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new announcement
   * POST /api/announcements
   */
  async createAnnouncement(req, res, next) {
    try {
      const { title, content, summary, type, category, status, communityId } = req.body;

      // Check if user has permission to create announcements
      const isAdmin = ['SUPER_ADMIN', 'CONTENT_ADMIN'].includes(req.user.role);

      if (!isAdmin) {
        return ApiResponse.forbidden(res, 'Only admins can create announcements');
      }

      const announcementStatus = status?.toUpperCase() || 'DRAFT';
      const publishedAt = announcementStatus === 'PUBLISHED' ? new Date() : null;

      const announcement = await AnnouncementModel.create({
        title,
        content,
        summary,
        type: type || 'public',
        category,
        status: announcementStatus,
        authorId: req.user.id,
        communityId: communityId ? parseInt(communityId) : null,
        publishedAt,
      });

      // Fetch with community relation
      const fullAnnouncement = await AnnouncementModel.findById(announcement.id, {
        include: { community: true },
      });

      logger.info(`Announcement created by user ${req.user.id}`);

      const transformedAnnouncement = {
        id: fullAnnouncement.id,
        title: fullAnnouncement.title,
        content: fullAnnouncement.content,
        summary: fullAnnouncement.summary,
        type: fullAnnouncement.type,
        category: fullAnnouncement.category,
        status: fullAnnouncement.status,
        communityId: fullAnnouncement.communityId,
        community: fullAnnouncement.community,
        views: fullAnnouncement.viewCount,
        createdAt: fullAnnouncement.createdAt instanceof Date ? fullAnnouncement.createdAt.toISOString() : fullAnnouncement.createdAt,
        updatedAt: fullAnnouncement.updatedAt instanceof Date ? fullAnnouncement.updatedAt.toISOString() : fullAnnouncement.updatedAt,
        publishedAt: fullAnnouncement.publishedAt ? (fullAnnouncement.publishedAt instanceof Date ? fullAnnouncement.publishedAt.toISOString() : fullAnnouncement.publishedAt) : null,
      };

      return ApiResponse.created(
        res,
        'Announcement created successfully',
        transformedAnnouncement
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update announcement
   * PUT /api/announcements/:id
   */
  async updateAnnouncement(req, res, next) {
    try {
      const announcementId = parseInt(req.params.id);
      const { title, content, summary, type, category, status, communityId } = req.body;

      const existingAnnouncement = await AnnouncementModel.findById(announcementId);

      if (!existingAnnouncement) {
        return ApiResponse.notFound(res, 'Announcement not found');
      }

      // Check if user has permission
      const isAdmin = ['SUPER_ADMIN', 'CONTENT_ADMIN'].includes(req.user.role);

      if (!isAdmin) {
        return ApiResponse.forbidden(res, 'Only admins can update announcements');
      }

      // Update data
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (summary !== undefined) updateData.summary = summary;
      if (type !== undefined) updateData.type = type;
      if (category !== undefined) updateData.category = category;
      if (communityId !== undefined) {
        updateData.communityId = communityId ? parseInt(communityId) : null;
      }

      if (status !== undefined) {
        updateData.status = status.toUpperCase();
        // Set publishedAt when status changes to PUBLISHED
        if (status.toUpperCase() === 'PUBLISHED' && !existingAnnouncement.publishedAt) {
          updateData.publishedAt = new Date();
        }
      }

      await AnnouncementModel.update(announcementId, updateData);

      // Fetch updated announcement with community relation
      const announcement = await AnnouncementModel.findById(announcementId, {
        include: { community: true },
      });

      logger.info(`Announcement ${announcementId} updated by user ${req.user.id}`);

      const transformedAnnouncement = {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        summary: announcement.summary,
        type: announcement.type,
        category: announcement.category,
        status: announcement.status,
        communityId: announcement.communityId,
        community: announcement.community,
        views: announcement.viewCount,
        createdAt: announcement.createdAt instanceof Date ? announcement.createdAt.toISOString() : announcement.createdAt,
        updatedAt: announcement.updatedAt instanceof Date ? announcement.updatedAt.toISOString() : announcement.updatedAt,
        publishedAt: announcement.publishedAt ? (announcement.publishedAt instanceof Date ? announcement.publishedAt.toISOString() : announcement.publishedAt) : null,
      };

      return ApiResponse.success(
        res,
        'Announcement updated successfully',
        transformedAnnouncement
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete announcement
   * DELETE /api/announcements/:id
   */
  async deleteAnnouncement(req, res, next) {
    try {
      const announcementId = parseInt(req.params.id);

      const announcement = await AnnouncementModel.findById(announcementId);

      if (!announcement) {
        return ApiResponse.notFound(res, 'Announcement not found');
      }

      // Check if user has permission
      const isAdmin = ['SUPER_ADMIN', 'CONTENT_ADMIN'].includes(req.user.role);

      if (!isAdmin) {
        return ApiResponse.forbidden(res, 'Only admins can delete announcements');
      }

      await AnnouncementModel.delete(announcementId);

      logger.info(`Announcement ${announcementId} deleted by user ${req.user.id}`);

      return ApiResponse.success(res, 'Announcement deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnnouncementsController();
