export type CompetenceType = 'course_exposure' | 'self_reported' | 'project_demonstrated' | 'verified';
export type SkillProficiencyLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseStatus = 'completed' | 'in_progress' | 'planned';
export type WorkArrangement = 'remote' | 'hybrid' | 'onsite' | 'any';
export type RoleLevelPreference = 'internship' | 'entry_level' | 'experienced' | 'any';

export interface StudentSkill {
  skillId: string;
  name: string;
  category: string;
  tier: string;
  level: SkillProficiencyLevel;
  competenceType: CompetenceType;
  evidenceDescription?: string;
  acquiredAt?: string;
}

export interface StudentCompletedCourse {
  courseId: string;
  code: string;
  title: string;
  department: string;
  credits: number;
  grade: string;
  completedSemester: number;
  status: CourseStatus;
  completedAt?: string;
  taughtSkillIds?: string[];
}

export interface StudentCustomProject {
  projectId: string;
  title: string;
  description: string;
  technologiesUsed: string[];
  skillsDemonstrated: string[];
  role: string;
  link: string;
  createdAt?: string;
}

export interface StudentCertification {
  name: string;
  issuer: string;
  issueDate?: string;
  credentialUrl?: string;
  associatedSkillIds?: string[];
}

export interface StudentProfile {
  studentId: string;
  rollNumber: string;
  name: string;
  email: string;
  department: string;
  degree: string;
  branch: string;
  institution: string;
  graduationYear: number;
  currentSemester: number;
  cgpa: number;
  interests: string[];
  careerInterests: string[];
  preferredLocations: string[];
  workArrangement: WorkArrangement;
  roleLevelPreference: RoleLevelPreference;
  skills: StudentSkill[];
  completedCourses: StudentCompletedCourse[];
  customProjects: StudentCustomProject[];
  certifications: StudentCertification[];
  savedRoleIds?: string[];
  savedJobIds?: string[];
  updatedAt?: string;
}

export interface CourseCatalogItem {
  courseId: string;
  code: string;
  title: string;
  department: string;
  credits: number;
  difficulty: 'introductory' | 'intermediate' | 'advanced';
  description: string;
  syllabusTopics: string[];
  taughtSkillIds: string[];
  prerequisiteCourseIds?: string[];
}

export interface SkillCatalogItem {
  skillId: string;
  name: string;
  category: string;
  tier: 'foundational' | 'intermediate' | 'advanced' | 'specialized';
  description: string;
  prerequisiteSkillIds?: string[];
}

export interface CompetenceBreakdown {
  courseExposure: {
    count: number;
    skills: StudentSkill[];
    description: string;
  };
  selfReported: {
    count: number;
    skills: StudentSkill[];
    description: string;
  };
  projectDemonstrated: {
    count: number;
    skills: StudentSkill[];
    description: string;
  };
  verified: {
    count: number;
    skills: StudentSkill[];
    description: string;
  };
}

export interface ProfileSummaryResponse {
  studentId: string;
  name: string;
  rollNumber: string;
  email: string;
  department: string;
  degree: string;
  branch: string;
  institution: string;
  graduationYear: number;
  currentSemester: number;
  cgpa: number;
  interests: string[];
  careerInterests: string[];
  preferredLocations: string[];
  workArrangement: WorkArrangement;
  roleLevelPreference: RoleLevelPreference;
  completedCoursesCount: number;
  completedCourses: StudentCompletedCourse[];
  totalSkillsCount: number;
  competenceBreakdown: CompetenceBreakdown;
  customProjects: StudentCustomProject[];
  certifications: StudentCertification[];
  updatedAt?: string;
}

// ── Career Discovery & Roles ──────────────────────────────────────────────────

export interface CareerRole {
  roleId: string;
  title: string;
  slug: string;
  category: string;
  demandLevel: 'High' | 'Very High' | 'Moderate';
  averageSalaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  growthRate: string;
  summary: string;
  description: string;
  requiredSkills: Array<{ skillId: string; name: string; category?: string; tier?: string }>;
  preferredSkills: Array<{ skillId: string; name: string; category?: string; tier?: string }>;
  typicalDayTasks: string[];
  recommendedElectives: string[];
}

export interface MatchingSkillDetail {
  skillId: string;
  name: string;
  category: string;
  tier: string;
  competenceType: CompetenceType;
  proficiencyLevel: SkillProficiencyLevel;
  isCore: boolean;
  evidenceDescription?: string;
}

export interface MissingSkillDetail {
  skillId: string;
  name: string;
  category: string;
  tier: string;
  isCore: boolean;
  prerequisites: string[];
  isBottleneckPrerequisite: boolean;
}

export interface LearningPathStep {
  step: number;
  skillId: string;
  skillName: string;
  category: string;
  tier: string;
  isCore: boolean;
  isPrerequisiteBottleneck: boolean;
  reason: string;
  prerequisites: string[];
  suggestedCourses: Array<{
    id: string;
    code: string;
    title: string;
    credits: number;
    difficulty: string;
  }>;
  suggestedProjects: Array<{
    id: string;
    title: string;
    domain: string;
    difficulty: string;
  }>;
  suggestedResources: Array<{
    id: string;
    title: string;
    type: string;
  }>;
}

export interface RoleCompatibilityScoreBreakdown {
  coreSkillsPoints: number;
  preferredSkillsPoints: number;
  evidenceDepthPoints: number;
  courseworkPoints: number;
  interestBonusPoints: number;
  totalRawScore: number;
  finalScore: number;
}

export interface RoleRecommendation {
  roleId: string;
  title: string;
  slug: string;
  category: string;
  demandLevel: 'High' | 'Very High' | 'Moderate';
  averageSalaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  growthRate: string;
  summary: string;
  compatibilityScore: number;
  fitLevel: 'High Fit' | 'Moderate Fit' | 'Emerging Fit';
  scoreBreakdown: RoleCompatibilityScoreBreakdown;
  matchingSkills: MatchingSkillDetail[];
  missingSkills: MissingSkillDetail[];
  missingRequiredSkills: MissingSkillDetail[];
  missingPreferredSkills: MissingSkillDetail[];
  skillGapsCount: number;
  prerequisiteBottlenecks: Array<{
    skillId: string;
    skillName: string;
    blocksSkillId: string;
    blocksSkillName: string;
  }>;
  recommendedNextCourse: {
    courseId: string;
    code: string;
    title: string;
    credits: number;
    difficulty: string;
    reason: string;
    taughtSkillIds: string[];
  } | null;
  recommendedCourses: Array<{
    courseId: string;
    code: string;
    title: string;
    credits: number;
    difficulty: string;
    taughtSkillIds: string[];
  }>;
  recommendedProjects: Array<{
    projectId: string;
    title: string;
    domain: string;
    difficulty: string;
    requiredSkillIds: string[];
  }>;
  explanation: string;
  learningPath: LearningPathStep[];
  alignedJobsCount: number;
}

export interface CareerToLearningPath {
  roleId: string;
  roleTitle: string;
  roleSummary: string;
  compatibilityScore: number;
  fitLevel: string;
  skillGapsCount: number;
  matchingSkills: MatchingSkillDetail[];
  missingSkills: MissingSkillDetail[];
  prerequisiteBottlenecks: Array<{
    skillId: string;
    skillName: string;
    blocksSkillId: string;
    blocksSkillName: string;
  }>;
  learningSequence: LearningPathStep[];
  recommendedCourses: Array<{
    courseId: string;
    code: string;
    title: string;
    credits: number;
    difficulty: string;
    taughtSkillIds: string[];
  }>;
  recommendedProjects: Array<{
    projectId: string;
    title: string;
    domain: string;
    difficulty: string;
    requiredSkillIds: string[];
  }>;
  estimatedEffort: {
    totalHours: number;
    estimatedWeeks: number;
    hoursPerWeek: number;
    confidence: 'high' | 'medium' | 'estimated';
    breakdownNote: string;
  };
  alignedJobs: NormalizedJob[];
}

export interface PathwayComparison {
  studentId: string;
  comparisonTimestamp: string;
  comparedRolesCount: number;
  highestCompatibilityRole: {
    roleId: string;
    title: string;
    score: number;
  };
  lowestEffortRole: {
    roleId: string;
    title: string;
    estimatedWeeks: number;
  };
  pathways: Array<{
    roleId: string;
    roleTitle: string;
    compatibilityScore: number;
    fitLevel: string;
    missingSkillsCount: number;
    missingPrerequisitesCount: number;
    coursesCount: number;
    projectsCount: number;
    estimatedWeeks: number;
    totalHours: number;
    recommendedNextCourse: {
      code: string;
      title: string;
    } | null;
  }>;
  commonSkillGaps: Array<{
    skillId: string;
    name: string;
    sharedAcrossRolesCount: number;
  }>;
}

export interface SavedPathway {
  id: string;
  studentId: string;
  roleId: string;
  roleTitle: string;
  notes?: string;
  savedAt: string;
}

// ── Live Jobs & Providers ─────────────────────────────────────────────────────

export interface JobAttribution {
  text: string;
  url: string;
  required: boolean;
  logoUrl?: string;
}

export interface NormalizedJob {
  id: string;
  externalId: string;
  provider: 'jobicy' | 'remotive' | 'development_fixture' | 'campus_internal';
  sourceName: string;
  title: string;
  company: string;
  companyLogo: string | null;
  description: string;
  excerpt: string;
  location: string;
  workArrangement: 'remote' | 'hybrid' | 'on-site' | 'unspecified';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship' | 'unspecified';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'unspecified';
  category: string;
  tags: string[];
  salary?: {
    min: number | null;
    max: number | null;
    currency: string;
    period: 'yearly' | 'monthly' | 'hourly';
    raw?: string;
  };
  publicationDate: string;
  originalUrl: string;
  retrievedAt: string;
  isLive: boolean;
  attribution: JobAttribution;
}

export interface JobSearchParams {
  keyword?: string;
  location?: string;
  category?: string;
  workArrangement?: string;
  employmentType?: string;
  experienceLevel?: string;
  limit?: number;
  page?: number;
  forceFresh?: boolean;
}

// ── Job Description Analysis & Matching ───────────────────────────────────────

export type StudentEvidenceTier =
  | 'proven_experience'
  | 'course_completed'
  | 'self_reported'
  | 'none';

export interface ExtractedSkill {
  id: string;
  canonicalName: string;
  category: 'technical_skill' | 'tool_framework' | 'qualification' | 'certification' | 'methodology';
  rawMatchedTerm: string;
  termFrequency: number;
  tfIdfScore: number;
  ontologySkillId?: string;
  confidence: number;
}

export interface ExtractedExperience {
  minYears: number | null;
  maxYears: number | null;
  level: 'entry' | 'mid' | 'senior' | 'lead' | 'unspecified';
  isIdentifiable: boolean;
  rawMentions: string[];
}

export interface ExtractedQualifications {
  degrees: Array<{
    level: 'bachelors' | 'masters' | 'doctorate' | 'unspecified';
    rawMention: string;
    field?: string;
  }>;
  certifications: Array<{
    name: string;
    rawMention: string;
  }>;
}

export interface StudentSkillMatch {
  skillId: string;
  name: string;
  category: 'technical_skill' | 'tool_framework' | 'qualification' | 'certification' | 'methodology';
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
    domain?: string;
  }>;
}

export interface StudentJobComparison {
  studentId: string;
  studentName: string;
  overallCompatibilityScore: number;
  evidenceDistribution: {
    totalRequiredSkills: number;
    provenCount: number;
    courseCount: number;
    selfReportedCount: number;
    missingCount: number;
  };
  matchedSkills: StudentSkillMatch[];
  missingSkills: StudentSkillMatch[];
  readinessAssessment: string;
  experienceFit: {
    jobLevel: string;
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
  technicalSkills: ExtractedSkill[];
  toolsAndFrameworks: ExtractedSkill[];
  methodologies: ExtractedSkill[];
  experience: ExtractedExperience;
  qualifications: ExtractedQualifications;
  comparison: StudentJobComparison | null;
  totalSkillsDetected: number;
}

export interface MarketSkillDemand {
  skillId: string;
  name: string;
  category: string;
  ontologySkillId?: string;
  frequency: number;
  percentage: number;
  isCoreInPlatform: boolean;
}

export interface RoleJobMarketSummary {
  roleId: string;
  roleTitle: string;
  sampleSize: number;
  analyzedAt: string;
  cachedAt: string | null;
  isFromCache: boolean;
  topSkillsInDemand: MarketSkillDemand[];
  topToolsInDemand: MarketSkillDemand[];
}
