import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheService, CACHE_TTL } from '../src/services/cache.service.js';
import { cacheRepository } from '../src/repositories/redis/cache.repository.js';
import { createRateLimiter } from '../src/middleware/rateLimiter.js';
import { recommendationService } from '../src/services/recommendation.service.js';

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

vi.mock('../src/services/recommendation.service.js', () => ({
  recommendationService: {
    getRecommendedCourses: vi.fn(),
    getRecommendedProjects: vi.fn(),
    getRecommendedJobs: vi.fn(),
    getLearningPathRecommendation: vi.fn(),
    getSkillGapAnalysis: vi.fn(),
    getJobReadinessAnalysis: vi.fn(),
  },
}));

describe('Phase 6: Redis Caching & Key-Value Layer - Unit Tests', () => {
  let service: CacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CacheService();
  });

  // ==========================================================================
  // 1. Cache-Aside Pattern Mechanics
  // ==========================================================================
  describe('Cache-Aside Pattern (getOrSet)', () => {
    it('should fetch from primary source on CACHE MISS, save to Redis with TTL, and record miss', async () => {
      // Setup: Redis returns null (miss)
      vi.mocked(cacheRepository.get).mockResolvedValueOnce(null);
      vi.mocked(cacheRepository.set).mockResolvedValueOnce(true);

      const mockDbFetcher = vi.fn().mockResolvedValue({ id: 'rec_01', title: 'ML Course' });

      const result = await service.getOrSet('test:key', mockDbFetcher, 300);

      // Verify fetcher was called
      expect(mockDbFetcher).toHaveBeenCalledTimes(1);

      // Verify cache set was called with serialized value and TTL
      expect(cacheRepository.set).toHaveBeenCalledWith(
        'test:key',
        JSON.stringify({ id: 'rec_01', title: 'ML Course' }),
        300
      );

      // Verify metrics recorded
      expect(cacheRepository.recordMiss).toHaveBeenCalledTimes(1);
      expect(cacheRepository.recordHit).not.toHaveBeenCalled();

      // Verify output
      expect(result.cached).toBe(false);
      expect(result.data).toEqual({ id: 'rec_01', title: 'ML Course' });
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return from Redis on CACHE HIT without executing primary database fetcher', async () => {
      const cachedPayload = JSON.stringify({ id: 'cached_01', title: 'Cached AI Course' });
      vi.mocked(cacheRepository.get).mockResolvedValueOnce(cachedPayload);

      const mockDbFetcher = vi.fn().mockResolvedValue({ id: 'fresh_01' });

      const result = await service.getOrSet('test:key', mockDbFetcher, 300);

      // Primary fetcher must NEVER be called on a cache hit
      expect(mockDbFetcher).not.toHaveBeenCalled();

      // Record hit metric
      expect(cacheRepository.recordHit).toHaveBeenCalledTimes(1);
      expect(cacheRepository.recordMiss).not.toHaveBeenCalled();

      expect(result.cached).toBe(true);
      expect(result.data).toEqual({ id: 'cached_01', title: 'Cached AI Course' });
    });

    it('should safely recover from corrupt/unparseable JSON in cache by purging key and re-fetching', async () => {
      // Malformed string
      vi.mocked(cacheRepository.get).mockResolvedValueOnce('INVALID_JSON_OBJECT{{{');
      vi.mocked(cacheRepository.del).mockResolvedValueOnce(1);
      vi.mocked(cacheRepository.set).mockResolvedValueOnce(true);

      const mockDbFetcher = vi.fn().mockResolvedValue({ status: 'recovered' });

      const result = await service.getOrSet('corrupt:key', mockDbFetcher, 300);

      // Corrupt key deleted
      expect(cacheRepository.del).toHaveBeenCalledWith('corrupt:key');

      // Fetcher called to re-heal
      expect(mockDbFetcher).toHaveBeenCalledTimes(1);
      expect(result.cached).toBe(false);
      expect(result.data).toEqual({ status: 'recovered' });
    });
  });

  // ==========================================================================
  // 2. Namespace & TTL Strategy
  // ==========================================================================
  describe('Key Namespace & TTL Strategy', () => {
    it('should format keys following uniform hierarchical namespaces', () => {
      expect(service.keys.dashboard('stu_001')).toBe('dashboard:student:stu_001');
      expect(service.keys.recommendation('stu_001', 'jobs')).toBe('recommendation:student:stu_001:jobs');
      expect(service.keys.recommendation('stu_001', 'learning-path', 'ai-ml')).toBe(
        'recommendation:student:stu_001:learning-path:ai-ml'
      );
      expect(service.keys.popularResources()).toBe('popular:resources');
      expect(service.keys.rateLimit('api', '127.0.0.1')).toBe('ratelimit:api:127.0.0.1');
    });

    it('should use defined TTL standards for different caches', () => {
      expect(CACHE_TTL.RECOMMENDATIONS).toBe(300); // 5 mins
      expect(CACHE_TTL.DASHBOARD).toBe(300);       // 5 mins
      expect(CACHE_TTL.POPULAR_RESOURCES).toBe(600); // 10 mins
    });
  });

  // ==========================================================================
  // 3. Cache Invalidation
  // ==========================================================================
  describe('Cache Invalidation', () => {
    it('should invalidate individual key', async () => {
      vi.mocked(cacheRepository.del).mockResolvedValueOnce(1);
      const res = await service.invalidate('some:key');
      expect(res).toBe(true);
      expect(cacheRepository.del).toHaveBeenCalledWith('some:key');
    });

    it('should invalidate patterns via SCAN + DEL', async () => {
      vi.mocked(cacheRepository.delPattern).mockResolvedValueOnce(5);
      const count = await service.invalidatePattern('recommendation:student:stu_001:*');
      expect(count).toBe(5);
      expect(cacheRepository.delPattern).toHaveBeenCalledWith('recommendation:student:stu_001:*');
    });

    it('should invalidate both student dashboard and all recommendations for student', async () => {
      vi.mocked(cacheRepository.del).mockResolvedValueOnce(1); // dashboard
      vi.mocked(cacheRepository.delPattern).mockResolvedValueOnce(4); // recommendations

      const res = await service.invalidateStudentCache('stu_001');

      expect(res.dashboardInvalidated).toBe(true);
      expect(res.recommendationsInvalidated).toBe(4);
      expect(cacheRepository.del).toHaveBeenCalledWith('dashboard:student:stu_001');
      expect(cacheRepository.delPattern).toHaveBeenCalledWith('recommendation:student:stu_001:*');
    });
  });

  // ==========================================================================
  // 4. Rate Limiting Middleware
  // ==========================================================================
  describe('Redis Rate Limiting Middleware', () => {
    it('should allow requests under the quota and set X-RateLimit headers', async () => {
      vi.mocked(cacheRepository.checkRateLimit).mockResolvedValueOnce({
        allowed: true,
        current: 5,
        remaining: 25,
        resetSeconds: 45,
      });

      const limiter = createRateLimiter({ limit: 30, windowSeconds: 60 });
      const req: any = { headers: {}, socket: { remoteAddress: '192.168.1.1' }, baseUrl: '/api/v1/recommendations' };
      const headers: Record<string, string> = {};
      const res: any = {
        setHeader: vi.fn((k, v) => (headers[k] = v)),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await limiter(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '30');
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '25');
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', '45');
    });

    it('should block requests exceeding quota with 429 and Retry-After header', async () => {
      vi.mocked(cacheRepository.checkRateLimit).mockResolvedValueOnce({
        allowed: false,
        current: 31,
        remaining: 0,
        resetSeconds: 15,
      });

      const limiter = createRateLimiter({ limit: 30, windowSeconds: 60 });
      const req: any = { headers: {}, socket: { remoteAddress: '192.168.1.1' }, baseUrl: '/api/v1/recommendations' };
      const res: any = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await limiter(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '15');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'TooManyRequests',
          retryAfterSeconds: 15,
        })
      );
    });
  });

  // ==========================================================================
  // 5. Controlled Latency Benchmark Engine
  // ==========================================================================
  describe('Controlled Benchmark Engine', () => {
    it('should compute speedup multiplier and latency reduction across iterations', async () => {
      // Mock recommendation call
      vi.mocked(recommendationService.getRecommendedCourses).mockResolvedValue([
        { courseId: 'c1', title: 'ML', score: 0.9 } as any,
      ]);

      // Alternating miss and hit for the benchmark
      vi.mocked(cacheRepository.get).mockImplementation(async (key) => {
        // Return null for misses, payload for hits
        return JSON.stringify([{ courseId: 'c1', title: 'ML', score: 0.9 }]);
      });
      vi.mocked(cacheRepository.del).mockResolvedValue(1);
      vi.mocked(cacheRepository.set).mockResolvedValue(true);

      const benchmark = await service.runBenchmark('stu_001', 3);

      expect(benchmark.studentId).toBe('stu_001');
      expect(benchmark.iterations).toBe(3);
      expect(benchmark.uncachedLatenciesMs).toHaveLength(3);
      expect(benchmark.cachedLatenciesMs).toHaveLength(3);
      expect(benchmark.speedupMultiplier).toBeGreaterThanOrEqual(1.0);
      expect(benchmark.summary).toContain('Controlled benchmark across 3 iterations');
    });
  });
});
