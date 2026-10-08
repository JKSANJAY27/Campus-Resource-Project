import { FilterQuery } from 'mongoose';
import { BaseMongoRepository } from './base.repository.js';
import { FacilityModel, IFacility } from '../../models/mongo/index.js';
import { QueryOptions, PaginatedResult } from '../../types/query.js';

export class FacilityRepository extends BaseMongoRepository<IFacility> {
  constructor() {
    super(FacilityModel, 'facilityId');
  }

  public async findFacilities(options: QueryOptions & {
    facilityType?: string;
    building?: string;
    minCapacity?: number;
  }): Promise<PaginatedResult<IFacility>> {
    const { facilityType, building, minCapacity, ...base } = options;
    const filter: FilterQuery<IFacility> = { ...(base.filter || {}) };

    if (facilityType) filter.facilityType = facilityType;
    if (building) filter.building = { $regex: building, $options: 'i' };
    if (minCapacity !== undefined) filter.capacity = { $gte: minCapacity };

    return this.findAll({ ...base, filter }, ['name']);
  }

  /** Find facilities large enough to host an event */
  public async findAvailableForEvent(requiredCapacity: number): Promise<IFacility[]> {
    return this.model
      .find({ capacity: { $gte: requiredCapacity } })
      .sort({ capacity: 1 })
      .exec();
  }

  // ──────────────────────────────────────────────────────
  // AGGREGATION PIPELINES
  // ──────────────────────────────────────────────────────

  /** Facility usage: how many events are hosted per facility */
  public async getFacilityUsage(): Promise<any[]> {
    return this.model.aggregate([
      {
        $lookup: {
          from: 'events',
          localField: 'facilityId',
          foreignField: 'venueFacilityId',
          as: 'hostedEvents',
        },
      },
      {
        $project: {
          facilityId: 1,
          name: 1,
          building: 1,
          facilityType: 1,
          capacity: 1,
          eventCount: { $size: '$hostedEvents' },
          totalAttendees: { $sum: '$hostedEvents.registeredCount' },
        },
      },
      { $sort: { eventCount: -1 } },
    ]).exec();
  }

  /** Facility type summary */
  public async getTypeSummary(): Promise<any[]> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$facilityType',
          count: { $sum: 1 },
          totalCapacity: { $sum: '$capacity' },
          avgCapacity: { $avg: '$capacity' },
          buildings: { $addToSet: '$building' },
        },
      },
      {
        $project: {
          facilityType: '$_id',
          count: 1,
          totalCapacity: 1,
          avgCapacity: { $round: ['$avgCapacity', 0] },
          buildingCount: { $size: '$buildings' },
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]).exec();
  }
}

export const facilityRepository = new FacilityRepository();
