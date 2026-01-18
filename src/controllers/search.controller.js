const db = require('../config/database');
const ApiResponse = require('../utils/response');

class SearchController {
  /**
   * General search across posts, users, communities, events
   * GET /api/search
   */
  async search(req, res, next) {
    try {
      const { q, type, page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      if (!q || q.trim().length < 2) {
        return ApiResponse.badRequest(res, 'Search query must be at least 2 characters');
      }

      const searchTerm = `%${q.trim()}%`;
      const results = {};

      // If type is specified, only search that type
      const searchTypes = type ? [type] : ['posts', 'users', 'communities', 'events'];

      // Search Posts
      if (searchTypes.includes('posts')) {
        const [posts] = await db.execute(
          `SELECT p.id, p.content, p.type, p.mediaUrl, p.createdAt,
                  u.id as authorId, u.name as authorName, u.avatar as authorAvatar
           FROM posts p
           LEFT JOIN users u ON p.authorId = u.id
           WHERE p.isPublished = true AND p.content LIKE ?
           ORDER BY p.createdAt DESC
           LIMIT ? OFFSET ?`,
          [searchTerm, take, skip]
        );

        const [[postCount]] = await db.execute(
          `SELECT COUNT(*) as count FROM posts WHERE isPublished = true AND content LIKE ?`,
          [searchTerm]
        );

        results.posts = {
          data: posts.map(post => ({
            id: post.id,
            content: post.content,
            type: post.type,
            mediaUrl: post.mediaUrl,
            createdAt: post.createdAt,
            author: {
              id: post.authorId,
              name: post.authorName,
              avatar: post.authorAvatar,
            },
          })),
          total: postCount.count,
        };
      }

      // Search Users
      if (searchTypes.includes('users')) {
        const [users] = await db.execute(
          `SELECT id, name, email, avatar, bio, role, status
           FROM users
           WHERE status = 'ACTIVE' AND (name LIKE ? OR email LIKE ? OR bio LIKE ?)
           ORDER BY name ASC
           LIMIT ? OFFSET ?`,
          [searchTerm, searchTerm, searchTerm, take, skip]
        );

        const [[userCount]] = await db.execute(
          `SELECT COUNT(*) as count FROM users
           WHERE status = 'ACTIVE' AND (name LIKE ? OR email LIKE ? OR bio LIKE ?)`,
          [searchTerm, searchTerm, searchTerm]
        );

        results.users = {
          data: users.map(user => ({
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            bio: user.bio,
            role: user.role,
          })),
          total: userCount.count,
        };
      }

      // Search Communities
      if (searchTypes.includes('communities')) {
        const [communities] = await db.execute(
          `SELECT c.id, c.name, c.description, c.avatar, c.isPublic, c.createdAt,
                  (SELECT COUNT(*) FROM community_members WHERE communityId = c.id) as memberCount
           FROM communities c
           WHERE c.isPublic = true AND (c.name LIKE ? OR c.description LIKE ?)
           ORDER BY c.name ASC
           LIMIT ? OFFSET ?`,
          [searchTerm, searchTerm, take, skip]
        );

        const [[communityCount]] = await db.execute(
          `SELECT COUNT(*) as count FROM communities
           WHERE isPublic = true AND (name LIKE ? OR description LIKE ?)`,
          [searchTerm, searchTerm]
        );

        results.communities = {
          data: communities.map(community => ({
            id: community.id,
            name: community.name,
            description: community.description,
            avatar: community.avatar,
            isPublic: community.isPublic,
            memberCount: community.memberCount,
            createdAt: community.createdAt,
          })),
          total: communityCount.count,
        };
      }

      // Search Events
      if (searchTypes.includes('events')) {
        const [events] = await db.execute(
          `SELECT e.id, e.title, e.description, e.coverImage, e.startDate, e.endDate,
                  e.location, e.isOnline, e.status, e.createdAt,
                  (SELECT COUNT(*) FROM event_participants WHERE eventId = e.id) as participantCount
           FROM events e
           WHERE e.status = 'PUBLISHED' AND (e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)
           ORDER BY e.startDate DESC
           LIMIT ? OFFSET ?`,
          [searchTerm, searchTerm, searchTerm, take, skip]
        );

        const [[eventCount]] = await db.execute(
          `SELECT COUNT(*) as count FROM events
           WHERE status = 'PUBLISHED' AND (title LIKE ? OR description LIKE ? OR location LIKE ?)`,
          [searchTerm, searchTerm, searchTerm]
        );

        results.events = {
          data: events.map(event => ({
            id: event.id,
            title: event.title,
            description: event.description,
            coverImage: event.coverImage,
            startDate: event.startDate,
            endDate: event.endDate,
            location: event.location,
            isOnline: event.isOnline,
            status: event.status,
            participantCount: event.participantCount,
            createdAt: event.createdAt,
          })),
          total: eventCount.count,
        };
      }

      return ApiResponse.success(res, 'Search completed successfully', {
        query: q,
        results,
        pagination: {
          page: parseInt(page),
          limit: take,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SearchController();
