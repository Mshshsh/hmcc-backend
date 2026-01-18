const db = require('../config/database');

class UserModel {
  /**
   * Find user by ID
   */
  static async findById(id, options = {}) {
    const { include = {} } = options;

    let query = 'SELECT * FROM users WHERE id = ?';
    const [users] = await db.execute(query, [id]);

    if (users.length === 0) return null;

    const user = users[0];

    // Include relations if requested
    if (include.fellow) {
      const [fellows] = await db.execute('SELECT * FROM fellows WHERE userId = ?', [id]);
      user.fellow = fellows[0] || null;
    }

    if (include.mentor) {
      const [mentors] = await db.execute('SELECT * FROM mentors WHERE userId = ?', [id]);
      user.mentor = mentors[0] || null;
    }

    if (include.communityAdmins) {
      const [admins] = await db.execute(
        `SELECT ca.*, c.id as communityId, c.name, c.slug, c.avatar, c.status
         FROM community_admins ca
         LEFT JOIN communities c ON ca.communityId = c.id
         WHERE ca.userId = ?`,
        [id]
      );
      user.communityAdmins = admins.map(admin => ({
        id: admin.id,
        userId: admin.userId,
        communityId: admin.communityId,
        role: admin.role,
        createdAt: admin.createdAt,
        community: {
          id: admin.communityId,
          name: admin.name,
          slug: admin.slug,
          avatar: admin.avatar,
          status: admin.status,
        },
      }));
    }

    return user;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    return users.length > 0 ? users[0] : null;
  }

  /**
   * Create new user
   */
  static async create(data) {
    const { name, email, password, role = 'FELLOW', status = 'PENDING' } = data;

    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [name, email, password, role, status]
    );

    return await this.findById(result.insertId);
  }

  /**
   * Update user
   */
  static async update(id, data) {
    const fields = [];
    const values = [];

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    });

    if (fields.length === 0) return await this.findById(id);

    fields.push('updatedAt = NOW()');
    values.push(id);

    await db.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return await this.findById(id);
  }

  /**
   * Delete user
   */
  static async delete(id) {
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
  }

  /**
   * Get all users with filters
   */
  static async findMany(options = {}) {
    const { where = {}, orderBy = {}, skip = 0, take = 100 } = options;

    let query = 'SELECT * FROM users';
    const params = [];
    const conditions = [];

    // Build WHERE clause
    if (where.role) {
      conditions.push('role = ?');
      params.push(where.role);
    }

    if (where.status) {
      conditions.push('status = ?');
      params.push(where.status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Add ORDER BY
    if (orderBy.createdAt) {
      query += ` ORDER BY createdAt ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(take, skip);

    const [users] = await db.execute(query, params);
    return users;
  }

  /**
   * Count users
   */
  static async count(options = {}) {
    // Support both { where: {...} } and direct {...} formats
    const where = options.where || options;

    let query = 'SELECT COUNT(*) as count FROM users';
    const params = [];
    const conditions = [];

    if (where.role) {
      conditions.push('role = ?');
      params.push(where.role);
    }

    if (where.status) {
      conditions.push('status = ?');
      params.push(where.status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const [result] = await db.execute(query, params);
    return result[0].count;
  }
}

module.exports = UserModel;
