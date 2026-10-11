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
