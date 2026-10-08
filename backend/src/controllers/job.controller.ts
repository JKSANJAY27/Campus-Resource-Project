import { Request, Response } from 'express';
import { jobService } from '../services/job.service.js';
import { asyncHandler, ok, paginated, parseQueryOptions } from './helpers.js';

export const createJob = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await jobService.createJob(req.body), 'Job created', 201);
});

export const getJob = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await jobService.getJob(req.params.jobId));
});

export const listJobs = asyncHandler(async (req: Request, res: Response) => {
  const opts = {
    ...parseQueryOptions(req),
    jobType: req.query.jobType as string | undefined,
    domain: req.query.domain as string | undefined,
    skillId: req.query.skillId as string | undefined,
    minCgpa: req.query.minCgpa ? Number(req.query.minCgpa) : undefined,
    company: req.query.company as string | undefined,
    openOnly: req.query.openOnly === 'true',
  };
  paginated(res, await jobService.listJobs(opts));
});

export const updateJob = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await jobService.updateJob(req.params.jobId, req.body), 'Job updated');
});

export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await jobService.deleteJob(req.params.jobId), 'Job deleted');
});

export const getEligibleJobs = asyncHandler(async (req: Request, res: Response) => {
  const skillIds = (req.query.skillIds as string)?.split(',') ?? [];
  const cgpa = req.query.cgpa ? Number(req.query.cgpa) : 10;
  ok(res, await jobService.getEligibleJobs(skillIds, cgpa));
});

export const getExpiringSoon = asyncHandler(async (req: Request, res: Response) => {
  const days = req.query.days ? Number(req.query.days) : 7;
  ok(res, await jobService.getExpiringSoon(days));
});

export const getSkillDemandStats = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await jobService.getSkillDemandStats(req.query.limit ? Number(req.query.limit) : 15));
});

export const getCompanyLandscape = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await jobService.getCompanyLandscape(req.query.limit ? Number(req.query.limit) : 15));
});
