import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService } from '../src/services/sync.service.js';
import { syncNeo4jRepository } from '../src/repositories/neo4j/sync.neo4j.repository.js';
import { cacheService } from '../src/services/cache.service.js';
import { activityService } from '../src/services/activity.service.js';
import { StudentModel } from '../src/models/mongo/index.js';

vi.mock('../src/repositories/neo4j/sync.neo4j.repository.js', () => ({
  syncNeo4jRepository: {
    syncStudentNode: vi.fn(),
    syncStudentSkills: vi.fn(),
    addStudentSkillRelationship: vi.fn(),
    syncStudentCompletedCourses: vi.fn(),
    addStudentCompletedCourseRelationship: vi.fn(),
    addStudentClubRelationship: vi.fn(),
    addStudentEventAttendanceRelationship: vi.fn(),
    syncCourseNode: vi.fn(),
    syncSkillNode: vi.fn(),
    syncProjectNode: vi.fn(),
    syncJobNode: vi.fn(),
    deleteEntityNode: vi.fn(),
  },
}));

vi.mock('../src/services/cache.service.js', () => ({
  cacheService: {
    flushAll: vi.fn(),
    invalidateStudentCache: vi.fn(),
    invalidatePattern: vi.fn(),
  },
}));

vi.mock('../src/services/activity.service.js', () => ({
  activityService: {
    recordEvent: vi.fn(),
  },
}));

describe('Phase 8: Multi-Store NoSQL Synchronization - Unit Tests', () => {
  let service: SyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SyncService();
  });

  // ==========================================================================
  // 1. Entity Update Propagation (MongoDB -> Neo4j -> Redis -> Cassandra)
  // ==========================================================================
  describe('Entity Update Propagation', () => {
    it('should propagate student entity update from MongoDB to Neo4j, invalidate cache, and log to Cassandra', async () => {
      // Mock MongoDB StudentModel.findOne
      const mockStudent = {
        studentId: 'stu_001',
        rollNumber: 'CS2026-001',
        name: 'Aarav Sharma Updated',
        department: 'Computer Science & Engineering',
        currentSemester: 5,
        cgpa: 9.1,
      };

      vi.spyOn(StudentModel, 'findOne').mockReturnValue({
        lean: () => ({
          exec: vi.fn().mockResolvedValue(mockStudent),
        }),
      } as any);

      await service.propagateStudentUpdate('stu_001');

      // 1. Neo4j node updated
      expect(syncNeo4jRepository.syncStudentNode).toHaveBeenCalledWith({
        studentId: 'stu_001',
        rollNumber: 'CS2026-001',
        name: 'Aarav Sharma Updated',
        department: 'Computer Science & Engineering',
        currentSemester: 5,
        cgpa: 9.1,
      });

      // 2. Redis cache invalidated
      expect(cacheService.invalidateStudentCache).toHaveBeenCalledWith('stu_001');

      // 3. Cassandra activity logged
      expect(activityService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'stu_001',
          targetEntityId: 'stu_001',
        })
      );
    });
  });

  // ==========================================================================
  // 2. Relationship Update Propagation
  // ==========================================================================
  describe('Relationship Update Propagation', () => {
    it('should propagate skill acquisition: add Neo4j relationship, invalidate Redis, log to Cassandra', async () => {
      await service.propagateStudentSkillAcquired('stu_001', 'sk_python', 'advanced');

      // 1. Neo4j relationship merged
      expect(syncNeo4jRepository.addStudentSkillRelationship).toHaveBeenCalledWith(
        'stu_001',
        'sk_python',
        'advanced'
      );

      // 2. Redis cache invalidated
      expect(cacheService.invalidateStudentCache).toHaveBeenCalledWith('stu_001');

      // 3. Cassandra activity recorded
      expect(activityService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'stu_001',
          targetEntityId: 'sk_python',
          actionType: 'complete_quiz',
        })
      );
    });

    it('should propagate course completion: add Neo4j relationship, invalidate Redis, log to Cassandra', async () => {
      await service.propagateStudentCourseCompleted('stu_001', 'crs_ml', 'A');

      expect(syncNeo4jRepository.addStudentCompletedCourseRelationship).toHaveBeenCalledWith(
        'stu_001',
        'crs_ml',
        'A'
      );
      expect(cacheService.invalidateStudentCache).toHaveBeenCalledWith('stu_001');
      expect(activityService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'stu_001',
          targetEntityId: 'crs_ml',
          actionType: 'view_course',
        })
      );
    });
  });

  // ==========================================================================
  // 3. Synchronization Status & Telemetry Reporting
  // ==========================================================================
  describe('Synchronization Status & Telemetry', () => {
    it('should report comprehensive multi-store status and eventual consistency model', () => {
      const status = service.getSyncStatus();

      expect(status.status).toBeDefined();
      expect(status.stores.mongodb).toContain('Primary Source of Truth');
      expect(status.stores.neo4j).toContain('Relationship Graph');
      expect(status.stores.redis).toContain('Ephemeral Cache');
      expect(status.stores.cassandra).toContain('Historical Activity');
      expect(status.consistencyModel.type).toBe('Eventual Consistency via Service Orchestration');
    });

    it('should record failures into the retry queue', () => {
      service.recordFailure('student', 'stu_999', 'syncStudentNode', 'Neo4j connection refused');

      const status = service.getSyncStatus();
      expect(status.retryQueueLength).toBe(1);
      expect(status.retries[0].entityId).toBe('stu_999');
      expect(status.retries[0].errorMessage).toBe('Neo4j connection refused');
      expect(status.retries[0].retryCount).toBe(1);
    });
  });
});
