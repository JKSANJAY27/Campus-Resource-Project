import { Request, Response } from 'express';
import { resourceService } from '../services/resource.service.js';
import { asyncHandler, ok, paginated, parseQueryOptions } from './helpers.js';

export const createResource = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await resourceService.createResource(req.body), 'Resource created', 201);
});

export const getResource = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await resourceService.getResource(req.params.resourceId));
});

export const listResources = asyncHandler(async (req: Request, res: Response) => {
  const opts = {
    ...parseQueryOptions(req),
    resourceType: req.query.resourceType as string | undefined,
    difficulty: req.query.difficulty as string | undefined,
    skillId: req.query.skillId as string | undefined,
    minRating: req.query.minRating ? Number(req.query.minRating) : undefined,
  };
  paginated(res, await resourceService.listResources(opts));
});

export const updateResource = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await resourceService.updateResource(req.params.resourceId, req.body), 'Resource updated');
});

export const deleteResource = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await resourceService.deleteResource(req.params.resourceId), 'Resource deleted');
});

export const trackAccess = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await resourceService.trackAccess(req.params.resourceId), 'Access tracked');
});

export const rateResource = asyncHandler(async (req: Request, res: Response) => {
  const { rating } = req.body;
  ok(res, await resourceService.rateResource(req.params.resourceId, rating), 'Rating submitted');
});

export const getPopularResources = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await resourceService.getPopularResources(req.query.limit ? Number(req.query.limit) : 10));
});

export const getTypeDistribution = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await resourceService.getTypeDistribution());
});

export const getSkillCoverage = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await resourceService.getSkillCoverage(req.query.limit ? Number(req.query.limit) : 20));
});
