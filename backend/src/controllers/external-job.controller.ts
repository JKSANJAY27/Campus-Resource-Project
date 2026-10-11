import { Request, Response } from 'express';
import { externalJobService } from '../services/external-job.service.js';
import { JobSearchParams } from '../types/job-provider.types.js';

/**
 * Controller for free live job listings, role-based postings, and provider status.
 */

export const searchJobsHandler = async (req: Request, res: Response) => {
  try {
    const params: JobSearchParams = {
      keyword: (req.query.keyword || req.query.q) as string | undefined,
      q: (req.query.q || req.query.keyword) as string | undefined,
      roleId: req.query.roleId as string | undefined,
      location: (req.query.location || req.query.geo) as string | undefined,
      geo: (req.query.geo || req.query.location) as string | undefined,
      category: (req.query.category || req.query.industry) as string | undefined,
      industry: (req.query.industry || req.query.category) as string | undefined,
      workArrangement: req.query.workArrangement as any,
      employmentType: req.query.employmentType as any,
      experienceLevel: req.query.experienceLevel as any,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      forceFresh: req.query.forceFresh === 'true',
    };

    const results = await externalJobService.searchJobs(params);
    res.status(200).json(results);
  } catch (err: any) {
    console.error('[ExternalJobController] Search error:', err);
    res.status(500).json({
      success: false,
      error: 'Job Search Failed',
      message: err.message || 'An unexpected error occurred while searching jobs.',
    });
  }
};

export const getJobByIdHandler = async (req: Request, res: Response) => {
  try {
    const id = req.params.id || req.params.jobId;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Job ID parameter is required.',
      });
    }

    const job = await externalJobService.getJobById(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Job listing with ID "${id}" was not found.`,
      });
    }

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (err: any) {
    console.error('[ExternalJobController] GetJob error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message || 'An error occurred while retrieving job details.',
    });
  }
};

export const getJobsForRoleHandler = async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    if (!roleId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'roleId parameter is required.',
      });
    }

    const params: JobSearchParams = {
      location: (req.query.location || req.query.geo) as string | undefined,
      workArrangement: req.query.workArrangement as any,
      employmentType: req.query.employmentType as any,
      experienceLevel: req.query.experienceLevel as any,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      forceFresh: req.query.forceFresh === 'true',
    };

    const results = await externalJobService.getJobsForRole(roleId, params);
    res.status(200).json(results);
  } catch (err: any) {
    console.error('[ExternalJobController] GetJobsForRole error:', err);
    res.status(500).json({
      success: false,
      error: 'Role Job Lookup Failed',
      message: err.message || 'An unexpected error occurred while fetching role jobs.',
    });
  }
};

export const getProvidersStatusHandler = async (_req: Request, res: Response) => {
  try {
    const status = await externalJobService.getProvidersStatus();
    res.status(200).json({
      success: true,
      providers: status,
      caching: {
        engine: 'Redis',
        searchTtlSeconds: 1800,
        detailTtlSeconds: 7200,
        strategy: 'Cache-Aside with graceful offline degradation',
      },
      policies: {
        credentialStorage: 'Backend-only. No API keys exposed to React Native or client bundles.',
        scrapingPolicy: 'Strictly prohibited for LinkedIn, Naukri, or unauthorized portals.',
        liveIntegrations: ['Jobicy Remote Jobs API (Primary)', 'Remotive Public API (Secondary)'],
        fallbackPolicy: 'Explicitly flagged synthetic fixtures (isLive: false) when providers are offline.',
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Provider Status Probe Failed',
      message: err.message,
    });
  }
};
