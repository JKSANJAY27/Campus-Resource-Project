import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityService } from '../src/services/activity.service.js';
import { activityRepository } from '../src/repositories/cassandra/activity.repository.js';

vi.mock('../src/repositories/cassandra/activity.repository.js', () => ({
  activityRepository: {
    recordActivity: vi.fn(),
    batchInsertActivities: vi.fn(),
    recordRecommendationAudit: vi.fn(),
    getStudentActivityByDate: vi.fn(),
    getResourceActivityByDate: vi.fn(),
    getRecommendationHistory: vi.fn(),
    getDailyActivitySummary: vi.fn(),
    getAllRecentSummaries: vi.fn(),
  },
}));

describe('Phase 7: Cassandra Activity & Event Storage - Unit Tests', () => {
  let service: ActivityService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ActivityService();
  });

  // ==========================================================================
  // 1. Input Validation & Error Handling
  // ==========================================================================
  describe('Input Validation & Error Handling', () => {
    it('should throw 400 if studentId is missing when retrieving student activity', async () => {
      await expect(service.getStudentActivity('', '2026-10-08')).rejects.toMatchObject({
        status: 400,
        message: 'studentId is required',
      });
    });

    it('should throw 400 if resourceId is missing when retrieving resource activity', async () => {
      await expect(service.getResourceActivity('', '2026-10-08')).rejects.toMatchObject({
        status: 400,
        message: 'resourceId is required',
      });
    });

    it('should throw 400 if studentId is missing when retrieving recommendation history', async () => {
      await expect(service.getRecommendationHistory('')).rejects.toMatchObject({
        status: 400,
        message: 'studentId is required',
      });
    });
  });

  // ==========================================================================
  // 2. Query Pattern 1: Student Activity by Date
  // ==========================================================================
  describe('Query Pattern 1: Student Activity by Day', () => {
    it('should query the ((student_id, activity_date)) composite partition', async () => {
      const mockEvents = [
        {
          studentId: 'stu_001',
          activityDate: '2026-10-08',
          eventTimestamp: new Date('2026-10-08T10:30:00Z'),
          eventId: 'uuid-1',
          actionType: 'view_resource' as const,
          targetEntityType: 'resource' as const,
          targetEntityId: 'res_01',
          metadataJson: '{}',
        },
        {
          studentId: 'stu_001',
          activityDate: '2026-10-08',
          eventTimestamp: new Date('2026-10-08T09:15:00Z'),
          eventId: 'uuid-2',
          actionType: 'click_recommendation' as const,
          targetEntityType: 'job' as const,
          targetEntityId: 'job_01',
          metadataJson: '{}',
        },
      ];

      vi.mocked(activityRepository.getStudentActivityByDate).mockResolvedValueOnce(mockEvents);

      const result = await service.getStudentActivity('stu_001', '2026-10-08', 20);

      expect(activityRepository.getStudentActivityByDate).toHaveBeenCalledWith('stu_001', '2026-10-08', 20);
      expect(result).toHaveLength(2);
      expect(result[0].actionType).toBe('view_resource');
      expect(result[1].actionType).toBe('click_recommendation');
    });
  });

  // ==========================================================================
  // 3. Query Pattern 2: Resource Activity by Date (Denormalization)
  // ==========================================================================
  describe('Query Pattern 2: Resource Activity by Date', () => {
    it('should query the ((resource_id, activity_date)) partition', async () => {
      const mockResourceEvents = [
        {
          resourceId: 'res_01',
          activityDate: '2026-10-08',
          eventTimestamp: new Date(),
          eventId: 'uuid-res-1',
          studentId: 'stu_001',
          actionType: 'view_resource',
          durationSeconds: 340,
        },
        {
          resourceId: 'res_01',
          activityDate: '2026-10-08',
          eventTimestamp: new Date(),
          eventId: 'uuid-res-2',
          studentId: 'stu_002',
          actionType: 'view_resource',
          durationSeconds: 120,
        },
      ];

      vi.mocked(activityRepository.getResourceActivityByDate).mockResolvedValueOnce(mockResourceEvents);

      const result = await service.getResourceActivity('res_01', '2026-10-08', 50);

      expect(activityRepository.getResourceActivityByDate).toHaveBeenCalledWith('res_01', '2026-10-08', 50);
      expect(result).toHaveLength(2);
      expect(result[0].durationSeconds).toBe(340);
    });
  });

  // ==========================================================================
  // 4. Query Pattern 3: Recommendation Audit History
  // ==========================================================================
  describe('Query Pattern 3: Recommendation History by Student', () => {
    it('should query the ((student_id, rec_type)) partition with clustering sort', async () => {
      const mockAudit = [
        {
          studentId: 'stu_001',
          recType: 'course' as const,
          generatedAt: new Date(),
          recId: 'uuid-rec-1',
          targetItemId: 'crs_ml',
          finalScore: 0.92,
          scoreBreakdownJson: '{"newSkillScore":0.35}',
        },
      ];

      vi.mocked(activityRepository.getRecommendationHistory).mockResolvedValueOnce(mockAudit);

      const result = await service.getRecommendationHistory('stu_001', 'course', 10);

      expect(activityRepository.getRecommendationHistory).toHaveBeenCalledWith('stu_001', 'course', 10);
      expect(result).toHaveLength(1);
      expect(result[0].finalScore).toBe(0.92);
    });
  });

  // ==========================================================================
  // 5. Query Pattern 4: Daily Activity Rollups & Summary
  // ==========================================================================
  describe('Query Pattern 4: Daily Rollups', () => {
    it('should fetch daily activity summary by date', async () => {
      const mockSummaries = [
        {
          activityDate: '2026-10-08',
          actionType: 'view_resource',
          eventCount: 154,
          uniqueStudents: 42,
          avgDurationSeconds: 245.5,
          lastUpdated: new Date(),
        },
        {
          activityDate: '2026-10-08',
          actionType: 'click_recommendation',
          eventCount: 68,
          uniqueStudents: 28,
          avgDurationSeconds: 15.0,
          lastUpdated: new Date(),
        },
      ];

      vi.mocked(activityRepository.getDailyActivitySummary).mockResolvedValueOnce(mockSummaries);

      const result = await service.getDailySummary('2026-10-08');

      expect(activityRepository.getDailyActivitySummary).toHaveBeenCalledWith('2026-10-08');
      expect(result).toHaveLength(2);
      expect(result[0].eventCount).toBe(154);
    });
  });

  // ==========================================================================
  // 6. Synthetic Event Simulator (High-Volume Append)
  // ==========================================================================
  describe('Synthetic Event Simulator', () => {
    it('should generate requested count of synthetic events and invoke batch insert', async () => {
      vi.mocked(activityRepository.batchInsertActivities).mockResolvedValueOnce(100);

      const result = await service.simulateSyntheticEvents({ count: 100, daysBack: 3 });

      expect(activityRepository.batchInsertActivities).toHaveBeenCalledTimes(1);
      const passedBatch = vi.mocked(activityRepository.batchInsertActivities).mock.calls[0][0];
      expect(passedBatch).toHaveLength(100);
      expect(result.countInserted).toBe(100);
      expect(result.throughputEventsPerSec).toBeGreaterThan(0);
      expect(result.sampleEvents.length).toBeLessThanOrEqual(5);
    });
  });
});
