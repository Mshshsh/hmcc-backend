const db = require('../config/database');

/**
 * Message Model
 * Handles conversations, messages, and participants
 */
class MessageModel {
  // ==================== CONVERSATION OPERATIONS ====================

  static async findConversationById(id, options = {}) {
    const { include = {} } = options;

    const [conversations] = await db.execute('SELECT * FROM conversations WHERE id = ?', [id]);

    if (conversations.length === 0) return null;

    const conversation = conversations[0];

    if (include.participants) {
      const [participants] = await db.execute(
        `SELECT cp.*, u.id as userId, u.name, u.avatar
         FROM conversation_participants cp
         LEFT JOIN users u ON cp.userId = u.id
         WHERE cp.conversationId = ?`,
        [id]
      );

      conversation.participants = participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        conversationId: p.conversationId,
        unreadCount: p.unreadCount,
        createdAt: p.createdAt,
        user: {
          id: p.userId,
          name: p.name,
          avatar: p.avatar,
        },
      }));
    }

    if (include.messages) {
      const take = include.messages.take || 1;
      const [messages] = await db.execute(
        `SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt DESC LIMIT ?`,
        [id, take]
      );
      conversation.messages = messages;
    }

    return conversation;
  }

  static async createConversation() {
    const [result] = await db.execute(
      'INSERT INTO conversations (createdAt, updatedAt) VALUES (NOW(), NOW())'
    );
    return { id: result.insertId };
  }

  static async updateConversation(id, data) {
    const fields = [];
    const values = [];

    if (data.lastMessage !== undefined) {
      fields.push('lastMessage = ?');
      values.push(data.lastMessage);
    }

    if (data.lastMessageAt !== undefined) {
      fields.push('lastMessageAt = ?');
      values.push(data.lastMessageAt);
    }

    if (fields.length === 0) return;

    fields.push('updatedAt = NOW()');
    values.push(id);

    await db.execute(
      `UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // ==================== CONVERSATION PARTICIPANT OPERATIONS ====================

  static async findParticipant(conversationId, userId) {
    const [participants] = await db.execute(
      'SELECT * FROM conversation_participants WHERE conversationId = ? AND userId = ?',
      [conversationId, userId]
    );
    return participants.length > 0 ? participants[0] : null;
  }

  static async findParticipantsByUserId(userId, options = {}) {
    const { skip = 0, take = 20 } = options;

    const [participants] = await db.execute(
      `SELECT cp.*,
              c.lastMessage, c.lastMessageAt, c.createdAt as convCreatedAt,
              op.userId as otherUserId, u.name as otherUserName, u.avatar as otherUserAvatar
       FROM conversation_participants cp
       LEFT JOIN conversations c ON cp.conversationId = c.id
       LEFT JOIN conversation_participants op ON cp.conversationId = op.conversationId AND op.userId != ?
       LEFT JOIN users u ON op.userId = u.id
       WHERE cp.userId = ?
       ORDER BY COALESCE(c.lastMessageAt, c.createdAt) DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, take, skip]
    );

    return participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      conversationId: p.conversationId,
      unreadCount: p.unreadCount,
      createdAt: p.createdAt,
      conversation: {
        id: p.conversationId,
        lastMessage: p.lastMessage,
        lastMessageAt: p.lastMessageAt,
        createdAt: p.convCreatedAt,
        participants: [
          {
            user: {
              id: p.otherUserId,
              name: p.otherUserName,
              avatar: p.otherUserAvatar,
            },
          },
        ],
        messages: [], // Will be populated separately if needed
      },
    }));
  }

  static async countParticipantsByUserId(userId) {
    const [[result]] = await db.execute(
      'SELECT COUNT(*) as count FROM conversation_participants WHERE userId = ?',
      [userId]
    );
    return result.count;
  }

  static async createParticipants(conversationId, userIds) {
    for (const userId of userIds) {
      await db.execute(
        'INSERT INTO conversation_participants (conversationId, userId, unreadCount, createdAt) VALUES (?, ?, 0, NOW())',
        [conversationId, userId]
      );
    }
  }

  static async updateParticipant(id, data) {
    const fields = [];
    const values = [];

    if (data.unreadCount !== undefined) {
      fields.push('unreadCount = ?');
      values.push(data.unreadCount);
    }

    if (fields.length === 0) return;

    values.push(id);

    await db.execute(
      `UPDATE conversation_participants SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  static async incrementUnreadCount(conversationId, excludeUserId) {
    await db.execute(
      'UPDATE conversation_participants SET unreadCount = unreadCount + 1 WHERE conversationId = ? AND userId != ?',
      [conversationId, excludeUserId]
    );
  }

  static async deleteParticipant(id) {
    await db.execute('DELETE FROM conversation_participants WHERE id = ?', [id]);
  }

  static async findConversationBetweenUsers(userId1, userId2) {
    // Find conversation where both users are participants
    const [results] = await db.execute(
      `SELECT cp1.conversationId
       FROM conversation_participants cp1
       INNER JOIN conversation_participants cp2
         ON cp1.conversationId = cp2.conversationId
       WHERE cp1.userId = ? AND cp2.userId = ?
       LIMIT 1`,
      [userId1, userId2]
    );

    if (results.length === 0) return null;

    return await this.findConversationById(results[0].conversationId, {
      include: {
        participants: true,
      },
    });
  }

  // ==================== MESSAGE OPERATIONS ====================

  static async findMessageById(id, options = {}) {
    const { include = {} } = options;

    const [messages] = await db.execute('SELECT * FROM messages WHERE id = ?', [id]);

    if (messages.length === 0) return null;

    const message = messages[0];

    if (include.sender) {
      const [senders] = await db.execute(
        'SELECT id, name, avatar FROM users WHERE id = ?',
        [message.senderId]
      );
      message.sender = senders[0] || null;
    }

    return message;
  }

  static async findMessages(conversationId, options = {}) {
    const { skip = 0, take = 50, include = {} } = options;

    const [messages] = await db.execute(
      `SELECT m.*${include.sender ? ', u.id as userId, u.name as userName, u.avatar as userAvatar' : ''}
       FROM messages m
       ${include.sender ? 'LEFT JOIN users u ON m.senderId = u.id' : ''}
       WHERE m.conversationId = ?
       ORDER BY m.createdAt DESC
       LIMIT ? OFFSET ?`,
      [conversationId, take, skip]
    );

    return messages.map((msg) => {
      const message = {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        content: msg.content,
        isRead: Boolean(msg.isRead),
        createdAt: msg.createdAt,
      };

      if (include.sender) {
        message.sender = {
          id: msg.userId,
          name: msg.userName,
          avatar: msg.userAvatar,
        };
      }

      return message;
    });
  }

  static async countMessages(conversationId) {
    const [[result]] = await db.execute(
      'SELECT COUNT(*) as count FROM messages WHERE conversationId = ?',
      [conversationId]
    );
    return result.count;
  }

  static async createMessage(data) {
    const { conversationId, senderId, content } = data;

    const [result] = await db.execute(
      `INSERT INTO messages (conversationId, senderId, content, isRead, createdAt)
       VALUES (?, ?, ?, false, NOW())`,
      [conversationId, senderId, content]
    );

    return await this.findMessageById(result.insertId, { include: { sender: true } });
  }

  static async markMessagesAsRead(conversationId, excludeSenderId) {
    await db.execute(
      'UPDATE messages SET isRead = true WHERE conversationId = ? AND senderId != ? AND isRead = false',
      [conversationId, excludeSenderId]
    );
  }
}

module.exports = MessageModel;
