const http = require('http');
const app = require('./app');
const logger = require('./utils/logger');
const db = require('./config/database');

// Get port from environment
// cPanel assigns PORT automatically, fallback to 5000 for local development
const PORT = process.env.PORT || 5000;

// cPanel uses 127.0.0.1, local development can use 0.0.0.0
const HOST = process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0';

// Create HTTP server
const server = http.createServer(app);

// Socket.io setup (optional - for real-time messaging)
// Note: Socket.io may have limitations on shared hosting (cPanel)
// Consider using polling transport for better compatibility
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS === '*' ? '*' : (process.env.ALLOWED_ORIGINS || '').split(','),
    credentials: true,
  },
  // Force polling for cPanel compatibility (WebSocket may not work on shared hosting)
  transports: process.env.NODE_ENV === 'production' ? ['polling'] : ['websocket', 'polling'],
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Join conversation room
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    logger.info(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  // Leave conversation room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    logger.info(`Socket ${socket.id} left conversation ${conversationId}`);
  });

  // Handle new message (real-time)
  socket.on('send_message', (data) => {
    const { conversationId, message } = data;
    io.to(`conversation_${conversationId}`).emit('new_message', message);
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { conversationId, userId, isTyping } = data;
    socket.to(`conversation_${conversationId}`).emit('user_typing', {
      userId,
      isTyping,
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Make io accessible to controllers (for emitting events)
app.set('io', io);

// Start server
async function startServer() {
  try {
    // Database connection is tested in database.js during initialization
    // No need to manually connect with mysql2 pool

    // Start listening
    server.listen(PORT, HOST, () => {
      logger.info(`Server running on ${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API Prefix: ${process.env.API_PREFIX || '/api'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    logger.info('HTTP server closed');
    await db.end();
    logger.info('Database connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    logger.info('HTTP server closed');
    await db.end();
    logger.info('Database connection closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
});

// Start the server
startServer();

module.exports = server;
