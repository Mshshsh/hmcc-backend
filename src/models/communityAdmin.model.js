const db = require('../config/database');

class CommunityAdminModel {
  /**
   * Create community admin
   */
  static async create(data) {
    const { userId, communityId, role = 'admin' } = data;

    const [result] = await db.execute(
      `INSERT INTO community_admins (userId, communityId, role, createdAt, updatedAt)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [userId, communityId, role]
    );

    return await this.findById(result.insertId);
  }

  /**
   * Find by ID
   */
  static async findById(id) {
    const [admins] = await db.execute('SELECT * FROM community_admins WHERE id = ?', [id]);
    return admins.length > 0 ? admins[0] : null;
  }

  /**
   * Find by userId and communityId
   */
  static async findByUserAndCommunity(userId, communityId) {
    const [admins] = await db.execute(
      'SELECT * FROM community_admins WHERE userId = ? AND communityId = ?',
      [userId, communityId]
    );
    return admins.length > 0 ? admins[0] : null;
  }

  /**
   * Delete community admin
   */
  static async delete(id) {
    await db.execute('DELETE FROM community_admins WHERE id = ?', [id]);
  }
}

module.exports = CommunityAdminModel;
