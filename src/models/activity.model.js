const db = require('../config/database');

/**
 * Activity Model
 * Handles user activity logging
 */
class ActivityModel {
  static async create(data) {
    const { userId, action, description, metadata = null } = data;

    const [result] = await db.execute(
      `INSERT INTO activities (userId, action, description, metadata, createdAt)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, action, description, metadata ? JSON.stringify(metadata) : null]
    );

    return { id: result.insertId, userId, action, description, metadata };
  }

  static async findMany(options = {}) {
    const { where = {}, skip = 0, take = 10, orderBy = {} } = options;

    let query = 'SELECT * FROM activities';
    const params = [];
    const conditions = [];

    if (where.userId) {
      conditions.push('userId = ?');
      params.push(where.userId);
    }

    if (where.createdAt && where.createdAt.gte) {
      conditions.push('createdAt >= ?');
      params.push(where.createdAt.gte);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Order by
    if (orderBy.createdAt) {
      query += ` ORDER BY createdAt ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(take, skip);

    const [activities] = await db.execute(query, params);

    // Parse JSON metadata field
    return activities.map((activity) => ({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
    }));
  }

  static async count(options = {}) {
    const { where = {} } = options;

    let query = 'SELECT COUNT(*) as count FROM activities';
    const params = [];
    const conditions = [];

    if (where.userId) {
      conditions.push('userId = ?');
      params.push(where.userId);
    }

    if (where.createdAt && where.createdAt.gte) {
      conditions.push('createdAt >= ?');
      params.push(where.createdAt.gte);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const [[result]] = await db.execute(query, params);
    return result.count;
  }
}

module.exports = ActivityModel;
