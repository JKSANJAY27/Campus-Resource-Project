import { FilterQuery } from 'mongoose';
import { BaseMongoRepository } from './base.repository.js';
import { CourseModel, ICourse } from '../../models/mongo/index.js';
import { QueryOptions, PaginatedResult } from '../../types/query.js';

export class CourseRepository extends BaseMongoRepository<ICourse> {
  constructor() {
    super(CourseModel, 'courseId');
  }

  public async findByCode(code: string): Promise<ICourse | null> {
    return this.model.findOne({ code }).exec();
  }

  public async findCourses(options: QueryOptions & {
    department?: string;
    difficulty?: string;
    skillId?: string;
  }): Promise<PaginatedResult<ICourse>> {
    const { department, difficulty, skillId, ...base } = options;
    const filter: FilterQuery<ICourse> = { ...(base.filter || {}) };

    if (department) filter.department = department;
    if (difficulty) filter.difficulty = difficulty;
    if (skillId) filter.taughtSkillIds = skillId;

    return this.findAll({ ...base, filter }, ['title', 'code', 'description']);
  }

  /** Find courses that teach a specific set of skills */
  public async findBySkills(skillIds: string[]): Promise<ICourse[]> {
    return this.model.find({ taughtSkillIds: { $in: skillIds } }).exec();
  }

  /** Get prerequisite chain for a course */
  public async getPrerequisiteChain(courseId: string): Promise<ICourse[]> {
    const course = await this.findById(courseId);
    if (!course || course.prerequisiteCourseIds.length === 0) return [];
    return this.model.find({ courseId: { $in: course.prerequisiteCourseIds } }).exec();
  }

  // ──────────────────────────────────────────────────────
  // AGGREGATION PIPELINES
  // ──────────────────────────────────────────────────────

  /** Course popularity: based on student enrolment counts */
  public async getCoursePopularity(limit = 10): Promise<any[]> {
    // Join with students who have completed each course
    return this.model.aggregate([
      {
        $lookup: {
          from: 'students',
          localField: 'courseId',
          foreignField: 'completedCourses.courseId',
          as: 'enrolledStudents',
        },
      },
      {
        $project: {
          courseId: 1,
          code: 1,
          title: 1,
          department: 1,
          difficulty: 1,
          credits: 1,
          enrollmentCount: { $size: '$enrolledStudents' },
          skillCount: { $size: '$taughtSkillIds' },
        },
      },
      { $sort: { enrollmentCount: -1 } },
      { $limit: limit },
    ]).exec();
  }

  /** Department course distribution */
  public async getDepartmentDistribution(): Promise<any[]> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$department',
          totalCourses: { $sum: 1 },
          totalCredits: { $sum: '$credits' },
          difficultyBreakdown: {
            $push: '$difficulty',
          },
          avgCredits: { $avg: '$credits' },
        },
      },
      {
        $project: {
          department: '$_id',
          totalCourses: 1,
          totalCredits: 1,
          avgCredits: { $round: ['$avgCredits', 2] },
          _id: 0,
        },
      },
      { $sort: { totalCourses: -1 } },
    ]).exec();
  }

  /** Skills taught per course (with skill info) */
  public async getCourseSkillMatrix(limit = 20): Promise<any[]> {
    return this.model.aggregate([
      { $match: { taughtSkillIds: { $exists: true, $not: { $size: 0 } } } },
      {
        $project: {
          courseId: 1,
          code: 1,
          title: 1,
          department: 1,
          skillCount: { $size: '$taughtSkillIds' },
          taughtSkillIds: 1,
        },
      },
      { $sort: { skillCount: -1 } },
      { $limit: limit },
    ]).exec();
  }
}

export const courseRepository = new CourseRepository();
