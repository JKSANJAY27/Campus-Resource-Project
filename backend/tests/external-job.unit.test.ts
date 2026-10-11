import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { JobicyJobAdapter } from '../src/services/job-providers/jobicy.adapter.js';
import { RemotiveJobAdapter } from '../src/services/job-providers/remotive.adapter.js';
import { MockJobFixtureAdapter, SYNTHETIC_DEVELOPMENT_FIXTURES } from '../src/services/job-providers/fixtures.adapter.js';
import { ExternalJobService } from '../src/services/external-job.service.js';
import { IJobProviderAdapter } from '../src/services/job-providers/job-provider.interface.js';
import { NormalizedJob } from '../src/types/job-provider.types.js';
import { cacheRepository } from '../src/repositories/redis/cache.repository.js';

describe('Free Job Listings Integration Suite', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Adapter Normalization & Field Integrity Tests
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. Provider Adapters & Normalization', () => {
    it('JobicyAdapter: should normalize raw Jobicy response into common schema', async () => {
      const adapter = new JobicyJobAdapter();

      const mockJobicyPayload = {
        success: true,
        jobs: [
          {
            id: 99101,
            url: 'https://jobicy.com/jobs/99101-senior-backend-engineer',
            jobTitle: 'Senior Backend Engineer',
            companyName: 'Acme Cloud Corp',
            companyLogo: 'https://jobicy.com/logos/acme.png',
            jobIndustry: ['engineering', 'dev'],
            jobType: ['Full-Time'],
            jobGeo: 'USA',
            jobLevel: 'Senior',
            jobExcerpt: 'Build high-scale distributed APIs with Node.js and TypeScript.',
            jobDescription: '<p>Detailed description of the role...</p>',
            pubDate: '2026-10-10T14:00:00Z',
            annualSalaryMin: 120000,
            annualSalaryMax: 150000,
            salaryCurrency: 'USD',
          },
        ],
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockJobicyPayload,
      } as any);

      const jobs = await adapter.searchJobs({ keyword: 'backend', limit: 10 });
      expect(jobs).toHaveLength(1);

      const job = jobs[0];
      expect(job.id).toBe('jobicy_99101');
      expect(job.externalId).toBe('99101');
      expect(job.provider).toBe('jobicy');
      expect(job.title).toBe('Senior Backend Engineer');
      expect(job.company).toBe('Acme Cloud Corp');
      expect(job.workArrangement).toBe('remote');
      expect(job.employmentType).toBe('full-time');
      expect(job.experienceLevel).toBe('senior');
      expect(job.isLive).toBe(true);
      expect(job.salary?.min).toBe(120000);
      expect(job.salary?.max).toBe(150000);
      expect(job.salary?.currency).toBe('USD');
      expect(job.salary?.period).toBe('yearly');
      expect(job.attribution.required).toBe(true);
      expect(job.attribution.text).toContain('Jobicy');
      expect(job.originalUrl).toBe('https://jobicy.com/jobs/99101-senior-backend-engineer');
      expect(job.retrievedAt).toBeDefined();
    });

    it('JobicyAdapter: should preserve null salary and not invent missing numbers', async () => {
      const adapter = new JobicyJobAdapter();

      const mockNoSalaryPayload = {
        success: true,
        jobs: [
          {
            id: 99102,
            url: 'https://jobicy.com/jobs/99102-intern',
            jobTitle: 'Junior Developer',
            companyName: 'Startup Inc',
            jobType: 'Internship',
            jobLevel: 'Entry',
            annualSalaryMin: null,
            annualSalaryMax: null,
            salaryCurrency: null,
          },
        ],
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockNoSalaryPayload,
      } as any);

      const [job] = await adapter.searchJobs({});
      expect(job.salary).toBeNull(); // Missing fields must NEVER be fabricated
      expect(job.employmentType).toBe('internship');
      expect(job.experienceLevel).toBe('entry');
    });

    it('JobicyAdapter: should throw on HTTP 429 rate limit or network error', async () => {
      const adapter = new JobicyJobAdapter();

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as any);

      await expect(adapter.searchJobs({})).rejects.toThrow(/rate limit/i);
    });

    it('RemotiveAdapter: should normalize raw Remotive response with raw salary string', async () => {
      const adapter = new RemotiveJobAdapter();

      const mockRemotivePayload = {
        jobs: [
          {
            id: 88201,
            url: 'https://remotive.com/jobs/88201',
            title: 'Lead Frontend Architect',
            company_name: 'Apex UI Solutions',
            company_logo: 'https://remotive.com/logo.png',
            category: 'software-dev',
            tags: ['React', 'TypeScript', 'Architecture'],
            job_type: 'full_time',
            publication_date: '2026-10-09T08:00:00Z',
            candidate_required_location: 'Worldwide',
            salary: '$130,000 - $160,000',
            description: '<p>Lead our web UI architecture team.</p>',
          },
        ],
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRemotivePayload,
      } as any);

      const jobs = await adapter.searchJobs({ keyword: 'frontend' });
      expect(jobs).toHaveLength(1);

      const job = jobs[0];
      expect(job.id).toBe('remotive_88201');
      expect(job.provider).toBe('remotive');
      expect(job.title).toBe('Lead Frontend Architect');
      expect(job.company).toBe('Apex UI Solutions');
      expect(job.workArrangement).toBe('remote');
      expect(job.employmentType).toBe('full-time');
      expect(job.experienceLevel).toBe('lead');
      expect(job.salary?.min).toBe(130000);
      expect(job.salary?.max).toBe(160000);
      expect(job.salary?.raw).toBe('$130,000 - $160,000');
      expect(job.isLive).toBe(true);
      expect(job.attribution.text).toContain('Remotive');
    });

    it('MockJobFixtureAdapter: MUST NEVER label fixtures as live listings', async () => {
      const adapter = new MockJobFixtureAdapter();

      expect(adapter.isLive).toBe(false);

      const jobs = await adapter.searchJobs({});
      expect(jobs.length).toBeGreaterThanOrEqual(8);

      for (const job of jobs) {
        expect(job.isLive).toBe(false); // CRITICAL: Never label fixtures as live
        expect(job.provider).toBe('development_fixture');
        expect(job.sourceName).toContain('Development Fixture');
        expect(job.retrievedAt).toBeDefined();
        expect(job.originalUrl).toBeDefined();
        expect(job.title).toBeDefined();
        expect(job.company).toBeDefined();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Search, Filtering, and Pagination Logic
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Search, Filtering & Pagination', () => {
    it('should filter fixtures by keyword correctly', async () => {
      const adapter = new MockJobFixtureAdapter();
      const pythonJobs = await adapter.searchJobs({ keyword: 'python' });

      expect(pythonJobs.length).toBeGreaterThan(0);
      for (const j of pythonJobs) {
        const text = `${j.title} ${j.description} ${j.tags.join(' ')}`.toLowerCase();
        expect(text).toContain('python');
      }
    });

    it('should filter fixtures by employment type and experience level', async () => {
      const adapter = new MockJobFixtureAdapter();
      const entryFullTime = await adapter.searchJobs({
        employmentType: 'full-time',
        experienceLevel: 'entry',
      });

      expect(entryFullTime.length).toBeGreaterThan(0);
      for (const j of entryFullTime) {
        expect(j.employmentType).toBe('full-time');
        expect(j.experienceLevel).toBe('entry');
      }
    });

    it('should enforce pagination limits and calculate totalPages', async () => {
      const mockPrimary: IJobProviderAdapter = {
        name: 'mock_test',
        displayName: 'Mock Test Provider',
        attribution: { text: 'Mock attribution', url: 'http://test.com', required: false },
        isLive: true,
        searchJobs: vi.fn().mockResolvedValue(
          Array.from({ length: 15 }, (_, i) => ({
            id: `test_${i + 1}`,
            externalId: String(i + 1),
            provider: 'mock_test',
            sourceName: 'Mock',
            title: `Job ${i + 1}`,
            company: 'Test Co',
            companyLogo: null,
            description: 'Desc',
            excerpt: null,
            location: 'Remote',
            workArrangement: 'remote',
            employmentType: 'full-time',
            experienceLevel: 'mid',
            category: 'Tech',
            tags: [],
            salary: null,
            publicationDate: new Date().toISOString(),
            originalUrl: 'http://test.com',
            retrievedAt: new Date().toISOString(),
            isLive: true,
            attribution: { text: 'Mock', url: 'http://test.com', required: false },
          }))
        ),
        getJobById: vi.fn().mockResolvedValue(null),
        isAvailable: vi.fn().mockResolvedValue(true),
      };

      const service = new ExternalJobService(mockPrimary);
      // Bypass redis for deterministic pagination test
      vi.spyOn(cacheRepository, 'get').mockResolvedValue(null);
      vi.spyOn(cacheRepository, 'set').mockResolvedValue(true);

      const resPage1 = await service.searchJobs({ limit: 5, page: 1 });
      expect(resPage1.data).toHaveLength(5);
      expect(resPage1.total).toBe(15);
      expect(resPage1.totalPages).toBe(3);
      expect(resPage1.page).toBe(1);
      expect(resPage1.data[0].id).toBe('test_1');

      const resPage2 = await service.searchJobs({ limit: 5, page: 2 });
      expect(resPage2.data).toHaveLength(5);
      expect(resPage2.data[0].id).toBe('test_6');

      const resPage3 = await service.searchJobs({ limit: 5, page: 3 });
      expect(resPage3.data).toHaveLength(5);
      expect(resPage3.data[0].id).toBe('test_11');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Resilience, Caching, and Fallback Behavior
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Resilience, Caching & Fallback Behavior', () => {
    it('should return cached result with cached: true on cache hit', async () => {
      const mockPrimary: IJobProviderAdapter = {
        name: 'primary',
        displayName: 'Primary Live Provider',
        attribution: { text: 'Attribution', url: 'http://test.com', required: true },
        isLive: true,
        searchJobs: vi.fn(),
        getJobById: vi.fn(),
        isAvailable: vi.fn().mockResolvedValue(true),
      };

      const cachedPayload = {
        success: true,
        data: [
          {
            id: 'cached_job_1',
            title: 'Cached Software Engineer',
            company: 'Cache Corp',
            isLive: true,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        provider: 'primary',
        isLive: true,
        cached: false,
        retrievedAt: new Date().toISOString(),
        attribution: { text: 'Attribution', url: 'http://test.com', required: true },
      };

      vi.spyOn(cacheRepository, 'get').mockResolvedValueOnce(JSON.stringify(cachedPayload));

      const service = new ExternalJobService(mockPrimary);
      const res = await service.searchJobs({ keyword: 'software' });

      expect(res.cached).toBe(true);
      expect(res.data[0].id).toBe('cached_job_1');
      expect(mockPrimary.searchJobs).not.toHaveBeenCalled(); // Cached read must not hit network
    });

    it('should failover to secondary provider when primary provider throws', async () => {
      const mockPrimary: IJobProviderAdapter = {
        name: 'primary_failed',
        displayName: 'Primary Failed Provider',
        attribution: { text: 'P1', url: 'http://p1.com', required: true },
        isLive: true,
        searchJobs: vi.fn().mockRejectedValue(new Error('Network timeout or 429 rate limit')),
        getJobById: vi.fn(),
        isAvailable: vi.fn().mockResolvedValue(false),
      };

      const mockSecondary: IJobProviderAdapter = {
        name: 'secondary_success',
        displayName: 'Secondary Success Provider',
        attribution: { text: 'P2', url: 'http://p2.com', required: true },
        isLive: true,
        searchJobs: vi.fn().mockResolvedValue([
          {
            id: 'secondary_job_1',
            externalId: 'sec_1',
            provider: 'secondary_success',
            sourceName: 'Secondary',
            title: 'Cloud DevOps Engineer',
            company: 'Secondary Co',
            companyLogo: null,
            description: 'Desc',
            excerpt: null,
            location: 'Remote',
            workArrangement: 'remote',
            employmentType: 'full-time',
            experienceLevel: 'senior',
            category: 'DevOps',
            tags: [],
            salary: null,
            publicationDate: new Date().toISOString(),
            originalUrl: 'http://p2.com/1',
            retrievedAt: new Date().toISOString(),
            isLive: true,
            attribution: { text: 'P2', url: 'http://p2.com', required: true },
          },
        ]),
        getJobById: vi.fn(),
        isAvailable: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(cacheRepository, 'get').mockResolvedValue(null);
      vi.spyOn(cacheRepository, 'set').mockResolvedValue(true);

      const service = new ExternalJobService(mockPrimary, mockSecondary);
      const res = await service.searchJobs({ keyword: 'devops' });

      expect(res.success).toBe(true);
      expect(res.provider).toBe('secondary_success');
      expect(res.isLive).toBe(true);
      expect(res.warning).toContain('Primary job provider was temporarily unreachable');
      expect(res.data[0].id).toBe('secondary_job_1');
    });

    it('should failover to synthetic development fixtures when ALL live providers fail', async () => {
      const mockPrimary: IJobProviderAdapter = {
        name: 'primary_down',
        displayName: 'Primary Down',
        attribution: { text: 'P1', url: 'http://p1.com', required: true },
        isLive: true,
        searchJobs: vi.fn().mockRejectedValue(new Error('DNS Failure')),
        getJobById: vi.fn(),
        isAvailable: vi.fn().mockResolvedValue(false),
      };

      const mockSecondary: IJobProviderAdapter = {
        name: 'secondary_down',
        displayName: 'Secondary Down',
        attribution: { text: 'P2', url: 'http://p2.com', required: true },
        isLive: true,
        searchJobs: vi.fn().mockRejectedValue(new Error('HTTP 429 Hard Rate Limit')),
        getJobById: vi.fn(),
        isAvailable: vi.fn().mockResolvedValue(false),
      };

      vi.spyOn(cacheRepository, 'get').mockResolvedValue(null);
      vi.spyOn(cacheRepository, 'set').mockResolvedValue(true);

      const service = new ExternalJobService(mockPrimary, mockSecondary);
      const res = await service.searchJobs({});

      expect(res.success).toBe(true);
      expect(res.provider).toBe('development_fixture');
      expect(res.isLive).toBe(false); // CRITICAL: NEVER label fixtures as live
      expect(res.warning).toContain('Serving synthetic development fixtures');
      expect(res.data.length).toBeGreaterThan(0);
    });

    it('should map Career Roles to job search keywords via getJobsForRole', async () => {
      const service = new ExternalJobService();
      vi.spyOn(cacheRepository, 'get').mockResolvedValue(null);
      vi.spyOn(cacheRepository, 'set').mockResolvedValue(true);

      const res = await service.getJobsForRole('role_backend_developer');
      expect(res.success).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
    });

    it('should retrieve job details by composite ID correctly', async () => {
      const service = new ExternalJobService();
      vi.spyOn(cacheRepository, 'get').mockResolvedValue(null);
      vi.spyOn(cacheRepository, 'set').mockResolvedValue(true);

      const fixture = await service.getJobById('fixture_job_001');
      expect(fixture).not.toBeNull();
      expect(fixture?.title).toContain('Frontend');
      expect(fixture?.isLive).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. HTTP Endpoints Integration Tests (Express API)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. Backend Express Endpoints', () => {
    beforeEach(() => {
      vi.spyOn(cacheRepository, 'get').mockResolvedValue(null);
      vi.spyOn(cacheRepository, 'set').mockResolvedValue(true);
    });

    it('GET /api/jobs/search: should return 200 with normalized job schema', async () => {
      const res = await request(app).get('/api/jobs/search?keyword=developer&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(5);
      expect(res.body.retrievedAt).toBeDefined();
      expect(res.body.attribution).toBeDefined();

      if (res.body.data.length > 0) {
        const first = res.body.data[0];
        expect(first.id).toBeDefined();
        expect(first.title).toBeDefined();
        expect(first.company).toBeDefined();
        expect(first.originalUrl).toBeDefined();
        expect(first.workArrangement).toBeDefined();
      }
    });

    it('GET /api/v1/jobs/search: should also work via /api/v1 convention', async () => {
      const res = await request(app).get('/api/v1/jobs/search?limit=3');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('GET /api/jobs/:id: should return 200 for known fixture or provider job', async () => {
      const res = await request(app).get('/api/jobs/fixture_job_002');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toContain('Backend');
      expect(res.body.data.isLive).toBe(false); // Fixture must be tagged not live
    });

    it('GET /api/jobs/:id: should return 404 for nonexistent job ID', async () => {
      const res = await request(app).get('/api/jobs/ghost_nonexistent_job_999999');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/roles/:roleId/jobs: should return role-aligned jobs', async () => {
      const res = await request(app).get('/api/roles/role_machine_learning_engineer/jobs?limit=5');
      // If roleId is role_ml_engineer or machine_learning_engineer, check response
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      } else {
        const resAlt = await request(app).get('/api/roles/role_ml_engineer/jobs?limit=5');
        expect(resAlt.status).toBe(200);
        expect(resAlt.body.success).toBe(true);
      }
    });

    it('GET /api/jobs/providers/status: should return provider compliance and terms report', async () => {
      const res = await request(app).get('/api/jobs/providers/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.providers)).toBe(true);
      expect(res.body.providers.length).toBeGreaterThanOrEqual(3);

      const jobicy = res.body.providers.find((p: any) => p.name === 'jobicy');
      expect(jobicy).toBeDefined();
      expect(jobicy.termsSummary).toBeDefined();

      const remotive = res.body.providers.find((p: any) => p.name === 'remotive');
      expect(remotive).toBeDefined();
      expect(remotive.rateLimitNote).toContain('2 requests/minute');

      const fixtures = res.body.providers.find((p: any) => p.name === 'development_fixture');
      expect(fixtures).toBeDefined();
      expect(fixtures.isLive).toBe(false);

      expect(res.body.policies.credentialStorage).toContain('Backend-only');
      expect(res.body.policies.scrapingPolicy).toContain('prohibited');
    });
  });
});
