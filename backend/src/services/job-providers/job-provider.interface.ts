import {
  NormalizedJob,
  JobSearchParams,
  JobAttribution,
} from '../../types/job-provider.types.js';

/**
 * Common contract for external job listing providers.
 * Allows adding new providers without changing controllers or client apps.
 */
export interface IJobProviderAdapter {
  /** Unique provider identifier code (e.g. 'jobicy', 'remotive', 'development_fixture') */
  readonly name: string;

  /** Human-readable display name */
  readonly displayName: string;

  /** Mandatory source attribution rules */
  readonly attribution: JobAttribution;

  /** Whether this adapter connects to a live external provider */
  readonly isLive: boolean;

  /**
   * Search jobs from this provider with keyword, location, and filter support.
   */
  searchJobs(params: JobSearchParams): Promise<NormalizedJob[]>;

  /**
   * Retrieve a single job listing by its provider-specific external ID.
   */
  getJobById(externalId: string): Promise<NormalizedJob | null>;

  /**
   * Quick liveness/healthcheck probe.
   */
  isAvailable(): Promise<boolean>;
}
