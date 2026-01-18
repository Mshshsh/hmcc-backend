const db = require('../config/database');

class MentorModel {
  /**
   * Create mentor profile
   */
  static async create(data) {
    const {
      userId,
      title,
      company = '',
      expertise = [],
      bio = '',
      experience = '',
    } = data;

    const [result] = await db.execute(
      `INSERT INTO mentors (userId, title, company, expertise, bio, experience, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, title, company, JSON.stringify(expertise), bio, experience]
    );

    return await this.findByUserId(userId);
  }

  /**
   * Find mentor by ID
   */
  static async findById(id, options = {}) {
    const { include = {} } = options;

    const [mentors] = await db.execute('SELECT * FROM mentors WHERE id = ?', [id]);
    if (mentors.length === 0) return null;

    const mentor = mentors[0];

    // Parse JSON fields
    if (mentor.expertise) {
      mentor.expertise = JSON.parse(mentor.expertise);
    }

    // Include user relation
    if (include.user) {
      const [users] = await db.execute(
        'SELECT id, name, avatar, email, status, createdAt FROM users WHERE id = ?',
        [mentor.userId]
      );
      mentor.user = users[0] || null;
    }

    // Include follower count
    if (include._count) {
      const [[followerCount]] = await db.execute(
        'SELECT COUNT(*) as count FROM mentor_follows WHERE mentorId = ?',
        [id]
      );
      const [[sessionCount]] = await db.execute(
        'SELECT COUNT(*) as count FROM mentor_sessions WHERE mentorId = ?',
        [id]
      );
      mentor._count = {
        followers: followerCount.count,
        sessions: sessionCount.count,
      };
    }

    // Check if current user follows
    if (include.followers && options.userId) {
      const [userFollows] = await db.execute(
        'SELECT id FROM mentor_follows WHERE mentorId = ? AND userId = ?',
        [id, options.userId]
      );
      mentor.followers = userFollows;
    }

    // Include upcoming sessions
    if (include.sessions) {
      const [sessions] = await db.execute(
        `SELECT id, title, scheduledAt, duration
         FROM mentor_sessions
         WHERE mentorId = ? AND status = 'scheduled' AND scheduledAt >= NOW()
         ORDER BY scheduledAt ASC
         LIMIT 5`,
        [id]
      );
      mentor.sessions = sessions;
    }

    return mentor;
  }

  /**
   * Find mentor by userId
   */
  static async findByUserId(userId, options = {}) {
    const { include = {} } = options;

    const [mentors] = await db.execute('SELECT * FROM mentors WHERE userId = ?', [userId]);
    if (mentors.length === 0) return null;

    const mentor = mentors[0];
    // Parse JSON fields
    if (mentor.expertise) {
      mentor.expertise = JSON.parse(mentor.expertise);
    }

    // Include user relation
    if (include.user) {
      const [users] = await db.execute(
        'SELECT id, name, avatar, email, status FROM users WHERE id = ?',
        [mentor.userId]
      );
      mentor.user = users[0] || null;
    }

    return mentor;
  }

  /**
   * Update mentor profile
   */
  static async update(userId, data) {
    const fields = [];
    const values = [];

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        if (key === 'expertise') {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(data[key]));
        } else {
          fields.push(`${key} = ?`);
          values.push(data[key]);
        }
      }
    });

    if (fields.length === 0) return await this.findByUserId(userId);

    fields.push('updatedAt = NOW()');
    values.push(userId);

    await db.execute(
      `UPDATE mentors SET ${fields.join(', ')} WHERE userId = ?`,
      values
    );

    return await this.findByUserId(userId);
  }

  /**
   * Update mentor by ID
   */
  static async updateById(id, data) {
    const fields = [];
    const values = [];

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        if (key === 'expertise') {
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
      `UPDATE mentors SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return await this.findById(id);
  }

  /**
   * Delete mentor
   */
  static async delete(userId) {
    await db.execute('DELETE FROM mentors WHERE userId = ?', [userId]);
  }

  /**
   * Get all mentors with filters
   */
  static async findMany(options = {}) {
    const { where = {}, skip = 0, take = 100, orderBy = {}, include = {} } = options;

    let query = `
      SELECT m.*, u.name, u.email, u.avatar, u.status as userStatus
      FROM mentors m
      LEFT JOIN users u ON m.userId = u.id
      WHERE u.status = 'ACTIVE'
    `;
    const params = [];

    if (where.availability) {
      query += ' AND m.availability = ?';
      params.push(where.availability);
    }

    // Order by
    if (orderBy.rating) {
      query += ` ORDER BY m.rating ${orderBy.rating === 'desc' ? 'DESC' : 'ASC'}`;
    } else {
      query += ' ORDER BY m.rating DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(take, skip);

    const [mentors] = await db.execute(query, params);

    // Parse JSON fields and include relations
    for (const mentor of mentors) {
      if (mentor.expertise) {
        mentor.expertise = JSON.parse(mentor.expertise);
      }

      mentor.user = {
        id: mentor.userId,
        name: mentor.name,
        avatar: mentor.avatar,
        email: mentor.email,
        status: mentor.userStatus,
      };

      if (include.followers && options.userId) {
        const [userFollows] = await db.execute(
          'SELECT id FROM mentor_follows WHERE mentorId = ? AND userId = ?',
          [mentor.id, options.userId]
        );
        mentor.followers = userFollows;
      }
    }

    return mentors;
  }

  /**
   * Count mentors
   */
  static async count(options = {}) {
    const { where = {} } = options;

    let query = `
      SELECT COUNT(*) as count
      FROM mentors m
      LEFT JOIN users u ON m.userId = u.id
      WHERE u.status = 'ACTIVE'
    `;
    const params = [];

    if (where.availability) {
      query += ' AND m.availability = ?';
      params.push(where.availability);
    }

    const [[result]] = await db.execute(query, params);
    return result.count;
  }

  // ==================== MENTOR FOLLOW OPERATIONS ====================

  static async findFollow(userId, mentorId) {
    const [follows] = await db.execute(
      'SELECT * FROM mentor_follows WHERE userId = ? AND mentorId = ?',
      [userId, mentorId]
    );
    return follows.length > 0 ? follows[0] : null;
  }

  static async createFollow(userId, mentorId) {
    await db.execute(
      'INSERT INTO mentor_follows (userId, mentorId, createdAt) VALUES (?, ?, NOW())',
      [userId, mentorId]
    );
    return { userId, mentorId };
  }

  static async deleteFollow(id) {
    await db.execute('DELETE FROM mentor_follows WHERE id = ?', [id]);
    return { id };
  }

  // ==================== MENTOR SESSION OPERATIONS ====================

  static async createSession(data) {
    const { mentorId, menteeId, title, description, scheduledAt, duration = 60, status = 'scheduled' } = data;

    const [result] = await db.execute(
      `INSERT INTO mentor_sessions (mentorId, menteeId, title, description, scheduledAt, duration, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [mentorId, menteeId, title, description, scheduledAt, duration, status]
    );

    return await this.findSessionById(result.insertId);
  }

  static async findSessionById(id) {
    const [sessions] = await db.execute(
      `SELECT ms.*,
              m.id as mentor_id, m.title as mentor_title, m.company as mentor_company,
              mu.id as mentor_userId, mu.name as mentor_name, mu.avatar as mentor_avatar,
              u.id as mentee_userId, u.name as mentee_name, u.avatar as mentee_avatar, u.email as mentee_email
       FROM mentor_sessions ms
       LEFT JOIN mentors m ON ms.mentorId = m.id
       LEFT JOIN users mu ON m.userId = mu.id
       LEFT JOIN users u ON ms.menteeId = u.id
       WHERE ms.id = ?`,
      [id]
    );

    if (sessions.length === 0) return null;

    const session = sessions[0];
    return {
      id: session.id,
      mentorId: session.mentorId,
      menteeId: session.menteeId,
      title: session.title,
      description: session.description,
      scheduledAt: session.scheduledAt,
      duration: session.duration,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      mentor: {
        id: session.mentor_id,
        title: session.mentor_title,
        company: session.mentor_company,
        user: {
          id: session.mentor_userId,
          name: session.mentor_name,
          avatar: session.mentor_avatar,
        },
      },
      mentee: {
        id: session.mentee_userId,
        name: session.mentee_name,
        avatar: session.mentee_avatar,
        email: session.mentee_email,
      },
    };
  }

  static async findSessions(options = {}) {
    const { where = {}, skip = 0, take = 20, orderBy = {} } = options;

    let query = `
      SELECT ms.*,
             u.id as mentee_userId, u.name as mentee_name, u.avatar as mentee_avatar, u.email as mentee_email
      FROM mentor_sessions ms
      LEFT JOIN users u ON ms.menteeId = u.id
      WHERE 1=1
    `;
    const params = [];

    if (where.mentorId) {
      query += ' AND ms.mentorId = ?';
      params.push(where.mentorId);
    }

    if (where.status) {
      query += ' AND ms.status = ?';
      params.push(where.status);
    }

    // Order by
    if (orderBy.scheduledAt) {
      query += ` ORDER BY ms.scheduledAt ${orderBy.scheduledAt === 'desc' ? 'DESC' : 'ASC'}`;
    } else {
      query += ' ORDER BY ms.scheduledAt DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(take, skip);

    const [sessions] = await db.execute(query, params);

    return sessions.map(session => ({
      id: session.id,
      mentorId: session.mentorId,
      menteeId: session.menteeId,
      title: session.title,
      description: session.description,
      scheduledAt: session.scheduledAt,
      duration: session.duration,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      mentee: {
        id: session.mentee_userId,
        name: session.mentee_name,
        avatar: session.mentee_avatar,
        email: session.mentee_email,
      },
    }));
  }

  static async countSessions(options = {}) {
    const { where = {} } = options;

    let query = 'SELECT COUNT(*) as count FROM mentor_sessions WHERE 1=1';
    const params = [];

    if (where.mentorId) {
      query += ' AND mentorId = ?';
      params.push(where.mentorId);
    }

    if (where.status) {
      query += ' AND status = ?';
      params.push(where.status);
    }

    const [[result]] = await db.execute(query, params);
    return result.count;
  }
}

module.exports = MentorModel;
