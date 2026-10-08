import { Router } from 'express';
import { cacheController } from '../controllers/cache.controller.js';
import { heavyRateLimiter, apiRateLimiter } from '../middleware/rateLimiter.js';

export const cacheRouter = Router();

// 1. Cache telemetry & metrics
cacheRouter.get('/metrics', cacheController.getMetrics);

// 2. Active cached keys & TTL inspection
cacheRouter.get('/keys', cacheController.getAllKeys);

// 3. Cache invalidation
cacheRouter.post('/invalidate', cacheController.invalidate);

// 4. Flush entire cache
cacheRouter.post('/flush', cacheController.flushAll);

// 5. Controlled performance benchmark experiment (rate limited)
cacheRouter.post('/benchmark', heavyRateLimiter, cacheController.runBenchmark);

// 6. Cached Student Dashboard (Aggregate Multi-Model View)
cacheRouter.get('/students/:studentId/dashboard', apiRateLimiter, cacheController.getStudentDashboard);

// 7. Cached Popular Resources
cacheRouter.get('/popular/resources', apiRateLimiter, cacheController.getPopularResources);
