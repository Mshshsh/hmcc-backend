const db = require('../config/database');
const CommunityModel = require('../models/community.model');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class DiscoverController {
  /**
   * Get discover statistics
   * GET /api/discover/stats
   */
  async getStats(req, res, next) {
    try {
      // Get user count from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

      // Active users (users who logged in last 30 days)
      const [[activeUsersResult]] = await db.execute(
        `SELECT COUNT(*) as count FROM users
         WHERE status = 'ACTIVE' AND lastLogin >= ?`,
        [thirtyDaysAgo]
      );

      // Online today (users who logged in today)
      const [[onlineTodayResult]] = await db.execute(
        `SELECT COUNT(*) as count FROM users
         WHERE status = 'ACTIVE' AND lastLogin >= ?`,
        [todayStart]
      );

      // Total communities
      const totalCommunities = await CommunityModel.count();

      const stats = {
        activeUsers: activeUsersResult.count,
        onlineToday: onlineTodayResult.count,
        newMatches: totalCommunities, // Using communities as "new matches"
      };

      return ApiResponse.success(res, 'Discover stats retrieved successfully', { stats });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DiscoverController();
