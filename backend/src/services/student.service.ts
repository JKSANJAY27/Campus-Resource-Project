/**
 * StudentService
 * Business logic layer between HTTP controllers and the student repository.
 * Handles validation, cross-entity concerns, error shaping, and multi-store synchronization.
 */

import { studentRepository } from '../repositories/mongo/student.repository.js';
import { courseRepository } from '../repositories/mongo/course.repository.js';
import { skillRepository } from '../repositories/mongo/skill.repository.js';
import { clubRepository } from '../repositories/mongo/club.repository.js';
import { eventRepository } from '../repositories/mongo/event.repository.js';
import { syncService } from './sync.service.js';
import { cacheService } from './cache.service.js';
import { activityService } from './activity.service.js';
import { QueryOptions } from '../types/query.js';

export class StudentService {
  // ── CRUD ───────────────────────────────────────────────

  async createStudent(data: Record<string, any>) {
    // Prevent duplicate email / rollNumber at service layer (before DB unique-index error)
    const [emailExists, rollExists] = await Promise.all([
      studentRepository.findByEmail(data.email),
      studentRepository.findByRollNumber(data.rollNumber),
    ]);
    if (emailExists) throw Object.assign(new Error('Email already registered'), { status: 409 });
    if (rollExists) throw Object.assign(new Error('Roll number already registered'), { status: 409 });

    const student = await studentRepository.create(data);
    // Propagate new student node into Neo4j
    syncService.propagateStudentUpdate(student.studentId).catch(() => {});
    return student;
  }

  async getStudent(studentId: string) {
    const student = await studentRepository.findById(studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });
    return student;
  }

  async listStudents(options: QueryOptions & Record<string, any>) {
    return studentRepository.findStudents(options);
  }

  async updateStudent(studentId: string, data: Record<string, any>) {
    const student = await studentRepository.update(studentId, data);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });
    // Propagate student entity update to Neo4j, Redis, and Cassandra
    syncService.propagateStudentUpdate(studentId).catch(() => {});
    return student;
  }

  async deleteStudent(studentId: string) {
    const deleted = await studentRepository.delete(studentId);
    if (!deleted) throw Object.assign(new Error('Student not found'), { status: 404 });
    cacheService.invalidateStudentCache(studentId).catch(() => {});
    return { deleted: true };
  }

  // ── SUB-DOCUMENT OPERATIONS (RELATIONSHIP PROPAGATION) ────

  async addSkill(
    studentId: string,
    skillId: string,
    level: 'beginner' | 'intermediate' | 'advanced',
    competenceType: 'self_reported' | 'course_exposure' | 'project_demonstrated' | 'verified' = 'self_reported',
    evidenceDescription?: string
  ) {
    const skill = await skillRepository.findById(skillId);
    if (!skill) throw Object.assign(new Error(`Skill '${skillId}' not found`), { status: 404 });
    const result = await studentRepository.addOrUpdateSkill(
      studentId,
      skillId,
      level,
      competenceType,
      evidenceDescription
    );

    // Propagate relationship to Neo4j, invalidate Redis, and log Cassandra audit record
    syncService.propagateStudentSkillAcquired(studentId, skillId, level).catch(() => {});
    cacheService.invalidateStudentCache(studentId).catch(() => {});
    return result;
  }

  async removeSkill(studentId: string, skillId: string) {
    const student = await studentRepository.findById(studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

    const result = await studentRepository.removeSkill(studentId, skillId);
    cacheService.invalidateStudentCache(studentId).catch(() => {});
    return result;
  }

  /**
   * Records a completed course.
   * Course records map to taught skills: adds them as 'course_exposure' (introductory evidence)
   * without overwriting existing higher-level self-reported or project-demonstrated competence.
   */
  async addCompletedCourse(
    studentId: string,
    courseId: string,
    grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'In Progress' | string = 'A',
    completedSemester: number = 1,
    status: 'completed' | 'in_progress' | 'planned' = 'completed'
  ) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw Object.assign(new Error(`Course '${courseId}' not found`), { status: 404 });

    const student = await studentRepository.findById(studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

    // 1. Record completed course
    const result = await studentRepository.addCompletedCourse(
      studentId,
      courseId,
      grade,
      completedSemester,
      status
    );

    // 2. Map course to taught skills as course_exposure evidence (does NOT imply full professional mastery)
    if (course.taughtSkillIds && course.taughtSkillIds.length > 0) {
      const existingSkillMap = new Map((student.skills || []).map((s) => [s.skillId, s]));

      for (const taughtSkillId of course.taughtSkillIds) {
        const existing = existingSkillMap.get(taughtSkillId);
        // Only set course_exposure if student doesn't already have verified or project demonstrated skill
        if (!existing) {
          await studentRepository.addOrUpdateSkill(
            studentId,
            taughtSkillId,
            'beginner',
            'course_exposure',
            `Course exposure via ${course.code} - ${course.title}`
          );
          syncService.propagateStudentSkillAcquired(studentId, taughtSkillId, 'beginner').catch(() => {});
        }
      }
    }

    // 3. Propagate relationship to Neo4j, invalidate Redis
    syncService.propagateStudentCourseCompleted(studentId, courseId, grade as any).catch(() => {});
    cacheService.invalidateStudentCache(studentId).catch(() => {});
    return result;
  }

  async removeCompletedCourse(studentId: string, courseId: string) {
    const student = await studentRepository.findById(studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

    const result = await studentRepository.removeCompletedCourse(studentId, courseId);
    cacheService.invalidateStudentCache(studentId).catch(() => {});
    return result;
  }

  /**
   * Record custom student project and tag demonstrated skills
   */
  async addOrUpdateCustomProject(
    studentId: string,
    project: {
      projectId?: string;
      title: string;
      description?: string;
      technologiesUsed: string[];
      skillsDemonstrated: string[];
      role?: string;
      link?: string;
    }
  ) {
    const student = await studentRepository.findById(studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

    const projectId = project.projectId || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullProject = {
      projectId,
      title: project.title,
      description: project.description || '',
      technologiesUsed: project.technologiesUsed || [],
      skillsDemonstrated: project.skillsDemonstrated || [],
      role: project.role || 'Contributor',
      link: project.link || '',
    };

    const result = await studentRepository.addOrUpdateCustomProject(studentId, fullProject);

    // Skills demonstrated in a project receive 'project_demonstrated' competence level
    for (const skillId of fullProject.skillsDemonstrated) {
      await studentRepository.addOrUpdateSkill(
        studentId,
        skillId,
        'intermediate',
        'project_demonstrated',
        `Demonstrated in project: ${fullProject.title}`
      );
      syncService.propagateStudentSkillAcquired(studentId, skillId, 'intermediate').catch(() => {});
    }

    cacheService.invalidateStudentCache(studentId).catch(() => {});
    return result;
  }

  async removeCustomProject(studentId: string, projectId: string) {
    const student = await studentRepository.findById(studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

    const result = await studentRepository.removeCustomProject(studentId, projectId);
    cacheService.invalidateStudentCache(studentId).catch(() => {});
    return result;
  }

  /**
   * Comprehensive Onboarding & Multi-Step Profile Synchronization
   * Safely merges profile information without overwriting existing data.
   */
  async onboardOrUpdateStudent(studentId: string, data: Record<string, any>) {
    let student = await studentRepository.findById(studentId);

    // If student doesn't exist yet, create initial document
    if (!student) {
      const email = data.email || `${studentId.toLowerCase()}@campus.edu`;
      const rollNumber = data.rollNumber || `ROLL-${studentId}`;
      student = await studentRepository.create({
        studentId,
        name: data.name || 'New Student',
        email,
        rollNumber,
        department: data.department || data.branch || 'Computer Science & Engineering',
        degree: data.degree || 'B.Tech',
        branch: data.branch || data.department || 'Computer Science & Engineering',
        institution: data.institution || 'Campus Institute of Technology',
        graduationYear: data.graduationYear || 2026,
        currentSemester: data.currentSemester || 4,
        cgpa: data.cgpa !== undefined ? data.cgpa : 8.0,
        interests: data.interests || [],
        careerInterests: data.careerInterests || [],
        preferredLocations: data.preferredLocations || [],
        workArrangement: data.workArrangement || 'any',
        roleLevelPreference: data.roleLevelPreference || 'any',
        skills: [],
        completedCourses: [],
        projectIds: [],
        customProjects: [],
        certifications: data.certifications || [],
      });
    } else {
      // Update top-level details without losing subdocuments
      const topLevelFields = [
        'name',
        'email',
        'department',
        'degree',
        'branch',
        'institution',
        'graduationYear',
        'currentSemester',
        'cgpa',
        'interests',
        'careerInterests',
        'preferredLocations',
        'workArrangement',
        'roleLevelPreference',
        'certifications',
      ];

      const updates: Record<string, any> = {};
      for (const field of topLevelFields) {
        if (data[field] !== undefined) {
          updates[field] = data[field];
        }
      }

      if (Object.keys(updates).length > 0) {
        student = (await studentRepository.update(studentId, updates)) || student;
      }
    }

    // Process courses if provided in payload
    if (Array.isArray(data.completedCourses)) {
      for (const courseItem of data.completedCourses) {
        const cId = typeof courseItem === 'string' ? courseItem : courseItem.courseId;
        const grade = typeof courseItem === 'object' && courseItem.grade ? courseItem.grade : 'A';
        const sem = typeof courseItem === 'object' && courseItem.completedSemester ? courseItem.completedSemester : (student?.currentSemester || 1);
        const status = typeof courseItem === 'object' && courseItem.status ? courseItem.status : 'completed';
        if (cId) {
          await this.addCompletedCourse(studentId, cId, grade, sem, status);
        }
      }
    }

    // Process skills if provided in payload
    if (Array.isArray(data.skills)) {
      for (const skillItem of data.skills) {
        const skId = typeof skillItem === 'string' ? skillItem : skillItem.skillId;
        const level = typeof skillItem === 'object' && skillItem.level ? skillItem.level : 'intermediate';
        const competenceType = typeof skillItem === 'object' && skillItem.competenceType ? skillItem.competenceType : 'self_reported';
        const evidenceDesc = typeof skillItem === 'object' ? skillItem.evidenceDescription : undefined;
        if (skId) {
          await this.addSkill(studentId, skId, level, competenceType, evidenceDesc);
        }
      }
    }

    // Process custom projects if provided in payload
    if (Array.isArray(data.customProjects)) {
      for (const proj of data.customProjects) {
        if (proj.title) {
          await this.addOrUpdateCustomProject(studentId, proj);
        }
      }
    }

    // Return fresh updated profile
    const refreshed = await studentRepository.findById(studentId);
    syncService.propagateStudentUpdate(studentId).catch(() => {});
    cacheService.invalidateStudentCache(studentId).catch(() => {});
    return refreshed;
  }

  /**
   * Generates a detailed profile summary with competence tier breakdown
   */
  async getProfileSummary(studentId: string) {
    const student = await studentRepository.findById(studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

    const skills = student.skills || [];
    const courseExposureSkills = skills.filter((s) => s.competenceType === 'course_exposure');
    const selfReportedSkills = skills.filter((s) => s.competenceType === 'self_reported' || !s.competenceType);
    const projectDemonstratedSkills = skills.filter((s) => s.competenceType === 'project_demonstrated');
    const verifiedSkills = skills.filter((s) => s.competenceType === 'verified');

    return {
      studentId: student.studentId,
      name: student.name,
      rollNumber: student.rollNumber,
      email: student.email,
      department: student.department,
      degree: student.degree || 'B.Tech',
      branch: student.branch || student.department,
      institution: student.institution || 'Campus Institute of Technology',
      graduationYear: student.graduationYear || 2026,
      currentSemester: student.currentSemester,
      cgpa: student.cgpa,
      interests: student.interests || [],
      careerInterests: student.careerInterests || [],
      preferredLocations: student.preferredLocations || [],
      workArrangement: student.workArrangement || 'any',
      roleLevelPreference: student.roleLevelPreference || 'any',
      completedCoursesCount: (student.completedCourses || []).length,
      completedCourses: student.completedCourses || [],
      totalSkillsCount: skills.length,
      competenceBreakdown: {
        courseExposure: {
          count: courseExposureSkills.length,
          skills: courseExposureSkills,
          description: 'Skills introduced through completed coursework curriculum',
        },
        selfReported: {
          count: selfReportedSkills.length,
          skills: selfReportedSkills,
          description: 'Skills reported by the student with self-assessed proficiency',
        },
        projectDemonstrated: {
          count: projectDemonstratedSkills.length,
          skills: projectDemonstratedSkills,
          description: 'Skills validated and proven through delivered projects',
        },
        verified: {
          count: verifiedSkills.length,
          skills: verifiedSkills,
          description: 'Skills verified via external certifications or formal assessments',
        },
      },
      customProjects: student.customProjects || [],
      certifications: student.certifications || [],
      updatedAt: student.updatedAt,
    };
  }

  async joinClub(studentId: string, clubId: string, role: 'Member' | 'Lead' | 'Coordinator') {
    const club = await clubRepository.findById(clubId);
    if (!club) throw Object.assign(new Error(`Club '${clubId}' not found`), { status: 404 });

    const result = await studentRepository.addClubMembership(studentId, clubId, role);
    await clubRepository.adjustMemberCount(clubId, 1);

    // Propagate club membership to Neo4j and invalidate Redis
    syncService.propagateStudentClubJoined(studentId, clubId, role).catch(() => {});
    return result;
  }

  async attendEvent(studentId: string, eventId: string) {
    const student = await studentRepository.findById(studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

    const regResult = await eventRepository.registerStudent(eventId);
    if (!regResult.success) throw Object.assign(new Error(regResult.message), { status: 409 });

    const result = await studentRepository.attendEvent(studentId, eventId);

    // Propagate event attendance to Neo4j and Cassandra
    syncService.propagateStudentEventAttended(studentId, eventId).catch(() => {});
    return result;
  }

  // ── ANALYTICS ─────────────────────────────────────────

  async getMostActiveStudents(limit = 10) {
    return studentRepository.getMostActiveStudents(limit);
  }

  async getSkillDistribution() {
    return studentRepository.getSkillDistribution();
  }

  async getDepartmentStats() {
    return studentRepository.getDepartmentStats();
  }

  // ── CAREER PERSISTENCE & SAVED STATES ─────────────────

  async saveJob(studentId: string, jobId: string) {
    const student = await studentRepository.findById(studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

    const result = await studentRepository.saveJob(studentId, jobId);
    cacheService.invalidateStudentCache(studentId).catch(() => {});
    activityService
      .recordEvent({
        studentId,
        actionType: 'open_job_listing',
        targetEntityType: 'job',
        targetEntityId: jobId,
        metadataJson: JSON.stringify({ action: 'saved_job' }),
      })
      .catch(() => {});
    return result;
  }

  async removeSavedJob(studentId: string, jobId: string) {
    const student = await studentRepository.findById(studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

    const result = await studentRepository.removeSavedJob(studentId, jobId);
    cacheService.invalidateStudentCache(studentId).catch(() => {});
    return result;
  }

  async getSavedJobs(studentId: string) {
    const student = await studentRepository.findById(studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });
    return studentRepository.getSavedJobs(studentId);
  }

  async saveRole(studentId: string, roleId: string) {
    const student = await studentRepository.findById(studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

    const result = await studentRepository.saveRole(studentId, roleId);
    cacheService.invalidateStudentCache(studentId).catch(() => {});
    activityService
      .recordEvent({
        studentId,
        actionType: 'view_career_role',
        targetEntityType: 'role',
        targetEntityId: roleId,
        metadataJson: JSON.stringify({ action: 'saved_role' }),
      })
      .catch(() => {});
    return result;
  }

  async removeSavedRole(studentId: string, roleId: string) {
    const student = await studentRepository.findById(studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

    const result = await studentRepository.removeSavedRole(studentId, roleId);
    cacheService.invalidateStudentCache(studentId).catch(() => {});
    return result;
  }

  async getSavedRoles(studentId: string) {
    const student = await studentRepository.findById(studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });
    return studentRepository.getSavedRoles(studentId);
  }

  async completeLearningMilestone(
    studentId: string,
    milestoneId: string,
    roleId?: string,
    metadata?: Record<string, any>
  ) {
    const student = await studentRepository.findById(studentId);
    if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

    cacheService.invalidateStudentCache(studentId).catch(() => {});
    await activityService
      .recordEvent({
        studentId,
        actionType: 'complete_learning_milestone',
        targetEntityType: 'milestone',
        targetEntityId: milestoneId,
        metadataJson: JSON.stringify({ roleId, ...metadata }),
      })
      .catch(() => {});

    return { success: true, milestoneId, completedAt: new Date() };
  }
}

export const studentService = new StudentService();
