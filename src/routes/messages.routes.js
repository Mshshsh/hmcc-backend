const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messages.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// All message routes require authentication
router.get('/conversations', authenticate, messagesController.getConversations);
router.post('/conversations', authenticate, messagesController.createConversation);
router.get('/:conversationId', authenticate, messagesController.getMessages);
router.post('/', authenticate, messagesController.sendMessage);
router.put('/:conversationId/read', authenticate, messagesController.markAsRead);
router.delete('/:conversationId', authenticate, messagesController.deleteConversation);

module.exports = router;
