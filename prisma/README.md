# Database Schema Documentation

**Note:** This project has been migrated from Prisma to mysql2 for better hosting compatibility.

## Files in this directory:

- **schema.prisma**: Legacy Prisma schema file (kept for reference only)
  - Contains the complete database schema
  - Use this as documentation for table structures and relationships
  - This file is NO LONGER used by the application

- **seed.js**: Legacy Prisma seed script (kept for reference only)
  - Contains example data and credentials for development
  - Default password for all users: `password123`
  - This script NO LONGER works (requires Prisma)

## Current Database Setup

The application now uses **mysql2** with connection pooling:

- Database connection: `src/config/database.js`
- Models: `src/models/*.model.js`
- Direct SQL queries using mysql2 pool

## Database Tables

Refer to `schema.prisma` for the complete list of tables and their structures:

- **users** - User accounts with roles (SUPER_ADMIN, CONTENT_ADMIN, FELLOW, MENTOR, etc.)
- **fellows** - Fellow-specific profile data
- **mentors** - Mentor-specific profile data
- **communities** - Community information
- **community_admins** - Community administrators
- **events** - Events and activities
- **announcements** - Announcements
- **posts** - Social media posts
- **messages** - Direct messaging
- And more...

## Seed Data Credentials (For Reference)

From the old seed.js file:

- **Super Admin**: admin@hmcc.com / password123
- **Mentor**: ahmet@mentor.com / password123
- **Fellows**: student1@hacettepe.edu.tr - student10@hacettepe.edu.tr / password123

## Migration Status

✅ Core auth system migrated to mysql2
✅ User models migrated
✅ Fellow, Mentor, Community models migrated
⚠️ Other controllers still use Prisma-style code (marked with TODO comments)

Controllers needing migration are marked with:
```javascript
// NOTE: This controller still uses Prisma-style code but needs migration to mysql2 models
```

These controllers will need to be updated when their functionality is actively used.
