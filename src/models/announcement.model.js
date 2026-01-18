const db = require('../config/database');

/**
 * Announcement Model
 * Handles announcements
 */
class AnnouncementModel {
  static async findById(id, options = {}) {
    const { include = {} } = options;

    const [announcements] = await db.execute('SELECT * FROM announcements WHERE id = ?', [id]);

    if (announcements.length === 0) return null;

    const announcement = announcements[0];

    // Include relations if requested
    if (include.community) {
      if (announcement.communityId) {
        const [communities] = await db.execute(
          'SELECT id, name, avatar FROM communities WHERE id = ?',
          [announcement.communityId]
        );
        announcement.community = communities[0] || null;
      } else {
        announcement.community = null;
      }
    }

    return announcement;
  }

  static async findMany(options = {}) {
    const { where = {}, skip = 0, take = 20, orderBy = {}, include = {} } = options;

    let query = 'SELECT * FROM announcements';
    const params = [];
    const conditions = [];

    if (where.status) {
      conditions.push('status = ?');
      params.push(where.status);
    }

    if (where.type) {
      conditions.push('type = ?');
      params.push(where.type);
    }

    if (where.communityId) {
      conditions.push('communityId = ?');
      params.push(where.communityId);
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

    const [announcements] = await db.execute(query, params);

    // Include relations
    for (const announcement of announcements) {
      if (include.community) {
        if (announcement.communityId) {
          const [communities] = await db.execute(
            'SELECT id, name, avatar FROM communities WHERE id = ?',
            [announcement.communityId]
          );
          announcement.community = communities[0] || null;
        } else {
          announcement.community = null;
        }
      }
    }

    return announcements;
  }

  static async count(options = {}) {
    const { where = {} } = options;

    let query = 'SELECT COUNT(*) as count FROM announcements';
    const params = [];
    const conditions = [];

    if (where.status) {
      conditions.push('status = ?');
      params.push(where.status);
    }

    if (where.type) {
      conditions.push('type = ?');
      params.push(where.type);
    }

    if (where.communityId) {
      conditions.push('communityId = ?');
      params.push(where.communityId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const [[result]] = await db.execute(query, params);
    return result.count;
  }

  static async create(data) {
    const {
      title,
      content,
      summary = null,
      type = 'public',
      category = null,
      status = 'DRAFT',
      authorId,
      communityId = null,
      publishedAt = null,
    } = data;

    const [result] = await db.execute(
      `INSERT INTO announcements (title, content, summary, type, category, status, authorId, communityId, viewCount, publishedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), NOW())`,
      [title, content, summary, type, category, status, authorId, communityId, publishedAt]
    );

    return await this.findById(result.insertId);
  }

  static async update(id, data) {
    const fields = [];
    const values = [];

    const allowedFields = ['title', 'content', 'summary', 'type', 'category', 'status', 'communityId', 'publishedAt'];

    allowedFields.forEach((field) => {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    });

    if (fields.length === 0) return await this.findById(id);

    fields.push('updatedAt = NOW()');
    values.push(id);

    await db.execute(
      `UPDATE announcements SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return await this.findById(id);
  }

  static async incrementViewCount(id) {
    await db.execute('UPDATE announcements SET viewCount = viewCount + 1 WHERE id = ?', [id]);
  }

  static async delete(id) {
    await db.execute('DELETE FROM announcements WHERE id = ?', [id]);
    return { id };
  }
}

module.exports = AnnouncementModel;
