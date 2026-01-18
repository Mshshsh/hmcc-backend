const db = require('../config/database');
const MessageModel = require('../models/message.model');
const UserModel = require('../models/user.model');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class MessagesController {
  /**
   * Get user conversations
   * GET /api/messages/conversations
   */
  async getConversations(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [participations, total] = await Promise.all([
        MessageModel.findParticipantsByUserId(req.user.id, { skip, take: limit }),
        MessageModel.countParticipantsByUserId(req.user.id),
      ]);

      // Get last message for each conversation
      const conversations = await Promise.all(
        participations.map(async (p) => {
          // Get last message
          const messages = await MessageModel.findMessages(p.conversationId, {
            take: 1,
            include: { sender: true },
          });
          const lastMessage = messages[0];

          const otherUser = p.conversation.participants[0]?.user;

          return {
            id: p.conversationId.toString(),
            otherUser: otherUser
              ? {
                  id: otherUser.id?.toString(),
                  name: otherUser.name,
                  avatar: otherUser.avatar,
                }
              : null,
            lastMessage: lastMessage
              ? {
                  content: lastMessage.content,
                  timestamp: lastMessage.createdAt instanceof Date ? lastMessage.createdAt.toISOString() : lastMessage.createdAt,
                  senderId: lastMessage.senderId?.toString(),
                }
              : null,
            unreadCount: p.unreadCount,
            lastMessageAt: p.conversation.lastMessageAt
              ? (p.conversation.lastMessageAt instanceof Date ? p.conversation.lastMessageAt.toISOString() : p.conversation.lastMessageAt)
              : (p.conversation.createdAt instanceof Date ? p.conversation.createdAt.toISOString() : p.conversation.createdAt),
          };
        })
      );

      return ApiResponse.paginated(
        res,
        'Conversations retrieved successfully',
        conversations,
        { page, limit, total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get or create conversation with another user
   * POST /api/messages/conversations
   */
  async createConversation(req, res, next) {
    try {
      const { userId } = req.body;
      const otherUserId = parseInt(userId);

      if (otherUserId === req.user.id) {
        return ApiResponse.badRequest(res, 'Cannot create conversation with yourself');
      }

      // Check if conversation already exists
      const existingConversation = await MessageModel.findConversationBetweenUsers(req.user.id, otherUserId);

      if (existingConversation) {
        const otherParticipant = existingConversation.participants.find(p => p.userId !== req.user.id);
        return ApiResponse.success(res, 'Conversation already exists', {
          id: existingConversation.id.toString(),
          otherUser: otherParticipant?.user || null,
        });
      }

      // Check if other user exists
      const otherUser = await UserModel.findById(otherUserId);

      if (!otherUser) {
        return ApiResponse.notFound(res, 'User not found');
      }

      // Create new conversation with transaction
      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        // Create conversation
        const [conversationResult] = await connection.execute(
          'INSERT INTO conversations (createdAt, updatedAt) VALUES (NOW(), NOW())'
        );
        const conversationId = conversationResult.insertId;

        // Add participants
        await connection.execute(
          'INSERT INTO conversation_participants (conversationId, userId, unreadCount, createdAt) VALUES (?, ?, 0, NOW())',
          [conversationId, req.user.id]
        );
        await connection.execute(
          'INSERT INTO conversation_participants (conversationId, userId, unreadCount, createdAt) VALUES (?, ?, 0, NOW())',
          [conversationId, otherUserId]
        );

        await connection.commit();

        logger.info(`Conversation created between users ${req.user.id} and ${otherUserId}`);

        return ApiResponse.created(res, 'Conversation created successfully', {
          id: conversationId.toString(),
          otherUser: {
            id: otherUser.id.toString(),
            name: otherUser.name,
            avatar: otherUser.avatar,
          },
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get messages in a conversation
   * GET /api/messages/:conversationId
   */
  async getMessages(req, res, next) {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const skip = (page - 1) * limit;

      // Check if user is participant
      const participation = await MessageModel.findParticipant(conversationId, req.user.id);

      if (!participation) {
        return ApiResponse.forbidden(res, 'You are not a participant in this conversation');
      }

      const [messages, total] = await Promise.all([
        MessageModel.findMessages(conversationId, {
          skip,
          take: limit,
          include: { sender: true },
        }),
        MessageModel.countMessages(conversationId),
      ]);

      const transformedMessages = messages.reverse().map((msg) => ({
        id: msg.id.toString(),
        content: msg.content,
        senderId: msg.senderId.toString(),
        isRead: msg.isRead,
        timestamp: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt,
        sender: msg.sender
          ? {
              id: msg.sender.id?.toString(),
              name: msg.sender.name,
              avatar: msg.sender.avatar,
            }
          : null,
      }));

      return ApiResponse.paginated(
        res,
        'Messages retrieved successfully',
        transformedMessages,
        { page, limit, total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send message
   * POST /api/messages
   */
  async sendMessage(req, res, next) {
    try {
      const { conversationId, content } = req.body;
      const convId = parseInt(conversationId);

      // Check if user is participant
      const participation = await MessageModel.findParticipant(convId, req.user.id);

      if (!participation) {
        return ApiResponse.forbidden(res, 'You are not a participant in this conversation');
      }

      // Create message and update conversation using transaction
      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        // Create message
        const [messageResult] = await connection.execute(
          `INSERT INTO messages (conversationId, senderId, content, isRead, createdAt)
           VALUES (?, ?, ?, false, NOW())`,
          [convId, req.user.id, content]
        );
        const messageId = messageResult.insertId;

        // Update conversation's last message
        await connection.execute(
          'UPDATE conversations SET lastMessage = ?, lastMessageAt = NOW(), updatedAt = NOW() WHERE id = ?',
          [content, convId]
        );

        // Increment unread count for other participants
        await connection.execute(
          'UPDATE conversation_participants SET unreadCount = unreadCount + 1 WHERE conversationId = ? AND userId != ?',
          [convId, req.user.id]
        );

        await connection.commit();

        // Get created message with sender info
        const message = await MessageModel.findMessageById(messageId, { include: { sender: true } });

        const transformedMessage = {
          id: message.id.toString(),
          content: message.content,
          senderId: message.senderId.toString(),
          isRead: message.isRead,
          timestamp: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt,
          sender: message.sender
            ? {
                id: message.sender.id?.toString(),
                name: message.sender.name,
                avatar: message.sender.avatar,
              }
            : null,
        };

        return ApiResponse.created(res, 'Message sent successfully', transformedMessage);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark messages as read
   * PUT /api/messages/:conversationId/read
   */
  async markAsRead(req, res, next) {
    try {
      const conversationId = parseInt(req.params.conversationId);

      // Check if user is participant
      const participation = await MessageModel.findParticipant(conversationId, req.user.id);

      if (!participation) {
        return ApiResponse.forbidden(res, 'You are not a participant in this conversation');
      }

      // Mark messages as read and reset unread count
      await MessageModel.markMessagesAsRead(conversationId, req.user.id);
      await MessageModel.updateParticipant(participation.id, { unreadCount: 0 });

      return ApiResponse.success(res, 'Messages marked as read');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete conversation
   * DELETE /api/messages/:conversationId
   */
  async deleteConversation(req, res, next) {
    try {
      const conversationId = parseInt(req.params.conversationId);

      // Check if user is participant
      const participation = await MessageModel.findParticipant(conversationId, req.user.id);

      if (!participation) {
        return ApiResponse.forbidden(res, 'You are not a participant in this conversation');
      }

      // Remove user from conversation (soft delete approach)
      await MessageModel.deleteParticipant(participation.id);

      logger.info(`User ${req.user.id} left conversation ${conversationId}`);

      return ApiResponse.success(res, 'Conversation deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MessagesController();
