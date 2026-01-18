const db = require('../config/database');
const UserModel = require('../models/user.model');
const ActivityModel = require('../models/activity.model');
const CommunityModel = require('../models/community.model');
const EventModel = require('../models/event.model');
const PostModel = require('../models/post.model');

/**
 * Get system statistics
 */
const getStatistics = async (req, res) => {
  try {
    const [
      totalUsers,
      pendingUsers,
      activeUsers,
      totalCommunities,
      totalEvents,
      totalPosts,
      recentActivities,
    ] = await Promise.all([
      // Total users
      UserModel.count(),
      // Pending approval users
      UserModel.count({ status: 'PENDING' }),
      // Active users
      UserModel.count({ status: 'ACTIVE' }),
      // Total communities
      CommunityModel.count(),
      // Total events
      EventModel.count(),
      // Total posts
      PostModel.count(),
      // Recent activities (last 7 days)
      ActivityModel.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // User role distribution
    const [usersByRoleRows] = await db.execute(
      'SELECT role, COUNT(*) as count FROM users GROUP BY role'
    );

    // User status distribution
    const [usersByStatusRows] = await db.execute(
      'SELECT status, COUNT(*) as count FROM users GROUP BY status'
    );

    res.json({
      success: true,
      data: {
        totalUsers,
        pendingUsers,
        activeUsers,
        totalCommunities,
        totalEvents,
        totalPosts,
        recentActivities,
        usersByRole: usersByRoleRows.map(item => ({
          role: item.role,
          count: item.count,
        })),
        usersByStatus: usersByStatusRows.map(item => ({
          status: item.status,
          count: item.count,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınırken bir hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get all users with filters
 */
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build query
    let query = `
      SELECT u.id, u.email, u.name, u.avatar, u.role, u.status, u.createdAt, u.updatedAt, u.lastLogin,
             f.team as fellowTeam, f.department as fellowDepartment,
             m.title as mentorTitle, m.company as mentorCompany,
             a.department as adminDepartment
      FROM users u
      LEFT JOIN fellows f ON u.id = f.userId
      LEFT JOIN mentors m ON u.id = m.userId
      LEFT JOIN admins a ON u.id = a.userId
    `;

    const params = [];
    const conditions = [];

    if (role) {
      conditions.push('u.role = ?');
      params.push(role);
    }

    if (status) {
      conditions.push('u.status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Add ORDER BY
    const validSortFields = ['createdAt', 'name', 'email', 'status', 'role'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY u.${sortField} ${sortDir}`;

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(take, skip);

    const [users] = await db.execute(query, params);

    // Count total
    let countQuery = 'SELECT COUNT(*) as total FROM users u';
    const countParams = [];

    if (role || status || search) {
      const countConditions = [];
      if (role) {
        countConditions.push('u.role = ?');
        countParams.push(role);
      }
      if (status) {
        countConditions.push('u.status = ?');
        countParams.push(status);
      }
      if (search) {
        countConditions.push('(u.name LIKE ? OR u.email LIKE ?)');
        countParams.push(`%${search}%`, `%${search}%`);
      }
      if (countConditions.length > 0) {
        countQuery += ' WHERE ' + countConditions.join(' AND ');
      }
    }

    const [[countResult]] = await db.execute(countQuery, countParams);
    const total = countResult.total;

    // Format users response
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin,
      fellow: user.fellowTeam || user.fellowDepartment ? {
        team: user.fellowTeam,
        department: user.fellowDepartment,
      } : null,
      mentor: user.mentorTitle || user.mentorCompany ? {
        title: user.mentorTitle,
        company: user.mentorCompany,
      } : null,
      admin: user.adminDepartment ? {
        department: user.adminDepartment,
      } : null,
    }));

    res.json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          total,
          page: parseInt(page),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcılar alınırken bir hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get pending users
 */
const getPendingUsers = async (req, res) => {
  try {
    const [pendingUsers] = await db.execute(`
      SELECT u.id, u.email, u.name, u.avatar, u.role, u.status, u.createdAt,
             f.team, f.department, f.studentId
      FROM users u
      LEFT JOIN fellows f ON u.id = f.userId
      WHERE u.status = 'PENDING'
      ORDER BY u.createdAt DESC
    `);

    const formattedUsers = pendingUsers.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      fellow: user.team || user.department || user.studentId ? {
        team: user.team,
        department: user.department,
        studentId: user.studentId,
      } : null,
    }));

    res.json({
      success: true,
      data: formattedUsers,
    });
  } catch (error) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({
      success: false,
      message: 'Bekleyen kullanıcılar alınırken bir hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get user by ID
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get user with all relations
    const user = await UserModel.findById(parseInt(id), {
      include: { fellow: true, mentor: true, communityAdmins: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    // Get admin profile if exists
    const [adminProfile] = await db.execute(
      'SELECT * FROM admins WHERE userId = ?',
      [parseInt(id)]
    );
    user.admin = adminProfile[0] || null;

    // Get recent posts
    const [posts] = await db.execute(
      'SELECT * FROM posts WHERE authorId = ? ORDER BY createdAt DESC LIMIT 5',
      [parseInt(id)]
    );
    user.posts = posts;

    // Get recent activities
    const activities = await ActivityModel.findMany({
      where: { userId: parseInt(id) },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
    user.activities = activities;

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı alınırken bir hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Update user status
 */
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz durum değeri',
      });
    }

    const user = await UserModel.update(parseInt(id), { status });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    // Log activity
    await ActivityModel.create({
      userId: req.user.id,
      action: 'update_user_status',
      description: `Kullanıcı durumu güncellendi: ${user.email} -> ${status}`,
      metadata: {
        targetUserId: user.id,
        newStatus: status,
      },
    });

    res.json({
      success: true,
      message: 'Kullanıcı durumu güncellendi',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı durumu güncellenirken bir hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Update user role
 */
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = [
      'SUPER_ADMIN',
      'CONTENT_ADMIN',
      'USER_ADMIN',
      'ANALYTICS_ADMIN',
      'MENTOR',
      'FELLOW',
      'COMMUNITY_ADMIN',
      'USER',
    ];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz rol değeri',
      });
    }

    // Only SUPER_ADMIN can change roles to admin roles
    const adminRoles = ['SUPER_ADMIN', 'CONTENT_ADMIN', 'USER_ADMIN', 'ANALYTICS_ADMIN'];
    if (adminRoles.includes(role) && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Sadece SUPER_ADMIN admin rolleri atayabilir',
      });
    }

    const user = await UserModel.update(parseInt(id), { role });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    // Log activity
    await ActivityModel.create({
      userId: req.user.id,
      action: 'update_user_role',
      description: `Kullanıcı rolü güncellendi: ${user.email} -> ${role}`,
      metadata: {
        targetUserId: user.id,
        newRole: role,
      },
    });

    res.json({
      success: true,
      message: 'Kullanıcı rolü güncellendi',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı rolü güncellenirken bir hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Delete user
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Kendi hesabınızı silemezsiniz',
      });
    }

    const user = await UserModel.findById(parseInt(id));

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    // Only SUPER_ADMIN can delete other admins
    const adminRoles = ['SUPER_ADMIN', 'CONTENT_ADMIN', 'USER_ADMIN', 'ANALYTICS_ADMIN'];
    if (adminRoles.includes(user.role) && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Sadece SUPER_ADMIN diğer adminleri silebilir',
      });
    }

    await UserModel.delete(parseInt(id));

    // Log activity
    await ActivityModel.create({
      userId: req.user.id,
      action: 'delete_user',
      description: `Kullanıcı silindi: ${user.email}`,
      metadata: {
        deletedUserId: user.id,
        deletedUserEmail: user.email,
      },
    });

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı silinirken bir hata oluştu',
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getPendingUsers,
  getStatistics,
};
