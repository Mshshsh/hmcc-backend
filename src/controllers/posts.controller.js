const PostModel = require('../models/post.model');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class PostsController {
  /**
   * Get feed (paginated posts)
   * GET /api/posts
   */
  async getFeed(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [posts, total] = await Promise.all([
        PostModel.findMany({
          where: { isPublished: true },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            author: true,
            community: true,
            likes: true,
            _count: true,
          },
          userId: req.user?.id,
        }),
        PostModel.count({ where: { isPublished: true } }),
      ]);

      // Transform posts to include isLiked flag
      const transformedPosts = posts.map((post) => ({
        id: post.id,
        type: post.type,
        content: post.content,
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
        author: post.author,
        community: post.community,
        likes: post._count?.likes || 0,
        comments_count: post._count?.comments || 0,
        isLiked: req.user ? (post.likes && post.likes.length > 0) : false,
        timestamp: post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt,
      }));

      return ApiResponse.paginated(
        res,
        'Feed retrieved successfully',
        transformedPosts,
        { page, limit, total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new post
   * POST /api/posts
   */
  async createPost(req, res, next) {
    try {
      const { content, type, mediaUrl, mediaType, communityId } = req.body;

      const post = await PostModel.create({
        authorId: req.user.id,
        content,
        type: type || 'TEXT',
        mediaUrl,
        mediaType,
        communityId: communityId || null,
        isPublished: true,
      });

      // Fetch the complete post with relations
      const fullPost = await PostModel.findById(post.id, {
        include: { author: true, community: true, _count: true },
      });

      logger.info(`Post created by user ${req.user.id}`);

      const transformedPost = {
        id: fullPost.id,
        type: fullPost.type,
        content: fullPost.content,
        mediaUrl: fullPost.mediaUrl,
        mediaType: fullPost.mediaType,
        author: fullPost.author,
        community: fullPost.community,
        likes: fullPost._count?.likes || 0,
        comments_count: fullPost._count?.comments || 0,
        isLiked: false,
        timestamp: fullPost.createdAt instanceof Date ? fullPost.createdAt.toISOString() : fullPost.createdAt,
      };

      return ApiResponse.created(res, 'Post created successfully', transformedPost);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single post by ID
   * GET /api/posts/:id
   */
  async getPost(req, res, next) {
    try {
      const postId = parseInt(req.params.id);

      const post = await PostModel.findById(postId, {
        include: {
          author: true,
          community: true,
          likes: true,
          comments: true,
          _count: true,
        },
        userId: req.user?.id,
      });

      if (!post) {
        return ApiResponse.notFound(res, 'Post not found');
      }

      // Check if post is published or user is author/admin
      if (!post.isPublished) {
        const isAuthor = post.authorId === req.user?.id;
        const isAdmin = req.user && ['SUPER_ADMIN', 'CONTENT_ADMIN'].includes(req.user.role);

        if (!isAuthor && !isAdmin) {
          return ApiResponse.notFound(res, 'Post not found');
        }
      }

      const transformedPost = {
        id: post.id,
        type: post.type,
        content: post.content,
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
        isPublished: post.isPublished,
        author: post.author,
        community: post.community,
        likes: post._count?.likes || 0,
        comments_count: post._count?.comments || 0,
        isLiked: req.user ? (post.likes && post.likes.length > 0) : false,
        createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt,
        updatedAt: post.updatedAt instanceof Date ? post.updatedAt.toISOString() : post.updatedAt,
      };

      return ApiResponse.success(res, 'Post retrieved successfully', transformedPost);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update post
   * PUT /api/posts/:id
   */
  async updatePost(req, res, next) {
    try {
      const postId = parseInt(req.params.id);
      const { content, type, mediaUrl, mediaType, isPublished } = req.body;

      const post = await PostModel.findById(postId);

      if (!post) {
        return ApiResponse.notFound(res, 'Post not found');
      }

      // Check if user is author or admin
      const isAuthor = post.authorId === req.user.id;
      const isAdmin = ['SUPER_ADMIN', 'CONTENT_ADMIN'].includes(req.user.role);

      if (!isAuthor && !isAdmin) {
        return ApiResponse.forbidden(res, 'You can only update your own posts');
      }

      // Build update data
      const updateData = {};
      if (content !== undefined) updateData.content = content;
      if (type !== undefined) updateData.type = type;
      if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
      if (mediaType !== undefined) updateData.mediaType = mediaType;
      if (isPublished !== undefined) updateData.isPublished = isPublished;

      const updatedPost = await PostModel.update(postId, updateData);

      // Fetch the complete post with relations
      const fullPost = await PostModel.findById(postId, {
        include: { author: true, community: true, _count: true },
        userId: req.user.id,
      });

      logger.info(`Post ${postId} updated by user ${req.user.id}`);

      const transformedPost = {
        id: fullPost.id,
        type: fullPost.type,
        content: fullPost.content,
        mediaUrl: fullPost.mediaUrl,
        mediaType: fullPost.mediaType,
        isPublished: fullPost.isPublished,
        author: fullPost.author,
        community: fullPost.community,
        likes: fullPost._count?.likes || 0,
        comments_count: fullPost._count?.comments || 0,
        isLiked: fullPost.likes && fullPost.likes.length > 0,
        createdAt: fullPost.createdAt instanceof Date ? fullPost.createdAt.toISOString() : fullPost.createdAt,
        updatedAt: fullPost.updatedAt instanceof Date ? fullPost.updatedAt.toISOString() : fullPost.updatedAt,
      };

      return ApiResponse.success(res, 'Post updated successfully', transformedPost);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete post
   * DELETE /api/posts/:id
   */
  async deletePost(req, res, next) {
    try {
      const postId = parseInt(req.params.id);

      const post = await PostModel.findById(postId);

      if (!post) {
        return ApiResponse.notFound(res, 'Post not found');
      }

      // Check if user is author or admin
      const isAuthor = post.authorId === req.user.id;
      const isAdmin = ['SUPER_ADMIN', 'CONTENT_ADMIN'].includes(req.user.role);

      if (!isAuthor && !isAdmin) {
        return ApiResponse.forbidden(res, 'You can only delete your own posts');
      }

      await PostModel.delete(postId);

      logger.info(`Post ${postId} deleted by user ${req.user.id}`);

      return ApiResponse.success(res, 'Post deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle like on post
   * POST /api/posts/:id/like
   */
  async toggleLike(req, res, next) {
    try {
      const postId = parseInt(req.params.id);

      const post = await PostModel.findById(postId);

      if (!post) {
        return ApiResponse.notFound(res, 'Post not found');
      }

      // Check if already liked
      const existingLike = await PostModel.findLike(req.user.id, postId);

      let isLiked;

      if (existingLike) {
        // Unlike
        await PostModel.deleteLike(existingLike.id);
        isLiked = false;
      } else {
        // Like
        await PostModel.createLike(req.user.id, postId);
        isLiked = true;
      }

      // Get updated like count
      const likeCount = await PostModel.countLikes(postId);

      return ApiResponse.success(res, isLiked ? 'Post liked' : 'Post unliked', {
        isLiked,
        likes: likeCount,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get post comments
   * GET /api/posts/:id/comments
   */
  async getComments(req, res, next) {
    try {
      const postId = parseInt(req.params.id);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [comments, total] = await Promise.all([
        PostModel.findComments(postId, {
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { user: true },
        }),
        PostModel.countComments(postId),
      ]);

      const transformedComments = comments.map((comment) => ({
        id: comment.id,
        post_id: comment.postId,
        user_id: comment.user?.id,
        user_name: comment.user?.name,
        user_avatar: comment.user?.avatar,
        content: comment.content,
        created_at: comment.createdAt instanceof Date ? comment.createdAt.toISOString() : comment.createdAt,
      }));

      return ApiResponse.paginated(
        res,
        'Comments retrieved successfully',
        transformedComments,
        { page, limit, total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create comment
   * POST /api/posts/:id/comments
   */
  async createComment(req, res, next) {
    try {
      const postId = parseInt(req.params.id);
      const { content } = req.body;

      const post = await PostModel.findById(postId);

      if (!post) {
        return ApiResponse.notFound(res, 'Post not found');
      }

      const comment = await PostModel.createComment({
        postId,
        userId: req.user.id,
        content,
      });

      const transformedComment = {
        id: comment.id,
        post_id: comment.postId,
        user_id: comment.user?.id,
        user_name: comment.user?.name,
        user_avatar: comment.user?.avatar,
        content: comment.content,
        created_at: comment.createdAt instanceof Date ? comment.createdAt.toISOString() : comment.createdAt,
      };

      return ApiResponse.created(res, 'Comment added successfully', transformedComment);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete comment
   * DELETE /api/posts/:postId/comments/:commentId
   */
  async deleteComment(req, res, next) {
    try {
      const commentId = parseInt(req.params.commentId);

      const comment = await PostModel.findCommentById(commentId);

      if (!comment) {
        return ApiResponse.notFound(res, 'Comment not found');
      }

      // Check if user is comment author or admin
      const isAuthor = comment.userId === req.user.id;
      const isAdmin = ['SUPER_ADMIN', 'CONTENT_ADMIN'].includes(req.user.role);

      if (!isAuthor && !isAdmin) {
        return ApiResponse.forbidden(res, 'You can only delete your own comments');
      }

      await PostModel.deleteComment(commentId);

      return ApiResponse.success(res, 'Comment deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PostsController();
