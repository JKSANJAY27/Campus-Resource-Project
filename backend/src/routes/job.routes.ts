import { Router } from 'express';
import {
  createJob, getJob, listJobs, updateJob, deleteJob,
  getEligibleJobs, getExpiringSoon, getSkillDemandStats, getCompanyLandscape,
} from '../controllers/job.controller.js';

export const jobRouter = Router();

jobRouter.get('/analytics/skill-demand', getSkillDemandStats);
jobRouter.get('/analytics/companies', getCompanyLandscape);
jobRouter.get('/search/eligible', getEligibleJobs);
jobRouter.get('/search/expiring-soon', getExpiringSoon);

jobRouter.post('/', createJob);
jobRouter.get('/', listJobs);
jobRouter.get('/:jobId', getJob);
jobRouter.put('/:jobId', updateJob);
jobRouter.delete('/:jobId', deleteJob);
