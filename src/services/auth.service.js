const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const UserModel = require('../models/user.model');
const FellowModel = require('../models/fellow.model');
const MentorModel = require('../models/mentor.model');
const CommunityModel = require('../models/community.model');
const CommunityAdminModel = require('../models/communityAdmin.model');

class AuthService {
  /**
   * Generate JWT tokens
   */
  generateTokens(userId) {
    const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    });

    return { accessToken, refreshToken };
  }

  /**
   * Hash password
   */
  async hashPassword(password) {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    return await bcrypt.hash(password, rounds);
  }

  /**
   * Compare password
   */
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Register new user
   */
  async register(data) {
    const { name, email, password, role, ...additionalData } = data;

    // Email domain validation
    const emailDomain = email.split('@')[1];

    // Fellows, Community Admins, and USERs must use @hacettepe.edu.tr email
    if ((role === 'FELLOW' || role === 'COMMUNITY_ADMIN' || role === 'USER') && emailDomain !== 'hacettepe.edu.tr') {
      throw new Error('Fellows, Community Admins, and Users must register with @hacettepe.edu.tr email address');
    }

    // Mentors can use any email (for company emails)
    // No restriction for mentors

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Get connection for transaction
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Create base user
      const newUser = await UserModel.create({
        name,
        email,
        password: hashedPassword,
        role: role || 'FELLOW',
        status: 'PENDING', // Needs approval
      });

      // Create role-specific record
      if (role === 'MENTOR') {
        await MentorModel.create({
          userId: newUser.id,
          title: additionalData.title,
          company: additionalData.company || '',
          expertise: additionalData.expertise || [],
          bio: additionalData.bio || '',
          experience: additionalData.experience || '',
        });
      } else if (role === 'COMMUNITY_ADMIN') {
        // Create community for community admin
        const community = await CommunityModel.create({
          name: additionalData.communityName,
          slug: additionalData.communityName.toLowerCase().replace(/\s+/g, '-'),
          description: additionalData.bio || '',
          category: additionalData.category || 'Social',
          status: 'PENDING',
        });

        await CommunityAdminModel.create({
          userId: newUser.id,
          communityId: community.id,
          role: 'admin',
        });
      } else if (role === 'FELLOW') {
        await FellowModel.create({
          userId: newUser.id,
          team: additionalData.team || null,
          department: additionalData.department || null,
          bio: additionalData.bio || null,
          interests: additionalData.interests || [],
        });
      }

      await connection.commit();

      // Generate tokens
      const tokens = this.generateTokens(newUser.id);

      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser;

      return {
        user: userWithoutPassword,
        ...tokens,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Login user
   */
  async login(email, password) {
    // Find user
    const user = await UserModel.findByEmail(email);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isValidPassword = await this.comparePassword(password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Check if account is active
    if (user.status === 'PENDING') {
      throw new Error('PENDING_APPROVAL');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error('Account is not active. Please contact administrator.');
    }

    // Update last login
    await UserModel.update(user.id, { lastLogin: new Date() });

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId) {
    const user = await UserModel.findById(userId, {
      include: {
        fellow: true,
        mentor: true,
        communityAdmins: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Remove password from response
    delete user.password;

    return user;
  }

  /**
   * Update profile
   */
  async updateProfile(userId, data) {
    const user = await UserModel.findById(userId, {
      include: { fellow: true, mentor: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Update user data
    await UserModel.update(userId, {
      name: data.name || user.name,
      avatar: data.avatar !== undefined ? data.avatar : user.avatar,
    });

    // Update role-specific data
    if (user.role === 'FELLOW' && user.fellow) {
      await FellowModel.update(userId, {
        bio: data.bio !== undefined ? data.bio : user.fellow.bio,
        team: data.team !== undefined ? data.team : user.fellow.team,
        department: data.department !== undefined ? data.department : user.fellow.department,
        interests: data.interests !== undefined ? data.interests : user.fellow.interests,
      });
    } else if (user.role === 'MENTOR' && user.mentor) {
      await MentorModel.update(userId, {
        bio: data.bio !== undefined ? data.bio : user.mentor.bio,
        title: data.title !== undefined ? data.title : user.mentor.title,
        company: data.company !== undefined ? data.company : user.mentor.company,
        expertise: data.expertise !== undefined ? data.expertise : user.mentor.expertise,
      });
    }

    return this.getCurrentUser(userId);
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      const user = await UserModel.findById(decoded.userId);

      if (!user || user.status !== 'ACTIVE') {
        throw new Error('Invalid refresh token');
      }

      const tokens = this.generateTokens(user.id);
      return tokens;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Generate password reset token
   */
  generateResetToken(userId) {
    return jwt.sign({ userId, type: 'reset' }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
  }

  /**
   * Forgot password - generate reset token
   */
  async forgotPassword(email) {
    const user = await UserModel.findByEmail(email);

    if (!user) {
      // Return success even if user not found (security best practice)
      return { success: true };
    }

    const resetToken = this.generateResetToken(user.id);

    // Store reset token in database
    await db.execute(
      `INSERT INTO password_resets (userId, token, expiresAt, createdAt)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR), NOW())
       ON DUPLICATE KEY UPDATE token = ?, expiresAt = DATE_ADD(NOW(), INTERVAL 1 HOUR)`,
      [user.id, resetToken, resetToken]
    );

    // TODO: Send email with reset link
    // For now, return the token (in production, only send via email)
    return {
      success: true,
      message: 'Password reset email sent successfully',
      // Remove this in production - only for development/testing
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type !== 'reset') {
        throw new Error('Invalid reset token');
      }

      // Check if token exists in database and not expired
      const [resets] = await db.execute(
        'SELECT * FROM password_resets WHERE userId = ? AND token = ? AND expiresAt > NOW()',
        [decoded.userId, token]
      );

      if (resets.length === 0) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password
      await UserModel.update(decoded.userId, { password: hashedPassword });

      // Delete used reset token
      await db.execute('DELETE FROM password_resets WHERE userId = ?', [decoded.userId]);

      return { success: true, message: 'Password reset successful' };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new Error('Invalid or expired reset token');
      }
      throw error;
    }
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await UserModel.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await this.comparePassword(currentPassword, user.password);

    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password
    await UserModel.update(userId, { password: hashedPassword });

    return { success: true, message: 'Password changed successfully' };
  }
}

module.exports = new AuthService();
