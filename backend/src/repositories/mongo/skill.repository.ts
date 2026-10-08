import { FilterQuery } from 'mongoose';
import { BaseMongoRepository } from './base.repository.js';
import { SkillModel, ISkill } from '../../models/mongo/index.js';
import { QueryOptions, PaginatedResult } from '../../types/query.js';

export class SkillRepository extends BaseMongoRepository<ISkill> {
  constructor() {
    super(SkillModel, 'skillId');
  }

  public async findByName(name: string): Promise<ISkill | null> {
    return this.model.findOne({ name: { $regex: `^${name}$`, $options: 'i' } }).exec();
  }

  public async findSkills(options: QueryOptions & {
    category?: string;
    tier?: string;
  }): Promise<PaginatedResult<ISkill>> {
    const { category, tier, ...base } = options;
    const filter: FilterQuery<ISkill> = { ...(base.filter || {}) };

    if (category) filter.category = category;
    if (tier) filter.tier = tier;

    return this.findAll({ ...base, filter }, ['name', 'description']);
  }

  /** Find all direct dependents (skills that list this as prereq) */
  public async findDependents(skillId: string): Promise<ISkill[]> {
    return this.model.find({ prerequisiteSkillIds: skillId }).exec();
  }

  /** Find the full prerequisite tree (BFS, up to 5 levels) */
  public async getPrerequisiteTree(skillId: string): Promise<Record<string, ISkill[]>> {
    const tree: Record<string, ISkill[]> = {};
    let frontier = [skillId];

    for (let depth = 0; depth < 5 && frontier.length > 0; depth++) {
      const skills = await this.model.find({ skillId: { $in: frontier } }).exec();
      const nextFrontier: string[] = [];
      for (const skill of skills) {
        if (skill.prerequisiteSkillIds.length > 0) {
          tree[skill.skillId] = await this.model
            .find({ skillId: { $in: skill.prerequisiteSkillIds } })
            .exec();
          nextFrontier.push(...skill.prerequisiteSkillIds);
        }
      }
      frontier = [...new Set(nextFrontier)].filter((id) => !Object.keys(tree).includes(id));
    }

    return tree;
  }

  // ──────────────────────────────────────────────────────
  // AGGREGATION PIPELINES
  // ──────────────────────────────────────────────────────

  /** Skill demand: how many jobs require each skill */
  public async getSkillDemand(limit = 20): Promise<any[]> {
    return this.model.aggregate([
      {
        $lookup: {
          from: 'jobs',
          localField: 'skillId',
          foreignField: 'demandedSkillIds',
          as: 'demandingJobs',
        },
      },
      {
        $lookup: {
          from: 'courses',
          localField: 'skillId',
          foreignField: 'taughtSkillIds',
          as: 'teachingCourses',
        },
      },
      {
        $lookup: {
          from: 'students',
          localField: 'skillId',
          foreignField: 'skills.skillId',
          as: 'learnedByStudents',
        },
      },
      {
        $project: {
          skillId: 1,
          name: 1,
          category: 1,
          tier: 1,
          jobDemand: { $size: '$demandingJobs' },
          taughtInCourses: { $size: '$teachingCourses' },
          studentCount: { $size: '$learnedByStudents' },
          prerequisiteCount: { $size: '$prerequisiteSkillIds' },
        },
      },
      { $sort: { jobDemand: -1, studentCount: -1 } },
      { $limit: limit },
    ]).exec();
  }

  /** Skill distribution by category and tier */
  public async getCategoryTierMatrix(): Promise<any[]> {
    return this.model.aggregate([
      {
        $group: {
          _id: { category: '$category', tier: '$tier' },
          count: { $sum: 1 },
          skills: { $push: '$name' },
        },
      },
      {
        $group: {
          _id: '$_id.category',
          tiers: {
            $push: {
              tier: '$_id.tier',
              count: '$count',
              skills: '$skills',
            },
          },
          totalSkills: { $sum: '$count' },
        },
      },
      { $sort: { totalSkills: -1 } },
    ]).exec();
  }
}

export const skillRepository = new SkillRepository();
