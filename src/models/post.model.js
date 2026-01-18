const db = require('../config/database');

/**
 * Post Model
 * Handles posts, likes, and comments
 */
class PostModel {
  // ==================== POST CRUD ====================

  static async findById(id, options = {}) {
    const { include = {} } = options;

    const [posts] = await db.execute('SELECT * FROM posts WHERE id = ?', [id]);

    if (posts.length === 0) return null;

    const post = posts[0];

    // Include relations if requested
    if (include.author) {
      const [authors] = await db.execute(
        'SELECT id, name, avatar FROM users WHERE id = ?',
        [post.authorId]
      );
      post.author = authors[0] || null;
    }

    if (include.community) {
      if (post.communityId) {
        const [communities] = await db.execute(
          'SELECT id, name, avatar FROM communities WHERE id = ?',
          [post.communityId]
        );
        post.community = communities[0] || null;
      } else {
        post.community = null;
      }
    }

    if (include._count) {
      const [[likeCount]] = await db.execute(
        'SELECT COUNT(*) as count FROM likes WHERE postId = ?',
        [id]
      );
      const [[commentCount]] = await db.execute(
        'SELECT COUNT(*) as count FROM comments WHERE postId = ?',
        [id]
      );

      post._count = {
        likes: likeCount.count,
        comments: commentCount.count,
      };
    }

    // Check if user liked this post
    if (include.likes && options.userId) {
      const [userLikes] = await db.execute(
        'SELECT id FROM likes WHERE postId = ? AND userId = ?',
        [id, options.userId]
      );
      post.likes = userLikes;
    }

    return post;
  }

  static async findMany(options = {}) {
    const { where = {}, skip = 0, take = 20, orderBy = {}, include = {} } = options;

    let query = 'SELECT * FROM posts';
    const params = [];
    const conditions = [];

    if (where.isPublished !== undefined) {
      conditions.push('isPublished = ?');
      params.push(where.isPublished);
    }

    if (where.authorId) {
      conditions.push('authorId = ?');
      params.push(where.authorId);
    }

    if (where.communityId !== undefined) {
      if (where.communityId === null) {
        conditions.push('communityId IS NULL');
      } else if (where.communityId.not !== undefined && where.communityId.not === null) {
        conditions.push('communityId IS NOT NULL');
      } else {
        conditions.push('communityId = ?');
        params.push(where.communityId);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Order by
    if (orderBy.createdAt) {
      query += ` ORDER BY createdAt ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(take, skip);

    const [posts] = await db.execute(query, params);

    // Include relations
    for (const post of posts) {
      if (include.author) {
        const [authors] = await db.execute(
          'SELECT id, name, avatar FROM users WHERE id = ?',
          [post.authorId]
        );
        post.author = authors[0] || null;
      }

      if (include.community) {
        if (post.communityId) {
          const [communities] = await db.execute(
            'SELECT id, name, avatar FROM communities WHERE id = ?',
            [post.communityId]
          );
          post.community = communities[0] || null;
        } else {
          post.community = null;
        }
      }

      if (include._count) {
        const [[likeCount]] = await db.execute(
          'SELECT COUNT(*) as count FROM likes WHERE postId = ?',
          [post.id]
        );
        const [[commentCount]] = await db.execute(
          'SELECT COUNT(*) as count FROM comments WHERE postId = ?',
          [post.id]
        );

        post._count = {
          likes: likeCount.count,
          comments: commentCount.count,
        };
      }

      if (include.likes && options.userId) {
        const [userLikes] = await db.execute(
          'SELECT id FROM likes WHERE postId = ? AND userId = ?',
          [post.id, options.userId]
        );
        post.likes = userLikes;
      }
    }

    return posts;
  }

  static async count(options = {}) {
    const { where = {} } = options;

    let query = 'SELECT COUNT(*) as count FROM posts';
    const params = [];
    const conditions = [];

    if (where.isPublished !== undefined) {
      conditions.push('isPublished = ?');
      params.push(where.isPublished);
    }

    if (where.authorId) {
      conditions.push('authorId = ?');
      params.push(where.authorId);
    }

    if (where.communityId !== undefined) {
      if (where.communityId.not !== undefined && where.communityId.not === null) {
        conditions.push('communityId IS NOT NULL');
      } else if (where.communityId === null) {
        conditions.push('communityId IS NULL');
      } else {
        conditions.push('communityId = ?');
        params.push(where.communityId);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const [[result]] = await db.execute(query, params);
    return result.count;
  }

  static async create(data) {
    const {
      authorId,
      content,
      type = 'TEXT',
      mediaUrl = null,
      mediaType = null,
      communityId = null,
      isPublished = true,
    } = data;

    const [result] = await db.execute(
      `INSERT INTO posts (authorId, content, type, mediaUrl, mediaType, communityId, isPublished, viewCount, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [authorId, content, type, mediaUrl, mediaType, communityId, isPublished]
    );

    return await this.findById(result.insertId);
  }

  static async update(id, data) {
    const fields = [];
    const params = [];

    if (data.content !== undefined) {
      fields.push('content = ?');
      params.push(data.content);
    }
    if (data.type !== undefined) {
      fields.push('type = ?');
      params.push(data.type);
    }
    if (data.mediaUrl !== undefined) {
      fields.push('mediaUrl = ?');
      params.push(data.mediaUrl);
    }
    if (data.mediaType !== undefined) {
      fields.push('mediaType = ?');
      params.push(data.mediaType);
    }
    if (data.isPublished !== undefined) {
      fields.push('isPublished = ?');
      params.push(data.isPublished);
    }

    if (fields.length === 0) {
      return await this.findById(id);
    }

    fields.push('updatedAt = NOW()');
    params.push(id);

    await db.execute(
      `UPDATE posts SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    return await this.findById(id);
  }

  static async delete(id) {
    await db.execute('DELETE FROM posts WHERE id = ?', [id]);
    return { id };
  }

  // ==================== LIKE OPERATIONS ====================

  static async findLike(userId, postId) {
    const [likes] = await db.execute(
      'SELECT * FROM likes WHERE userId = ? AND postId = ?',
      [userId, postId]
    );
    return likes.length > 0 ? likes[0] : null;
  }

  static async createLike(userId, postId) {
    await db.execute(
      'INSERT INTO likes (userId, postId, createdAt) VALUES (?, ?, NOW())',
      [userId, postId]
    );
    return { userId, postId };
  }

  static async deleteLike(id) {
    await db.execute('DELETE FROM likes WHERE id = ?', [id]);
    return { id };
  }

  static async countLikes(postId) {
    const [[result]] = await db.execute(
      'SELECT COUNT(*) as count FROM likes WHERE postId = ?',
      [postId]
    );
    return result.count;
  }

  // ==================== COMMENT OPERATIONS ====================

  static async findComments(postId, options = {}) {
    const { skip = 0, take = 20 } = options;

    const [comments] = await db.execute(
      `SELECT c.*, u.id as userId, u.name as userName, u.avatar as userAvatar
       FROM comments c
       LEFT JOIN users u ON c.userId = u.id
       WHERE c.postId = ?
       ORDER BY c.createdAt DESC
       LIMIT ? OFFSET ?`,
      [postId, take, skip]
    );

    return comments.map((comment) => ({
      id: comment.id,
      userId: comment.userId,
      postId: comment.postId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: {
        id: comment.userId,
        name: comment.userName,
        avatar: comment.userAvatar,
      },
    }));
  }

  static async countComments(postId) {
    const [[result]] = await db.execute(
      'SELECT COUNT(*) as count FROM comments WHERE postId = ?',
      [postId]
    );
    return result.count;
  }

  static async createComment(data) {
    const { userId, postId, content } = data;

    const [result] = await db.execute(
      `INSERT INTO comments (userId, postId, content, createdAt, updatedAt)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [userId, postId, content]
    );

    const [comments] = await db.execute(
      `SELECT c.*, u.id as userId, u.name as userName, u.avatar as userAvatar
       FROM comments c
       LEFT JOIN users u ON c.userId = u.id
       WHERE c.id = ?`,
      [result.insertId]
    );

    const comment = comments[0];
    return {
      id: comment.id,
      userId: comment.userId,
      postId: comment.postId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: {
        id: comment.userId,
        name: comment.userName,
        avatar: comment.userAvatar,
      },
    };
  }

  static async findCommentById(id) {
    const [comments] = await db.execute('SELECT * FROM comments WHERE id = ?', [id]);
    return comments.length > 0 ? comments[0] : null;
  }

  static async deleteComment(id) {
    await db.execute('DELETE FROM comments WHERE id = ?', [id]);
    return { id };
  }
}

module.exports = PostModel;
