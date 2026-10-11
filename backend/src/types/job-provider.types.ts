/**
 * Common schema and types for normalized job listings and provider adapters.
 */

export type WorkArrangement = 'remote' | 'hybrid' | 'on-site' | 'unspecified';

export type EmploymentType =
  | 'full-time'
  | 'part-time'
  | 'contract'
  | 'internship'
  | 'temporary'
  | 'unspecified';

export type ExperienceLevel =
  | 'entry'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'unspecified';

export interface JobSalary {
  min: number | null;
  max: number | null;
  currency: string | null;
  period?: 'yearly' | 'monthly' | 'hourly' | null;
  raw: string | null;
}

export interface JobAttribution {
  text: string;
  url: string;
  required: boolean;
}

export interface NormalizedJob {
  /** Unique composite ID: `${provider}_${externalId}` */
  id: string;
  /** External identifier from the source provider */
  externalId: string;
  /** Provider identifier: 'jobicy' | 'remotive' | 'development_fixture' */
  provider: 'jobicy' | 'remotive' | 'development_fixture' | string;
  /** Human-readable source name: 'Jobicy' | 'Remotive' | 'Development Fixture' */
  sourceName: string;
  /** Job title */
  title: string;
  /** Hiring company name */
  company: string;
  /** Hiring company logo URL if supplied by source; null otherwise */
  companyLogo: string | null;
  /** Full job description or HTML content */
  description: string;
  /** Short summary or excerpt if supplied */
  excerpt: string | null;
  /** Geographic location or restrictions (e.g. "USA Only", "Worldwide", "India") */
  location: string | null;
  /** Work arrangement: 'remote' | 'hybrid' | 'on-site' | 'unspecified' */
  workArrangement: WorkArrangement;
  /** Employment type: 'full-time' | 'part-time' | 'contract' | 'internship' | 'unspecified' */
  employmentType: EmploymentType;
  /** Required or inferred experience level */
  experienceLevel: ExperienceLevel;
  /** Primary category or industry */
  category: string | null;
  /** Related tech tags or skills */
  tags: string[];
  /** Salary structure when supplied by source; null otherwise (do not invent) */
  salary: JobSalary | null;
  /** ISO publication timestamp */
  publicationDate: string | null;
  /** Direct URL to original listing */
  originalUrl: string;
  /** Timestamp when the record was retrieved by this service */
  retrievedAt: string;
  /** Whether the job originated from a verified live provider API */
  isLive: boolean;
  /** Mandatory source attribution details */
  attribution: JobAttribution;
}

export interface JobSearchParams {
  keyword?: string;
  q?: string;
  roleId?: string;
  location?: string;
  geo?: string;
  category?: string;
  industry?: string;
  workArrangement?: WorkArrangement | 'any';
  employmentType?: EmploymentType | 'any';
  experienceLevel?: ExperienceLevel | 'any';
  limit?: number;
  page?: number;
  /** Force fresh fetch bypassing Redis cache */
  forceFresh?: boolean;
}

export interface JobSearchResult {
  success: boolean;
  data: NormalizedJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  provider: string;
  isLive: boolean;
  cached: boolean;
  retrievedAt: string;
  attribution: JobAttribution;
  warning?: string;
}
