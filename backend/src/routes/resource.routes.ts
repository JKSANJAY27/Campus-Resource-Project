import { Router } from 'express';
import {
  createResource, getResource, listResources, updateResource, deleteResource,
  trackAccess, rateResource, getPopularResources, getTypeDistribution, getSkillCoverage,
} from '../controllers/resource.controller.js';

export const resourceRouter = Router();

resourceRouter.get('/analytics/popular', getPopularResources);
resourceRouter.get('/analytics/type-distribution', getTypeDistribution);
resourceRouter.get('/analytics/skill-coverage', getSkillCoverage);

resourceRouter.post('/', createResource);
resourceRouter.get('/', listResources);
resourceRouter.get('/:resourceId', getResource);
resourceRouter.put('/:resourceId', updateResource);
resourceRouter.delete('/:resourceId', deleteResource);
resourceRouter.post('/:resourceId/access', trackAccess);
resourceRouter.post('/:resourceId/rate', rateResource);
