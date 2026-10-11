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

  /** Add a skill to student (upsert by skillId with competence type) */
  public async addOrUpdateSkill(
    studentId: string,
    skillId: string,
    level: 'beginner' | 'intermediate' | 'advanced',
    competenceType: 'self_reported' | 'course_exposure' | 'project_demonstrated' | 'verified' = 'self_reported',
    evidenceDescription?: string
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
          skills: {
            skillId,
            level,
            competenceType,
            evidenceDescription,
            acquiredAt: new Date(),
          },
        },
      } as any,
      { new: true, runValidators: true }
    ).exec();
  }

  /** Remove a skill from student */
  public async removeSkill(studentId: string, skillId: string): Promise<IStudent | null> {
    return this.model.findOneAndUpdate(
      { studentId },
      { $pull: { skills: { skillId } } } as any,
      { new: true }
    ).exec();
  }

  /** Add a completed course (upsert by courseId) */
  public async addCompletedCourse(
    studentId: string,
    courseId: string,
    grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'In Progress' | string = 'A',
    completedSemester: number = 1,
    status: 'completed' | 'in_progress' | 'planned' = 'completed'
  ): Promise<IStudent | null> {
    await this.model.updateOne(
      { studentId },
      { $pull: { completedCourses: { courseId } } } as any
    ).exec();

    return this.model.findOneAndUpdate(
      { studentId },
      {
        $push: {
          completedCourses: {
            courseId,
            grade,
            completedSemester,
            status,
            completedAt: new Date(),
          },
        },
      } as any,
      { new: true, runValidators: true }
    ).exec();
  }

  /** Remove completed course */
  public async removeCompletedCourse(studentId: string, courseId: string): Promise<IStudent | null> {
    return this.model.findOneAndUpdate(
      { studentId },
      { $pull: { completedCourses: { courseId } } } as any,
      { new: true }
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

  /** Add or update custom project */
  public async addOrUpdateCustomProject(
    studentId: string,
    project: {
      projectId: string;
      title: string;
      description?: string;
      technologiesUsed: string[];
      skillsDemonstrated: string[];
      role?: string;
      link?: string;
    }
  ): Promise<IStudent | null> {
    await this.model.updateOne(
      { studentId },
      { $pull: { customProjects: { projectId: project.projectId } } } as any
    ).exec();

    return this.model.findOneAndUpdate(
      { studentId },
      {
        $push: {
          customProjects: {
            ...project,
            createdAt: new Date(),
          },
        },
      } as any,
      { new: true }
    ).exec();
  }

  /** Remove custom project */
  public async removeCustomProject(studentId: string, projectId: string): Promise<IStudent | null> {
    return this.model.findOneAndUpdate(
      { studentId },
      { $pull: { customProjects: { projectId } } } as any,
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

  /** Save a career pathway for the student (upsert by roleId) */
  public async savePathway(
    studentId: string,
    roleId: string,
    roleTitle: string,
    notes?: string
  ): Promise<IStudent | null> {
    // Remove any existing entry for this roleId first
    await this.model.updateOne(
      { studentId },
      { $pull: { savedPathways: { roleId } } } as any
    ).exec();

    return this.model.findOneAndUpdate(
      { studentId },
      {
        $push: {
          savedPathways: {
            roleId,
            roleTitle,
            savedAt: new Date(),
            ...(notes ? { notes } : {}),
          },
        },
      } as any,
      { new: true }
    ).exec();
  }

  /** Remove a saved pathway by roleId */
  public async removeSavedPathway(studentId: string, roleId: string): Promise<IStudent | null> {
    return this.model.findOneAndUpdate(
      { studentId },
      { $pull: { savedPathways: { roleId } } } as any,
      { new: true }
    ).exec();
  }

  /** Retrieve saved pathways for a student */
  public async getSavedPathways(studentId: string): Promise<IStudent['savedPathways']> {
    const student = await this.model.findOne({ studentId }, { savedPathways: 1 }).exec();
    return student?.savedPathways ?? [];
  }

  /** Save a job for the student */
  public async saveJob(studentId: string, jobId: string): Promise<IStudent | null> {
    return this.model.findOneAndUpdate(
      { studentId },
      { $addToSet: { savedJobIds: jobId } } as any,
      { new: true }
    ).exec();
  }

  /** Remove a saved job */
  public async removeSavedJob(studentId: string, jobId: string): Promise<IStudent | null> {
    return this.model.findOneAndUpdate(
      { studentId },
      { $pull: { savedJobIds: jobId } } as any,
      { new: true }
    ).exec();
  }

  /** Get saved jobs for a student */
  public async getSavedJobs(studentId: string): Promise<string[]> {
    const student = await this.model.findOne({ studentId }, { savedJobIds: 1 }).lean().exec();
    return (student as any)?.savedJobIds ?? [];
  }

  /** Save a career role for the student */
  public async saveRole(studentId: string, roleId: string): Promise<IStudent | null> {
    return this.model.findOneAndUpdate(
      { studentId },
      { $addToSet: { savedRoleIds: roleId } } as any,
      { new: true }
    ).exec();
  }

  /** Remove a saved career role */
  public async removeSavedRole(studentId: string, roleId: string): Promise<IStudent | null> {
    return this.model.findOneAndUpdate(
      { studentId },
      { $pull: { savedRoleIds: roleId } } as any,
      { new: true }
    ).exec();
  }

  /** Get saved career roles for a student */
  public async getSavedRoles(studentId: string): Promise<string[]> {
    const student = await this.model.findOne({ studentId }, { savedRoleIds: 1 }).lean().exec();
    return (student as any)?.savedRoleIds ?? [];
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
