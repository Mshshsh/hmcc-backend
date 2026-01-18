const db = require('../config/database');

class FellowModel {
  /**
   * Create fellow profile
   */
  static async create(data) {
    const {
      userId,
      team = null,
      department = null,
      bio = null,
      interests = [],
    } = data;

    const [result] = await db.execute(
      `INSERT INTO fellows (userId, team, department, bio, interests, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, team, department, bio, JSON.stringify(interests)]
    );

    return await this.findByUserId(userId);
  }

  /**
   * Find fellow by userId
   */
  static async findByUserId(userId) {
    const [fellows] = await db.execute('SELECT * FROM fellows WHERE userId = ?', [userId]);
    if (fellows.length === 0) return null;

    const fellow = fellows[0];
    // Parse JSON fields
    if (fellow.interests) {
      fellow.interests = JSON.parse(fellow.interests);
    }

    return fellow;
  }

  /**
   * Update fellow profile
   */
  static async update(userId, data) {
    const fields = [];
    const values = [];

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        if (key === 'interests') {
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
      `UPDATE fellows SET ${fields.join(', ')} WHERE userId = ?`,
      values
    );

    return await this.findByUserId(userId);
  }

  /**
   * Delete fellow
   */
  static async delete(userId) {
    await db.execute('DELETE FROM fellows WHERE userId = ?', [userId]);
  }
}

module.exports = FellowModel;
