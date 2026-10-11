import { Router } from 'express';
import {
  createJob, getJob, listJobs, updateJob, deleteJob,
  getEligibleJobs, getExpiringSoon, getSkillDemandStats, getCompanyLandscape,
} from '../controllers/job.controller.js';
import {
  searchJobsHandler,
  getJobByIdHandler,
  getJobsForRoleHandler,
  getProvidersStatusHandler,
} from '../controllers/external-job.controller.js';
import {
  analyzeJobTextHandler,
  analyzeJobByIdHandler,
} from '../controllers/job-analyzer.controller.js';

export const jobRouter = Router();

// ── Job Description Analysis & Matching Routes ────────────────────────────────
jobRouter.post('/analyze', analyzeJobTextHandler);

// ── External & Live Provider Job Routes ───────────────────────────────────────
// (Must be registered before /:jobId parameter route)
jobRouter.get('/search', searchJobsHandler);
jobRouter.get('/providers/status', getProvidersStatusHandler);
jobRouter.get('/role/:roleId', getJobsForRoleHandler);

// ── Specific Job Analysis & Match (registered before generic /:jobId) ─────────
jobRouter.get('/:jobId/analysis', analyzeJobByIdHandler);
jobRouter.get('/:jobId/match', analyzeJobByIdHandler);

// ── Campus Internal Job Analytics & Search ────────────────────────────────────
jobRouter.get('/analytics/skill-demand', getSkillDemandStats);
jobRouter.get('/analytics/companies', getCompanyLandscape);
jobRouter.get('/search/eligible', getEligibleJobs);
jobRouter.get('/search/expiring-soon', getExpiringSoon);

// ── Job Retrieval & CRUD Routes ───────────────────────────────────────────────
jobRouter.post('/', createJob);
jobRouter.get('/', listJobs);
jobRouter.get('/:jobId', getJob);
jobRouter.put('/:jobId', updateJob);
jobRouter.delete('/:jobId', deleteJob);
