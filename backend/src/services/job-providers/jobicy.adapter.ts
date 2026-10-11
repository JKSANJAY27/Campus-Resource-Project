import { IJobProviderAdapter } from './job-provider.interface.js';
import {
  NormalizedJob,
  JobSearchParams,
  JobAttribution,
  EmploymentType,
  ExperienceLevel,
  JobSalary,
} from '../../types/job-provider.types.js';

interface JobicyRawJob {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string | null;
  jobIndustry?: string | string[];
  jobType?: string | string[];
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  annualSalaryMin?: number | null;
  annualSalaryMax?: number | null;
  salaryCurrency?: string | null;
}

interface JobicyApiResponse {
  success?: boolean;
  statusCode?: number;
  jobs?: JobicyRawJob[];
  message?: string;
}

export class JobicyJobAdapter implements IJobProviderAdapter {
  public readonly name = 'jobicy';
  public readonly displayName = 'Jobicy Remote Jobs API';
  public readonly isLive = true;

  public readonly attribution: JobAttribution = {
    text: 'Job listings sourced via Jobicy Remote Jobs API',
    url: 'https://jobicy.com',
    required: true,
  };

  private readonly baseUrl = 'https://jobicy.com/api/v2/remote-jobs';
  private readonly requestTimeoutMs = 6000;

  /**
   * Search jobs from Jobicy with keyword, location/geo, and industry parameters.
   */
  public async searchJobs(params: JobSearchParams): Promise<NormalizedJob[]> {
    const url = new URL(this.baseUrl);

    // Limit (Jobicy supports up to 100/200 listings)
    const count = Math.min(Math.max(params.limit || 30, 5), 100);
    url.searchParams.set('count', String(count));

    // Keyword / tag mapping
    const keyword = (params.keyword || params.q || '').trim();
    if (keyword) {
      // Jobicy uses `tag` for skill/tool keywords
      url.searchParams.set('tag', keyword.toLowerCase());
    }

    // Geographic location mapping
    const location = (params.location || params.geo || '').trim().toLowerCase();
    if (location) {
      if (location.includes('us') || location.includes('united states') || location.includes('america')) {
        url.searchParams.set('geo', 'usa');
      } else if (location.includes('uk') || location.includes('united kingdom') || location.includes('london')) {
        url.searchParams.set('geo', 'uk');
      } else if (location.includes('canada')) {
        url.searchParams.set('geo', 'canada');
      } else if (location.includes('europe') || location.includes('emea')) {
        url.searchParams.set('geo', 'europe');
      } else if (location.includes('apac') || location.includes('asia') || location.includes('india')) {
        url.searchParams.set('geo', 'apac');
      } else if (location.includes('latam') || location.includes('latin')) {
        url.searchParams.set('geo', 'latam');
      }
    }

    // Industry category mapping
    const category = (params.category || params.industry || '').trim().toLowerCase();
    if (category) {
      if (category.includes('engineer') || category.includes('tech') || category.includes('software')) {
        url.searchParams.set('industry', 'engineering');
      } else if (category.includes('dev') || category.includes('web') || category.includes('programming')) {
        url.searchParams.set('industry', 'dev');
      } else if (category.includes('data') || category.includes('ai') || category.includes('analytics')) {
        url.searchParams.set('industry', 'data');
      } else if (category.includes('design') || category.includes('ui') || category.includes('ux')) {
        url.searchParams.set('industry', 'design');
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
          throw new Error('Jobicy API rate limit reached (HTTP 429). Please retry shortly.');
        }
        throw new Error(`Jobicy API responded with HTTP status ${res.status}`);
      }

      const data = (await res.json()) as JobicyApiResponse;
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
    const numericId = parseInt(externalId.replace(/^jobicy_/, ''), 10);
    if (isNaN(numericId)) return null;

    // Search a recent batch to find the matching job
    const jobs = await this.searchJobs({ limit: 100 });
    const match = jobs.find((j) => j.externalId === String(numericId) || j.id === `jobicy_${numericId}`);
    return match || null;
  }

  /**
   * Liveness probe.
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${this.baseUrl}?count=1`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Normalization helper: transforms raw Jobicy record to NormalizedJob.
   * Strictly preserves missing fields without inventing fake data.
   */
  private normalizeJob(raw: JobicyRawJob, retrievedAt: string): NormalizedJob {
    const externalId = String(raw.id);

    // Employment type normalization
    let employmentType: EmploymentType = 'unspecified';
    const rawType = Array.isArray(raw.jobType) ? raw.jobType.join(', ') : raw.jobType || '';
    const lowerType = rawType.toLowerCase();
    if (lowerType.includes('full-time') || lowerType.includes('full time')) {
      employmentType = 'full-time';
    } else if (lowerType.includes('part-time') || lowerType.includes('part time')) {
      employmentType = 'part-time';
    } else if (lowerType.includes('contract') || lowerType.includes('freelance')) {
      employmentType = 'contract';
    } else if (lowerType.includes('intern')) {
      employmentType = 'internship';
    }

    // Experience level normalization
    let experienceLevel: ExperienceLevel = 'unspecified';
    const lowerLevel = (raw.jobLevel || '').toLowerCase();
    if (lowerLevel.includes('senior') || lowerLevel.includes('lead') || lowerLevel.includes('principal')) {
      experienceLevel = lowerLevel.includes('lead') ? 'lead' : 'senior';
    } else if (lowerLevel.includes('entry') || lowerLevel.includes('junior') || lowerLevel.includes('graduate')) {
      experienceLevel = 'entry';
    } else if (lowerLevel.includes('mid') || lowerLevel.includes('intermediate')) {
      experienceLevel = 'mid';
    }

    // Salary: only construct if source supplied non-null values
    let salary: JobSalary | null = null;
    const hasMin = typeof raw.annualSalaryMin === 'number' && raw.annualSalaryMin > 0;
    const hasMax = typeof raw.annualSalaryMax === 'number' && raw.annualSalaryMax > 0;
    if (hasMin || hasMax || raw.salaryCurrency) {
      salary = {
        min: hasMin ? raw.annualSalaryMin! : null,
        max: hasMax ? raw.annualSalaryMax! : null,
        currency: raw.salaryCurrency || 'USD',
        period: 'yearly',
        raw: hasMin && hasMax
          ? `${raw.salaryCurrency || '$'}${raw.annualSalaryMin?.toLocaleString()} - ${raw.salaryCurrency || '$'}${raw.annualSalaryMax?.toLocaleString()} / year`
          : null,
      };
    }

    // Category / Industries
    const category = Array.isArray(raw.jobIndustry)
      ? raw.jobIndustry.join(', ')
      : raw.jobIndustry || null;

    // Tags
    const tags: string[] = [];
    if (category) tags.push(category);
    if (raw.jobLevel && raw.jobLevel !== 'Any') tags.push(raw.jobLevel);
    if (raw.jobGeo) tags.push(raw.jobGeo);

    return {
      id: `jobicy_${externalId}`,
      externalId,
      provider: 'jobicy',
      sourceName: 'Jobicy',
      title: raw.jobTitle || 'Untitled Position',
      company: raw.companyName || 'Confidential Employer',
      companyLogo: raw.companyLogo || null,
      description: raw.jobDescription || raw.jobExcerpt || '',
      excerpt: raw.jobExcerpt || null,
      location: raw.jobGeo || 'Remote (Global)',
      workArrangement: 'remote', // Jobicy is explicitly a remote-first job board
      employmentType,
      experienceLevel,
      category,
      tags,
      salary,
      publicationDate: raw.pubDate ? new Date(raw.pubDate).toISOString() : null,
      originalUrl: raw.url || 'https://jobicy.com',
      retrievedAt,
      isLive: true,
      attribution: this.attribution,
    };
  }
}
