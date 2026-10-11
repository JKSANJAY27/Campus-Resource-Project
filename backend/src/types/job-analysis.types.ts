/**
 * Types and interfaces for lightweight local job-description analysis.
 */

export type SkillCategoryType =
  | 'technical_skill'
  | 'tool_framework'
  | 'qualification'
  | 'certification'
  | 'methodology';

export type ExperienceLevel =
  | 'entry'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'unspecified';

export interface SkillDictionaryItem {
  id: string;
  canonicalName: string;
  category: SkillCategoryType;
  /** Primary search phrases and synonyms (lower-cased) */
  synonyms: string[];
  /** Optional custom regex pattern for tricky terms like C++, C#, .NET, Go */
  customRegex?: RegExp;
  /** Whether the term requires strict word boundaries (e.g. short acronyms) */
  requiresWordBoundary?: boolean;
  /** Corresponding ontology skill ID in the campus resource graph (e.g. 'sk_react', 'sk_sql') */
  ontologySkillId?: string;
  /** Importance multiplier for job matching */
  weight?: number;
}

export interface ExtractedSkill {
  id: string;
  canonicalName: string;
  category: SkillCategoryType;
  /** Raw token or phrase matched in the description */
  rawMatchedTerm: string;
  /** Number of times the skill/synonym appeared in the job description */
  termFrequency: number;
  /** Normalized TF-IDF score reflecting relative importance */
  tfIdfScore: number;
  /** Corresponding campus ontology ID if mapped */
  ontologySkillId?: string;
  /** Confidence score between 0.0 and 1.0 based on context and boundary match */
  confidence: number;
}

export interface ExtractedExperience {
  /** Minimum required years of experience, or null if not explicitly stated */
  minYears: number | null;
  /** Maximum years of experience if stated as a range (e.g. 3-5 years) */
  maxYears: number | null;
  /** Inferred seniority level */
  level: ExperienceLevel;
  /** Whether explicit numeric experience or seniority cues were identified */
  isIdentifiable: boolean;
  /** Raw text snippets from the listing that mentioned experience */
  rawMentions: string[];
}

export interface ExtractedQualifications {
  /** Degrees detected, e.g. "Bachelor's Degree", "Master's Degree", "Ph.D." */
  degrees: Array<{
    level: 'bachelors' | 'masters' | 'doctorate' | 'unspecified';
    rawMention: string;
    field?: string;
  }>;
  /** Certifications detected, e.g. "AWS Certified Solutions Architect", "CKA" */
  certifications: Array<{
    name: string;
    rawMention: string;
  }>;
}

export type StudentEvidenceTier =
  | 'proven_experience'   // Supported by student's projects, work, or verified credentials
  | 'course_completed'    // Acquired via completed academic course; theoretical exposure only
  | 'self_reported'       // Self-claimed in profile without project or course evidence
  | 'none';               // Missing requirement

export interface StudentSkillMatch {
  skillId: string;
  name: string;
  category: SkillCategoryType;
  ontologySkillId?: string;
  status: 'matched' | 'missing';
  evidenceTier: StudentEvidenceTier;
  evidenceDescription: string;
  termFrequencyInJob: number;
  importanceInJob: 'critical' | 'important' | 'nice_to_have';
  suggestedCourses?: Array<{
    id: string;
    code: string;
    title: string;
    credits?: number;
  }>;
  suggestedProjects?: Array<{
    id: string;
    title: string;
    domain: string;
    difficulty: string;
  }>;
}

export interface StudentJobComparison {
  studentId: string;
  studentName: string;
  /** Overall compatibility score (0-100) reflecting both skill match and evidence depth */
  overallCompatibilityScore: number;
  /** Distribution of requirements across evidence tiers */
  evidenceDistribution: {
    totalRequiredSkills: number;
    provenCount: number;
    courseCount: number;
    selfReportedCount: number;
    missingCount: number;
  };
  matchedSkills: StudentSkillMatch[];
  missingSkills: StudentSkillMatch[];
  /** Detailed human-readable explanation of readiness and evidence strengths/gaps */
  readinessAssessment: string;
  /** Comparison of student semester / role preference against job experience level */
  experienceFit: {
    jobLevel: ExperienceLevel;
    studentStatus: string;
    isAligned: boolean;
    note: string;
  };
}

export interface JobDescriptionAnalysis {
  jobId: string | null;
  title: string | null;
  company: string | null;
  analyzedAt: string;
  cachedAt: string | null;
  isFromCache: boolean;
  wordCount: number;
  /** Technical skills detected (languages, databases, architectures) */
  technicalSkills: ExtractedSkill[];
  /** Tools, libraries, and frameworks detected (React, Docker, AWS, etc.) */
  toolsAndFrameworks: ExtractedSkill[];
  /** Software development methodologies and practices detected */
  methodologies: ExtractedSkill[];
  /** Explicit experience requirements */
  experience: ExtractedExperience;
  /** Qualifications and certifications */
  qualifications: ExtractedQualifications;
  /** Profile comparison if a student ID or profile was provided */
  comparison: StudentJobComparison | null;
  /** Total count of distinct skills and tools detected */
  totalSkillsDetected: number;
}

export interface MarketSkillDemand {
  skillId: string;
  name: string;
  category: SkillCategoryType;
  ontologySkillId?: string;
  /** Number of sampled listings that mentioned this skill */
  frequency: number;
  /** Percentage of sampled listings (0 - 100) */
  percentage: number;
  /** Whether this skill is marked as a mandatory core skill in the campus role catalogue */
  isCoreInPlatform: boolean;
}

export interface RoleJobMarketSummary {
  roleId: string;
  roleTitle: string;
  sampleSize: number;
  analyzedAt: string;
  cachedAt: string | null;
  isFromCache: boolean;
  /** Most demanded technical skills across current listings */
  topSkillsInDemand: MarketSkillDemand[];
  /** Most demanded tools and frameworks across current listings */
  topToolsInDemand: MarketSkillDemand[];
  /** Distribution of required seniority levels in current postings */
  experienceDistribution: {
    entry: number;
    mid: number;
    senior: number;
    lead: number;
    unspecified: number;
  };
  /** Cross-listing variations observed (e.g. language or framework fragmentation) */
  marketVariations: Array<{
    aspect: string;
    observation: string;
  }>;
  /** Gap analysis and suggested courses/projects if studentId was provided */
  studentGapAnalysis: {
    coverageScore: number;
    missingHighDemandSkills: Array<{
      skillId: string;
      name: string;
      marketPercentage: number;
      suggestedCourses: any[];
      suggestedProjects: any[];
    }>;
    provenSkillsHeld: string[];
    academicOnlySkillsHeld: string[];
  } | null;
}
