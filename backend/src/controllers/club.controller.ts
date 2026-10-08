import { Request, Response } from 'express';
import { clubService } from '../services/club.service.js';
import { asyncHandler, ok, paginated, parseQueryOptions } from './helpers.js';

export const createClub = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await clubService.createClub(req.body), 'Club created', 201);
});

export const getClub = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await clubService.getClub(req.params.clubId));
});

export const listClubs = asyncHandler(async (req: Request, res: Response) => {
  const opts = {
    ...parseQueryOptions(req),
    category: req.query.category as string | undefined,
  };
  paginated(res, await clubService.listClubs(opts));
});

export const updateClub = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await clubService.updateClub(req.params.clubId, req.body), 'Club updated');
});

export const deleteClub = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await clubService.deleteClub(req.params.clubId), 'Club deleted');
});

export const getClubActivity = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await clubService.getClubActivity());
});

export const getCategoryBreakdown = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await clubService.getCategoryBreakdown());
});
