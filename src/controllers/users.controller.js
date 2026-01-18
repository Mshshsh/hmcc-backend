const db = require('../config/database');
const UserModel = require('../models/user.model');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class UsersController {
  /**
   * Get all users (Admin only)
   * GET /api/users
   */
  async getUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const { role, status, search } = req.query;

      const where = {};
      if (role) where.role = role;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
        ];
      }

      const [users, total] = await Promise.all([
        UserModel.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        UserModel.count({ where }),
      ]);

      // Remove passwords and format
      const formattedUsers = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      }));

      return ApiResponse.paginated(
        res,
        'Users retrieved successfully',
        formattedUsers,
        { page, limit, total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   * GET /api/users/:id
   */
  async getUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id);

      const user = await UserModel.findById(userId, {
        include: {
          fellow: true,
          mentor: true,
          communityAdmins: true,
        },
      });

      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      // Get admin profile if exists
      const [adminRows] = await db.execute(
        'SELECT * FROM admins WHERE userId = ?',
        [userId]
      );
      user.admin = adminRows[0] || null;

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      return ApiResponse.success(res, 'User retrieved successfully', userWithoutPassword);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user status (Admin only)
   * PUT /api/users/:id/status
   */
  async updateStatus(req, res, next) {
    try {
      const userId = parseInt(req.params.id);
      const { status } = req.body;

      if (!['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
        return ApiResponse.badRequest(res, 'Invalid status');
      }

      const user = await UserModel.findById(userId);

      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      // Prevent super admin from being deactivated by non-super admins
      if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        return ApiResponse.forbidden(res, 'Cannot modify super admin status');
      }

      const updatedUser = await UserModel.update(userId, { status });

      logger.info(`User ${userId} status updated to ${status} by ${req.user.id}`);

      return ApiResponse.success(res, 'User status updated successfully', {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user role (Super Admin only)
   * PUT /api/users/:id/role
   */
  async updateRole(req, res, next) {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;

      const validRoles = [
        'SUPER_ADMIN',
        'CONTENT_ADMIN',
        'USER_ADMIN',
        'ANALYTICS_ADMIN',
        'MENTOR',
        'FELLOW',
        'COMMUNITY_ADMIN',
      ];

      if (!validRoles.includes(role)) {
        return ApiResponse.badRequest(res, 'Invalid role');
      }

      const user = await UserModel.findById(userId);

      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      // Prevent changing super admin role
      if (user.role === 'SUPER_ADMIN') {
        return ApiResponse.forbidden(res, 'Cannot change super admin role');
      }

      const updatedUser = await UserModel.update(userId, { role });

      logger.info(`User ${userId} role updated to ${role} by ${req.user.id}`);

      return ApiResponse.success(res, 'User role updated successfully', {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user (Super Admin only)
   * DELETE /api/users/:id
   */
  async deleteUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id);

      const user = await UserModel.findById(userId);

      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      // Prevent deleting super admin
      if (user.role === 'SUPER_ADMIN') {
        return ApiResponse.forbidden(res, 'Cannot delete super admin');
      }

      // Prevent self-deletion
      if (user.id === req.user.id) {
        return ApiResponse.forbidden(res, 'Cannot delete your own account');
      }

      await UserModel.delete(userId);

      logger.info(`User ${userId} deleted by ${req.user.id}`);

      return ApiResponse.success(res, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending users (for approval)
   * GET /api/users/pending
   */
  async getPendingUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const { role } = req.query;

      const where = { status: 'PENDING' };
      if (role) where.role = role;

      const [users, total] = await Promise.all([
        UserModel.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            mentor: true,
            fellow: true,
            communityAdmins: true,
          },
        }),
        UserModel.count({ where }),
      ]);

      // Remove passwords
      const usersWithoutPasswords = users.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      return ApiResponse.paginated(
        res,
        'Pending users retrieved successfully',
        usersWithoutPasswords,
        { page, limit, total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve user (change status to ACTIVE)
   * POST /api/users/:id/approve
   */
  async approveUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id);

      const user = await UserModel.findById(userId);

      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      if (user.status !== 'PENDING') {
        return ApiResponse.badRequest(res, 'User is not pending approval');
      }

      const updatedUser = await UserModel.update(userId, { status: 'ACTIVE' });

      logger.info(`User ${userId} approved by ${req.user.id}`);

      return ApiResponse.success(res, 'User approved successfully', {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject user (delete pending user)
   * POST /api/users/:id/reject
   */
  async rejectUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id);

      const user = await UserModel.findById(userId);

      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      if (user.status !== 'PENDING') {
        return ApiResponse.badRequest(res, 'User is not pending approval');
      }

      await UserModel.delete(userId);

      logger.info(`User ${userId} rejected by ${req.user.id}`);

      return ApiResponse.success(res, 'User registration rejected');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user statistics
   * GET /api/users/stats
   */
  async getUserStats(req, res, next) {
    try {
      const [
        totalUsers,
        activeUsers,
        pendingUsers,
        mentorCount,
        fellowCount,
        communityCount,
        adminCount,
      ] = await Promise.all([
        UserModel.count(),
        UserModel.count({ where: { status: 'ACTIVE' } }),
        UserModel.count({ where: { status: 'PENDING' } }),
        UserModel.count({ where: { role: 'MENTOR' } }),
        UserModel.count({ where: { role: 'FELLOW' } }),
        UserModel.count({ where: { role: 'COMMUNITY_ADMIN' } }),
        (async () => {
          const [[result]] = await db.execute(
            `SELECT COUNT(*) as count FROM users WHERE role IN ('SUPER_ADMIN', 'CONTENT_ADMIN', 'USER_ADMIN', 'ANALYTICS_ADMIN')`
          );
          return result.count;
        })(),
      ]);

      const stats = {
        total: totalUsers,
        active: activeUsers,
        pending: pendingUsers,
        byRole: {
          mentors: mentorCount,
          fellows: fellowCount,
          communities: communityCount,
          admins: adminCount,
        },
      };

      return ApiResponse.success(res, 'User statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user profile stats
   * GET /api/users/profile-stats
   */
  async getProfileStats(req, res, next) {
    try {
      const userId = req.user.id;

      const [
        eventsResult,
        communitiesResult,
        mentorsResult,
        postsResult,
      ] = await Promise.all([
        // Events user is interested in
        db.execute(
          'SELECT COUNT(*) as count FROM event_interests WHERE userId = ?',
          [userId]
        ),
        // Communities user follows
        db.execute(
          'SELECT COUNT(*) as count FROM community_follows WHERE userId = ?',
          [userId]
        ),
        // Mentors user follows
        db.execute(
          'SELECT COUNT(*) as count FROM mentor_follows WHERE userId = ?',
          [userId]
        ),
        // Posts user created
        db.execute(
          'SELECT COUNT(*) as count FROM posts WHERE authorId = ?',
          [userId]
        ),
      ]);

      const stats = {
        events: eventsResult[0][0].count,
        communities: communitiesResult[0][0].count,
        matches: mentorsResult[0][0].count, // Using mentor follows as "matches"
        posts: postsResult[0][0].count,
      };

      return ApiResponse.success(res, 'Profile stats retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get public user profile
   * GET /api/users/:id/profile
   */
  async getPublicProfile(req, res, next) {
    try {
      const userId = parseInt(req.params.id);

      const user = await UserModel.findById(userId, {
        include: { fellow: true, mentor: true },
      });

      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      if (user.status !== 'ACTIVE') {
        return ApiResponse.notFound(res, 'User not found');
      }

      // Get user stats
      const [postsResult, communitiesResult, eventsResult] = await Promise.all([
        db.execute('SELECT COUNT(*) as count FROM posts WHERE authorId = ?', [userId]),
        db.execute('SELECT COUNT(*) as count FROM community_follows WHERE userId = ?', [userId]),
        db.execute('SELECT COUNT(*) as count FROM event_interests WHERE userId = ?', [userId]),
      ]);

      // Check if current user is following (if authenticated)
      let isFollowing = false;
      if (req.user) {
        const [followResult] = await db.execute(
          'SELECT id FROM user_follows WHERE followerId = ? AND followingId = ?',
          [req.user.id, userId]
        );
        isFollowing = followResult.length > 0;
      }

      const profile = {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        bio: user.fellow?.bio || user.mentor?.bio || null,
        department: user.fellow?.department || null,
        title: user.mentor?.title || null,
        company: user.mentor?.company || null,
        expertise: user.mentor?.expertise || null,
        joinedAt: user.createdAt,
        stats: {
          posts: postsResult[0][0].count,
          communities: communitiesResult[0][0].count,
          events: eventsResult[0][0].count,
        },
        isFollowing,
      };

      return ApiResponse.success(res, 'Profile retrieved successfully', profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's posts
   * GET /api/users/:id/posts
   */
  async getUserPosts(req, res, next) {
    try {
      const userId = parseInt(req.params.id);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      // Check if user exists and is active
      const user = await UserModel.findById(userId);
      if (!user || user.status !== 'ACTIVE') {
        return ApiResponse.notFound(res, 'User not found');
      }

      const [posts] = await db.execute(
        `SELECT p.*,
                (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
                (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount
         FROM posts p
         WHERE p.authorId = ? AND p.isPublished = true
         ORDER BY p.createdAt DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, skip]
      );

      const [[countResult]] = await db.execute(
        'SELECT COUNT(*) as total FROM posts WHERE authorId = ? AND isPublished = true',
        [userId]
      );

      const formattedPosts = posts.map(post => ({
        id: post.id,
        type: post.type,
        content: post.content,
        mediaUrl: post.mediaUrl,
        likes: post.likeCount,
        comments_count: post.commentCount,
        timestamp: post.createdAt,
      }));

      return ApiResponse.paginated(
        res,
        'Posts retrieved successfully',
        formattedPosts,
        { page, limit, total: countResult.total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's communities
   * GET /api/users/:id/communities
   */
  async getUserCommunities(req, res, next) {
    try {
      const userId = parseInt(req.params.id);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      // Check if user exists and is active
      const user = await UserModel.findById(userId);
      if (!user || user.status !== 'ACTIVE') {
        return ApiResponse.notFound(res, 'User not found');
      }

      const [communities] = await db.execute(
        `SELECT c.*,
                (SELECT COUNT(*) FROM community_follows WHERE communityId = c.id) as memberCount
         FROM communities c
         INNER JOIN community_follows cf ON c.id = cf.communityId
         WHERE cf.userId = ? AND c.status = 'ACTIVE'
         ORDER BY cf.createdAt DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, skip]
      );

      const [[countResult]] = await db.execute(
        `SELECT COUNT(*) as total FROM community_follows cf
         INNER JOIN communities c ON cf.communityId = c.id
         WHERE cf.userId = ? AND c.status = 'ACTIVE'`,
        [userId]
      );

      const formattedCommunities = communities.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        avatar: c.avatar,
        category: c.category,
        members: c.memberCount,
      }));

      return ApiResponse.paginated(
        res,
        'Communities retrieved successfully',
        formattedCommunities,
        { page, limit, total: countResult.total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's events
   * GET /api/users/:id/events
   */
  async getUserEvents(req, res, next) {
    try {
      const userId = parseInt(req.params.id);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      // Check if user exists and is active
      const user = await UserModel.findById(userId);
      if (!user || user.status !== 'ACTIVE') {
        return ApiResponse.notFound(res, 'User not found');
      }

      const [events] = await db.execute(
        `SELECT e.*, c.name as communityName, c.avatar as communityAvatar
         FROM events e
         INNER JOIN event_interests ei ON e.id = ei.eventId
         LEFT JOIN communities c ON e.communityId = c.id
         WHERE ei.userId = ?
         ORDER BY e.date DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, skip]
      );

      const [[countResult]] = await db.execute(
        'SELECT COUNT(*) as total FROM event_interests WHERE userId = ?',
        [userId]
      );

      const formattedEvents = events.map(e => ({
        id: e.id,
        title: e.title,
        date: e.date,
        time: e.time,
        location: e.location,
        community: e.communityName,
        communityAvatar: e.communityAvatar,
      }));

      return ApiResponse.paginated(
        res,
        'Events retrieved successfully',
        formattedEvents,
        { page, limit, total: countResult.total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle follow user
   * POST /api/users/:id/follow
   */
  async toggleFollow(req, res, next) {
    try {
      const userId = parseInt(req.params.id);

      if (userId === req.user.id) {
        return ApiResponse.badRequest(res, 'Cannot follow yourself');
      }

      const user = await UserModel.findById(userId);
      if (!user || user.status !== 'ACTIVE') {
        return ApiResponse.notFound(res, 'User not found');
      }

      // Check if already following
      const [existingFollow] = await db.execute(
        'SELECT id FROM user_follows WHERE followerId = ? AND followingId = ?',
        [req.user.id, userId]
      );

      let isFollowing;

      if (existingFollow.length > 0) {
        // Unfollow
        await db.execute('DELETE FROM user_follows WHERE id = ?', [existingFollow[0].id]);
        isFollowing = false;
      } else {
        // Follow
        await db.execute(
          'INSERT INTO user_follows (followerId, followingId, createdAt) VALUES (?, ?, NOW())',
          [req.user.id, userId]
        );
        isFollowing = true;
      }

      return ApiResponse.success(
        res,
        isFollowing ? 'User followed' : 'User unfollowed',
        { isFollowing }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's followers
   * GET /api/users/:id/followers
   */
  async getFollowers(req, res, next) {
    try {
      const userId = parseInt(req.params.id);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [followers] = await db.execute(
        `SELECT u.id, u.name, u.avatar, u.role
         FROM users u
         INNER JOIN user_follows uf ON u.id = uf.followerId
         WHERE uf.followingId = ? AND u.status = 'ACTIVE'
         ORDER BY uf.createdAt DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, skip]
      );

      const [[countResult]] = await db.execute(
        'SELECT COUNT(*) as total FROM user_follows WHERE followingId = ?',
        [userId]
      );

      return ApiResponse.paginated(
        res,
        'Followers retrieved successfully',
        followers,
        { page, limit, total: countResult.total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get users that user is following
   * GET /api/users/:id/following
   */
  async getFollowing(req, res, next) {
    try {
      const userId = parseInt(req.params.id);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [following] = await db.execute(
        `SELECT u.id, u.name, u.avatar, u.role
         FROM users u
         INNER JOIN user_follows uf ON u.id = uf.followingId
         WHERE uf.followerId = ? AND u.status = 'ACTIVE'
         ORDER BY uf.createdAt DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, skip]
      );

      const [[countResult]] = await db.execute(
        'SELECT COUNT(*) as total FROM user_follows WHERE followerId = ?',
        [userId]
      );

      return ApiResponse.paginated(
        res,
        'Following retrieved successfully',
        following,
        { page, limit, total: countResult.total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Register device token for push notifications
   * POST /api/users/device-token
   */
  async registerDeviceToken(req, res, next) {
    try {
      const { token, platform, deviceId } = req.body;

      if (!token || !platform || !deviceId) {
        return ApiResponse.badRequest(res, 'Token, platform, and deviceId are required');
      }

      if (!['ios', 'android'].includes(platform)) {
        return ApiResponse.badRequest(res, 'Platform must be ios or android');
      }

      // Upsert device token
      await db.execute(
        `INSERT INTO device_tokens (userId, token, platform, deviceId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE token = ?, platform = ?, updatedAt = NOW()`,
        [req.user.id, token, platform, deviceId, token, platform]
      );

      logger.info(`Device token registered for user ${req.user.id}`);

      return ApiResponse.success(res, 'Device token registered successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove device token
   * DELETE /api/users/device-token
   */
  async removeDeviceToken(req, res, next) {
    try {
      const { deviceId } = req.body;

      if (!deviceId) {
        return ApiResponse.badRequest(res, 'DeviceId is required');
      }

      await db.execute(
        'DELETE FROM device_tokens WHERE userId = ? AND deviceId = ?',
        [req.user.id, deviceId]
      );

      logger.info(`Device token removed for user ${req.user.id}`);

      return ApiResponse.success(res, 'Device token removed successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UsersController();
