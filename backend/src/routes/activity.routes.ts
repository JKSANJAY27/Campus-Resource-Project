import { Router } from 'express';
import { activityController } from '../controllers/activity.controller.js';
import { heavyRateLimiter, apiRateLimiter } from '../middleware/rateLimiter.js';

export const activityRouter = Router();

// 1. Single Event Append
// POST /api/v1/activity/events
activityRouter.post('/events', apiRateLimiter, activityController.recordEvent);

// 2. Query Pattern 1: Student Activity by Date
// GET /api/v1/activity/students/:studentId?date=YYYY-MM-DD&limit=50
activityRouter.get('/students/:studentId', apiRateLimiter, activityController.getStudentActivity);

// 3. Query Pattern 2: Resource Activity by Date
// GET /api/v1/activity/resources/:resourceId?date=YYYY-MM-DD&limit=50
activityRouter.get('/resources/:resourceId', apiRateLimiter, activityController.getResourceActivity);

// 4. Query Pattern 3: Recommendation History by Student
// GET /api/v1/activity/students/:studentId/recommendations?recType=course&limit=50
activityRouter.get(
  '/students/:studentId/recommendations',
  apiRateLimiter,
  activityController.getRecommendationHistory
);

// 5. Query Pattern 4: Daily Activity Rollup
// GET /api/v1/activity/daily-summary?date=YYYY-MM-DD
activityRouter.get('/daily-summary', apiRateLimiter, activityController.getDailySummary);

// 6. Analytics Time-Series Trends
// GET /api/v1/activity/trends?days=7
activityRouter.get('/trends', apiRateLimiter, activityController.getActivityTrends);

// 7. High-Volume Synthetic Event Simulator (Stress Testing)
// POST /api/v1/activity/simulate
activityRouter.post('/simulate', heavyRateLimiter, activityController.simulateEvents);
