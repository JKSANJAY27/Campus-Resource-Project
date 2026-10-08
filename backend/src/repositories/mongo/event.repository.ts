import { FilterQuery } from 'mongoose';
import { BaseMongoRepository } from './base.repository.js';
import { EventModel, IEvent } from '../../models/mongo/index.js';
import { QueryOptions, PaginatedResult } from '../../types/query.js';

export class EventRepository extends BaseMongoRepository<IEvent> {
  constructor() {
    super(EventModel, 'eventId');
  }

  public async findEvents(options: QueryOptions & {
    eventType?: string;
    clubId?: string;
    facilityId?: string;
    skillId?: string;
    upcoming?: boolean;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<PaginatedResult<IEvent>> {
    const { eventType, clubId, facilityId, skillId, upcoming, fromDate, toDate, ...base } = options;
    const filter: FilterQuery<IEvent> = { ...(base.filter || {}) };

    if (eventType) filter.eventType = eventType;
    if (clubId) filter.organizingClubId = clubId;
    if (facilityId) filter.venueFacilityId = facilityId;
    if (skillId) filter.targetedSkillIds = skillId;

    const dateFilter: Record<string, Date> = {};
    if (upcoming) dateFilter.$gte = new Date();
    if (fromDate) dateFilter.$gte = fromDate;
    if (toDate) dateFilter.$lte = toDate;
    if (Object.keys(dateFilter).length > 0) filter.eventDate = dateFilter as any;

    return this.findAll({ ...base, filter, sortBy: base.sortBy || 'eventDate', sortOrder: base.sortOrder || 'asc' }, ['title', 'description']);
  }

  /** Register a student for an event (increment count if capacity allows) */
  public async registerStudent(eventId: string): Promise<{ success: boolean; message: string; event?: IEvent }> {
    const event = await this.model.findOne({ eventId }).exec();
    if (!event) return { success: false, message: 'Event not found' };
    if (event.registeredCount >= event.capacity) {
      return { success: false, message: 'Event is at full capacity' };
    }

    const updated = await this.model.findOneAndUpdate(
      { eventId, registeredCount: { $lt: event.capacity } },
      { $inc: { registeredCount: 1 } } as any,
      { new: true }
    ).exec();

    if (!updated) return { success: false, message: 'Registration failed (race condition)' };
    return { success: true, message: 'Registration successful', event: updated };
  }

  // ──────────────────────────────────────────────────────
  // AGGREGATION PIPELINES
  // ──────────────────────────────────────────────────────

  /** Event participation analytics */
  public async getEventParticipation(limit = 20): Promise<any[]> {
    return this.model.aggregate([
      {
        $lookup: {
          from: 'students',
          localField: 'eventId',
          foreignField: 'attendedEventIds',
          as: 'attendees',
        },
      },
      {
        $project: {
          eventId: 1,
          title: 1,
          eventType: 1,
          eventDate: 1,
          capacity: 1,
          registeredCount: 1,
          actualAttendees: { $size: '$attendees' },
          fillRate: {
            $cond: [
              { $eq: ['$capacity', 0] },
              0,
              { $divide: ['$registeredCount', '$capacity'] },
            ],
          },
        },
      },
      { $sort: { actualAttendees: -1 } },
      { $limit: limit },
    ]).exec();
  }

  /** Event type distribution over time */
  public async getTypeDistribution(): Promise<any[]> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          totalRegistrations: { $sum: '$registeredCount' },
          avgCapacity: { $avg: '$capacity' },
          avgFillRate: {
            $avg: {
              $cond: [
                { $eq: ['$capacity', 0] },
                0,
                { $divide: ['$registeredCount', '$capacity'] },
              ],
            },
          },
        },
      },
      {
        $project: {
          eventType: '$_id',
          count: 1,
          totalRegistrations: 1,
          avgCapacity: { $round: ['$avgCapacity', 0] },
          avgFillRate: { $round: [{ $multiply: ['$avgFillRate', 100] }, 1] },
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]).exec();
  }

  /** Monthly event schedule summary */
  public async getMonthlySchedule(): Promise<any[]> {
    return this.model.aggregate([
      {
        $project: {
          year: { $year: '$eventDate' },
          month: { $month: '$eventDate' },
          eventType: 1,
          registeredCount: 1,
        },
      },
      {
        $group: {
          _id: { year: '$year', month: '$month' },
          eventCount: { $sum: 1 },
          totalRegistrations: { $sum: '$registeredCount' },
          eventTypes: { $addToSet: '$eventType' },
        },
      },
      {
        $project: {
          year: '$_id.year',
          month: '$_id.month',
          eventCount: 1,
          totalRegistrations: 1,
          uniqueEventTypes: { $size: '$eventTypes' },
          _id: 0,
        },
      },
      { $sort: { year: -1, month: -1 } },
    ]).exec();
  }
}

export const eventRepository = new EventRepository();
