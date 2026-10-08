import { Router } from 'express';
import {
  createFacility, getFacility, listFacilities, updateFacility, deleteFacility,
  findAvailableForEvent, getFacilityUsage, getTypeSummary,
} from '../controllers/facility.controller.js';

export const facilityRouter = Router();

facilityRouter.get('/analytics/usage', getFacilityUsage);
facilityRouter.get('/analytics/type-summary', getTypeSummary);
facilityRouter.get('/search/available', findAvailableForEvent);

facilityRouter.post('/', createFacility);
facilityRouter.get('/', listFacilities);
facilityRouter.get('/:facilityId', getFacility);
facilityRouter.put('/:facilityId', updateFacility);
facilityRouter.delete('/:facilityId', deleteFacility);
