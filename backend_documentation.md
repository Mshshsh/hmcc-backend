# HMCC Backend API Documentation

**Base URL:** `http://localhost:5000/api`
**Version:** 1.0.0
**Last Updated:** January 18, 2026

---

## Table of Contents

1. [Authentication](#authentication)
2. [Posts](#posts)
3. [Communities](#communities)
4. [Events](#events)
5. [Mentors](#mentors)
6. [Messages](#messages)
7. [Announcements](#announcements)
8. [Notifications](#notifications)
9. [Users](#users)
10. [Admin](#admin)
11. [Upload](#upload)
12. [Discover](#discover)
13. [Search](#search)

---

## Authentication

### Headers
All protected endpoints require a Bearer token:
```
Authorization: Bearer <access_token>
```

### Roles
- `SUPER_ADMIN` - Full system access
- `CONTENT_ADMIN` - Content management
- `USER_ADMIN` - User management
- `ANALYTICS_ADMIN` - Analytics access
- `MENTOR` - Mentor features
- `FELLOW` - Fellow/student features
- `COMMUNITY_ADMIN` - Community management
- `USER` - Basic user access

---

## 1. Auth Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | User login |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/forgot-password` | No | Request password reset |
| POST | `/auth/reset-password` | No | Reset password with token |
| GET | `/auth/me` | Yes | Get current user |
| PUT | `/auth/profile` | Yes | Update profile |
| PUT | `/auth/change-password` | Yes | Change password |
| POST | `/auth/logout` | Yes | Logout user |

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@hacettepe.edu.tr",
  "password": "password123",
  "role": "FELLOW",
  "fellowData": {
    "department": "Computer Science",
    "team": "Development",
    "studentId": "21290001"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### POST /auth/login
Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "admin@hmcc.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 16,
      "email": "admin@hmcc.com",
      "name": "Super Admin",
      "role": "SUPER_ADMIN",
      "status": "ACTIVE"
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

### POST /auth/forgot-password
Request a password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent successfully",
  "data": {
    "success": true,
    "message": "Password reset email sent successfully"
  }
}
```

### POST /auth/reset-password
Reset password using token from email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newPassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful",
  "data": {
    "success": true,
    "message": "Password reset successful"
  }
}
```

### PUT /auth/change-password
Change password (authenticated user).

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "success": true,
    "message": "Password changed successfully"
  }
}
```

### GET /auth/me
Get currently authenticated user details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 16,
    "email": "admin@hmcc.com",
    "name": "Super Admin",
    "role": "SUPER_ADMIN",
    "status": "ACTIVE",
    "fellow": null,
    "mentor": null
  }
}
```

---

## 2. Posts Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/posts` | Optional | Get feed (posts) |
| GET | `/posts/:id` | Optional | Get single post detail |
| POST | `/posts` | Yes | Create new post |
| PUT | `/posts/:id` | Yes | Update post |
| DELETE | `/posts/:id` | Yes | Delete post |
| POST | `/posts/:id/like` | Yes | Toggle like |
| GET | `/posts/:id/comments` | No | Get comments |
| POST | `/posts/:id/comments` | Yes | Add comment |
| DELETE | `/posts/:postId/comments/:commentId` | Yes | Delete comment |

### GET /posts
Get paginated feed of posts.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response (200):**
```json
{
  "success": true,
  "message": "Feed retrieved successfully",
  "data": [
    {
      "id": 3,
      "type": "TEXT",
      "content": "Just finished my first React project!",
      "mediaUrl": null,
      "author": {
        "id": 21,
        "name": "Student 1",
        "avatar": "https://..."
      },
      "community": {
        "id": 3,
        "name": "Technology Club",
        "avatar": "https://..."
      },
      "likes": 2,
      "comments_count": 1,
      "isLiked": false,
      "timestamp": "2026-01-01T20:08:55.993Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

### GET /posts/:id
Get single post with full details.

**Response (200):**
```json
{
  "success": true,
  "message": "Post retrieved successfully",
  "data": {
    "id": 3,
    "type": "TEXT",
    "content": "Just finished my first React project!",
    "mediaUrl": null,
    "mediaType": null,
    "isPublished": true,
    "author": {
      "id": 21,
      "name": "Student 1",
      "avatar": "https://..."
    },
    "community": {
      "id": 3,
      "name": "Technology Club",
      "avatar": "https://..."
    },
    "likes": 2,
    "comments_count": 1,
    "isLiked": false,
    "createdAt": "2026-01-01T20:08:55.993Z",
    "updatedAt": "2026-01-01T20:08:55.993Z"
  }
}
```

### PUT /posts/:id
Update a post (author or admin only).

**Request Body:**
```json
{
  "content": "Updated content",
  "type": "TEXT",
  "mediaUrl": null,
  "mediaType": null,
  "isPublished": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Post updated successfully",
  "data": { ... }
}
```

### POST /posts/:id/like
Toggle like on a post.

**Response (200):**
```json
{
  "success": true,
  "message": "Post liked",
  "data": {
    "isLiked": true,
    "likes": 3
  }
}
```

### POST /posts/:id/comments
Add comment to a post.

**Request Body:**
```json
{
  "content": "Great post!"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "id": 3,
    "post_id": 3,
    "user_id": 16,
    "user_name": "Super Admin",
    "content": "Great post!",
    "created_at": "2026-01-18T05:00:51.000Z"
  }
}
```

---

## 3. Communities Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/communities` | Optional | List communities |
| GET | `/communities/:id` | Optional | Get community details |
| POST | `/communities` | Yes | Create community |
| PUT | `/communities/:id` | Yes | Update community |
| DELETE | `/communities/:id` | Super Admin | Delete community |
| POST | `/communities/:id/follow` | Yes | Toggle follow |
| GET | `/communities/admin/stats` | Admin | Get statistics |
| GET | `/communities/admin/pending` | Admin | Get pending communities |
| GET | `/communities/admin/all` | Admin | Get all communities |
| POST | `/communities/:id/approve` | Admin | Approve community |
| POST | `/communities/:id/reject` | Admin | Reject community |
| PUT | `/communities/:id/status` | User Admin | Update status |

### GET /communities
Get list of active communities.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `category` - Filter by category
- `search` - Search by name/description
- `status` - Filter by status (default: ACTIVE)

**Response (200):**
```json
{
  "success": true,
  "message": "Communities retrieved successfully",
  "data": [
    {
      "id": "3",
      "name": "Technology Club",
      "slug": "technology-club",
      "description": "A community for tech enthusiasts",
      "avatar": "https://...",
      "category": "Technology",
      "tags": ["Programming", "AI", "Web Development"],
      "members": 5,
      "isFollowing": false,
      "isVerified": true,
      "status": "ACTIVE",
      "upcomingEvents": [...],
      "recentPosts": [...]
    }
  ],
  "pagination": { ... }
}
```

### POST /communities/:id/follow
Toggle community follow status.

**Response (200):**
```json
{
  "success": true,
  "message": "Community followed",
  "data": {
    "isFollowing": true,
    "members": 6
  }
}
```

---

## 4. Events Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/events` | Optional | List events |
| GET | `/events/:id` | Optional | Get event details |
| POST | `/events` | Yes | Create event |
| PUT | `/events/:id` | Yes | Update event |
| DELETE | `/events/:id` | Yes | Delete event |
| POST | `/events/:id/interest` | Yes | Toggle interest |

### GET /events
Get list of events.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` - Filter by status
- `category` - Filter by category
- `communityId` - Filter by community

**Response (200):**
```json
{
  "success": true,
  "message": "Events retrieved successfully",
  "data": [
    {
      "id": "3",
      "title": "Intro to Web Development Workshop",
      "description": "Learn the basics of web development",
      "community": "Technology Club",
      "communityAvatar": "https://...",
      "date": "2026-02-14",
      "time": "14:00",
      "location": "Beytepe Campus, Room 301",
      "image": "https://...",
      "interested": 8,
      "isInterested": false,
      "capacity": 50,
      "category": "topluluk",
      "status": "UPCOMING"
    }
  ],
  "pagination": { ... }
}
```

### POST /events/:id/interest
Toggle interest in an event.

**Response (200):**
```json
{
  "success": true,
  "message": "Interest marked",
  "data": {
    "isInterested": true,
    "interested": 9
  }
}
```

---

## 5. Mentors Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/mentors` | Optional | List mentors |
| GET | `/mentors/:id` | Optional | Get mentor details |
| POST | `/mentors/:id/follow` | Yes | Toggle follow |
| POST | `/mentors/:id/book` | Yes | Book session |
| PUT | `/mentors/availability` | Mentor | Update availability |
| GET | `/mentors/sessions` | Mentor | Get mentor sessions |

### GET /mentors
Get list of mentors.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `filter` - "all", "available", "following"

**Response (200):**
```json
{
  "success": true,
  "message": "Mentors retrieved successfully",
  "data": [
    {
      "id": "3",
      "userId": 18,
      "name": "Ahmet Yılmaz",
      "avatar": "https://...",
      "title": "Senior Software Engineer",
      "company": "Google",
      "expertise": ["JavaScript", "React", "Node.js"],
      "bio": "Helping students build better software",
      "availability": "available",
      "rating": 4.8,
      "sessionsCompleted": 127,
      "responseTime": "2h",
      "isFollowing": false
    }
  ],
  "pagination": { ... }
}
```

### POST /mentors/:id/book
Book a session with a mentor.

**Request Body:**
```json
{
  "title": "Career Advice Session",
  "description": "Discuss career path in software engineering",
  "scheduledAt": "2026-02-01T14:00:00Z",
  "duration": 60
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Session booked successfully",
  "data": {
    "id": 1,
    "mentorId": 3,
    "menteeId": 16,
    "title": "Career Advice Session",
    "scheduledAt": "2026-02-01T14:00:00Z",
    "status": "scheduled"
  }
}
```

---

## 6. Messages Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/messages/conversations` | Yes | Get conversations |
| POST | `/messages/conversations` | Yes | Create conversation |
| GET | `/messages/:conversationId` | Yes | Get messages |
| POST | `/messages` | Yes | Send message |
| PUT | `/messages/:conversationId/read` | Yes | Mark as read |
| DELETE | `/messages/:conversationId` | Yes | Delete conversation |

### GET /messages/conversations
Get user's conversations.

**Response (200):**
```json
{
  "success": true,
  "message": "Conversations retrieved successfully",
  "data": [
    {
      "id": "1",
      "otherUser": {
        "id": "18",
        "name": "Ahmet Yılmaz",
        "avatar": "https://..."
      },
      "lastMessage": {
        "content": "Thanks for your help!",
        "timestamp": "2026-01-15T10:30:00Z",
        "senderId": "16"
      },
      "unreadCount": 2,
      "lastMessageAt": "2026-01-15T10:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

### POST /messages
Send a message.

**Request Body:**
```json
{
  "conversationId": "1",
  "content": "Hello, I have a question about React hooks."
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": "5",
    "content": "Hello, I have a question about React hooks.",
    "senderId": "16",
    "isRead": false,
    "timestamp": "2026-01-18T05:10:00Z",
    "sender": {
      "id": "16",
      "name": "Super Admin",
      "avatar": null
    }
  }
}
```

---

## 7. Announcements Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/announcements` | No | List announcements |
| GET | `/announcements/:id` | No | Get announcement |
| POST | `/announcements` | Admin | Create announcement |
| PUT | `/announcements/:id` | Admin | Update announcement |
| DELETE | `/announcements/:id` | Admin | Delete announcement |

### GET /announcements
Get published announcements.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` (default: PUBLISHED)
- `type` - Filter by type
- `communityId` - Filter by community

**Response (200):**
```json
{
  "success": true,
  "message": "Announcements retrieved successfully",
  "data": [
    {
      "id": 1,
      "title": "New Semester Registration Open",
      "content": "Registration for the new semester...",
      "summary": "Registration is open for new semester activities.",
      "type": "topluluk",
      "category": "General",
      "status": "PUBLISHED",
      "communityId": 3,
      "community": {
        "id": 3,
        "name": "Technology Club",
        "avatar": "https://..."
      },
      "views": 234,
      "createdAt": "2026-01-01T20:08:58.871Z",
      "publishedAt": "2026-01-01T20:08:58.863Z"
    }
  ],
  "pagination": { ... }
}
```

---

## 8. Notifications Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | Yes | Get notifications |
| GET | `/notifications/unread-count` | Yes | Get unread count |
| PUT | `/notifications/mark-all-read` | Yes | Mark all as read |
| PUT | `/notifications/:id/read` | Yes | Mark one as read |
| DELETE | `/notifications/:id` | Yes | Delete notification |

### GET /notifications
Get user notifications.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response (200):**
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": [
    {
      "id": 1,
      "type": "like",
      "title": "New Like",
      "message": "John Doe liked your post",
      "isRead": false,
      "createdAt": "2026-01-18T05:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### GET /notifications/unread-count
Get count of unread notifications.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

---

## 9. Users Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users` | Admin | List users |
| GET | `/users/:id` | Admin | Get user details |
| GET | `/users/stats` | Admin | Get user statistics |
| GET | `/users/profile-stats` | Yes | Get profile stats |
| GET | `/users/pending` | Admin | Get pending users |
| GET | `/users/:id/profile` | Optional | Get public user profile |
| GET | `/users/:id/posts` | Optional | Get user's posts |
| GET | `/users/:id/communities` | Optional | Get user's communities |
| GET | `/users/:id/events` | Optional | Get user's events |
| POST | `/users/:id/follow` | Yes | Toggle follow user |
| GET | `/users/:id/followers` | Optional | Get user's followers |
| GET | `/users/:id/following` | Optional | Get users they follow |
| POST | `/users/device-token` | Yes | Register device token |
| DELETE | `/users/device-token` | Yes | Remove device token |
| POST | `/users/:id/approve` | Admin | Approve user |
| POST | `/users/:id/reject` | Admin | Reject user |
| PUT | `/users/:id/status` | Admin | Update status |
| PUT | `/users/:id/role` | Super Admin | Update role |
| DELETE | `/users/:id` | Super Admin | Delete user |

### GET /users/stats
Get user statistics (Admin only).

**Response (200):**
```json
{
  "success": true,
  "message": "User statistics retrieved successfully",
  "data": {
    "total": 19,
    "active": 18,
    "pending": 1,
    "byRole": {
      "mentors": 2,
      "fellows": 13,
      "communities": 2,
      "admins": 2
    }
  }
}
```

### GET /users/profile-stats
Get authenticated user's profile statistics.

**Response (200):**
```json
{
  "success": true,
  "message": "Profile stats retrieved successfully",
  "data": {
    "events": 1,
    "communities": 1,
    "matches": 1,
    "posts": 0
  }
}
```

### GET /users/:id/profile
Get public profile of a user.

**Response (200):**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": 21,
    "name": "Student 1",
    "avatar": "https://...",
    "bio": "Computer Science student",
    "role": "FELLOW",
    "createdAt": "2026-01-01T20:08:55.000Z",
    "stats": {
      "posts": 5,
      "followers": 12,
      "following": 8,
      "communities": 3
    },
    "isFollowing": false
  }
}
```

### GET /users/:id/posts
Get posts by a specific user.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response (200):**
```json
{
  "success": true,
  "message": "User posts retrieved successfully",
  "data": [...],
  "pagination": { ... }
}
```

### GET /users/:id/communities
Get communities a user is member of.

**Response (200):**
```json
{
  "success": true,
  "message": "User communities retrieved successfully",
  "data": [...],
  "pagination": { ... }
}
```

### GET /users/:id/events
Get events a user is participating in.

**Response (200):**
```json
{
  "success": true,
  "message": "User events retrieved successfully",
  "data": [...],
  "pagination": { ... }
}
```

### POST /users/:id/follow
Toggle follow/unfollow a user.

**Response (200):**
```json
{
  "success": true,
  "message": "User followed",
  "data": {
    "isFollowing": true,
    "followerCount": 13
  }
}
```

### GET /users/:id/followers
Get list of user's followers.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response (200):**
```json
{
  "success": true,
  "message": "Followers retrieved successfully",
  "data": [
    {
      "id": 16,
      "name": "John Doe",
      "avatar": "https://...",
      "bio": "Developer",
      "isFollowing": true
    }
  ],
  "pagination": { ... }
}
```

### GET /users/:id/following
Get list of users they follow.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response (200):**
```json
{
  "success": true,
  "message": "Following retrieved successfully",
  "data": [...],
  "pagination": { ... }
}
```

### POST /users/device-token
Register device token for push notifications.

**Request Body:**
```json
{
  "token": "fcm-device-token-here",
  "platform": "android"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Device token registered successfully",
  "data": {
    "token": "fcm-device-token-here",
    "platform": "android"
  }
}
```

### DELETE /users/device-token
Remove device token (on logout).

**Request Body:**
```json
{
  "token": "fcm-device-token-here"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Device token removed successfully"
}
```

---

## 10. Admin Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/statistics` | Admin | Get system stats |
| GET | `/admin/users` | Admin | List all users |
| GET | `/admin/users/pending` | Admin | Get pending users |
| GET | `/admin/users/:id` | Admin | Get user details |
| PUT | `/admin/users/:id/status` | Admin | Update user status |
| PUT | `/admin/users/:id/role` | Admin | Update user role |
| DELETE | `/admin/users/:id` | Admin | Delete user |

### GET /admin/statistics
Get system-wide statistics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 19,
    "pendingUsers": 1,
    "activeUsers": 18,
    "totalCommunities": 4,
    "totalEvents": 5,
    "totalPosts": 2,
    "recentActivities": 0,
    "usersByRole": [
      { "role": "SUPER_ADMIN", "count": 1 },
      { "role": "CONTENT_ADMIN", "count": 1 },
      { "role": "MENTOR", "count": 2 },
      { "role": "FELLOW", "count": 13 },
      { "role": "COMMUNITY_ADMIN", "count": 2 }
    ],
    "usersByStatus": [
      { "status": "ACTIVE", "count": 18 },
      { "status": "PENDING", "count": 1 }
    ]
  }
}
```

---

## 11. Upload Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/upload/status` | Yes | Get upload config status |
| POST | `/upload` | Yes | Upload single file |
| POST | `/upload/multiple` | Yes | Upload multiple files |

### POST /upload
Upload a single file to S3.

**Request:** `multipart/form-data`
- `file` - File to upload

**Response (200):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://bucket.s3.region.amazonaws.com/uploads/file.jpg",
    "key": "uploads/file.jpg",
    "contentType": "image/jpeg",
    "size": 123456
  }
}
```

### POST /upload/multiple
Upload multiple files (max 5).

**Request:** `multipart/form-data`
- `files` - Files to upload (max 5)

**Response (200):**
```json
{
  "success": true,
  "message": "Files uploaded successfully",
  "data": [
    {
      "url": "https://...",
      "key": "uploads/file1.jpg"
    },
    {
      "url": "https://...",
      "key": "uploads/file2.jpg"
    }
  ]
}
```

---

## 12. Discover Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/discover/stats` | No | Get discover statistics |

### GET /discover/stats
Get discover page statistics.

**Response (200):**
```json
{
  "success": true,
  "message": "Discover stats retrieved successfully",
  "data": {
    "stats": {
      "activeUsers": 5,
      "onlineToday": 1,
      "newMatches": 4
    }
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details (only in development)"
}
```

---

## Rate Limiting

- **Auth endpoints:** 5 requests per 15 minutes
- **Upload endpoints:** 10 requests per minute
- **General endpoints:** 100 requests per minute

---

## Database

- **Database:** MySQL 8.0+
- **Driver:** mysql2 (connection pool)
- **No ORM:** Direct SQL queries via models

---

## Test Credentials

```
Email: admin@hmcc.com
Password: password123
Role: SUPER_ADMIN
```

---

## 13. Search Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/search` | Optional | General search |

### GET /search
Search across posts, users, communities, and events.

**Query Parameters:**
- `q` (required) - Search query (min 2 characters)
- `type` (optional) - Filter by type: "posts", "users", "communities", "events"
- `page` (default: 1)
- `limit` (default: 20)

**Response (200):**
```json
{
  "success": true,
  "message": "Search completed successfully",
  "data": {
    "query": "react",
    "results": {
      "posts": {
        "data": [
          {
            "id": 3,
            "content": "Just finished my first React project!",
            "type": "TEXT",
            "author": {
              "id": 21,
              "name": "Student 1",
              "avatar": "https://..."
            },
            "createdAt": "2026-01-01T20:08:55.993Z"
          }
        ],
        "total": 1
      },
      "users": {
        "data": [
          {
            "id": 18,
            "name": "React Developer",
            "avatar": "https://...",
            "bio": "React enthusiast",
            "role": "MENTOR"
          }
        ],
        "total": 1
      },
      "communities": {
        "data": [
          {
            "id": 3,
            "name": "React Community",
            "description": "For React developers",
            "memberCount": 25
          }
        ],
        "total": 1
      },
      "events": {
        "data": [
          {
            "id": 5,
            "title": "React Workshop",
            "description": "Learn React basics",
            "startDate": "2026-02-15T14:00:00.000Z",
            "participantCount": 15
          }
        ],
        "total": 1
      }
    },
    "pagination": {
      "page": 1,
      "limit": 20
    }
  }
}
```

---

**Note:** This documentation is auto-generated based on the current API routes and tested endpoints. All endpoints have been verified to work correctly with the mysql2 migration.
