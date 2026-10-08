import { Request, Response } from 'express';
import { recommendationService } from '../services/recommendation.service.js';
import { cacheService } from '../services/cache.service.js';
import { asyncHandler, ok } from './helpers.js';

export class RecommendationController {
  /**
   * 1. Skill Gap Analysis (Cached)
   * GET /api/v1/recommendations/students/:studentId/skill-gap?targetType=job&targetId=job_01
   */
  public getSkillGap = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const { targetType, targetId } = req.query as {
      targetType: 'job' | 'project' | 'skill';
      targetId: string;
    };

    if (!targetType || !targetId) {
      res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: 'Query parameters "targetType" and "targetId" are required.',
      });
      return;
    }

    const { data, cached, latencyMs } = await cacheService.getCachedSkillGap(studentId, targetType, targetId);
    res.setHeader('X-Cache-Status', cached ? 'HIT' : 'MISS');
    res.setHeader('X-Response-Time-Ms', latencyMs.toString());
    ok(res, data, `Skill gap analysis computed (${cached ? 'Cache HIT' : 'Cache MISS'} in ${latencyMs}ms)`);
  });

  /**
   * 2. Personalized Learning Path Recommendation (Cached)
   * GET /api/v1/recommendations/students/:studentId/learning-path?targetRole=ai-ml-engineer
   */
  public getLearningPath = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const targetRole = (req.query.targetRole as string) || 'full-stack-developer';

    const { data, cached, latencyMs } = await cacheService.getCachedLearningPath(studentId, targetRole);
    res.setHeader('X-Cache-Status', cached ? 'HIT' : 'MISS');
    res.setHeader('X-Response-Time-Ms', latencyMs.toString());
    ok(res, data, `Learning path generated (${cached ? 'Cache HIT' : 'Cache MISS'} in ${latencyMs}ms)`);
  });

  /**
   * 3. Recommended Courses (Cached)
   * GET /api/v1/recommendations/students/:studentId/courses?limit=10
   */
  public getRecommendedCourses = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const { data, cached, latencyMs } = await cacheService.getCachedRecommendedCourses(studentId, limit);
    res.setHeader('X-Cache-Status', cached ? 'HIT' : 'MISS');
    res.setHeader('X-Response-Time-Ms', latencyMs.toString());
    ok(res, data, `Recommended courses retrieved (${cached ? 'Cache HIT' : 'Cache MISS'} in ${latencyMs}ms)`);
  });

  /**
   * 4. Recommended Projects (Cached)
   * GET /api/v1/recommendations/students/:studentId/projects?limit=10
   */
  public getRecommendedProjects = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const { data, cached, latencyMs } = await cacheService.getCachedRecommendedProjects(studentId, limit);
    res.setHeader('X-Cache-Status', cached ? 'HIT' : 'MISS');
    res.setHeader('X-Response-Time-Ms', latencyMs.toString());
    ok(res, data, `Recommended projects retrieved (${cached ? 'Cache HIT' : 'Cache MISS'} in ${latencyMs}ms)`);
  });

  /**
   * 5. Recommended Jobs (Cached)
   * GET /api/v1/recommendations/students/:studentId/jobs?limit=10
   */
  public getRecommendedJobs = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const { data, cached, latencyMs } = await cacheService.getCachedRecommendedJobs(studentId, limit);
    res.setHeader('X-Cache-Status', cached ? 'HIT' : 'MISS');
    res.setHeader('X-Response-Time-Ms', latencyMs.toString());
    ok(res, data, `Recommended jobs retrieved (${cached ? 'Cache HIT' : 'Cache MISS'} in ${latencyMs}ms)`);
  });

  /**
   * 6. Job Readiness Analysis (Cached)
   * GET /api/v1/recommendations/students/:studentId/job-readiness/:jobId
   */
  public getJobReadiness = asyncHandler(async (req: Request, res: Response) => {
    const { studentId, jobId } = req.params;

    const { data, cached, latencyMs } = await cacheService.getCachedJobReadiness(studentId, jobId);
    res.setHeader('X-Cache-Status', cached ? 'HIT' : 'MISS');
    res.setHeader('X-Response-Time-Ms', latencyMs.toString());
    ok(res, data, `Job readiness report generated (${cached ? 'Cache HIT' : 'Cache MISS'} in ${latencyMs}ms)`);
  });

  /**
   * 7. Recommended Resources (Direct / Cached)
   * GET /api/v1/recommendations/students/:studentId/resources?limit=10
   */
  public getRecommendedResources = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const result = await recommendationService.getRecommendedResources(studentId, limit);
    ok(res, result, 'Recommended resources retrieved successfully');
  });

  /**
   * 8. Available Career Roles
   * GET /api/v1/recommendations/roles
   */
  public getAvailableRoles = asyncHandler(async (_req: Request, res: Response) => {
    const roles = recommendationService.getAvailableRoles();
    ok(res, roles, 'Available career roles retrieved successfully');
  });
}

export const recommendationController = new RecommendationController();
