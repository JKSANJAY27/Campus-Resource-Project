import { Router } from 'express';
import { syncController } from '../controllers/sync.controller.js';
import { heavyRateLimiter, apiRateLimiter } from '../middleware/rateLimiter.js';

export const syncRouter = Router();

// 1. Get synchronization status, failure counters, and retry telemetry
// GET /api/v1/sync/status
syncRouter.get('/status', apiRateLimiter, syncController.getStatus);

// 2. Trigger full initial synchronization pass
// POST /api/v1/sync/initial
syncRouter.post('/initial', heavyRateLimiter, syncController.triggerFullSync);

// 3. Manually propagate entity synchronization
// POST /api/v1/sync/entity
syncRouter.post('/entity', apiRateLimiter, syncController.propagateEntity);
