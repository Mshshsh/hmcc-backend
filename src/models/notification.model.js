const db = require('../config/database');

/**
 * Notification Model
 * Handles user notifications
 */
class NotificationModel {
  static async findById(id) {
    const [notifications] = await db.execute('SELECT * FROM notifications WHERE id = ?', [id]);
    return notifications.length > 0 ? notifications[0] : null;
  }

  static async findMany(options = {}) {
    const { where = {}, skip = 0, take = 20, orderBy = {} } = options;

    let query = 'SELECT * FROM notifications';
    const params = [];
    const conditions = [];

    if (where.userId) {
      conditions.push('userId = ?');
      params.push(where.userId);
    }

    if (where.isRead !== undefined) {
      conditions.push('isRead = ?');
      params.push(where.isRead);
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

    const [notifications] = await db.execute(query, params);

    // Parse JSON data field
    return notifications.map((notif) => ({
      ...notif,
      data: notif.data ? JSON.parse(notif.data) : null,
    }));
  }

  static async count(options = {}) {
    const { where = {} } = options;

    let query = 'SELECT COUNT(*) as count FROM notifications';
    const params = [];
    const conditions = [];

    if (where.userId) {
      conditions.push('userId = ?');
      params.push(where.userId);
    }

    if (where.isRead !== undefined) {
      conditions.push('isRead = ?');
      params.push(where.isRead);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const [[result]] = await db.execute(query, params);
    return result.count;
  }

  static async create(data) {
    const { userId, type, title, message, data: notifData = null } = data;

    const [result] = await db.execute(
      `INSERT INTO notifications (userId, type, title, message, data, isRead, createdAt)
       VALUES (?, ?, ?, ?, ?, false, NOW())`,
      [userId, type, title, message, notifData ? JSON.stringify(notifData) : null]
    );

    return await this.findById(result.insertId);
  }

  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.isRead !== undefined) {
      fields.push('isRead = ?');
      values.push(data.isRead);
    }

    if (fields.length === 0) return await this.findById(id);

    values.push(id);

    await db.execute(
      `UPDATE notifications SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return await this.findById(id);
  }

  static async updateMany(options = {}) {
    const { where = {}, data = {} } = options;

    let query = 'UPDATE notifications SET';
    const params = [];
    const updates = [];
    const conditions = [];

    if (data.isRead !== undefined) {
      updates.push(' isRead = ?');
      params.push(data.isRead);
    }

    if (updates.length === 0) return;

    query += updates.join(', ');

    if (where.userId) {
      conditions.push('userId = ?');
      params.push(where.userId);
    }

    if (where.isRead !== undefined) {
      conditions.push('isRead = ?');
      params.push(where.isRead);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    await db.execute(query, params);
  }

  static async delete(id) {
    await db.execute('DELETE FROM notifications WHERE id = ?', [id]);
    return { id };
  }
}

module.exports = NotificationModel;
