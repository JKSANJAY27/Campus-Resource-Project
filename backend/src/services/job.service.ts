import { jobRepository } from '../repositories/mongo/job.repository.js';
import { QueryOptions } from '../types/query.js';

export class JobService {
  async createJob(data: Record<string, any>) {
    return jobRepository.create(data);
  }

  async getJob(jobId: string) {
    const job = await jobRepository.findById(jobId);
    if (!job) throw Object.assign(new Error('Job not found'), { status: 404 });
    return job;
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
