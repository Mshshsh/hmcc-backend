const db = require('../config/database');

class CommunityModel {
  /**
   * Create community
   */
  static async create(data) {
    const {
      name,
      slug,
      description,
      category = 'Social',
      status = 'PENDING',
      avatar = null,
      tags = null,
    } = data;

    const [result] = await db.execute(
      `INSERT INTO communities (name, slug, description, category, status, avatar, tags, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [name, slug, description, category, status, avatar, tags ? JSON.stringify(tags) : null]
    );

    return await this.findById(result.insertId);
  }

  /**
   * Find community by ID with includes
   */
  static async findById(id, options = {}) {
    const { include = {} } = options;

    const [communities] = await db.execute('SELECT * FROM communities WHERE id = ?', [id]);
    if (communities.length === 0) return null;

    const community = communities[0];

    // Parse JSON fields
    if (community.tags) {
      community.tags = JSON.parse(community.tags);
    }

    // Include relations
    if (include._count) {
      const [[memberCount]] = await db.execute(
        'SELECT COUNT(*) as count FROM community_follows WHERE communityId = ?',
        [id]
      );
      const [[eventCount]] = await db.execute(
        'SELECT COUNT(*) as count FROM events WHERE communityId = ?',
        [id]
      );
      const [[postCount]] = await db.execute(
        'SELECT COUNT(*) as count FROM posts WHERE communityId = ?',
        [id]
      );

      community._count = {
        members: memberCount.count,
        events: eventCount.count,
        posts: postCount.count,
      };
    }

    if (include.members && options.userId) {
      const [userFollows] = await db.execute(
        'SELECT id FROM community_follows WHERE communityId = ? AND userId = ?',
        [id, options.userId]
      );
      community.members = userFollows;
    }

    if (include.admins) {
      const [admins] = await db.execute(
        `SELECT ca.id, ca.userId, ca.role, ca.createdAt,
                u.id as userId, u.name, u.email, u.avatar
         FROM community_admins ca
         LEFT JOIN users u ON ca.userId = u.id
         WHERE ca.communityId = ?`,
        [id]
      );

      community.admins = admins.map(admin => ({
        id: admin.id,
        userId: admin.userId,
        communityId: id,
        role: admin.role,
        createdAt: admin.createdAt,
        user: {
          id: admin.userId,
          name: admin.name,
          email: admin.email,
          avatar: admin.avatar,
        },
      }));
    }

    return community;
  }

  /**
   * Find community by slug
   */
  static async findBySlug(slug) {
    const [communities] = await db.execute('SELECT * FROM communities WHERE slug = ?', [slug]);
    if (communities.length === 0) return null;

    const community = communities[0];
    if (community.tags) {
      community.tags = JSON.parse(community.tags);
    }

    return community;
  }

  /**
   * Update community
   */
  static async update(id, data) {
    const fields = [];
    const values = [];

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        if (key === 'tags') {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(data[key]));
        } else {
          fields.push(`${key} = ?`);
          values.push(data[key]);
        }
      }
    });

    if (fields.length === 0) return await this.findById(id);

    fields.push('updatedAt = NOW()');
    values.push(id);

    await db.execute(
      `UPDATE communities SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return await this.findById(id);
  }

  /**
   * Delete community
   */
  static async delete(id) {
    await db.execute('DELETE FROM communities WHERE id = ?', [id]);
    return { id };
  }

  /**
   * Find many communities with complex filtering
   */
  static async findMany(options = {}) {
    const { where = {}, orderBy = {}, skip = 0, take = 100, include = {} } = options;

    let query = 'SELECT * FROM communities';
    const params = [];
    const conditions = [];

    if (where.status) {
      conditions.push('status = ?');
      params.push(where.status);
    }

    if (where.category) {
      conditions.push('category = ?');
      params.push(where.category);
    }

    if (where.OR) {
      const orConditions = [];
      where.OR.forEach(condition => {
        if (condition.name && condition.name.contains) {
          orConditions.push('name LIKE ?');
          params.push(`%${condition.name.contains}%`);
        }
        if (condition.description && condition.description.contains) {
          orConditions.push('description LIKE ?');
          params.push(`%${condition.description.contains}%`);
        }
      });
      if (orConditions.length > 0) {
        conditions.push(`(${orConditions.join(' OR ')})`);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    if (orderBy.createdAt) {
      query += ` ORDER BY createdAt ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(take, skip);

    const [communities] = await db.execute(query, params);

    // Parse JSON fields and include relations
    for (const community of communities) {
      if (community.tags) {
        community.tags = JSON.parse(community.tags);
      }

      if (include._count) {
        const [[memberCount]] = await db.execute(
          'SELECT COUNT(*) as count FROM community_follows WHERE communityId = ?',
          [community.id]
        );
        const [[eventCount]] = await db.execute(
          'SELECT COUNT(*) as count FROM events WHERE communityId = ?',
          [community.id]
        );
        const [[postCount]] = await db.execute(
          'SELECT COUNT(*) as count FROM posts WHERE communityId = ?',
          [community.id]
        );

        community._count = {
          members: memberCount.count,
          events: eventCount.count,
          posts: postCount.count,
        };
      }

      if (include.members && options.userId) {
        const [userFollows] = await db.execute(
          'SELECT id FROM community_follows WHERE communityId = ? AND userId = ?',
          [community.id, options.userId]
        );
        community.members = userFollows;
      }

      if (include.admins) {
        const [admins] = await db.execute(
          `SELECT ca.id, ca.userId, ca.role, ca.createdAt,
                  u.id as userId, u.name, u.email, u.avatar
           FROM community_admins ca
           LEFT JOIN users u ON ca.userId = u.id
           WHERE ca.communityId = ?`,
          [community.id]
        );

        community.admins = admins.map(admin => ({
          id: admin.id,
          userId: admin.userId,
          communityId: community.id,
          role: admin.role,
          createdAt: admin.createdAt,
          user: {
            id: admin.userId,
            name: admin.name,
            email: admin.email,
            avatar: admin.avatar,
          },
        }));
      }

      if (include.events) {
        const [events] = await db.execute(
          `SELECT id, title, date FROM events
           WHERE communityId = ? AND date >= ? AND status = 'UPCOMING'
           ORDER BY date ASC
           LIMIT 3`,
          [community.id, new Date()]
        );
        community.events = events;
      }

      if (include.posts) {
        const [posts] = await db.execute(
          `SELECT id, content, createdAt FROM posts
           WHERE communityId = ?
           ORDER BY createdAt DESC
           LIMIT 3`,
          [community.id]
        );

        // Get like counts for posts
        for (const post of posts) {
          const [[likeCount]] = await db.execute(
            'SELECT COUNT(*) as count FROM likes WHERE postId = ?',
            [post.id]
          );
          post._count = { likes: likeCount.count };
        }

        community.posts = posts;
      }
    }

    return communities;
  }

  /**
   * Count communities
   */
  static async count(options = {}) {
    const { where = {} } = options;

    let query = 'SELECT COUNT(*) as count FROM communities';
    const params = [];
    const conditions = [];

    if (where.status) {
      conditions.push('status = ?');
      params.push(where.status);
    }

    if (where.category) {
      conditions.push('category = ?');
      params.push(where.category);
    }

    if (where.OR) {
      const orConditions = [];
      where.OR.forEach(condition => {
        if (condition.name && condition.name.contains) {
          orConditions.push('name LIKE ?');
          params.push(`%${condition.name.contains}%`);
        }
        if (condition.description && condition.description.contains) {
          orConditions.push('description LIKE ?');
          params.push(`%${condition.description.contains}%`);
        }
      });
      if (orConditions.length > 0) {
        conditions.push(`(${orConditions.join(' OR ')})`);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const [[result]] = await db.execute(query, params);
    return result.count;
  }

  /**
   * Group by for statistics
   */
  static async groupBy(options = {}) {
    const { by = [], _count = {} } = options;

    if (by.includes('category') && _count.id) {
      const [results] = await db.execute(
        'SELECT category, COUNT(*) as count FROM communities GROUP BY category'
      );
      return results.map(r => ({ category: r.category, _count: { id: r.count } }));
    }

    return [];
  }

  // ==================== COMMUNITY FOLLOW OPERATIONS ====================

  static async findFollow(userId, communityId) {
    const [follows] = await db.execute(
      'SELECT * FROM community_follows WHERE userId = ? AND communityId = ?',
      [userId, communityId]
    );
    return follows.length > 0 ? follows[0] : null;
  }

  static async createFollow(userId, communityId) {
    await db.execute(
      'INSERT INTO community_follows (userId, communityId, createdAt) VALUES (?, ?, NOW())',
      [userId, communityId]
    );
    return { userId, communityId };
  }

  static async deleteFollow(id) {
    await db.execute('DELETE FROM community_follows WHERE id = ?', [id]);
    return { id };
  }

  static async countFollows(communityId) {
    const [[result]] = await db.execute(
      'SELECT COUNT(*) as count FROM community_follows WHERE communityId = ?',
      [communityId]
    );
    return result.count;
  }
}

module.exports = CommunityModel;
