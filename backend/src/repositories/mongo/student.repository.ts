import { FilterQuery, Types } from 'mongoose';
import { BaseMongoRepository } from './base.repository.js';
import { StudentModel, IStudent } from '../../models/mongo/index.js';
import { QueryOptions, PaginatedResult } from '../../types/query.js';

export class StudentRepository extends BaseMongoRepository<IStudent> {
  constructor() {
    super(StudentModel, 'studentId');
  }

  /** Find student by rollNumber */
  public async findByRollNumber(rollNumber: string): Promise<IStudent | null> {
    return this.model.findOne({ rollNumber }).exec();
  }

  /** Find student by email */
  public async findByEmail(email: string): Promise<IStudent | null> {
    return this.model.findOne({ email }).exec();
  }

  /** Filtered + paginated student list */
  public async findStudents(options: QueryOptions & {
    department?: string;
    semester?: number;
    minCgpa?: number;
    maxCgpa?: number;
    interest?: string;
    skillId?: string;
  }): Promise<PaginatedResult<IStudent>> {
    const { department, semester, minCgpa, maxCgpa, interest, skillId, ...base } = options;
    const filter: FilterQuery<IStudent> = { ...(base.filter || {}) };

    if (department) filter.department = department;
    if (semester) filter.currentSemester = semester;
    if (minCgpa !== undefined || maxCgpa !== undefined) {
      filter.cgpa = {};
      if (minCgpa !== undefined) filter.cgpa.$gte = minCgpa;
      if (maxCgpa !== undefined) filter.cgpa.$lte = maxCgpa;
    }
    if (interest) filter.interests = interest;
    if (skillId) filter['skills.skillId'] = skillId;

    return this.findAll({ ...base, filter }, ['name', 'rollNumber', 'email']);
  }

  /** Add a skill to student (upsert by skillId) */
  public async addOrUpdateSkill(
    studentId: string,
    skillId: string,
    level: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<IStudent | null> {
    // Remove if already exists, then push new entry (maintains single entry per skillId)
    await this.model.updateOne(
      { studentId },
      { $pull: { skills: { skillId } } } as any
    ).exec();

    return this.model.findOneAndUpdate(
      { studentId },
      {
        $push: {
          skills: { skillId, level, acquiredAt: new Date() },
        },
      } as any,
      { new: true, runValidators: true }
    ).exec();
  }

  /** Add a completed course (upsert by courseId) */
  public async addCompletedCourse(
    studentId: string,
    courseId: string,
    grade: 'A+' | 'A' | 'B+' | 'B' | 'C',
    completedSemester: number
  ): Promise<IStudent | null> {
    await this.model.updateOne(
      { studentId },
      { $pull: { completedCourses: { courseId } } } as any
    ).exec();

    return this.model.findOneAndUpdate(
      { studentId },
      {
        $push: {
          completedCourses: { courseId, grade, completedSemester, completedAt: new Date() },
        },
      } as any,
      { new: true, runValidators: true }
    ).exec();
  }

  /** Add project to student */
  public async addProject(studentId: string, projectId: string): Promise<IStudent | null> {
    return this.model.findOneAndUpdate(
      { studentId },
      { $addToSet: { projectIds: projectId } } as any,
      { new: true }
    ).exec();
  }

  /** Add or update club membership */
  public async addClubMembership(
    studentId: string,
    clubId: string,
    role: 'Member' | 'Lead' | 'Coordinator'
  ): Promise<IStudent | null> {
    await this.model.updateOne(
      { studentId },
      { $pull: { clubMemberships: { clubId } } } as any
    ).exec();

    return this.model.findOneAndUpdate(
      { studentId },
      {
        $push: {
          clubMemberships: { clubId, role, joinedAt: new Date() },
        },
      } as any,
      { new: true }
    ).exec();
  }

  /** Record event attendance */
  public async attendEvent(studentId: string, eventId: string): Promise<IStudent | null> {
    return this.model.findOneAndUpdate(
      { studentId },
      { $addToSet: { attendedEventIds: eventId } } as any,
      { new: true }
    ).exec();
  }

  // ──────────────────────────────────────────────────────
  // AGGREGATION PIPELINES
  // ──────────────────────────────────────────────────────

  /** Most active students: ranked by skills + courses + projects + events */
  public async getMostActiveStudents(limit = 10): Promise<any[]> {
    return this.model.aggregate([
      {
        $project: {
          studentId: 1,
          name: 1,
          department: 1,
          cgpa: 1,
          currentSemester: 1,
          skillCount: { $size: '$skills' },
          courseCount: { $size: '$completedCourses' },
          projectCount: { $size: '$projectIds' },
          eventCount: { $size: '$attendedEventIds' },
          clubCount: { $size: '$clubMemberships' },
        },
      },
      {
        $addFields: {
          activityScore: {
            $add: [
              { $multiply: ['$skillCount', 2] },
              { $multiply: ['$courseCount', 3] },
              { $multiply: ['$projectCount', 5] },
              { $multiply: ['$eventCount', 1] },
              { $multiply: ['$clubCount', 2] },
            ],
          },
        },
      },
      { $sort: { activityScore: -1 } },
      { $limit: limit },
    ]).exec();
  }

  /** Skill distribution across all students */
  public async getSkillDistribution(): Promise<any[]> {
    return this.model.aggregate([
      { $unwind: '$skills' },
      {
        $group: {
          _id: { skillId: '$skills.skillId', level: '$skills.level' },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.skillId',
          totalStudents: { $sum: '$count' },
          levelBreakdown: {
            $push: { level: '$_id.level', count: '$count' },
          },
        },
      },
      { $sort: { totalStudents: -1 } },
    ]).exec();
  }

  /** Department-wise student statistics */
  public async getDepartmentStats(): Promise<any[]> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          avgCgpa: { $avg: '$cgpa' },
          avgSkills: { $avg: { $size: '$skills' } },
          avgCourses: { $avg: { $size: '$completedCourses' } },
        },
      },
      {
        $project: {
          department: '$_id',
          count: 1,
          avgCgpa: { $round: ['$avgCgpa', 2] },
          avgSkills: { $round: ['$avgSkills', 1] },
          avgCourses: { $round: ['$avgCourses', 1] },
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]).exec();
  }
}

export const studentRepository = new StudentRepository();
