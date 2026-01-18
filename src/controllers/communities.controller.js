const db = require('../config/database');
const CommunityModel = require('../models/community.model');
const CommunityAdminModel = require('../models/communityAdmin.model');
const EventModel = require('../models/event.model');
const PostModel = require('../models/post.model');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class CommunitiesController {
  /**
   * Get all communities with filters
   * GET /api/communities
   */
  async getCommunities(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const { category, search, status } = req.query;

      const where = {};

      if (category) {
        where.category = category;
      }

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { description: { contains: search } },
        ];
      }

      if (status) {
        where.status = status;
      } else {
        where.status = 'ACTIVE'; // Default to ACTIVE only
      }

      const [communities, total] = await Promise.all([
        CommunityModel.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: true,
            members: true,
            events: true,
            posts: true,
          },
          userId: req.user?.id,
        }),
        CommunityModel.count({ where }),
      ]);

      const transformedCommunities = communities.map((community) => ({
        id: community.id.toString(),
        name: community.name,
        slug: community.slug,
        description: community.description,
        avatar: community.avatar,
        category: community.category,
        tags: community.tags || [],
        members: community._count?.members || 0,
        isFollowing: req.user ? (community.members && community.members.length > 0) : false,
        established: community.established ? (community.established instanceof Date ? community.established.toISOString() : community.established) : (community.createdAt instanceof Date ? community.createdAt.toISOString() : community.createdAt),
        isVerified: community.isVerified,
        status: community.status,
        upcomingEvents: (community.events || []).map((e) => ({
          id: e.id.toString(),
          title: e.title,
          date: e.date instanceof Date ? e.date.toISOString() : e.date,
        })),
        recentPosts: (community.posts || []).map((p) => ({
          id: p.id.toString(),
          content: p.content ? p.content.substring(0, 100) : '',
          timestamp: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
          likes: p._count?.likes || 0,
        })),
      }));

      return ApiResponse.paginated(
        res,
        'Communities retrieved successfully',
        transformedCommunities,
        { page, limit, total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single community
   * GET /api/communities/:id
   */
  async getCommunity(req, res, next) {
    try {
      const communityId = parseInt(req.params.id);

      const community = await CommunityModel.findById(communityId, {
        include: {
          _count: true,
          members: true,
          admins: true,
        },
        userId: req.user?.id,
      });

      if (!community) {
        return ApiResponse.notFound(res, 'Community not found');
      }

      const transformedCommunity = {
        id: community.id.toString(),
        name: community.name,
        slug: community.slug,
        description: community.description,
        avatar: community.avatar,
        coverImage: community.coverImage,
        category: community.category,
        tags: community.tags || [],
        members: community._count?.members || 0,
        isFollowing: req.user ? (community.members && community.members.length > 0) : false,
        isVerified: community.isVerified,
        status: community.status,
        established: community.established ? (community.established instanceof Date ? community.established.toISOString() : community.established) : (community.createdAt instanceof Date ? community.createdAt.toISOString() : community.createdAt),
        admins: (community.admins || []).map((a) => ({
          id: a.user?.id || a.userId,
          name: a.user?.name || '',
          avatar: a.user?.avatar || null,
          role: a.role,
        })),
      };

      return ApiResponse.success(res, 'Community retrieved successfully', transformedCommunity);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create community (Admin or Community Admin creation during registration)
   * POST /api/communities
   */
  async createCommunity(req, res, next) {
    try {
      const { name, description, category, tags, avatar } = req.body;

      // Generate slug from name
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      // Check if slug already exists
      const existingCommunity = await CommunityModel.findBySlug(slug);

      if (existingCommunity) {
        return ApiResponse.badRequest(res, 'A community with this name already exists');
      }

      // Start transaction
      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        // Create community
        const [communityResult] = await connection.execute(
          `INSERT INTO communities (name, slug, description, category, tags, avatar, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [name, slug, description, category || 'Social', tags ? JSON.stringify(tags) : null, avatar, req.user.role === 'SUPER_ADMIN' ? 'ACTIVE' : 'PENDING']
        );

        const communityId = communityResult.insertId;

        // Add creator as admin
        await connection.execute(
          `INSERT INTO community_admins (userId, communityId, role, createdAt, updatedAt)
           VALUES (?, ?, 'admin', NOW(), NOW())`,
          [req.user.id, communityId]
        );

        await connection.commit();

        logger.info(`Community created: ${name} by user ${req.user.id}`);

        return ApiResponse.created(res, 'Community created successfully', {
          id: communityId.toString(),
          name,
          slug,
          status: req.user.role === 'SUPER_ADMIN' ? 'ACTIVE' : 'PENDING',
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update community
   * PUT /api/communities/:id
   */
  async updateCommunity(req, res, next) {
    try {
      const communityId = parseInt(req.params.id);
      const { name, description, category, tags, avatar, coverImage } = req.body;

      // Check if user is community admin or system admin
      const isAdmin = ['SUPER_ADMIN', 'USER_ADMIN'].includes(req.user.role);
      const communityAdmin = await CommunityAdminModel.findByUserAndCommunity(req.user.id, communityId);

      if (!isAdmin && !communityAdmin) {
        return ApiResponse.forbidden(res, 'You do not have permission to update this community');
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (description) updateData.description = description;
      if (category) updateData.category = category;
      if (tags) updateData.tags = tags;
      if (avatar !== undefined) updateData.avatar = avatar;
      if (coverImage !== undefined) updateData.coverImage = coverImage;

      const community = await CommunityModel.update(communityId, updateData);

      logger.info(`Community ${communityId} updated by user ${req.user.id}`);

      return ApiResponse.success(res, 'Community updated successfully', community);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete community (Admin only)
   * DELETE /api/communities/:id
   */
  async deleteCommunity(req, res, next) {
    try {
      const communityId = parseInt(req.params.id);

      // Only super admin can delete
      if (req.user.role !== 'SUPER_ADMIN') {
        return ApiResponse.forbidden(res, 'Only super admin can delete communities');
      }

      await CommunityModel.delete(communityId);

      logger.info(`Community ${communityId} deleted by user ${req.user.id}`);

      return ApiResponse.success(res, 'Community deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle follow community
   * POST /api/communities/:id/follow
   */
  async toggleFollow(req, res, next) {
    try {
      const communityId = parseInt(req.params.id);

      const community = await CommunityModel.findById(communityId);

      if (!community) {
        return ApiResponse.notFound(res, 'Community not found');
      }

      // Check if already following
      const existingFollow = await CommunityModel.findFollow(req.user.id, communityId);

      let isFollowing;

      if (existingFollow) {
        // Unfollow
        await CommunityModel.deleteFollow(existingFollow.id);
        isFollowing = false;
      } else {
        // Follow
        await CommunityModel.createFollow(req.user.id, communityId);
        isFollowing = true;
      }

      // Get updated member count
      const memberCount = await CommunityModel.countFollows(communityId);

      return ApiResponse.success(
        res,
        isFollowing ? 'Community followed' : 'Community unfollowed',
        {
          isFollowing,
          members: memberCount,
        }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update community status (Admin only)
   * PUT /api/communities/:id/status
   */
  async updateStatus(req, res, next) {
    try {
      const communityId = parseInt(req.params.id);
      const { status } = req.body;

      if (!['ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE'].includes(status)) {
        return ApiResponse.badRequest(res, 'Invalid status');
      }

      const community = await CommunityModel.update(communityId, { status });

      logger.info(`Community ${communityId} status updated to ${status} by user ${req.user.id}`);

      return ApiResponse.success(res, 'Community status updated', community);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all communities including pending (Admin only)
   * GET /api/communities/admin/all
   */
  async getAllCommunitiesAdmin(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const { status, category, search } = req.query;

      const where = {};
      if (status) where.status = status;
      if (category) where.category = category;
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { description: { contains: search } },
        ];
      }

      const [communities, total] = await Promise.all([
        CommunityModel.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: true,
            admins: true,
          },
        }),
        CommunityModel.count({ where }),
      ]);

      return ApiResponse.paginated(
        res,
        'Communities retrieved successfully',
        communities,
        { page, limit, total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending communities (Admin only)
   * GET /api/communities/admin/pending
   */
  async getPendingCommunities(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const { category } = req.query;

      const where = { status: 'PENDING' };
      if (category) where.category = category;

      const [communities, total] = await Promise.all([
        CommunityModel.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: true,
            admins: true,
          },
        }),
        CommunityModel.count({ where }),
      ]);

      return ApiResponse.paginated(
        res,
        'Pending communities retrieved successfully',
        communities,
        { page, limit, total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve community (Admin only)
   * POST /api/communities/:id/approve
   */
  async approveCommunity(req, res, next) {
    try {
      const communityId = parseInt(req.params.id);

      const community = await CommunityModel.findById(communityId);

      if (!community) {
        return ApiResponse.notFound(res, 'Community not found');
      }

      if (community.status !== 'PENDING') {
        return ApiResponse.badRequest(res, 'Community is not pending approval');
      }

      const updatedCommunity = await CommunityModel.update(communityId, { status: 'ACTIVE' });

      // Fetch with admins
      const fullCommunity = await CommunityModel.findById(communityId, {
        include: { admins: true },
      });

      logger.info(`Community ${communityId} approved by user ${req.user.id}`);

      return ApiResponse.success(res, 'Community approved successfully', fullCommunity);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject community (Admin only)
   * POST /api/communities/:id/reject
   */
  async rejectCommunity(req, res, next) {
    try {
      const communityId = parseInt(req.params.id);
      const { reason } = req.body;

      const community = await CommunityModel.findById(communityId, {
        include: { admins: true },
      });

      if (!community) {
        return ApiResponse.notFound(res, 'Community not found');
      }

      if (community.status !== 'PENDING') {
        return ApiResponse.badRequest(res, 'Community is not pending approval');
      }

      // Delete the community
      await CommunityModel.delete(communityId);

      logger.info(
        `Community ${communityId} rejected by user ${req.user.id}${reason ? ` - Reason: ${reason}` : ''}`
      );

      return ApiResponse.success(res, 'Community rejected successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get community statistics (Admin only)
   * GET /api/communities/admin/stats
   */
  async getCommunityStats(req, res, next) {
    try {
      const [
        totalCommunities,
        activeCommunities,
        pendingCommunities,
        suspendedCommunities,
        totalMembersResult,
        totalEvents,
        totalPostsResult,
        communitiesByCategory,
      ] = await Promise.all([
        CommunityModel.count(),
        CommunityModel.count({ where: { status: 'ACTIVE' } }),
        CommunityModel.count({ where: { status: 'PENDING' } }),
        CommunityModel.count({ where: { status: 'SUSPENDED' } }),
        db.execute('SELECT COUNT(*) as count FROM community_follows'),
        EventModel.count(),
        db.execute('SELECT COUNT(*) as count FROM posts WHERE communityId IS NOT NULL'),
        CommunityModel.groupBy({ by: ['category'], _count: { id: true } }),
      ]);

      const totalMembers = totalMembersResult[0][0].count;
      const totalPosts = totalPostsResult[0][0].count;

      const categoryStats = communitiesByCategory.reduce((acc, item) => {
        acc[item.category] = item._count.id;
        return acc;
      }, {});

      const stats = {
        total: totalCommunities,
        active: activeCommunities,
        pending: pendingCommunities,
        suspended: suspendedCommunities,
        totalMembers,
        totalEvents,
        totalPosts,
        byCategory: categoryStats,
      };

      return ApiResponse.success(res, 'Community statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CommunitiesController();
