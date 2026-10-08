import { FilterQuery } from 'mongoose';
import { BaseMongoRepository } from './base.repository.js';
import { JobModel, IJob } from '../../models/mongo/index.js';
import { QueryOptions, PaginatedResult } from '../../types/query.js';

export class JobRepository extends BaseMongoRepository<IJob> {
  constructor() {
    super(JobModel, 'jobId');
  }

  public async findJobs(options: QueryOptions & {
    jobType?: string;
    domain?: string;
    skillId?: string;
    minCgpa?: number;
    company?: string;
    openOnly?: boolean;
  }): Promise<PaginatedResult<IJob>> {
    const { jobType, domain, skillId, minCgpa, company, openOnly, ...base } = options;
    const filter: FilterQuery<IJob> = { ...(base.filter || {}) };

    if (jobType) filter.jobType = jobType;
    if (domain) filter.preferredDomain = domain;
    if (skillId) filter.demandedSkillIds = skillId;
    if (minCgpa !== undefined) filter.minimumCgpa = { $lte: minCgpa }; // CGPA >= minimum
    if (company) filter.company = { $regex: company, $options: 'i' };
    if (openOnly) filter.deadline = { $gte: new Date() };

    return this.findAll({ ...base, filter }, ['title', 'description', 'company']);
  }

  /** Find jobs a student is eligible for given skills and CGPA */
  public async findEligibleJobs(studentSkillIds: string[], cgpa: number): Promise<IJob[]> {
    return this.model.aggregate([
      {
        $match: {
          minimumCgpa: { $lte: cgpa },
          deadline: { $gte: new Date() },
        },
      },
      {
        $addFields: {
          matchedSkills: {
            $size: {
              $setIntersection: ['$demandedSkillIds', studentSkillIds],
            },
          },
          totalRequired: { $size: '$demandedSkillIds' },
        },
      },
      {
        $addFields: {
          matchScore: {
            $cond: [
              { $eq: ['$totalRequired', 0] },
              1,
              { $divide: ['$matchedSkills', '$totalRequired'] },
            ],
          },
        },
      },
      { $match: { matchScore: { $gte: 0.4 } } },
      { $sort: { matchScore: -1, openPositions: -1 } },
    ]).exec();
  }

  /** Find jobs expiring within the next N days */
  public async findExpiringSoon(days = 7): Promise<IJob[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return this.model.find({
      deadline: { $gte: now, $lte: cutoff },
    }).sort({ deadline: 1 }).exec();
  }

  // ──────────────────────────────────────────────────────
  // AGGREGATION PIPELINES
  // ──────────────────────────────────────────────────────

  /** Job market stats: skill demand across open positions */
  public async getSkillDemandStats(limit = 15): Promise<any[]> {
    return this.model.aggregate([
      { $match: { deadline: { $gte: new Date() } } },
      { $unwind: '$demandedSkillIds' },
      {
        $group: {
          _id: '$demandedSkillIds',
          openJobCount: { $sum: 1 },
          totalOpenPositions: { $sum: '$openPositions' },
          companies: { $addToSet: '$company' },
          avgMinCgpa: { $avg: '$minimumCgpa' },
        },
      },
      {
        $project: {
          skillId: '$_id',
          openJobCount: 1,
          totalOpenPositions: 1,
          uniqueCompanies: { $size: '$companies' },
          avgMinCgpa: { $round: ['$avgMinCgpa', 2] },
          _id: 0,
        },
      },
      { $sort: { openJobCount: -1 } },
      { $limit: limit },
    ]).exec();
  }

  /** Company landscape: internship vs full-time breakdown */
  public async getCompanyLandscape(limit = 15): Promise<any[]> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$company',
          totalListings: { $sum: 1 },
          totalPositions: { $sum: '$openPositions' },
          internships: {
            $sum: { $cond: [{ $eq: ['$jobType', 'internship'] }, 1, 0] },
          },
          fullTime: {
            $sum: { $cond: [{ $eq: ['$jobType', 'full_time'] }, 1, 0] },
          },
          avgCgpa: { $avg: '$minimumCgpa' },
          domains: { $addToSet: '$preferredDomain' },
        },
      },
      {
        $project: {
          company: '$_id',
          totalListings: 1,
          totalPositions: 1,
          internships: 1,
          fullTime: 1,
          avgCgpa: { $round: ['$avgCgpa', 2] },
          domainCount: { $size: '$domains' },
          _id: 0,
        },
      },
      { $sort: { totalPositions: -1 } },
      { $limit: limit },
    ]).exec();
  }
}

export const jobRepository = new JobRepository();
