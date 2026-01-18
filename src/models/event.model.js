const db = require('../config/database');

/**
 * Event Model
 * Handles events, event interests, and event schedules
 */
class EventModel {
  // ==================== EVENT CRUD ====================

  static async findById(id, options = {}) {
    const { include = {} } = options;

    const [events] = await db.execute('SELECT * FROM events WHERE id = ?', [id]);

    if (events.length === 0) return null;

    const event = events[0];

    // Include relations if requested
    if (include.community) {
      if (event.communityId) {
        const [communities] = await db.execute(
          'SELECT id, name, avatar FROM communities WHERE id = ?',
          [event.communityId]
        );
        event.community = communities[0] || null;
      } else {
        event.community = null;
      }
    }

    if (include._count) {
      const [[interestCount]] = await db.execute(
        'SELECT COUNT(*) as count FROM event_interests WHERE eventId = ?',
        [id]
      );
      event._count = {
        interests: interestCount.count,
      };
    }

    if (include.interests && options.userId) {
      const [userInterests] = await db.execute(
        'SELECT id FROM event_interests WHERE eventId = ? AND userId = ?',
        [id, options.userId]
      );
      event.interests = userInterests;
    }

    if (include.schedule) {
      const [schedules] = await db.execute(
        'SELECT * FROM event_schedules WHERE eventId = ? ORDER BY time ASC',
        [id]
      );
      event.schedule = schedules;
    }

    return event;
  }

  static async findMany(options = {}) {
    const { where = {}, skip = 0, take = 20, orderBy = {}, include = {} } = options;

    let query = 'SELECT * FROM events';
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

    if (where.communityId) {
      conditions.push('communityId = ?');
      params.push(where.communityId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Order by
    if (orderBy.date) {
      query += ` ORDER BY date ${orderBy.date === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (orderBy.createdAt) {
      query += ` ORDER BY createdAt ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(take, skip);

    const [events] = await db.execute(query, params);

    // Include relations
    for (const event of events) {
      if (include.community) {
        if (event.communityId) {
          const [communities] = await db.execute(
            'SELECT id, name, avatar FROM communities WHERE id = ?',
            [event.communityId]
          );
          event.community = communities[0] || null;
        } else {
          event.community = null;
        }
      }

      if (include._count) {
        const [[interestCount]] = await db.execute(
          'SELECT COUNT(*) as count FROM event_interests WHERE eventId = ?',
          [event.id]
        );
        event._count = {
          interests: interestCount.count,
        };
      }

      if (include.interests && options.userId) {
        const [userInterests] = await db.execute(
          'SELECT id FROM event_interests WHERE eventId = ? AND userId = ?',
          [event.id, options.userId]
        );
        event.interests = userInterests;
      }
    }

    return events;
  }

  static async count(options = {}) {
    const { where = {} } = options;

    let query = 'SELECT COUNT(*) as count FROM events';
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
      description,
      date,
      time,
      location,
      image = null,
      capacity = 100,
      category = 'topluluk',
      communityId = null,
      status = 'UPCOMING',
    } = data;

    const [result] = await db.execute(
      `INSERT INTO events (title, description, date, time, location, image, capacity, category, communityId, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [title, description, date, time, location, image, capacity, category, communityId, status]
    );

    return await this.findById(result.insertId);
  }

  static async update(id, data) {
    const fields = [];
    const values = [];

    const allowedFields = ['title', 'description', 'date', 'time', 'location', 'image', 'capacity', 'status'];

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
      `UPDATE events SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return await this.findById(id);
  }

  static async delete(id) {
    await db.execute('DELETE FROM events WHERE id = ?', [id]);
    return { id };
  }

  // ==================== EVENT INTEREST OPERATIONS ====================

  static async findInterest(userId, eventId) {
    const [interests] = await db.execute(
      'SELECT * FROM event_interests WHERE userId = ? AND eventId = ?',
      [userId, eventId]
    );
    return interests.length > 0 ? interests[0] : null;
  }

  static async createInterest(userId, eventId) {
    await db.execute(
      'INSERT INTO event_interests (userId, eventId, createdAt) VALUES (?, ?, NOW())',
      [userId, eventId]
    );
    return { userId, eventId };
  }

  static async deleteInterest(id) {
    await db.execute('DELETE FROM event_interests WHERE id = ?', [id]);
    return { id };
  }

  static async countInterests(eventId) {
    const [[result]] = await db.execute(
      'SELECT COUNT(*) as count FROM event_interests WHERE eventId = ?',
      [eventId]
    );
    return result.count;
  }

  // ==================== EVENT SCHEDULE OPERATIONS ====================

  static async createScheduleItems(eventId, scheduleItems) {
    for (const item of scheduleItems) {
      await db.execute(
        'INSERT INTO event_schedules (eventId, time, activity, createdAt) VALUES (?, ?, ?, NOW())',
        [eventId, item.time, item.activity]
      );
    }
  }

  static async findScheduleByEventId(eventId) {
    const [schedules] = await db.execute(
      'SELECT * FROM event_schedules WHERE eventId = ? ORDER BY time ASC',
      [eventId]
    );
    return schedules;
  }
}

module.exports = EventModel;
