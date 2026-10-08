import { Request, Response } from 'express';
import { cacheService } from '../services/cache.service.js';
import { asyncHandler, ok } from './helpers.js';

export class CacheController {
  /**
   * 1. Get Real-Time Cache Metrics
   * GET /api/v1/cache/metrics
   */
  public getMetrics = asyncHandler(async (_req: Request, res: Response) => {
    const metrics = await cacheService.getMetrics();
    ok(res, metrics, 'Cache metrics retrieved successfully');
  });

  /**
   * 2. List All Active Cached Keys with TTL
   * GET /api/v1/cache/keys
   */
  public getAllKeys = asyncHandler(async (_req: Request, res: Response) => {
    const keys = await cacheService.getAllKeys();
    ok(res, keys, 'Cached keys retrieved successfully');
  });

  /**
   * 3. Invalidate Cache by Key, Pattern, or Student ID
   * POST /api/v1/cache/invalidate
   * Body: { key?: string, pattern?: string, studentId?: string }
   */
  public invalidate = asyncHandler(async (req: Request, res: Response) => {
    const { key, pattern, studentId } = req.body || {};

    if (!key && !pattern && !studentId) {
      res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: 'Must provide at least one of: "key", "pattern", or "studentId" in request body.',
      });
      return;
    }

    if (studentId) {
      const result = await cacheService.invalidateStudentCache(studentId);
      ok(res, result, `Cache for student '${studentId}' invalidated successfully`);
      return;
    }

    if (key) {
      const deleted = await cacheService.invalidate(key);
      ok(res, { key, deleted }, `Key '${key}' invalidation status: ${deleted}`);
      return;
    }

    if (pattern) {
      const count = await cacheService.invalidatePattern(pattern);
      ok(res, { pattern, count }, `Invalidated ${count} key(s) matching pattern '${pattern}'`);
      return;
    }
  });

  /**
   * 4. Flush Entire Cache
   * POST /api/v1/cache/flush
   */
  public flushAll = asyncHandler(async (_req: Request, res: Response) => {
    const flushed = await cacheService.flushAll();
    ok(res, { flushed }, 'Entire cache database flushed successfully');
  });

  /**
   * 5. Run Controlled Latency Benchmark (Cached vs Uncached Comparison)
   * POST /api/v1/cache/benchmark
   * Body: { studentId?: string, iterations?: number }
   */
  public runBenchmark = asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.body?.studentId || 'stu_001';
    const iterations = req.body?.iterations ? parseInt(req.body.iterations, 10) : 5;

    const benchmark = await cacheService.runBenchmark(studentId, iterations);
    ok(res, benchmark, 'Cache latency benchmark executed successfully');
  });

  /**
   * 6. Get Cached Student Dashboard
   * GET /api/v1/cache/students/:studentId/dashboard
   */
  public getStudentDashboard = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const result = await cacheService.getStudentDashboard(studentId);
    ok(res, result, 'Student dashboard retrieved (cache-aside)');
  });

  /**
   * 7. Get Cached Popular Resources
   * GET /api/v1/cache/popular/resources
   */
  public getPopularResources = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const result = await cacheService.getPopularResources(limit);
    ok(res, result, 'Popular resources retrieved (cache-aside)');
  });
}

export const cacheController = new CacheController();
