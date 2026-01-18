# HMCC Backend API

Express.js REST API for **HMCC Website** (Next.js) and **UniSocialOne Mobile App** (React Native).

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: Admins, Mentors, Fellows, Community Admins
- **Social Features**: Posts, Likes, Comments, Feed
- **Community Management**: Communities, Events, Announcements
- **Mentoring System**: Mentor profiles, session booking, availability
- **Messaging**: Real-time chat with Socket.io
- **File Upload**: Image/Video upload with AWS S3 support
- **Security**: Helmet, CORS, Rate limiting, Input validation
- **Database**: MySQL with Prisma ORM

## 📋 Prerequisites

- Node.js >= 18.0.0
- MySQL >= 8.0
- npm >= 9.0.0

## 🛠️ Installation

1. Clone the repository and navigate to backend folder:
```bash
cd hmcc-backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env and update with your MySQL credentials
DATABASE_URL="mysql://username:password@localhost:3306/hmcc_db"
```

4. Setup database:
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed
```

5. Start development server:
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## 📁 Project Structure

```
hmcc-backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.js      # Database connection
│   │   ├── cloudinary.js    # Cloudinary config
│   │   └── socket.js        # Socket.io config
│   ├── controllers/         # Route controllers
│   │   ├── auth.controller.js
│   │   ├── users.controller.js
│   │   ├── posts.controller.js
│   │   ├── communities.controller.js
│   │   ├── events.controller.js
│   │   ├── mentors.controller.js
│   │   └── messages.controller.js
│   ├── middlewares/         # Middleware functions
│   │   ├── auth.middleware.js
│   │   ├── rbac.middleware.js
│   │   ├── upload.middleware.js
│   │   ├── validate.middleware.js
│   │   ├── error.middleware.js
│   │   └── rateLimiter.middleware.js
│   ├── routes/              # API routes
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── posts.routes.js
│   │   ├── communities.routes.js
│   │   ├── events.routes.js
│   │   ├── mentors.routes.js
│   │   ├── messages.routes.js
│   │   └── index.js
│   ├── services/            # Business logic
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── post.service.js
│   │   └── ...
│   ├── validators/          # Request validators
│   │   ├── auth.validator.js
│   │   ├── user.validator.js
│   │   └── ...
│   ├── utils/               # Helper functions
│   │   ├── logger.js
│   │   ├── response.js
│   │   └── ...
│   ├── app.js               # Express app setup
│   └── server.js            # Server entry point
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Migration files
│   └── seed.js              # Database seeder
├── uploads/                 # Local file storage
├── logs/                    # Application logs
├── .env                     # Environment variables
├── .env.example             # Environment template
├── .gitignore
├── package.json
└── README.md
```

## 🔑 Environment Variables

See [.env.example](.env.example) for all available environment variables.

Key variables:
- `DATABASE_URL`: MySQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Server port (default: 5000)
- `ALLOWED_ORIGINS`: CORS allowed origins

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Users (Admin)
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PUT /api/users/:id/status` - Update user status

### Posts (Mobile App)
- `GET /api/posts` - Get feed
- `POST /api/posts` - Create post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike post
- `GET /api/posts/:id/comments` - Get comments
- `POST /api/posts/:id/comments` - Add comment

### Communities
- `GET /api/communities` - List communities
- `GET /api/communities/:id` - Get community details
- `POST /api/communities` - Create community
- `PUT /api/communities/:id` - Update community
- `DELETE /api/communities/:id` - Delete community
- `POST /api/communities/:id/follow` - Follow/unfollow

### Events
- `GET /api/events` - List events
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/:id/interest` - Mark interest

### Mentors
- `GET /api/mentors` - List mentors
- `GET /api/mentors/:id` - Get mentor details
- `POST /api/mentors/:id/follow` - Follow mentor
- `POST /api/mentors/:id/book` - Book session

### Messages
- `GET /api/messages/conversations` - Get conversations
- `GET /api/messages/:conversationId` - Get messages
- `POST /api/messages` - Send message
- `PUT /api/messages/:id/read` - Mark as read

### File Upload
- `GET /api/upload/status` - Get upload configuration
- `POST /api/upload` - Upload single file
- `POST /api/upload/multiple` - Upload multiple files

## 🔒 User Roles

- `SUPER_ADMIN` - Full system access
- `CONTENT_ADMIN` - Manage content (announcements, events, pages)
- `USER_ADMIN` - Manage users (communities, mentors, fellows)
- `ANALYTICS_ADMIN` - Access analytics and reports
- `MENTOR` - Mentor dashboard and student management
- `FELLOW` - Regular member access
- `COMMUNITY_ADMIN` - Community management

## 🧪 Testing

```bash
npm test
```

## 📦 Database Management

```bash
# Open Prisma Studio (GUI for database)
npm run prisma:studio

# Create a new migration
npm run prisma:migrate

# Push schema changes without migration
npm run prisma:push

# Seed database
npm run prisma:seed
```

## 🚢 Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Update `DATABASE_URL` with production database
3. Configure AWS S3 for file uploads (see [AWS_S3_SETUP.md](AWS_S3_SETUP.md))
4. Set strong `JWT_SECRET` values
5. Enable rate limiting and security headers
6. Run migrations: `npm run prisma:migrate`
7. Start server: `npm start`

### AWS S3 Setup

For detailed AWS S3 configuration, see [AWS_S3_SETUP.md](AWS_S3_SETUP.md)

## 📝 License

MIT

## 👥 Contributors

HMCC Development Team
