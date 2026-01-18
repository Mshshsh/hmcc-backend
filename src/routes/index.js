const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const postsRoutes = require('./posts.routes');
const announcementsRoutes = require('./announcements.routes');
const communitiesRoutes = require('./communities.routes');
const eventsRoutes = require('./events.routes');
const mentorsRoutes = require('./mentors.routes');
const messagesRoutes = require('./messages.routes');
const uploadRoutes = require('./upload.routes');
const usersRoutes = require('./users.routes');
const adminRoutes = require('./admin.routes');
const discoverRoutes = require('./discover.routes');
const notificationsRoutes = require('./notifications.routes');
const searchRoutes = require('./search.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/posts', postsRoutes);
router.use('/feed', postsRoutes); // Alias for mobile app compatibility
router.use('/announcements', announcementsRoutes);
router.use('/communities', communitiesRoutes);
router.use('/events', eventsRoutes);
router.use('/mentors', mentorsRoutes);
router.use('/messages', messagesRoutes);
router.use('/conversations', messagesRoutes); // Alias for mobile app
router.use('/upload', uploadRoutes);
router.use('/users', usersRoutes);
router.use('/admin', adminRoutes);
router.use('/discover', discoverRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/search', searchRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'HMCC Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API documentation endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to HMCC Backend API',
    version: '1.0.0',
    documentation: {
      auth: '/api/auth/*',
      posts: '/api/posts/*',
      announcements: '/api/announcements/*',
      communities: '/api/communities/*',
      events: '/api/events/*',
      mentors: '/api/mentors/*',
      messages: '/api/messages/*',
      upload: '/api/upload/*',
      users: '/api/users/*',
      admin: '/api/admin/*',
      search: '/api/search/*',
    },
  });
});

module.exports = router;
