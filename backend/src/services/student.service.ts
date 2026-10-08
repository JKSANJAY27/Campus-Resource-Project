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

  async addSkill(studentId: string, skillId: string, level: 'beginner' | 'intermediate' | 'advanced') {
    const skill = await skillRepository.findById(skillId);
    if (!skill) throw Object.assign(new Error(`Skill '${skillId}' not found`), { status: 404 });
    const result = await studentRepository.addOrUpdateSkill(studentId, skillId, level);

    // Propagate relationship to Neo4j, invalidate Redis, and log Cassandra audit record
    syncService.propagateStudentSkillAcquired(studentId, skillId, level).catch(() => {});
    return result;
  }

  async addCompletedCourse(
    studentId: string,
    courseId: string,
    grade: 'A+' | 'A' | 'B+' | 'B' | 'C',
    completedSemester: number
  ) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw Object.assign(new Error(`Course '${courseId}' not found`), { status: 404 });
    const result = await studentRepository.addCompletedCourse(studentId, courseId, grade, completedSemester);

    // Propagate relationship to Neo4j, invalidate Redis, and log Cassandra audit record
    syncService.propagateStudentCourseCompleted(studentId, courseId, grade).catch(() => {});
    return result;
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
}

export const studentService = new StudentService();
