import { Request, Response } from 'express';
import { jobAnalyzerService } from '../services/job-analyzer.service.js';

/**
 * POST /api/jobs/analyze & /api/v1/jobs/analyze
 * Analyzes raw job description text with optional student profile comparison.
 */
export async function analyzeJobTextHandler(req: Request, res: Response): Promise<void> {
  try {
    const { text, title, company, studentId, forceFresh } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Field "text" containing the job description is required.',
      });
      return;
    }

    const analysis = await jobAnalyzerService.analyzeJob({
      rawText: text,
      title: title || undefined,
      company: company || undefined,
      studentId: studentId || (req.query.studentId as string) || undefined,
      forceFresh: forceFresh === true || req.query.forceFresh === 'true',
    });

    res.status(200).json({
      success: true,
      analysis,
    });
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      error: status === 404 ? 'Not Found' : 'Internal Server Error',
      message: err.message || 'An error occurred while analyzing the job description.',
    });
  }
}

/**
 * GET /api/jobs/:jobId/analysis & /api/jobs/:jobId/match
 * Analyzes an existing job listing by ID (live provider, fixture, or campus internal).
 */
export async function analyzeJobByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    const { jobId } = req.params;
    const studentId = (req.query.studentId as string) || undefined;
    const forceFresh = req.query.forceFresh === 'true';

    if (!jobId) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'jobId parameter is required.',
      });
      return;
    }

    const analysis = await jobAnalyzerService.analyzeJobById(jobId, studentId, forceFresh);

    res.status(200).json({
      success: true,
      analysis,
    });
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      error: status === 404 ? 'Not Found' : 'Internal Server Error',
      message: err.message || `Failed to analyze job listing "${req.params.jobId}".`,
    });
  }
}

/**
 * GET /api/roles/:roleId/market-summary & /api/v1/roles/:roleId/market-summary
 * Builds a role-level job-market summary across a sample of current live/fixture listings.
 */
export async function getRoleJobMarketSummaryHandler(req: Request, res: Response): Promise<void> {
  try {
    const { roleId } = req.params;
    const studentId = (req.query.studentId as string) || undefined;
    const sampleSize = req.query.sampleSize ? parseInt(req.query.sampleSize as string, 10) : 10;
    const forceFresh = req.query.forceFresh === 'true';

    if (!roleId) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'roleId parameter is required.',
      });
      return;
    }

    const summary = await jobAnalyzerService.getRoleMarketSummary(
      roleId,
      studentId,
      sampleSize,
      forceFresh
    );

    res.status(200).json({
      success: true,
      summary,
    });
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      error: status === 404 ? 'Not Found' : 'Internal Server Error',
      message: err.message || `Failed to generate market summary for role "${req.params.roleId}".`,
    });
  }
}
