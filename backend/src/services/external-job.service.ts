import { createHash } from 'crypto';
import { IJobProviderAdapter } from './job-providers/job-provider.interface.js';
import { JobicyJobAdapter } from './job-providers/jobicy.adapter.js';
import { RemotiveJobAdapter } from './job-providers/remotive.adapter.js';
import { MockJobFixtureAdapter } from './job-providers/fixtures.adapter.js';
import {
  NormalizedJob,
  JobSearchParams,
  JobSearchResult,
} from '../types/job-provider.types.js';
import { cacheRepository } from '../repositories/redis/cache.repository.js';
import { CURATED_CAREER_ROLES, CareerRoleData } from '../constants/career-roles.data.js';

export interface ProviderStatusReport {
  name: string;
  displayName: string;
  isLive: boolean;
  status: 'healthy' | 'degraded' | 'offline';
  attribution: {
    text: string;
    url: string;
  };
  termsSummary: string;
  rateLimitNote: string;
}

export class ExternalJobService {
  private primaryAdapter: IJobProviderAdapter;
  private secondaryAdapter: IJobProviderAdapter;
  private fixtureAdapter: IJobProviderAdapter;

  // Cache TTLs in seconds
  private readonly SEARCH_CACHE_TTL = 1800; // 30 minutes
  private readonly DETAIL_CACHE_TTL = 7200; // 2 hours

  constructor(
    primary?: IJobProviderAdapter,
    secondary?: IJobProviderAdapter,
    fixtures?: IJobProviderAdapter
  ) {
    this.primaryAdapter = primary || new JobicyJobAdapter();
    this.secondaryAdapter = secondary || new RemotiveJobAdapter();
    this.fixtureAdapter = fixtures || new MockJobFixtureAdapter();
  }

  /**
   * Search for jobs using primary live provider, falling back to secondary or fixtures.
   * Utilizes Redis cache-aside with a 30-minute TTL.
   */
  public async searchJobs(params: JobSearchParams = {}): Promise<JobSearchResult> {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);

    // Build deterministic cache key
    const cacheKey = this.generateSearchCacheKey(params);

    // 1. Check Redis cache
    if (!params.forceFresh) {
      try {
        const cachedRaw = await cacheRepository.get(cacheKey);
        if (cachedRaw) {
          const cachedResult = JSON.parse(cachedRaw) as JobSearchResult;
          return {
            ...cachedResult,
            cached: true,
            page,
            limit,
          };
        }
      } catch (err) {
        // Safe degrade if cache read fails
      }
    }

    let jobs: NormalizedJob[] = [];
    let providerUsed = this.primaryAdapter.name;
    let isLive = true;
    let warning: string | undefined;

    // 2. Fetch from Primary Provider (Jobicy)
    try {
      jobs = await this.primaryAdapter.searchJobs(params);
      providerUsed = this.primaryAdapter.name;
    } catch (primaryErr: any) {
      console.warn(`[JobService] Primary provider (${this.primaryAdapter.name}) failed: ${primaryErr.message}. Trying secondary...`);

      // 3. Fallback to Secondary Provider (Remotive)
      try {
        jobs = await this.secondaryAdapter.searchJobs(params);
        providerUsed = this.secondaryAdapter.name;
        warning = `Primary job provider was temporarily unreachable. Results served via ${this.secondaryAdapter.displayName}.`;
      } catch (secondaryErr: any) {
        console.warn(`[JobService] Secondary provider (${this.secondaryAdapter.name}) failed: ${secondaryErr.message}. Falling back to fixtures...`);

        // 4. Fallback to High-Fidelity Synthetic Fixtures (NEVER labeled as live)
        jobs = await this.fixtureAdapter.searchJobs(params);
        providerUsed = this.fixtureAdapter.name;
        isLive = false;
        warning = 'Live job providers are currently unreachable or rate-limited. Serving synthetic development fixtures for offline demonstration. (NOT LIVE LISTINGS)';
      }
    }

    // 5. Post-process filters (e.g. experience level, work arrangement, keyword refinement)
    const filtered = this.applyLocalFilters(jobs, params);

    // 6. Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedJobs = filtered.slice(offset, offset + limit);

    const activeAdapter = isLive
      ? (providerUsed === this.primaryAdapter.name ? this.primaryAdapter : this.secondaryAdapter)
      : this.fixtureAdapter;

    const result: JobSearchResult = {
      success: true,
      data: paginatedJobs,
      total,
      page,
      limit,
      totalPages,
      provider: providerUsed,
      isLive,
      cached: false,
      retrievedAt: new Date().toISOString(),
      attribution: activeAdapter.attribution,
      warning,
    };

    // 7. Store in Redis cache (only cache live or complete results)
    try {
      await cacheRepository.set(cacheKey, JSON.stringify(result), this.SEARCH_CACHE_TTL);
    } catch {
      // Safe degrade if Redis write fails
    }

    return result;
  }

  /**
   * Get specific job by composite ID (`jobicy_155044`, `remotive_1954382`, or `fix_001`).
   */
  public async getJobById(id: string): Promise<NormalizedJob | null> {
    if (!id || typeof id !== 'string') return null;

    const cacheKey = `jobs:detail:${id}`;

    // 1. Check Redis cache
    try {
      const cached = await cacheRepository.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as NormalizedJob;
      }
    } catch {
      // Safe degrade
    }

    let job: NormalizedJob | null = null;

    // Route to appropriate adapter based on prefix
    if (id.startsWith('jobicy_')) {
      job = await this.primaryAdapter.getJobById(id);
    } else if (id.startsWith('remotive_')) {
      job = await this.secondaryAdapter.getJobById(id);
    } else if (id.startsWith('fixture_') || id.startsWith('fix_')) {
      job = await this.fixtureAdapter.getJobById(id);
    } else {
      // Try primary first, then secondary, then fixtures
      job = await this.primaryAdapter.getJobById(id);
      if (!job) job = await this.secondaryAdapter.getJobById(id);
      if (!job) job = await this.fixtureAdapter.getJobById(id);
    }

    if (job) {
      try {
        await cacheRepository.set(cacheKey, JSON.stringify(job), this.DETAIL_CACHE_TTL);
      } catch {
        // Safe degrade
      }
    }

    return job;
  }

  /**
   * Search jobs tailored to a specific Career Role from the 10-role catalogue.
   * Maps role title, category, and typical job titles into search queries.
   */
  public async getJobsForRole(roleId: string, params: JobSearchParams = {}): Promise<JobSearchResult> {
    const role = this.findRole(roleId);

    // Build role-focused query
    const searchKeyword = params.keyword || params.q || (role ? role.title : roleId.replace(/^role_/, '').replace(/_/g, ' '));
    const searchCategory = params.category || (role ? role.category : undefined);

    const mergedParams: JobSearchParams = {
      ...params,
      keyword: searchKeyword,
      category: searchCategory,
      roleId,
    };

    return this.searchJobs(mergedParams);
  }

  /**
   * Status and terms compliance report for configured providers.
   */
  public async getProvidersStatus(): Promise<ProviderStatusReport[]> {
    const [jobicyOk, remotiveOk] = await Promise.all([
      this.primaryAdapter.isAvailable().catch(() => false),
      this.secondaryAdapter.isAvailable().catch(() => false),
    ]);

    return [
      {
        name: this.primaryAdapter.name,
        displayName: this.primaryAdapter.displayName,
        isLive: true,
        status: jobicyOk ? 'healthy' : 'degraded',
        attribution: this.primaryAdapter.attribution,
        termsSummary: 'Public endpoint requires no API key. Free for personal/educational use. Must preserve original job URLs and attribute source to Jobicy.',
        rateLimitNote: 'Fair use policy. Supports up to 200 jobs per query with tag and geo filters.',
      },
      {
        name: this.secondaryAdapter.name,
        displayName: this.secondaryAdapter.displayName,
        isLive: true,
        status: remotiveOk ? 'healthy' : 'degraded',
        attribution: this.secondaryAdapter.attribution,
        termsSummary: 'Free public endpoint with mandatory attribution and direct link to Remotive. Strictly forbids republication to other job boards or automated bulk scraping.',
        rateLimitNote: 'Hard limit of 2 requests/minute. 24-hour publication latency on public tier.',
      },
      {
        name: this.fixtureAdapter.name,
        displayName: this.fixtureAdapter.displayName,
        isLive: false,
        status: 'healthy',
        attribution: this.fixtureAdapter.attribution,
        termsSummary: 'Synthetic offline fixtures for testing and automated evaluation. Explicitly tagged as isLive: false.',
        rateLimitNote: 'No rate limit (local in-memory).',
      },
    ];
  }

  /**
   * Local in-memory filter helper.
   */
  private applyLocalFilters(jobs: NormalizedJob[], params: JobSearchParams): NormalizedJob[] {
    let filtered = [...jobs];

    // Filter by work arrangement
    if (params.workArrangement && params.workArrangement !== 'any') {
      filtered = filtered.filter((j) => j.workArrangement === params.workArrangement);
    }

    // Filter by employment type
    if (params.employmentType && params.employmentType !== 'any') {
      filtered = filtered.filter((j) => j.employmentType === params.employmentType);
    }

    // Filter by experience level
    if (params.experienceLevel && params.experienceLevel !== 'any') {
      filtered = filtered.filter((j) => j.experienceLevel === params.experienceLevel);
    }

    // Additional client-side keyword matching
    const keyword = (params.keyword || params.q || '').trim().toLowerCase();
    if (keyword && filtered.length > 0) {
      // If keyword wasn't already strictly filtered upstream
      const matches = filtered.filter((j) => {
        const inTitle = j.title.toLowerCase().includes(keyword);
        const inCompany = j.company.toLowerCase().includes(keyword);
        const inDesc = j.description.toLowerCase().includes(keyword);
        const inTags = j.tags.some((t) => t.toLowerCase().includes(keyword));
        return inTitle || inCompany || inDesc || inTags;
      });
      if (matches.length > 0) {
        filtered = matches;
      }
    }

    return filtered;
  }

  /**
   * Helper to resolve career role by roleId or slug.
   */
  private findRole(roleIdOrSlug: string): CareerRoleData | undefined {
    const clean = roleIdOrSlug.toLowerCase().trim();
    return CURATED_CAREER_ROLES.find(
      (r) => r.roleId.toLowerCase() === clean || r.slug.toLowerCase() === clean
    );
  }

  /**
   * Generate MD5 hash cache key from search parameters.
   */
  private generateSearchCacheKey(params: JobSearchParams): string {
    const normalized = {
      q: (params.keyword || params.q || '').toLowerCase().trim(),
      roleId: (params.roleId || '').toLowerCase().trim(),
      loc: (params.location || params.geo || '').toLowerCase().trim(),
      cat: (params.category || params.industry || '').toLowerCase().trim(),
      work: params.workArrangement || 'any',
      emp: params.employmentType || 'any',
      exp: params.experienceLevel || 'any',
    };
    const hash = createHash('md5').update(JSON.stringify(normalized)).digest('hex').substring(0, 16);
    return `jobs:search:${hash}`;
  }
}

export const externalJobService = new ExternalJobService();
