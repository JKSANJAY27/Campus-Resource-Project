import { FilterQuery } from 'mongoose';
import { BaseMongoRepository } from './base.repository.js';
import { ResourceModel, IResource } from '../../models/mongo/index.js';
import { QueryOptions, PaginatedResult } from '../../types/query.js';

export class ResourceRepository extends BaseMongoRepository<IResource> {
  constructor() {
    super(ResourceModel, 'resourceId');
  }

  public async findResources(options: QueryOptions & {
    resourceType?: string;
    difficulty?: string;
    skillId?: string;
    minRating?: number;
  }): Promise<PaginatedResult<IResource>> {
    const { resourceType, difficulty, skillId, minRating, ...base } = options;
    const filter: FilterQuery<IResource> = { ...(base.filter || {}) };

    if (resourceType) filter.resourceType = resourceType;
    if (difficulty) filter.difficulty = difficulty;
    if (skillId) filter.taughtSkillIds = skillId;
    if (minRating !== undefined) filter.rating = { $gte: minRating };

    return this.findAll({ ...base, filter }, ['title']);
  }

  /** Increment access count when a resource is viewed */
  public async incrementAccessCount(resourceId: string): Promise<void> {
    await this.model.updateOne({ resourceId }, { $inc: { accessCount: 1 } } as any).exec();
  }

  /** Update rating for a resource (simple setter — could average in production) */
  public async updateRating(resourceId: string, rating: number): Promise<IResource | null> {
    return this.model.findOneAndUpdate(
      { resourceId },
      { $set: { rating } },
      { new: true, runValidators: true }
    ).exec();
  }

  // ──────────────────────────────────────────────────────
  // AGGREGATION PIPELINES
  // ──────────────────────────────────────────────────────

  /** Popular resources: ranked by access count and rating */
  public async getPopularResources(limit = 10): Promise<any[]> {
    return this.model.aggregate([
      {
        $project: {
          resourceId: 1,
          title: 1,
          resourceType: 1,
          difficulty: 1,
          rating: 1,
          accessCount: 1,
          skillCount: { $size: '$taughtSkillIds' },
          popularityScore: {
            $add: [
              { $multiply: ['$accessCount', 0.6] },
              { $multiply: ['$rating', 8] },
            ],
          },
        },
      },
      { $sort: { popularityScore: -1 } },
      { $limit: limit },
    ]).exec();
  }

  /** Resource type distribution with average ratings */
  public async getTypeDistribution(): Promise<any[]> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$resourceType',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          totalAccesses: { $sum: '$accessCount' },
          avgDuration: { $avg: '$durationMinutes' },
        },
      },
      {
        $project: {
          resourceType: '$_id',
          count: 1,
          avgRating: { $round: ['$avgRating', 2] },
          totalAccesses: 1,
          avgDurationMinutes: { $round: ['$avgDuration', 0] },
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]).exec();
  }

  /** Skill coverage: which skills have most resources */
  public async getSkillCoverage(limit = 20): Promise<any[]> {
    return this.model.aggregate([
      { $unwind: '$taughtSkillIds' },
      {
        $group: {
          _id: '$taughtSkillIds',
          resourceCount: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          totalAccesses: { $sum: '$accessCount' },
          types: { $addToSet: '$resourceType' },
        },
      },
      {
        $project: {
          skillId: '$_id',
          resourceCount: 1,
          avgRating: { $round: ['$avgRating', 2] },
          totalAccesses: 1,
          typeVariety: { $size: '$types' },
          _id: 0,
        },
      },
      { $sort: { resourceCount: -1 } },
      { $limit: limit },
    ]).exec();
  }
}

export const resourceRepository = new ResourceRepository();
