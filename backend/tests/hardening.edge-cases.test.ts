import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendationService } from '../src/services/recommendation.service.js';
import { ResourceService } from '../src/services/resource.service.js';
import { ActivityService } from '../src/services/activity.service.js';
import { CacheService } from '../src/services/cache.service.js';
import { graphRepository } from '../src/repositories/neo4j/graph.repository.js';
import { recommendationRepository } from '../src/repositories/neo4j/recommendation.repository.js';
import { resourceRepository } from '../src/repositories/mongo/resource.repository.js';
import { activityRepository } from '../src/repositories/cassandra/activity.repository.js';
import { cacheRepository } from '../src/repositories/redis/cache.repository.js';

// Mocks
vi.mock('../src/repositories/neo4j/graph.repository.js', () => ({
  graphRepository: {
    findStudentCurrentSkills: vi.fn(),
    findMissingSkills: vi.fn(),
    findSkillPrerequisites: vi.fn(),
    findCoursesTeachingMissingSkills: vi.fn(),
    findJobRequiredSkills: vi.fn(),
    findProjectsMatchingStudentSkills: vi.fn(),
  },
}));

vi.mock('../src/repositories/neo4j/recommendation.repository.js', () => ({
  recommendationRepository: {
    findStudentInterests: vi.fn(),
    findStudentCompletedCourses: vi.fn(),
    findAllJobsWithSkills: vi.fn(),
    findAllProjectsWithSkills: vi.fn(),
    findAllCoursesWithSkills: vi.fn(),
    findResourcesForSkills: vi.fn(),
    findSkillPopularity: vi.fn(),
    findShortestPrerequisitePath: vi.fn(),
  },
}));

vi.mock('../src/repositories/mongo/resource.repository.js', () => ({
  resourceRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findResources: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    incrementAccessCount: vi.fn(),
    updateRating: vi.fn(),
    getPopularResources: vi.fn(),
    getTypeDistribution: vi.fn(),
    getSkillCoverage: vi.fn(),
  },
}));

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

vi.mock('../src/repositories/redis/cache.repository.js', () => ({
  cacheRepository: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    ttl: vi.fn(),
    exists: vi.fn(),
    scanKeys: vi.fn(),
    delPattern: vi.fn(),
    flushAll: vi.fn(),
    getAllKeysInfo: vi.fn(),
    recordHit: vi.fn(),
    recordMiss: vi.fn(),
    getMetrics: vi.fn(),
    checkRateLimit: vi.fn(),
  },
}));

describe('Phase 13: System Hardening & Critical Edge Cases Suite', () => {
  let recService: RecommendationService;
  let resService: ResourceService;
  let actService: ActivityService;
  let cacheService: CacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    recService = new RecommendationService();
    resService = new ResourceService();
    actService = new ActivityService();
    cacheService = new CacheService();
  });

  // ==========================================================================
  // Edge Case 1: Student with NO skills
  // ==========================================================================
  describe('Edge Case 1: Student with NO skills', () => {
    it('Skill Gap: should handle zero current skills with 0% readiness and Low level without NaN or division by zero', async () => {
      vi.mocked(graphRepository.findStudentCurrentSkills).mockResolvedValueOnce([]);
      vi.mocked(graphRepository.findJobRequiredSkills).mockResolvedValueOnce({
        jobId: 'job_web',
        title: 'Web Developer',
        company: 'WebTech',
        requiredSkills: [
          { skillId: 'sk_html', name: 'HTML', category: 'Frontend', tier: 'foundational' },
          { skillId: 'sk_css', name: 'CSS', category: 'Frontend', tier: 'foundational' },
          { skillId: 'sk_js', name: 'JavaScript', category: 'Frontend', tier: 'foundational' },
        ],
      });
      vi.mocked(graphRepository.findMissingSkills).mockResolvedValueOnce([
        { skillId: 'sk_html', name: 'HTML', category: 'Frontend' },
        { skillId: 'sk_css', name: 'CSS', category: 'Frontend' },
        { skillId: 'sk_js', name: 'JavaScript', category: 'Frontend' },
      ]);
      vi.mocked(graphRepository.findSkillPrerequisites).mockResolvedValue([]);

      const gap = await recService.getSkillGapAnalysis('stu_empty', 'job', 'job_web');

      expect(gap.studentId).toBe('stu_empty');
      expect(gap.currentSkills).toHaveLength(0);
      expect(gap.matchedSkills).toHaveLength(0);
      expect(gap.missingSkills).toHaveLength(3);
      expect(gap.readinessPercentage).toBe(0);
      expect(gap.readinessLevel).toBe('Low');
      expect(gap.summary).toContain('0.0% readiness');
    });

    it('Learning Path: should produce foundational path starting from scratch when student has zero skills', async () => {
      vi.mocked(graphRepository.findStudentCurrentSkills).mockResolvedValueOnce([]);
      vi.mocked(graphRepository.findSkillPrerequisites).mockResolvedValue([]);
      vi.mocked(graphRepository.findCoursesTeachingMissingSkills).mockResolvedValue([]);
      vi.mocked(recommendationRepository.findResourcesForSkills).mockResolvedValue([]);

      const path = await recService.getLearningPathRecommendation('stu_empty', 'full-stack-developer');

      expect(path.alreadyAcquiredSkills).toHaveLength(0);
      expect(path.missingSkills.length).toBeGreaterThan(0);
      expect(path.orderedLearningPath.length).toBeGreaterThan(0);
      expect(path.explanation).toContain('already possess 0 skills (none)');
    });
  });

  // ==========================================================================
  // Edge Case 2: Student with ALL required skills
  // ==========================================================================
  describe('Edge Case 2: Student with ALL required skills', () => {
    it('Skill Gap: should calculate 100% readiness and High level with zero missing skills', async () => {
      vi.mocked(graphRepository.findStudentCurrentSkills).mockResolvedValueOnce([
        { skillId: 'sk_python', name: 'Python', category: 'Programming', level: 'advanced' },
        { skillId: 'sk_sql', name: 'SQL', category: 'Database', level: 'advanced' },
      ]);
      vi.mocked(graphRepository.findJobRequiredSkills).mockResolvedValueOnce({
        jobId: 'job_analyst',
        title: 'Junior Analyst',
        company: 'DataCorp',
        requiredSkills: [
          { skillId: 'sk_python', name: 'Python', category: 'Programming', tier: 'foundational' },
          { skillId: 'sk_sql', name: 'SQL', category: 'Database', tier: 'foundational' },
        ],
      });
      vi.mocked(graphRepository.findMissingSkills).mockResolvedValueOnce([]);

      const gap = await recService.getSkillGapAnalysis('stu_master', 'job', 'job_analyst');

      expect(gap.matchedSkills).toHaveLength(2);
      expect(gap.missingSkills).toHaveLength(0);
      expect(gap.readinessPercentage).toBe(100);
      expect(gap.readinessLevel).toBe('High');
      expect(gap.summary).toContain('100.0% readiness');
    });

    it('Job Readiness: should return full readiness when all skills and prerequisites are satisfied', async () => {
      vi.mocked(graphRepository.findJobRequiredSkills).mockResolvedValueOnce({
        jobId: 'job_dev',
        title: 'Developer',
        company: 'DevCorp',
        requiredSkills: [
          { skillId: 'sk_python', name: 'Python', category: 'Programming', tier: 'foundational' },
        ],
      });
      vi.mocked(graphRepository.findStudentCurrentSkills).mockResolvedValueOnce([
        { skillId: 'sk_python', name: 'Python', category: 'Programming', level: 'expert' },
      ]);
      vi.mocked(graphRepository.findMissingSkills).mockResolvedValueOnce([]);

      const readiness = await recService.getJobReadinessAnalysis('stu_master', 'job_dev');

      expect(readiness.isQualified).toBe(true);
      expect(readiness.readinessPercentage).toBe(100);
      expect(readiness.missingSkills).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Edge Case 3: Unavailable / broken prerequisite
  // ==========================================================================
  describe('Edge Case 3: Unavailable / broken prerequisite reference', () => {
    it('Learning Path: should gracefully handle a prerequisite pointing to a missing node without halting ordering', async () => {
      vi.mocked(graphRepository.findStudentCurrentSkills).mockResolvedValueOnce([]);
      // sk_ml requires sk_phantom which does NOT exist in target skills or database
      vi.mocked(graphRepository.findSkillPrerequisites).mockImplementation(async (skillId) => {
        if (skillId === 'sk_ml') {
          return [
            { prerequisiteId: 'sk_phantom_prereq_404', name: 'Unknown', category: 'Unknown', tier: 'unknown', depth: 1 },
          ];
        }
        return [];
      });
      vi.mocked(graphRepository.findCoursesTeachingMissingSkills).mockResolvedValue([]);
      vi.mocked(recommendationRepository.findResourcesForSkills).mockResolvedValue([]);

      const path = await recService.getLearningPathRecommendation('stu_01', 'ai-ml-engineer');

      expect(path.orderedLearningPath.length).toBeGreaterThan(0);
      // Ensure sk_ml was still successfully scheduled and not blocked by the broken prerequisite
      const mlStep = path.orderedLearningPath.find((s) => s.skillId === 'sk_ml');
      expect(mlStep).toBeDefined();
    });
  });

  // ==========================================================================
  // Edge Case 4: Circular prerequisite attempt
  // ==========================================================================
  describe('Edge Case 4: Circular prerequisite attempt', () => {
    it('Topological Sort: should detect mutual cycles and terminate in finite steps without call stack overflow', async () => {
      vi.mocked(graphRepository.findStudentCurrentSkills).mockResolvedValueOnce([]);
      // Cycle: sk_python requires sk_ml, sk_ml requires sk_python
      vi.mocked(graphRepository.findSkillPrerequisites).mockImplementation(async (skillId) => {
        if (skillId === 'sk_python') {
          return [{ prerequisiteId: 'sk_ml', name: 'Machine Learning', category: 'AI', tier: 'core', depth: 1 }];
        }
        if (skillId === 'sk_ml') {
          return [{ prerequisiteId: 'sk_python', name: 'Python', category: 'Code', tier: 'core', depth: 1 }];
        }
        return [];
      });
      vi.mocked(graphRepository.findCoursesTeachingMissingSkills).mockResolvedValue([]);
      vi.mocked(recommendationRepository.findResourcesForSkills).mockResolvedValue([]);

      // Should finish promptly without infinite recursion
      const path = await recService.getLearningPathRecommendation('stu_01', 'ai-ml-engineer');

      expect(path.orderedLearningPath.length).toBeGreaterThan(0);
      const skillIdsInPath = path.orderedLearningPath.map((s) => s.skillId);
      // Both cycled skills should still appear in the output path
      expect(skillIdsInPath).toContain('sk_python');
      expect(skillIdsInPath).toContain('sk_ml');
    });
  });

  // ==========================================================================
  // Edge Case 5: Empty recommendation result
  // ==========================================================================
  describe('Edge Case 5: Empty recommendation result', () => {
    it('Course Recommendations: should return empty array cleanly when no courses exist in catalog', async () => {
      vi.mocked(graphRepository.findStudentCurrentSkills).mockResolvedValueOnce([]);
      vi.mocked(recommendationRepository.findStudentInterests).mockResolvedValueOnce([]);
      vi.mocked(recommendationRepository.findStudentCompletedCourses).mockResolvedValueOnce([]);
      vi.mocked(recommendationRepository.findAllCoursesWithSkills).mockResolvedValueOnce([]);

      const courses = await recService.getRecommendedCourses('stu_01');

      expect(Array.isArray(courses)).toBe(true);
      expect(courses).toHaveLength(0);
    });

    it('Project Recommendations: should return empty array cleanly when no projects match criteria', async () => {
      vi.mocked(graphRepository.findStudentCurrentSkills).mockResolvedValueOnce([]);
      vi.mocked(recommendationRepository.findStudentInterests).mockResolvedValueOnce([]);
      vi.mocked(recommendationRepository.findAllProjectsWithSkills).mockResolvedValueOnce([]);

      const projects = await recService.getRecommendedProjects('stu_01');

      expect(Array.isArray(projects)).toBe(true);
      expect(projects).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Edge Case 6: Deleted / Non-existent resource
  // ==========================================================================
  describe('Edge Case 6: Deleted or missing resource', () => {
    it('ResourceService: getResource on deleted resource should throw 404', async () => {
      vi.mocked(resourceRepository.findById).mockResolvedValueOnce(null);

      await expect(resService.getResource('res_deleted')).rejects.toMatchObject({
        status: 404,
        message: 'Resource not found',
      });
    });

    it('ResourceService: deleteResource on already deleted resource should throw 404', async () => {
      vi.mocked(resourceRepository.delete).mockResolvedValueOnce(false);

      await expect(resService.deleteResource('res_deleted')).rejects.toMatchObject({
        status: 404,
        message: 'Resource not found',
      });
    });

    it('ResourceService: trackAccess on deleted resource should throw 404', async () => {
      vi.mocked(resourceRepository.findById).mockResolvedValueOnce(null);

      await expect(resService.trackAccess('res_deleted')).rejects.toMatchObject({
        status: 404,
        message: 'Resource not found',
      });
    });

    it('ResourceService: rateResource with out-of-bounds rating (< 1 or > 5) should throw 400', async () => {
      await expect(resService.rateResource('res_01', 0)).rejects.toMatchObject({
        status: 400,
        message: 'Rating must be between 1 and 5',
      });
      await expect(resService.rateResource('res_01', 6)).rejects.toMatchObject({
        status: 400,
        message: 'Rating must be between 1 and 5',
      });
    });
  });

  // ==========================================================================
  // Edge Case 7: Stale Redis Cache & Cache Invalidation
  // ==========================================================================
  describe('Edge Case 7: Stale Redis cache & re-fetching', () => {
    it('Cache-Aside: should re-fetch from primary database when cache key has expired or is invalidated', async () => {
      // 1st request: Cache hit
      vi.mocked(cacheRepository.get).mockResolvedValueOnce(JSON.stringify({ data: 'stale_val' }));
      const fetcher1 = vi.fn().mockResolvedValue({ data: 'fresh_val' });
      const res1 = await cacheService.getOrSet('test:cache:key', fetcher1, 300);
      expect(res1).toEqual({ data: 'stale_val' });
      expect(fetcher1).not.toHaveBeenCalled();

      // Invalidation event
      vi.mocked(cacheRepository.del).mockResolvedValueOnce(true);
      await cacheService.invalidatePattern('test:cache:*');

      // 2nd request: Cache miss -> re-fetches fresh data and stores in Redis
      vi.mocked(cacheRepository.get).mockResolvedValueOnce(null);
      vi.mocked(cacheRepository.set).mockResolvedValueOnce(true);
      const fetcher2 = vi.fn().mockResolvedValue({ data: 'fresh_val' });
      const res2 = await cacheService.getOrSet('test:cache:key', fetcher2, 300);

      expect(fetcher2).toHaveBeenCalledTimes(1);
      expect(res2).toEqual({ data: 'fresh_val' });
      expect(cacheRepository.set).toHaveBeenCalledWith(
        'test:cache:key',
        JSON.stringify({ data: 'fresh_val' }),
        300
      );
    });
  });

  // ==========================================================================
  // Edge Case 8: Cassandra missing partition
  // ==========================================================================
  describe('Edge Case 8: Cassandra missing partition queries', () => {
    it('getStudentActivity: should return empty list [] without throwing when querying unrecorded student/date partition', async () => {
      vi.mocked(activityRepository.getStudentActivityByDate).mockResolvedValueOnce([]);

      const events = await actService.getStudentActivity('stu_nonexistent', '2026-10-08');

      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(0);
    });

    it('getResourceActivity: should return empty list [] when partition has no activity records', async () => {
      vi.mocked(activityRepository.getResourceActivityByDate).mockResolvedValueOnce([]);

      const events = await actService.getResourceActivity('res_nonexistent', '2026-10-08');

      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(0);
    });

    it('getRecommendationHistory: should return empty list [] when student has no audit records', async () => {
      vi.mocked(activityRepository.getRecommendationHistory).mockResolvedValueOnce([]);

      const history = await actService.getRecommendationHistory('stu_nonexistent');

      expect(Array.isArray(history)).toBe(true);
      expect(history).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Edge Case 9: Neo4j missing node
  // ==========================================================================
  describe('Edge Case 9: Neo4j missing node queries', () => {
    it('Job Readiness: should throw 404 if requested job does not exist in the Neo4j graph', async () => {
      vi.mocked(graphRepository.findJobRequiredSkills).mockResolvedValueOnce(null as any);

      await expect(recService.getJobReadinessAnalysis('stu_01', 'job_nonexistent')).rejects.toMatchObject({
        status: 404,
        message: 'Job not found with ID: job_nonexistent',
      });
    });

    it('Skill Gap: should throw 404 if requested target job node does not exist', async () => {
      vi.mocked(graphRepository.findStudentCurrentSkills).mockResolvedValueOnce([]);
      vi.mocked(graphRepository.findJobRequiredSkills).mockResolvedValueOnce(null as any);

      await expect(recService.getSkillGapAnalysis('stu_01', 'job', 'job_ghost')).rejects.toMatchObject({
        status: 404,
        message: 'Target job not found: job_ghost',
      });
    });
  });

  // ==========================================================================
  // Edge Case 10: Input validation & error responses
  // ==========================================================================
  describe('Edge Case 10: Input validation and consistent error responses', () => {
    it('should reject missing studentId with 400 Bad Request in skill gap', async () => {
      await expect(recService.getSkillGapAnalysis('', 'job', 'job_01')).rejects.toMatchObject({
        status: 400,
        message: 'studentId, targetType, and targetId are required',
      });
    });

    it('should reject invalid targetType with 400 Bad Request', async () => {
      await expect(recService.getSkillGapAnalysis('stu_01', 'invalid_target' as any, 'job_01')).rejects.toMatchObject({
        status: 400,
        message: 'targetType must be one of: job, project, skill',
      });
    });

    it('should reject missing studentId in Cassandra activity retrieval with 400', async () => {
      await expect(actService.getStudentActivity('', '2026-10-08')).rejects.toMatchObject({
        status: 400,
        message: 'studentId is required',
      });
    });

    it('should reject missing resourceId in Cassandra resource activity retrieval with 400', async () => {
      await expect(actService.getResourceActivity('', '2026-10-08')).rejects.toMatchObject({
        status: 400,
        message: 'resourceId is required',
      });
    });
  });
});
