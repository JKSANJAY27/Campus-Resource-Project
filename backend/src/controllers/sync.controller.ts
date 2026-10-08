import { Request, Response } from 'express';
import { syncService } from '../services/sync.service.js';
import { asyncHandler, ok } from './helpers.js';

export class SyncController {
  /**
   * 1. Get Synchronization Status & Telemetry
   * GET /api/v1/sync/status
   */
  public getStatus = asyncHandler(async (_req: Request, res: Response) => {
    const status = syncService.getSyncStatus();
    ok(res, status, 'Synchronization status retrieved successfully');
  });

  /**
   * 2. Trigger Full Initial / Idempotent Synchronization Pass
   * POST /api/v1/sync/initial
   */
  public triggerFullSync = asyncHandler(async (_req: Request, res: Response) => {
    const result = await syncService.performFullSync();
    ok(res, result, 'Full multi-store synchronization completed');
  });

  /**
   * 3. Propagate Individual Entity Mutation
   * POST /api/v1/sync/entity
   * Body: { entityType: 'student' | 'course' | 'skill', entityId: string }
   */
  public propagateEntity = asyncHandler(async (req: Request, res: Response) => {
    const { entityType, entityId } = req.body || {};

    if (!entityType || !entityId) {
      res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: 'entityType and entityId are required in request body.',
      });
      return;
    }

    if (entityType === 'student') {
      await syncService.propagateStudentUpdate(entityId);
    } else if (entityType === 'course') {
      await syncService.propagateCourseUpdate(entityId);
    } else if (entityType === 'skill') {
      await syncService.propagateSkillUpdate(entityId);
    } else {
      res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: `Unsupported entityType '${entityType}'. Supported types: student, course, skill.`,
      });
      return;
    }

    ok(res, { entityType, entityId, status: 'propagated' }, `Entity '${entityId}' synchronized across NoSQL stores`);
  });
}

export const syncController = new SyncController();
