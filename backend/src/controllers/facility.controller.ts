import { Request, Response } from 'express';
import { facilityService } from '../services/facility.service.js';
import { asyncHandler, ok, paginated, parseQueryOptions } from './helpers.js';

export const createFacility = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await facilityService.createFacility(req.body), 'Facility created', 201);
});

export const getFacility = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await facilityService.getFacility(req.params.facilityId));
});

export const listFacilities = asyncHandler(async (req: Request, res: Response) => {
  const opts = {
    ...parseQueryOptions(req),
    facilityType: req.query.facilityType as string | undefined,
    building: req.query.building as string | undefined,
    minCapacity: req.query.minCapacity ? Number(req.query.minCapacity) : undefined,
  };
  paginated(res, await facilityService.listFacilities(opts));
});

export const updateFacility = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await facilityService.updateFacility(req.params.facilityId, req.body), 'Facility updated');
});

export const deleteFacility = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await facilityService.deleteFacility(req.params.facilityId), 'Facility deleted');
});

export const findAvailableForEvent = asyncHandler(async (req: Request, res: Response) => {
  const capacity = Number(req.query.capacity ?? 0);
  ok(res, await facilityService.findAvailableForEvent(capacity));
});

export const getFacilityUsage = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await facilityService.getFacilityUsage());
});

export const getTypeSummary = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await facilityService.getTypeSummary());
});
