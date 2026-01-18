const MentorModel = require('../models/mentor.model');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class MentorsController {
  /**
   * Get all mentors
   * GET /api/mentors
   */
  async getMentors(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const { filter } = req.query; // all, available, following

      const where = {};

      if (filter === 'available') {
        where.availability = 'available';
      }
      // Note: 'following' filter would require additional query logic

      const [mentors, total] = await Promise.all([
        MentorModel.findMany({
          where,
          skip,
          take: limit,
          orderBy: { rating: 'desc' },
          include: { followers: true },
          userId: req.user?.id,
        }),
        MentorModel.count({ where }),
      ]);

      const transformedMentors = mentors.map((mentor) => ({
        id: mentor.id.toString(),
        userId: mentor.userId,
        name: mentor.user?.name || mentor.name,
        avatar: mentor.user?.avatar || mentor.avatar,
        title: mentor.title,
        company: mentor.company,
        expertise: mentor.expertise,
        bio: mentor.bio,
        availability: mentor.availability,
        rating: mentor.rating,
        sessionsCompleted: mentor.sessionsCompleted,
        responseTime: mentor.responseTime,
        isFollowing: req.user ? (mentor.followers && mentor.followers.length > 0) : false,
      }));

      return ApiResponse.paginated(
        res,
        'Mentors retrieved successfully',
        transformedMentors,
        { page, limit, total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single mentor
   * GET /api/mentors/:id
   */
  async getMentor(req, res, next) {
    try {
      const mentorId = parseInt(req.params.id);

      const mentor = await MentorModel.findById(mentorId, {
        include: {
          user: true,
          followers: true,
          _count: true,
          sessions: true,
        },
        userId: req.user?.id,
      });

      if (!mentor) {
        return ApiResponse.notFound(res, 'Mentor not found');
      }

      const transformedMentor = {
        id: mentor.id.toString(),
        userId: mentor.userId,
        name: mentor.user?.name,
        avatar: mentor.user?.avatar,
        email: mentor.user?.email,
        title: mentor.title,
        company: mentor.company,
        expertise: mentor.expertise,
        bio: mentor.bio,
        availability: mentor.availability,
        rating: mentor.rating,
        sessionsCompleted: mentor.sessionsCompleted,
        responseTime: mentor.responseTime,
        isFollowing: req.user ? (mentor.followers && mentor.followers.length > 0) : false,
        followerCount: mentor._count?.followers || 0,
        upcomingSessions: mentor.sessions || [],
      };

      return ApiResponse.success(res, 'Mentor retrieved successfully', transformedMentor);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle follow mentor
   * POST /api/mentors/:id/follow
   */
  async toggleFollow(req, res, next) {
    try {
      const mentorId = parseInt(req.params.id);

      const mentor = await MentorModel.findById(mentorId);

      if (!mentor) {
        return ApiResponse.notFound(res, 'Mentor not found');
      }

      // Check if already following
      const existingFollow = await MentorModel.findFollow(req.user.id, mentorId);

      let isFollowing;

      if (existingFollow) {
        // Unfollow
        await MentorModel.deleteFollow(existingFollow.id);
        isFollowing = false;
      } else {
        // Follow
        await MentorModel.createFollow(req.user.id, mentorId);
        isFollowing = true;
      }

      return ApiResponse.success(
        res,
        isFollowing ? 'Mentor followed' : 'Mentor unfollowed',
        { isFollowing }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Book mentor session
   * POST /api/mentors/:id/book
   */
  async bookSession(req, res, next) {
    try {
      const mentorId = parseInt(req.params.id);
      const { title, description, scheduledAt, duration } = req.body;

      const mentor = await MentorModel.findById(mentorId);

      if (!mentor) {
        return ApiResponse.notFound(res, 'Mentor not found');
      }

      if (mentor.availability !== 'available') {
        return ApiResponse.badRequest(res, 'Mentor is not currently available');
      }

      const session = await MentorModel.createSession({
        mentorId,
        menteeId: req.user.id,
        title,
        description,
        scheduledAt: new Date(scheduledAt),
        duration: duration || 60,
        status: 'scheduled',
      });

      logger.info(`Session booked with mentor ${mentorId} by user ${req.user.id}`);

      return ApiResponse.created(res, 'Session booked successfully', session);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update mentor availability (Mentor only)
   * PUT /api/mentors/availability
   */
  async updateAvailability(req, res, next) {
    try {
      const { availability } = req.body;

      if (!['available', 'busy', 'offline'].includes(availability)) {
        return ApiResponse.badRequest(res, 'Invalid availability status');
      }

      const mentor = await MentorModel.findByUserId(req.user.id);

      if (!mentor) {
        return ApiResponse.notFound(res, 'Mentor profile not found');
      }

      const updatedMentor = await MentorModel.updateById(mentor.id, { availability });

      logger.info(`Mentor ${mentor.id} updated availability to ${availability}`);

      return ApiResponse.success(res, 'Availability updated successfully', {
        availability: updatedMentor.availability,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get mentor sessions (Mentor only)
   * GET /api/mentors/sessions
   */
  async getMentorSessions(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const { status } = req.query;

      const mentor = await MentorModel.findByUserId(req.user.id);

      if (!mentor) {
        return ApiResponse.notFound(res, 'Mentor profile not found');
      }

      const where = { mentorId: mentor.id };
      if (status) where.status = status;

      const [sessions, total] = await Promise.all([
        MentorModel.findSessions({
          where,
          skip,
          take: limit,
          orderBy: { scheduledAt: 'desc' },
        }),
        MentorModel.countSessions({ where }),
      ]);

      return ApiResponse.paginated(
        res,
        'Sessions retrieved successfully',
        sessions,
        { page, limit, total }
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MentorsController();
