const EventModel = require('../models/event.model');
const CommunityAdminModel = require('../models/communityAdmin.model');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class EventsController {
  /**
   * Get all events
   * GET /api/events
   */
  async getEvents(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const { status, category, communityId } = req.query;

      const where = {};
      if (status) where.status = status;
      if (category) where.category = category;
      if (communityId) where.communityId = parseInt(communityId);

      const [events, total] = await Promise.all([
        EventModel.findMany({
          where,
          skip,
          take: limit,
          orderBy: { date: 'asc' },
          include: {
            community: true,
            _count: true,
            interests: true,
          },
          userId: req.user?.id,
        }),
        EventModel.count({ where }),
      ]);

      const transformedEvents = events.map((event) => ({
        id: event.id.toString(),
        title: event.title,
        description: event.description,
        community: event.community?.name || 'HMCC',
        communityAvatar: event.community?.avatar || null,
        date: event.date instanceof Date ? event.date.toISOString().split('T')[0] : (event.date ? event.date.split('T')[0] : null),
        time: event.time,
        location: event.location,
        image: event.image,
        interested: event._count?.interests || 0,
        isInterested: req.user ? (event.interests && event.interests.length > 0) : false,
        capacity: event.capacity,
        category: event.category,
        status: event.status,
      }));

      return ApiResponse.paginated(
        res,
        'Events retrieved successfully',
        transformedEvents,
        { page, limit, total }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single event
   * GET /api/events/:id
   */
  async getEvent(req, res, next) {
    try {
      const eventId = parseInt(req.params.id);

      const event = await EventModel.findById(eventId, {
        include: {
          community: true,
          schedule: true,
          _count: true,
          interests: true,
        },
        userId: req.user?.id,
      });

      if (!event) {
        return ApiResponse.notFound(res, 'Event not found');
      }

      const transformedEvent = {
        id: event.id.toString(),
        title: event.title,
        description: event.description,
        community: event.community?.name || 'HMCC',
        communityAvatar: event.community?.avatar || null,
        date: event.date instanceof Date ? event.date.toISOString().split('T')[0] : (event.date ? event.date.split('T')[0] : null),
        time: event.time,
        location: event.location,
        image: event.image,
        interested: event._count?.interests || 0,
        isInterested: req.user ? (event.interests && event.interests.length > 0) : false,
        capacity: event.capacity,
        category: event.category,
        status: event.status,
        schedule: event.schedule || [],
      };

      return ApiResponse.success(res, 'Event retrieved successfully', transformedEvent);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create event (Admin or Community Admin)
   * POST /api/events
   */
  async createEvent(req, res, next) {
    try {
      const { title, description, date, time, location, image, capacity, category, communityId, schedule } = req.body;

      // Check permissions
      const isAdmin = ['SUPER_ADMIN', 'CONTENT_ADMIN'].includes(req.user.role);
      let canCreate = isAdmin;

      if (!canCreate && communityId) {
        const communityAdmin = await CommunityAdminModel.findByUserAndCommunity(req.user.id, parseInt(communityId));
        canCreate = !!communityAdmin;
      }

      if (!canCreate) {
        return ApiResponse.forbidden(res, 'You do not have permission to create events');
      }

      const event = await EventModel.create({
        title,
        description,
        date: new Date(date),
        time,
        location,
        image,
        capacity: capacity || 100,
        category: category || 'topluluk',
        communityId: communityId ? parseInt(communityId) : null,
        status: 'UPCOMING',
      });

      // Create schedule items if provided
      if (schedule && schedule.length > 0) {
        await EventModel.createScheduleItems(event.id, schedule);
      }

      logger.info(`Event created: ${event.title} by user ${req.user.id}`);

      return ApiResponse.created(res, 'Event created successfully', event);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update event
   * PUT /api/events/:id
   */
  async updateEvent(req, res, next) {
    try {
      const eventId = parseInt(req.params.id);
      const { title, description, date, time, location, image, capacity, status } = req.body;

      const existingEvent = await EventModel.findById(eventId);

      if (!existingEvent) {
        return ApiResponse.notFound(res, 'Event not found');
      }

      // Check permissions
      const isAdmin = ['SUPER_ADMIN', 'CONTENT_ADMIN'].includes(req.user.role);
      let canUpdate = isAdmin;

      if (!canUpdate && existingEvent.communityId) {
        const communityAdmin = await CommunityAdminModel.findByUserAndCommunity(req.user.id, existingEvent.communityId);
        canUpdate = !!communityAdmin;
      }

      if (!canUpdate) {
        return ApiResponse.forbidden(res, 'You do not have permission to update this event');
      }

      const updateData = {};
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (date) updateData.date = new Date(date);
      if (time) updateData.time = time;
      if (location) updateData.location = location;
      if (image !== undefined) updateData.image = image;
      if (capacity) updateData.capacity = capacity;
      if (status) updateData.status = status;

      const event = await EventModel.update(eventId, updateData);

      logger.info(`Event ${eventId} updated by user ${req.user.id}`);

      return ApiResponse.success(res, 'Event updated successfully', event);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete event
   * DELETE /api/events/:id
   */
  async deleteEvent(req, res, next) {
    try {
      const eventId = parseInt(req.params.id);

      const event = await EventModel.findById(eventId);

      if (!event) {
        return ApiResponse.notFound(res, 'Event not found');
      }

      // Check permissions (same as update)
      const isAdmin = ['SUPER_ADMIN', 'CONTENT_ADMIN'].includes(req.user.role);
      let canDelete = isAdmin;

      if (!canDelete && event.communityId) {
        const communityAdmin = await CommunityAdminModel.findByUserAndCommunity(req.user.id, event.communityId);
        canDelete = !!communityAdmin;
      }

      if (!canDelete) {
        return ApiResponse.forbidden(res, 'You do not have permission to delete this event');
      }

      await EventModel.delete(eventId);

      logger.info(`Event ${eventId} deleted by user ${req.user.id}`);

      return ApiResponse.success(res, 'Event deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle interest in event
   * POST /api/events/:id/interest
   */
  async toggleInterest(req, res, next) {
    try {
      const eventId = parseInt(req.params.id);

      const event = await EventModel.findById(eventId);

      if (!event) {
        return ApiResponse.notFound(res, 'Event not found');
      }

      // Check if already interested
      const existingInterest = await EventModel.findInterest(req.user.id, eventId);

      let isInterested;

      if (existingInterest) {
        // Remove interest
        await EventModel.deleteInterest(existingInterest.id);
        isInterested = false;
      } else {
        // Add interest
        await EventModel.createInterest(req.user.id, eventId);
        isInterested = true;
      }

      // Get updated interest count
      const interestCount = await EventModel.countInterests(eventId);

      return ApiResponse.success(
        res,
        isInterested ? 'Interest marked' : 'Interest removed',
        {
          isInterested,
          interested: interestCount,
        }
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EventsController();
