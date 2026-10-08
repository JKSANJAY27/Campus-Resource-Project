import { Request, Response } from 'express';
import { activityService } from '../services/activity.service.js';
import { asyncHandler, ok } from './helpers.js';

export class ActivityController {
  /**
   * 1. Record Single Student Activity Event
   * POST /api/v1/activity/events
   */
  public recordEvent = asyncHandler(async (req: Request, res: Response) => {
    const { studentId, actionType, targetEntityType, targetEntityId, activityDate, durationSeconds, metadata } =
      req.body || {};

    if (!studentId || !actionType || !targetEntityType || !targetEntityId) {
      res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: 'studentId, actionType, targetEntityType, and targetEntityId are required.',
      });
      return;
    }

    await activityService.recordEvent({
      studentId,
      actionType,
      targetEntityType,
      targetEntityId,
      activityDate,
      durationSeconds: durationSeconds ? parseInt(durationSeconds, 10) : 0,
      metadataJson: metadata ? JSON.stringify(metadata) : undefined,
    });

    ok(res, { status: 'recorded' }, 'Activity event logged into Cassandra successfully', 201);
  });

  /**
   * 2. Query Pattern 1: Student Activity by Date
   * GET /api/v1/activity/students/:studentId?date=YYYY-MM-DD&limit=50
   */
  public getStudentActivity = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const date = req.query.date as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const events = await activityService.getStudentActivity(studentId, date, limit);
    ok(res, events, 'Student activity retrieved for date partition');
  });

  /**
   * 3. Query Pattern 2: Resource Activity by Date
   * GET /api/v1/activity/resources/:resourceId?date=YYYY-MM-DD&limit=50
   */
  public getResourceActivity = asyncHandler(async (req: Request, res: Response) => {
    const { resourceId } = req.params;
    const date = req.query.date as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const events = await activityService.getResourceActivity(resourceId, date, limit);
    ok(res, events, 'Resource activity retrieved for date partition');
  });

  /**
   * 4. Query Pattern 3: Recommendation Interaction History
   * GET /api/v1/activity/students/:studentId/recommendations?recType=course&limit=50
   */
  public getRecommendationHistory = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const recType = req.query.recType as any;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const history = await activityService.getRecommendationHistory(studentId, recType, limit);
    ok(res, history, 'Recommendation interaction history retrieved');
  });

  /**
   * 5. Query Pattern 4: Daily Activity Rollup
   * GET /api/v1/activity/daily-summary?date=YYYY-MM-DD
   */
  public getDailySummary = asyncHandler(async (req: Request, res: Response) => {
    const date = req.query.date as string | undefined;
    const summary = await activityService.getDailySummary(date);
    ok(res, summary, 'Daily activity summary retrieved');
  });

  /**
   * 6. Analytics Time-Series Trends
   * GET /api/v1/activity/trends?days=7
   */
  public getActivityTrends = asyncHandler(async (req: Request, res: Response) => {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
    const trends = await activityService.getActivityTrends(days);
    ok(res, trends, 'Activity trends time-series retrieved');
  });

  /**
   * 7. Bulk Synthetic Event Simulation (Stress Testing & Demo Seeding)
   * POST /api/v1/activity/simulate
   * Body: { count: 1000, studentIds?: string[], daysBack?: 7 }
   */
  public simulateEvents = asyncHandler(async (req: Request, res: Response) => {
    const count = req.body?.count ? parseInt(req.body.count, 10) : 500;
    const studentIds = req.body?.studentIds;
    const daysBack = req.body?.daysBack ? parseInt(req.body.daysBack, 10) : 5;

    const result = await activityService.simulateSyntheticEvents({ count, studentIds, daysBack });
    ok(res, result, `Simulated and appended ${result.countInserted} synthetic events into Cassandra`);
  });
}

export const activityController = new ActivityController();
