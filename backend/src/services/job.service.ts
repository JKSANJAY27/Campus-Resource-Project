import mongoose from 'mongoose';
import { jobRepository } from '../repositories/mongo/job.repository.js';
import { QueryOptions } from '../types/query.js';
import { externalJobService } from './external-job.service.js';

export class JobService {
  async createJob(data: Record<string, any>) {
    return jobRepository.create(data);
  }

  async getJob(jobId: string) {
    // 1. Resolve external provider / fixture IDs immediately
    if (
      jobId.startsWith('jobicy_') ||
      jobId.startsWith('remotive_') ||
      jobId.startsWith('fixture_') ||
      jobId.startsWith('fix_')
    ) {
      const externalJob = await externalJobService.getJobById(jobId);
      if (externalJob) return externalJob;
    }

    // 2. Query MongoDB campus database only if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const job = await jobRepository.findById(jobId);
        if (job) return job;
      } catch {}
    }

    // 3. Fallback check on external job service
    const externalJob = await externalJobService.getJobById(jobId);
    if (externalJob) return externalJob;

    throw Object.assign(new Error(`Job "${jobId}" not found`), { status: 404 });
  }

  async listJobs(options: QueryOptions & Record<string, any>) {
    return jobRepository.findJobs(options);
  }

  async updateJob(jobId: string, data: Record<string, any>) {
    const job = await jobRepository.update(jobId, data);
    if (!job) throw Object.assign(new Error('Job not found'), { status: 404 });
    return job;
  }

  async deleteJob(jobId: string) {
    const deleted = await jobRepository.delete(jobId);
    if (!deleted) throw Object.assign(new Error('Job not found'), { status: 404 });
    return { deleted: true };
  }

  async getEligibleJobs(studentSkillIds: string[], cgpa: number) {
    return jobRepository.findEligibleJobs(studentSkillIds, cgpa);
  }

  async getExpiringSoon(days = 7) {
    return jobRepository.findExpiringSoon(days);
  }

  async getSkillDemandStats(limit = 15) {
    return jobRepository.getSkillDemandStats(limit);
  }

  async getCompanyLandscape(limit = 15) {
    return jobRepository.getCompanyLandscape(limit);
  }
}

export const jobService = new JobService();
