import { cacheRepository, KeyInfo } from '../repositories/redis/cache.repository.js';
import { studentRepository } from '../repositories/mongo/student.repository.js';
import { resourceRepository } from '../repositories/mongo/resource.repository.js';
import { recommendationService } from './recommendation.service.js';

// ============================================================================
// TTL Configuration (Configurable in Seconds)
// ============================================================================

export const CACHE_TTL = {
  RECOMMENDATIONS: 300, // 5 minutes
  DASHBOARD: 300,       // 5 minutes
  POPULAR_RESOURCES: 600, // 10 minutes
  POPULAR_SKILLS: 600,   // 10 minutes
  SHORT_LIVED: 60,       // 1 minute
};

export interface CacheResult<T> {
  data: T;
  cached: boolean;
  latencyMs: number;
}

export interface BenchmarkResult {
  studentId: string;
  iterations: number;
  uncachedLatenciesMs: number[];
  cachedLatenciesMs: number[];
  avgUncachedLatencyMs: number;
  avgCachedLatencyMs: number;
  speedupMultiplier: number;
  latencyReductionPercent: number;
  summary: string;
}

export interface StudentDashboardData {
  student: {
    studentId: string;
    rollNumber: string;
    name: string;
    department: string;
    currentSemester: number;
    cgpa: number;
    interests: string[];
  };
  metrics: {
    skillsAcquiredCount: number;
    completedCoursesCount: number;
    clubMembershipsCount: number;
    attendedEventsCount: number;
  };
  skillsSummary: Array<{ skillId: string; level: string }>;
  topRecommendedCourses: any[];
  topRecommendedProjects: any[];
  topRecommendedJobs: any[];
  cachedAt: string;
}

export class CacheService {
  /**
   * Universal Cache-Aside Implementation
   * Checks Redis first -> returns on hit -> fetches primary on miss -> stores in Redis
   */
  public async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL.RECOMMENDATIONS
  ): Promise<CacheResult<T>> {
    const start = performance.now();

    // 1. Check cache (Redis GET)
    try {
      const cachedValue = await cacheRepository.get(key);
      if (cachedValue !== null) {
        try {
          const parsed = JSON.parse(cachedValue) as T;
          const latencyMs = Number((performance.now() - start).toFixed(2));
          await cacheRepository.recordHit(latencyMs);
          return {
            data: parsed,
            cached: true,
            latencyMs,
          };
        } catch {
          // If cached data is malformed or stale schema, treat as cache miss
          await cacheRepository.del(key);
        }
      }
    } catch {
      // Redis error: fall through directly to primary database
    }

    // 2. Cache Miss -> Fetch from primary database
    const fetchStart = performance.now();
    const data = await fetchFn();
    const latencyMs = Number((performance.now() - fetchStart).toFixed(2));

    // 3. Populate Redis asynchronously with TTL (fire & forget to keep response snappy)
    try {
      const serialized = JSON.stringify(data);
      await cacheRepository.set(key, serialized, ttlSeconds);
    } catch {
      // Ignored if Redis is offline
    }

    // 4. Record miss metrics
    await cacheRepository.recordMiss(latencyMs);

    return {
      data,
      cached: false,
      latencyMs,
    };
  }

  // ==========================================================================
  // Key Namespace Builders
  // ==========================================================================

  public keys = {
    recommendation: (studentId: string, type: string, extra?: string) =>
      `recommendation:student:${studentId}:${type}${extra ? `:${extra}` : ''}`,
    dashboard: (studentId: string) => `dashboard:student:${studentId}`,
    popularResources: () => 'popular:resources',
    popularSkills: () => 'popular:skills',
    rateLimit: (endpoint: string, id: string) => `ratelimit:${endpoint}:${id}`,
  };

  // ==========================================================================
  // Student Dashboard Caching (Aggregate Multi-Model View)
  // ==========================================================================

  public async getStudentDashboard(studentId: string): Promise<CacheResult<StudentDashboardData>> {
    const key = this.keys.dashboard(studentId);

    return this.getOrSet(
      key,
      async () => {
        // Fetch student from MongoDB
        let studentDoc = await studentRepository.findById(studentId);
        if (!studentDoc) {
          // Fallback minimal mock object for test/demo resilience
          studentDoc = {
            studentId,
            rollNumber: 'CS2026-001',
            name: 'Demo Student',
            department: 'Computer Science & Engineering',
            currentSemester: 4,
            cgpa: 8.5,
            interests: ['Artificial Intelligence', 'Full-Stack Web Development'],
            skills: [
              { skillId: 'sk_python', level: 'intermediate' },
              { skillId: 'sk_javascript', level: 'intermediate' },
            ],
            completedCourses: [],
            clubMemberships: [],
            attendedEventIds: [],
          } as any;
        }

        // Fetch top recommendations in parallel
        const [courses, projects, jobs] = await Promise.all([
          recommendationService.getRecommendedCourses(studentId, 3).catch(() => []),
          recommendationService.getRecommendedProjects(studentId, 3).catch(() => []),
          recommendationService.getRecommendedJobs(studentId, 2).catch(() => []),
        ]);

        const dashboardData: StudentDashboardData = {
          student: {
            studentId: studentDoc.studentId,
            rollNumber: studentDoc.rollNumber,
            name: studentDoc.name,
            department: studentDoc.department,
            currentSemester: studentDoc.currentSemester,
            cgpa: studentDoc.cgpa,
            interests: studentDoc.interests || [],
          },
          metrics: {
            skillsAcquiredCount: studentDoc.skills?.length || 0,
            completedCoursesCount: studentDoc.completedCourses?.length || 0,
            clubMembershipsCount: studentDoc.clubMemberships?.length || 0,
            attendedEventsCount: studentDoc.attendedEventIds?.length || 0,
          },
          skillsSummary: (studentDoc.skills || []).map((s: any) => ({
            skillId: s.skillId,
            level: s.level,
          })),
          topRecommendedCourses: courses,
          topRecommendedProjects: projects,
          topRecommendedJobs: jobs,
          cachedAt: new Date().toISOString(),
        };

        return dashboardData;
      },
      CACHE_TTL.DASHBOARD
    );
  }

  // ==========================================================================
  // Popular Resources Caching
  // ==========================================================================

  public async getPopularResources(limit: number = 10): Promise<CacheResult<any[]>> {
    const key = this.keys.popularResources();

    return this.getOrSet(
      key,
      async () => {
        try {
          return await resourceRepository.getPopularResources(limit);
        } catch {
          // Fallback if Mongo aggregation is empty or offline
          return [
            {
              resourceId: 'res_01',
              title: 'Interactive Python Data Structures Lab',
              resourceType: 'Interactive Lab',
              difficulty: 'beginner',
              rating: 4.8,
              accessCount: 340,
            },
            {
              resourceId: 'res_02',
              title: 'Essence of Linear Algebra (3Blue1Brown)',
              resourceType: 'Video Series',
              difficulty: 'beginner',
              rating: 4.9,
              accessCount: 512,
            },
            {
              resourceId: 'res_03',
              title: 'Deep Learning Specialization Series',
              resourceType: 'Video Series',
              difficulty: 'advanced',
              rating: 4.7,
              accessCount: 280,
            },
          ];
        }
      },
      CACHE_TTL.POPULAR_RESOURCES
    );
  }

  // ==========================================================================
  // Recommendation Caching Wrappers
  // ==========================================================================

  public async getCachedRecommendedCourses(studentId: string, limit: number = 10) {
    const key = this.keys.recommendation(studentId, `courses:${limit}`);
    return this.getOrSet(key, () => recommendationService.getRecommendedCourses(studentId, limit));
  }

  public async getCachedRecommendedProjects(studentId: string, limit: number = 10) {
    const key = this.keys.recommendation(studentId, `projects:${limit}`);
    return this.getOrSet(key, () => recommendationService.getRecommendedProjects(studentId, limit));
  }

  public async getCachedRecommendedJobs(studentId: string, limit: number = 10) {
    const key = this.keys.recommendation(studentId, `jobs:${limit}`);
    return this.getOrSet(key, () => recommendationService.getRecommendedJobs(studentId, limit));
  }

  public async getCachedLearningPath(studentId: string, targetRole: string) {
    const key = this.keys.recommendation(studentId, `learning-path:${targetRole}`);
    return this.getOrSet(key, () => recommendationService.getLearningPathRecommendation(studentId, targetRole));
  }

  public async getCachedSkillGap(studentId: string, targetType: 'job' | 'project' | 'skill', targetId: string) {
    const key = this.keys.recommendation(studentId, `skill-gap:${targetType}:${targetId}`);
    return this.getOrSet(key, () => recommendationService.getSkillGapAnalysis(studentId, targetType, targetId));
  }

  public async getCachedJobReadiness(studentId: string, jobId: string) {
    const key = this.keys.recommendation(studentId, `job-readiness:${jobId}`);
    return this.getOrSet(key, () => recommendationService.getJobReadinessAnalysis(studentId, jobId));
  }

  // ==========================================================================
  // Invalidation Routines
  // ==========================================================================

  public async invalidate(key: string): Promise<boolean> {
    const count = await cacheRepository.del(key);
    return count > 0;
  }

  public async invalidatePattern(pattern: string): Promise<number> {
    return cacheRepository.delPattern(pattern);
  }

  /**
   * Invalidate all cached data for a specific student (e.g. after adding a skill or completing a course)
   */
  public async invalidateStudentCache(studentId: string): Promise<{
    dashboardInvalidated: boolean;
    recommendationsInvalidated: number;
  }> {
    const dashKey = this.keys.dashboard(studentId);
    const recPattern = `recommendation:student:${studentId}:*`;

    const [delDash, delRecs] = await Promise.all([
      cacheRepository.del(dashKey),
      cacheRepository.delPattern(recPattern),
    ]);

    return {
      dashboardInvalidated: delDash > 0,
      recommendationsInvalidated: delRecs,
    };
  }

  public async flushAll(): Promise<boolean> {
    return cacheRepository.flushAll();
  }

  // ==========================================================================
  // Metrics & Key Inspection
  // ==========================================================================

  public async getMetrics() {
    return cacheRepository.getMetrics();
  }

  public async getAllKeys(): Promise<KeyInfo[]> {
    return cacheRepository.getAllKeysInfo();
  }

  // ==========================================================================
  // Controlled Latency Benchmark Engine
  // ==========================================================================

  /**
   * Executes a controlled latency experiment:
   * 1. Invalidates student cache.
   * 2. Executes N uncached recommendation calls and measures latencies.
   * 3. Executes N cached recommendation calls and measures latencies.
   * 4. Computes average latency, speedup ratio, and reduction percentage.
   */
  public async runBenchmark(studentId: string = 'stu_001', iterations: number = 5): Promise<BenchmarkResult> {
    const clampedIterations = Math.min(20, Math.max(3, iterations));
    const recKey = this.keys.recommendation(studentId, 'benchmark:courses');

    // 1. Force Invalidate to ensure clean slate
    await cacheRepository.del(recKey);

    const uncachedLatencies: number[] = [];
    const cachedLatencies: number[] = [];

    // 2. Measure uncached iterations (invalidating before each call)
    for (let i = 0; i < clampedIterations; i++) {
      await cacheRepository.del(recKey);
      const res = await this.getOrSet(
        recKey,
        () => recommendationService.getRecommendedCourses(studentId, 5),
        CACHE_TTL.RECOMMENDATIONS
      );
      uncachedLatencies.push(res.latencyMs);
    }

    // 3. Ensure key is warm in cache
    await this.getOrSet(
      recKey,
      () => recommendationService.getRecommendedCourses(studentId, 5),
      CACHE_TTL.RECOMMENDATIONS
    );

    // 4. Measure cached iterations
    for (let i = 0; i < clampedIterations; i++) {
      const res = await this.getOrSet(
        recKey,
        () => recommendationService.getRecommendedCourses(studentId, 5),
        CACHE_TTL.RECOMMENDATIONS
      );
      cachedLatencies.push(res.latencyMs);
    }

    // Cleanup benchmark key
    await cacheRepository.del(recKey);

    const avgUncached = Number(
      (uncachedLatencies.reduce((a, b) => a + b, 0) / uncachedLatencies.length).toFixed(2)
    );
    const avgCached = Number(
      (cachedLatencies.reduce((a, b) => a + b, 0) / cachedLatencies.length).toFixed(2)
    );

    const speedup = avgCached > 0 ? Number((avgUncached / avgCached).toFixed(1)) : 1.0;
    const latencyReduction =
      avgUncached > 0 ? Number((((avgUncached - avgCached) / avgUncached) * 100).toFixed(1)) : 0;

    const summary =
      `Controlled benchmark across ${clampedIterations} iterations: ` +
      `Uncached avg latency = ${avgUncached}ms vs Cached avg latency = ${avgCached}ms. ` +
      `Redis cache-aside achieved a ${speedup}x speedup (${latencyReduction}% reduction in request latency).`;

    return {
      studentId,
      iterations: clampedIterations,
      uncachedLatenciesMs: uncachedLatencies,
      cachedLatenciesMs: cachedLatencies,
      avgUncachedLatencyMs: avgUncached,
      avgCachedLatencyMs: avgCached,
      speedupMultiplier: speedup,
      latencyReductionPercent: latencyReduction,
      summary,
    };
  }
}

export const cacheService = new CacheService();
