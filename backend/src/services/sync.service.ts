import { syncNeo4jRepository } from '../repositories/neo4j/sync.neo4j.repository.js';
import { cacheService } from './cache.service.js';
import { activityService } from './activity.service.js';
import {
  StudentModel,
  CourseModel,
  SkillModel,
  ProjectModel,
  JobModel,
  ClubModel,
  EventModel,
  ResourceModel,
  FacilityModel,
} from '../models/mongo/index.js';

export interface SyncFailureRecord {
  entityType: string;
  entityId: string;
  action: string;
  errorMessage: string;
  timestamp: string;
  retryCount: number;
}

export interface SyncStatusReport {
  lastSyncTime: string;
  status: 'idle' | 'syncing' | 'completed' | 'degraded';
  recordsProcessed: number;
  successes: number;
  failures: number;
  retryQueueLength: number;
  retries: SyncFailureRecord[];
  stores: {
    mongodb: string;
    neo4j: string;
    redis: string;
    cassandra: string;
  };
  consistencyModel: {
    type: string;
    primarySourceOfTruth: string;
    graphPropagation: string;
    cachePolicy: string;
    auditLog: string;
  };
}

export class SyncService {
  private lastSyncTime: string = new Date().toISOString();
  private status: 'idle' | 'syncing' | 'completed' | 'degraded' = 'idle';
  private recordsProcessed: number = 0;
  private successes: number = 0;
  private failures: number = 0;
  private retryQueue: SyncFailureRecord[] = [];

  // ==========================================================================
  // 1. Initial / Full Multi-Store Synchronization
  // ==========================================================================

  /**
   * Executes an idempotent full synchronization pass:
   * 1. Reads all entity documents from MongoDB (Primary Source of Truth)
   * 2. Synchronizes corresponding nodes & edges into Neo4j using idempotent MERGE
   * 3. Flushes ephemeral Redis caches
   * 4. Logs a synchronization audit checkpoint into Cassandra
   */
  public async performFullSync(): Promise<{
    processed: number;
    successes: number;
    failures: number;
    durationMs: number;
  }> {
    const start = performance.now();
    this.status = 'syncing';
    let processed = 0;
    let successful = 0;
    let failed = 0;

    try {
      // 1. Sync Skills
      const skills = await SkillModel.find().lean().exec();
      for (const sk of skills) {
        processed++;
        try {
          await syncNeo4jRepository.syncSkillNode({
            skillId: sk.skillId,
            name: sk.name,
            category: sk.category,
            tier: sk.tier,
            prerequisiteSkillIds: sk.prerequisiteSkillIds,
          });
          successful++;
        } catch (err: any) {
          failed++;
          this.recordFailure('skill', sk.skillId, 'syncSkillNode', err.message);
        }
      }

      // 2. Sync Courses
      const courses = await CourseModel.find().lean().exec();
      for (const c of courses) {
        processed++;
        try {
          await syncNeo4jRepository.syncCourseNode({
            courseId: c.courseId,
            code: c.code,
            title: c.title,
            department: c.department,
            credits: c.credits,
            difficulty: c.difficulty,
            taughtSkillIds: c.taughtSkillIds,
            prerequisiteCourseIds: c.prerequisiteCourseIds,
          });
          successful++;
        } catch (err: any) {
          failed++;
          this.recordFailure('course', c.courseId, 'syncCourseNode', err.message);
        }
      }

      // 3. Sync Projects
      const projects = await ProjectModel.find().lean().exec();
      for (const p of projects) {
        processed++;
        try {
          await syncNeo4jRepository.syncProjectNode({
            projectId: p.projectId,
            title: p.title,
            domain: p.domain,
            difficulty: p.difficulty,
            requiredSkillIds: p.requiredSkillIds,
          });
          successful++;
        } catch (err: any) {
          failed++;
          this.recordFailure('project', p.projectId, 'syncProjectNode', err.message);
        }
      }

      // 4. Sync Jobs
      const jobs = await JobModel.find().lean().exec();
      for (const j of jobs) {
        processed++;
        try {
          await syncNeo4jRepository.syncJobNode({
            jobId: j.jobId,
            title: j.title,
            company: j.company,
            jobType: j.jobType,
            preferredDomain: j.preferredDomain,
            demandedSkillIds: j.demandedSkillIds,
          });
          successful++;
        } catch (err: any) {
          failed++;
          this.recordFailure('job', j.jobId, 'syncJobNode', err.message);
        }
      }

      // 5. Sync Students & Relationships
      const students = await StudentModel.find().lean().exec();
      for (const s of students) {
        processed++;
        try {
          await syncNeo4jRepository.syncStudentNode({
            studentId: s.studentId,
            rollNumber: s.rollNumber,
            name: s.name,
            department: s.department,
            currentSemester: s.currentSemester,
            cgpa: s.cgpa,
          });

          // Sync student skills
          if (s.skills && s.skills.length > 0) {
            await syncNeo4jRepository.syncStudentSkills(s.studentId, s.skills as any);
          }

          // Sync student completed courses
          if (s.completedCourses && s.completedCourses.length > 0) {
            await syncNeo4jRepository.syncStudentCompletedCourses(s.studentId, s.completedCourses as any);
          }

          successful++;
        } catch (err: any) {
          failed++;
          this.recordFailure('student', s.studentId, 'syncStudentNode', err.message);
        }
      }

      // 6. Invalidate all ephemeral Redis caches
      await cacheService.flushAll().catch(() => {});

      // 7. Log sync checkpoint into Cassandra
      await activityService
        .recordEvent({
          studentId: 'system_admin',
          actionType: 'complete_quiz' as any, // Using standard activity type enum
          targetEntityType: 'course' as any,
          targetEntityId: 'multi_store_full_sync',
          metadataJson: JSON.stringify({ processed, successful, failed }),
        })
        .catch(() => {});

      this.recordsProcessed += processed;
      this.successes += successful;
      this.failures += failed;
      this.lastSyncTime = new Date().toISOString();
      this.status = failed > 0 ? 'degraded' : 'completed';
    } catch {
      this.status = 'degraded';
    }

    const durationMs = Number((performance.now() - start).toFixed(2));
    return {
      processed,
      successes: successful,
      failures: failed,
      durationMs,
    };
  }

  // ==========================================================================
  // 2. Entity Update Propagation (MongoDB -> Neo4j -> Redis -> Cassandra)
  // ==========================================================================

  /**
   * Propagates a student profile update across the polyglot stores
   */
  public async propagateStudentUpdate(studentId: string): Promise<void> {
    try {
      const student = await StudentModel.findOne({ studentId }).lean().exec();
      if (!student) return;

      // 1. Update Neo4j node
      await syncNeo4jRepository.syncStudentNode({
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        name: student.name,
        department: student.department,
        currentSemester: student.currentSemester,
        cgpa: student.cgpa,
      });

      // 2. Invalidate student Redis caches
      await cacheService.invalidateStudentCache(studentId);

      // 3. Record audit event in Cassandra
      await activityService.recordEvent({
        studentId,
        actionType: 'search_skills' as any,
        targetEntityType: 'student' as any,
        targetEntityId: studentId,
        metadataJson: JSON.stringify({ action: 'student_profile_synchronized' }),
      });

      this.successes++;
      this.recordsProcessed++;
    } catch (err: any) {
      this.failures++;
      this.recordFailure('student', studentId, 'propagateStudentUpdate', err.message);
    }
  }

  /**
   * Propagates a course entity update
   */
  public async propagateCourseUpdate(courseId: string): Promise<void> {
    try {
      const course = await CourseModel.findOne({ courseId }).lean().exec();
      if (!course) return;

      await syncNeo4jRepository.syncCourseNode({
        courseId: course.courseId,
        code: course.code,
        title: course.title,
        department: course.department,
        credits: course.credits,
        difficulty: course.difficulty,
        taughtSkillIds: course.taughtSkillIds,
        prerequisiteCourseIds: course.prerequisiteCourseIds,
      });

      // Invalidate course recommendation caches
      await cacheService.invalidatePattern('recommendation:student:*:courses*');
      this.successes++;
      this.recordsProcessed++;
    } catch (err: any) {
      this.failures++;
      this.recordFailure('course', courseId, 'propagateCourseUpdate', err.message);
    }
  }

  /**
   * Propagates a skill entity update
   */
  public async propagateSkillUpdate(skillId: string): Promise<void> {
    try {
      const skill = await SkillModel.findOne({ skillId }).lean().exec();
      if (!skill) return;

      await syncNeo4jRepository.syncSkillNode({
        skillId: skill.skillId,
        name: skill.name,
        category: skill.category,
        tier: skill.tier,
        prerequisiteSkillIds: skill.prerequisiteSkillIds,
      });

      // Invalidate all recommendation caches since skill graph changed
      await cacheService.invalidatePattern('recommendation:student:*');
      this.successes++;
      this.recordsProcessed++;
    } catch (err: any) {
      this.failures++;
      this.recordFailure('skill', skillId, 'propagateSkillUpdate', err.message);
    }
  }

  // ==========================================================================
  // 3. Relationship Update Propagation
  // ==========================================================================

  /**
   * Propagates when a student acquires a new skill
   */
  public async propagateStudentSkillAcquired(
    studentId: string,
    skillId: string,
    level: string
  ): Promise<void> {
    try {
      // 1. Neo4j graph edge
      await syncNeo4jRepository.addStudentSkillRelationship(studentId, skillId, level);

      // 2. Invalidate student Redis caches
      await cacheService.invalidateStudentCache(studentId);

      // 3. Log into Cassandra activity log
      await activityService.recordEvent({
        studentId,
        actionType: 'complete_quiz' as any,
        targetEntityType: 'skill' as any,
        targetEntityId: skillId,
        metadataJson: JSON.stringify({ level, syncStatus: 'propagated' }),
      });

      this.successes++;
      this.recordsProcessed++;
    } catch (err: any) {
      this.failures++;
      this.recordFailure('student_skill', `${studentId}:${skillId}`, 'addStudentSkillRelationship', err.message);
    }
  }

  /**
   * Propagates when a student completes a course
   */
  public async propagateStudentCourseCompleted(
    studentId: string,
    courseId: string,
    grade: string
  ): Promise<void> {
    try {
      // 1. Neo4j graph edge
      await syncNeo4jRepository.addStudentCompletedCourseRelationship(studentId, courseId, grade);

      // 2. Invalidate student Redis caches
      await cacheService.invalidateStudentCache(studentId);

      // 3. Log into Cassandra
      await activityService.recordEvent({
        studentId,
        actionType: 'view_course' as any,
        targetEntityType: 'course' as any,
        targetEntityId: courseId,
        metadataJson: JSON.stringify({ grade, syncStatus: 'propagated' }),
      });

      this.successes++;
      this.recordsProcessed++;
    } catch (err: any) {
      this.failures++;
      this.recordFailure('student_course', `${studentId}:${courseId}`, 'addStudentCompletedCourseRelationship', err.message);
    }
  }

  /**
   * Propagates when a student joins a club
   */
  public async propagateStudentClubJoined(
    studentId: string,
    clubId: string,
    role: string
  ): Promise<void> {
    try {
      await syncNeo4jRepository.addStudentClubRelationship(studentId, clubId, role);
      await cacheService.invalidateStudentCache(studentId);
      this.successes++;
      this.recordsProcessed++;
    } catch (err: any) {
      this.failures++;
      this.recordFailure('student_club', `${studentId}:${clubId}`, 'addStudentClubRelationship', err.message);
    }
  }

  /**
   * Propagates when a student attends an event
   */
  public async propagateStudentEventAttended(
    studentId: string,
    eventId: string
  ): Promise<void> {
    try {
      await syncNeo4jRepository.addStudentEventAttendanceRelationship(studentId, eventId);
      await cacheService.invalidateStudentCache(studentId);
      await activityService.recordEvent({
        studentId,
        actionType: 'attend_event' as any,
        targetEntityType: 'event' as any,
        targetEntityId: eventId,
      });
      this.successes++;
      this.recordsProcessed++;
    } catch (err: any) {
      this.failures++;
      this.recordFailure('student_event', `${studentId}:${eventId}`, 'addStudentEventAttendanceRelationship', err.message);
    }
  }

  // ==========================================================================
  // 4. Status, Telemetry & Retry Management
  // ==========================================================================

  public recordFailure(entityType: string, entityId: string, action: string, errorMessage: string): void {
    const existingIndex = this.retryQueue.findIndex(
      (r) => r.entityType === entityType && r.entityId === entityId && r.action === action
    );

    if (existingIndex >= 0) {
      this.retryQueue[existingIndex].retryCount++;
      this.retryQueue[existingIndex].errorMessage = errorMessage;
      this.retryQueue[existingIndex].timestamp = new Date().toISOString();
    } else {
      this.retryQueue.push({
        entityType,
        entityId,
        action,
        errorMessage,
        timestamp: new Date().toISOString(),
        retryCount: 1,
      });
    }

    // Keep queue manageable
    if (this.retryQueue.length > 50) {
      this.retryQueue.shift();
    }
  }

  public getSyncStatus(): SyncStatusReport {
    return {
      lastSyncTime: this.lastSyncTime,
      status: this.status,
      recordsProcessed: this.recordsProcessed,
      successes: this.successes,
      failures: this.failures,
      retryQueueLength: this.retryQueue.length,
      retries: this.retryQueue,
      stores: {
        mongodb: 'Primary Source of Truth (Document Store)',
        neo4j: 'Relationship Graph Representation (Propagated via MERGE)',
        redis: 'Ephemeral Cache (Proactively Invalidated on Mutation)',
        cassandra: 'Historical Activity Telemetry (Append-Only Audit Log)',
      },
      consistencyModel: {
        type: 'Eventual Consistency via Service Orchestration',
        primarySourceOfTruth: 'MongoDB (Immediate Consistency)',
        graphPropagation: 'Synchronous via Idempotent Cypher MERGE',
        cachePolicy: 'Proactive Cache Invalidation + 300s TTL Fallback',
        auditLog: 'Asynchronous Cassandra Append Stream',
      },
    };
  }
}

export const syncService = new SyncService();
