import { FilterQuery } from 'mongoose';
import { BaseMongoRepository } from './base.repository.js';
import { ProjectModel, IProject } from '../../models/mongo/index.js';
import { QueryOptions, PaginatedResult } from '../../types/query.js';

export class ProjectRepository extends BaseMongoRepository<IProject> {
  constructor() {
    super(ProjectModel, 'projectId');
  }

  public async findProjects(options: QueryOptions & {
    domain?: string;
    difficulty?: string;
    skillId?: string;
    technology?: string;
    mentor?: string;
  }): Promise<PaginatedResult<IProject>> {
    const { domain, difficulty, skillId, technology, mentor, ...base } = options;
    const filter: FilterQuery<IProject> = { ...(base.filter || {}) };

    if (domain) filter.domain = domain;
    if (difficulty) filter.difficulty = difficulty;
    if (skillId) filter.requiredSkillIds = skillId;
    if (technology) filter.technologiesUsed = { $in: [technology] };
    if (mentor) filter.facultyMentor = { $regex: mentor, $options: 'i' };

    return this.findAll({ ...base, filter }, ['title', 'abstract', 'technologiesUsed']);
  }

  /** Find projects that a student is qualified for given their skill set */
  public async findQualifiedProjects(studentSkillIds: string[], limit = 10): Promise<IProject[]> {
    return this.model.aggregate([
      {
        $addFields: {
          matchedSkills: {
            $size: {
              $setIntersection: ['$requiredSkillIds', studentSkillIds],
            },
          },
          totalRequired: { $size: '$requiredSkillIds' },
        },
      },
      {
        $addFields: {
          matchRatio: {
            $cond: [
              { $eq: ['$totalRequired', 0] },
              1,
              { $divide: ['$matchedSkills', '$totalRequired'] },
            ],
          },
        },
      },
      { $match: { matchRatio: { $gte: 0.5 } } },
      { $sort: { matchRatio: -1, difficulty: 1 } },
      { $limit: limit },
    ]).exec();
  }

  // ──────────────────────────────────────────────────────
  // AGGREGATION PIPELINES
  // ──────────────────────────────────────────────────────

  /** Project statistics: domain breakdown, difficulty distribution, avg team size */
  public async getProjectStats(): Promise<any[]> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$domain',
          count: { $sum: 1 },
          avgTeamSize: { $avg: '$maxTeamSize' },
          difficultyBreakdown: {
            $push: '$difficulty',
          },
          mentors: { $addToSet: '$facultyMentor' },
        },
      },
      {
        $project: {
          domain: '$_id',
          count: 1,
          avgTeamSize: { $round: ['$avgTeamSize', 1] },
          mentorCount: { $size: '$mentors' },
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]).exec();
  }

  /** Technology usage across all projects */
  public async getTechnologyUsage(limit = 20): Promise<any[]> {
    return this.model.aggregate([
      { $unwind: '$technologiesUsed' },
      {
        $group: {
          _id: '$technologiesUsed',
          projectCount: { $sum: 1 },
          domains: { $addToSet: '$domain' },
        },
      },
      {
        $project: {
          technology: '$_id',
          projectCount: 1,
          domainCount: { $size: '$domains' },
          _id: 0,
        },
      },
      { $sort: { projectCount: -1 } },
      { $limit: limit },
    ]).exec();
  }

  /** Projects per student participation */
  public async getStudentParticipation(limit = 10): Promise<any[]> {
    return this.model.aggregate([
      {
        $lookup: {
          from: 'students',
          localField: 'projectId',
          foreignField: 'projectIds',
          as: 'participants',
        },
      },
      {
        $project: {
          projectId: 1,
          title: 1,
          domain: 1,
          difficulty: 1,
          participantCount: { $size: '$participants' },
          maxTeamSize: 1,
          utilization: {
            $cond: [
              { $eq: ['$maxTeamSize', 0] },
              0,
              { $divide: [{ $size: '$participants' }, '$maxTeamSize'] },
            ],
          },
        },
      },
      { $sort: { participantCount: -1 } },
      { $limit: limit },
    ]).exec();
  }
}

export const projectRepository = new ProjectRepository();
