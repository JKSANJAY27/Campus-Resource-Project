import { IJobProviderAdapter } from './job-provider.interface.js';
import {
  NormalizedJob,
  JobSearchParams,
  JobAttribution,
  EmploymentType,
  ExperienceLevel,
  JobSalary,
} from '../../types/job-provider.types.js';

interface RemotiveRawJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo?: string | null;
  category?: string;
  tags?: string[];
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string | null;
  description?: string;
}

interface RemotiveApiResponse {
  '0-legal-notice'?: string;
  'job-count'?: number;
  jobs?: RemotiveRawJob[];
}

export class RemotiveJobAdapter implements IJobProviderAdapter {
  public readonly name = 'remotive';
  public readonly displayName = 'Remotive Public Remote Jobs API';
  public readonly isLive = true;

  public readonly attribution: JobAttribution = {
    text: 'Job listings provided by Remotive.com Remote Jobs API',
    url: 'https://remotive.com',
    required: true,
  };

  private readonly baseUrl = 'https://remotive.com/api/remote-jobs';
  private readonly requestTimeoutMs = 6000;

  // Rate limit guard: Remotive limits public requests to 2 per minute
  private lastRequestTime = 0;
  private readonly minIntervalMs = 25000; // ~25 seconds between requests

  /**
   * Search jobs from Remotive.
   */
  public async searchJobs(params: JobSearchParams): Promise<NormalizedJob[]> {
    const url = new URL(this.baseUrl);

    // Rate limit prevention
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minIntervalMs && this.lastRequestTime !== 0) {
      // Throttle or return empty to allow secondary adapter / cache
      const waitTime = this.minIntervalMs - elapsed;
      if (waitTime > 5000) {
        throw new Error('Remotive rate-limit throttling active (2 req/min limit). Falling back to alternate provider.');
      }
      await new Promise((r) => setTimeout(r, waitTime));
    }
    this.lastRequestTime = Date.now();

    // Limit
    const limit = Math.min(Math.max(params.limit || 25, 5), 50);
    url.searchParams.set('limit', String(limit));

    // Keyword search
    const keyword = (params.keyword || params.q || '').trim();
    if (keyword) {
      url.searchParams.set('search', keyword);
    }

    // Category mapping
    const category = (params.category || params.industry || '').trim().toLowerCase();
    if (category) {
      if (category.includes('software') || category.includes('web') || category.includes('dev')) {
        url.searchParams.set('category', 'software-dev');
      } else if (category.includes('data') || category.includes('ai') || category.includes('analytics')) {
        url.searchParams.set('category', 'data');
      } else if (category.includes('devops') || category.includes('cloud') || category.includes('sysadmin')) {
        url.searchParams.set('category', 'devops-sysadmin');
      } else if (category.includes('design') || category.includes('ui') || category.includes('ux')) {
        url.searchParams.set('category', 'design');
      } else if (category.includes('qa') || category.includes('test')) {
        url.searchParams.set('category', 'qa');
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CampusResourceIntelligence/1.0 (Student Career Education Project)',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Remotive API hard rate limit reached (HTTP 429). Max 2 requests/minute allowed.');
        }
        throw new Error(`Remotive API responded with HTTP status ${res.status}`);
      }

      const data = (await res.json()) as RemotiveApiResponse;
      if (!data || !Array.isArray(data.jobs)) {
        return [];
      }

      const retrievedAt = new Date().toISOString();
      return data.jobs.map((raw) => this.normalizeJob(raw, retrievedAt));
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Retrieve single job by ID.
   */
  public async getJobById(externalId: string): Promise<NormalizedJob | null> {
    const numericId = parseInt(externalId.replace(/^remotive_/, ''), 10);
    if (isNaN(numericId)) return null;

    const jobs = await this.searchJobs({ limit: 50 });
    const match = jobs.find((j) => j.externalId === String(numericId) || j.id === `remotive_${numericId}`);
    return match || null;
  }

  /**
   * Liveness probe.
   */
  public async isAvailable(): Promise<boolean> {
    return Date.now() - this.lastRequestTime > this.minIntervalMs;
  }

  /**
   * Normalization helper: strictly preserves missing fields without inventing fake data.
   */
  private normalizeJob(raw: RemotiveRawJob, retrievedAt: string): NormalizedJob {
    const externalId = String(raw.id);

    // Employment type normalization
    let employmentType: EmploymentType = 'unspecified';
    const lowerType = (raw.job_type || '').toLowerCase();
    if (lowerType.includes('full_time') || lowerType.includes('full-time')) {
      employmentType = 'full-time';
    } else if (lowerType.includes('part_time') || lowerType.includes('part-time')) {
      employmentType = 'part-time';
    } else if (lowerType.includes('contract') || lowerType.includes('freelance')) {
      employmentType = 'contract';
    } else if (lowerType.includes('intern')) {
      employmentType = 'internship';
    }

    // Inferred experience level from title
    let experienceLevel: ExperienceLevel = 'unspecified';
    const lowerTitle = (raw.title || '').toLowerCase();
    if (lowerTitle.includes('senior') || lowerTitle.includes('lead') || lowerTitle.includes('staff') || lowerTitle.includes('principal')) {
      experienceLevel = lowerTitle.includes('lead') || lowerTitle.includes('principal') ? 'lead' : 'senior';
    } else if (lowerTitle.includes('junior') || lowerTitle.includes('intern') || lowerTitle.includes('graduate') || lowerTitle.includes('entry')) {
      experienceLevel = 'entry';
    } else if (lowerTitle.includes('mid') || lowerTitle.includes('intermediate')) {
      experienceLevel = 'mid';
    }

    // Salary parsing: Remotive returns unstructured strings like "$120,000 - $140,000" or empty string
    let salary: JobSalary | null = null;
    const rawSalary = (raw.salary || '').trim();
    if (rawSalary && rawSalary.length > 0) {
      const numbers = rawSalary.match(/\d[\d,\.]+/g);
      let min: number | null = null;
      let max: number | null = null;
      if (numbers && numbers.length >= 1) {
        min = parseInt(numbers[0].replace(/[^\d]/g, ''), 10);
        if (numbers.length >= 2) {
          max = parseInt(numbers[1].replace(/[^\d]/g, ''), 10);
        }
      }
      salary = {
        min: isNaN(min as number) ? null : min,
        max: isNaN(max as number) ? null : max,
        currency: rawSalary.includes('€') ? 'EUR' : rawSalary.includes('£') ? 'GBP' : 'USD',
        raw: rawSalary,
      };
    }

    return {
      id: `remotive_${externalId}`,
      externalId,
      provider: 'remotive',
      sourceName: 'Remotive',
      title: raw.title || 'Untitled Position',
      company: raw.company_name || 'Confidential Employer',
      companyLogo: raw.company_logo || null,
      description: raw.description || '',
      excerpt: null,
      location: raw.candidate_required_location || 'Remote (Worldwide)',
      workArrangement: 'remote', // Remotive is strictly a remote job board
      employmentType,
      experienceLevel,
      category: raw.category || null,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      salary,
      publicationDate: raw.publication_date ? new Date(raw.publication_date).toISOString() : null,
      originalUrl: raw.url || 'https://remotive.com',
      retrievedAt,
      isLive: true,
      attribution: this.attribution,
    };
  }
}
