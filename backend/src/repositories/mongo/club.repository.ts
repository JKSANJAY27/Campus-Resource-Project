import { FilterQuery } from 'mongoose';
import { BaseMongoRepository } from './base.repository.js';
import { ClubModel, IClub } from '../../models/mongo/index.js';
import { QueryOptions, PaginatedResult } from '../../types/query.js';

export class ClubRepository extends BaseMongoRepository<IClub> {
  constructor() {
    super(ClubModel, 'clubId');
  }

  public async findByName(name: string): Promise<IClub | null> {
    return this.model.findOne({ name: { $regex: `^${name}$`, $options: 'i' } }).exec();
  }

  public async findClubs(options: QueryOptions & {
    category?: string;
  }): Promise<PaginatedResult<IClub>> {
    const { category, ...base } = options;
    const filter: FilterQuery<IClub> = { ...(base.filter || {}) };

    if (category) filter.category = category;

    return this.findAll({ ...base, filter }, ['name', 'description']);
  }

  /** Update member count (e.g., after student joins/leaves) */
  public async adjustMemberCount(clubId: string, delta: 1 | -1): Promise<void> {
    await this.model.updateOne(
      { clubId },
      { $inc: { activeMemberCount: delta } } as any
    ).exec();
  }

  // ──────────────────────────────────────────────────────
  // AGGREGATION PIPELINES
  // ──────────────────────────────────────────────────────

  /** Club activity: member count, event count, avg event attendance */
  public async getClubActivity(): Promise<any[]> {
    return this.model.aggregate([
      {
        $lookup: {
          from: 'events',
          localField: 'clubId',
          foreignField: 'organizingClubId',
          as: 'events',
        },
      },
      {
        $project: {
          clubId: 1,
          name: 1,
          category: 1,
          activeMemberCount: 1,
          eventCount: { $size: '$events' },
          totalEventCapacity: { $sum: '$events.capacity' },
          totalRegistrations: { $sum: '$events.registeredCount' },
        },
      },
      { $sort: { activeMemberCount: -1 } },
    ]).exec();
  }

  /** Category distribution */
  public async getCategoryBreakdown(): Promise<any[]> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalMembers: { $sum: '$activeMemberCount' },
          avgMembers: { $avg: '$activeMemberCount' },
        },
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          totalMembers: 1,
          avgMembers: { $round: ['$avgMembers', 0] },
          _id: 0,
        },
      },
      { $sort: { totalMembers: -1 } },
    ]).exec();
  }
}

export const clubRepository = new ClubRepository();
