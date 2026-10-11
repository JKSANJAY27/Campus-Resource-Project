'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Briefcase,
  Layers,
  ChevronRight,
  TrendingUp,
  X,
  Target,
  Sparkles,
  ArrowRight,
  Split,
  Search,
  Filter,
  Check,
  Award,
  ExternalLink,
  BookMarked,
  FolderGit2,
  BarChart3,
  HelpCircle,
  Bookmark,
  BookmarkCheck,
  Download,
  Trash2,
  Route,
} from 'lucide-react';
import { SAMPLE_STUDENTS } from './StudentProfileView';

interface CareerDiscoveryViewProps {
  studentId: string;
}

interface MatchingSkill {
  skillId: string;
  name: string;
  category: string;
  tier: string;
  competenceType: 'course_exposure' | 'self_reported' | 'project_demonstrated' | 'verified';
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced';
  isCore: boolean;
  evidenceDescription?: string;
}

interface MissingSkill {
  skillId: string;
  name: string;
  category: string;
  tier: string;
  isCore: boolean;
  prerequisites: string[];
  isBottleneckPrerequisite: boolean;
}

interface LearningPathStep {
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
}

interface RoleRecommendation {
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
  compatibilityScore: number; // Labeled strictly as "Role-Compatibility Score"
  fitLevel: 'High Fit' | 'Moderate Fit' | 'Emerging Fit';
  scoreBreakdown: {
    coreSkillsPoints: number;
    preferredSkillsPoints: number;
    evidenceDepthPoints: number;
    courseworkPoints: number;
    interestBonusPoints: number;
    totalRawScore: number;
    finalScore: number;
  };
  matchingSkills: MatchingSkill[];
  missingSkills: MissingSkill[];
  missingRequiredSkills: MissingSkill[];
  missingPreferredSkills: MissingSkill[];
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
  } | null;
  recommendedCourses: Array<{
    courseId: string;
    code: string;
    title: string;
    credits: number;
    difficulty: string;
  }>;
  explanation: string;
  learningPath: LearningPathStep[];
  alignedJobsCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback Curated Role Catalog (Deterministic simulation if backend is offline)
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_ROLES: RoleRecommendation[] = [
  {
    roleId: 'role_fullstack_developer',
    title: 'Full-Stack Developer',
    slug: 'fullstack-developer',
    category: 'Web Development',
    demandLevel: 'Very High',
    averageSalaryRange: { min: 88000, max: 132000, currency: 'USD' },
    growthRate: '+20% through 2030',
    summary: 'Delivers full end-to-end features spanning client interfaces, middle-tier API services, relational and NoSQL data stores, and CI deployment.',
    compatibilityScore: 82,
    fitLevel: 'High Fit',
    scoreBreakdown: {
      coreSkillsPoints: 48,
      preferredSkillsPoints: 12,
      evidenceDepthPoints: 8,
      courseworkPoints: 9,
      interestBonusPoints: 5,
      totalRawScore: 82,
      finalScore: 82,
    },
    matchingSkills: [
      { skillId: 'sk_javascript', name: 'JavaScript / TypeScript', category: 'Programming', tier: 'foundational', competenceType: 'project_demonstrated', proficiencyLevel: 'advanced', isCore: true, evidenceDescription: 'Used extensively in custom full-stack web application' },
      { skillId: 'sk_html_css', name: 'HTML5 & Modern CSS', category: 'Web Development', tier: 'foundational', competenceType: 'course_exposure', proficiencyLevel: 'intermediate', isCore: true },
      { skillId: 'sk_sql', name: 'Relational Database Design (SQL)', category: 'Programming', tier: 'foundational', competenceType: 'course_exposure', proficiencyLevel: 'intermediate', isCore: true },
      { skillId: 'sk_react', name: 'React.js & Next.js', category: 'Web Development', tier: 'intermediate', competenceType: 'project_demonstrated', proficiencyLevel: 'intermediate', isCore: true },
    ],
    missingSkills: [
      { skillId: 'sk_nodejs', name: 'Node.js & Express API Design', category: 'Web Development', tier: 'intermediate', isCore: true, prerequisites: ['sk_javascript'], isBottleneckPrerequisite: false },
      { skillId: 'sk_docker', name: 'Docker & Containerization', category: 'Cloud & DevOps', tier: 'intermediate', isCore: false, prerequisites: ['sk_linux'], isBottleneckPrerequisite: true },
    ],
    missingRequiredSkills: [
      { skillId: 'sk_nodejs', name: 'Node.js & Express API Design', category: 'Web Development', tier: 'intermediate', isCore: true, prerequisites: ['sk_javascript'], isBottleneckPrerequisite: false },
    ],
    missingPreferredSkills: [
      { skillId: 'sk_docker', name: 'Docker & Containerization', category: 'Cloud & DevOps', tier: 'intermediate', isCore: false, prerequisites: ['sk_linux'], isBottleneckPrerequisite: true },
    ],
    skillGapsCount: 2,
    prerequisiteBottlenecks: [
      { skillId: 'sk_linux', skillName: 'Linux Shell & Administration', blocksSkillId: 'sk_docker', blocksSkillName: 'Docker & Containerization' },
    ],
    recommendedNextCourse: {
      courseId: 'CS302',
      code: 'CS302',
      title: 'Backend API Design & Distributed Node.js',
      credits: 4,
      difficulty: 'intermediate',
      reason: 'Teaches mandatory core skill Node.js & Express API Design',
    },
    recommendedCourses: [
      { courseId: 'CS302', code: 'CS302', title: 'Backend API Design & Distributed Node.js', credits: 4, difficulty: 'intermediate' },
      { courseId: 'CS340', code: 'CS340', title: 'Containerization & Microservices Architecture', credits: 3, difficulty: 'intermediate' },
    ],
    explanation: 'High compatibility (82/100 role-compatibility score). Student satisfies 4 of 5 mandatory core skills. Key strengths in JavaScript and React are reinforced with demonstrated project evidence. Primary remaining gap is Node.js server design, which builds directly upon existing JavaScript competency.',
    learningPath: [
      {
        step: 1,
        skillId: 'sk_nodejs',
        skillName: 'Node.js & Express API Design',
        category: 'Web Development',
        tier: 'intermediate',
        isCore: true,
        isPrerequisiteBottleneck: false,
        reason: 'Mandatory core requirement for Full-Stack Developer',
        prerequisites: ['sk_javascript'],
        suggestedCourses: [{ id: 'CS302', code: 'CS302', title: 'Backend API Design', credits: 4, difficulty: 'intermediate' }],
        suggestedProjects: [{ id: 'PRJ_05', title: 'RESTful Campus Marketplace API', domain: 'Full-Stack', difficulty: 'intermediate' }],
      },
      {
        step: 2,
        skillId: 'sk_docker',
        skillName: 'Docker & Containerization',
        category: 'Cloud & DevOps',
        tier: 'intermediate',
        isCore: false,
        isPrerequisiteBottleneck: true,
        reason: 'Preferred deployment skill for containerized web stacks',
        prerequisites: ['sk_linux'],
        suggestedCourses: [{ id: 'CS340', code: 'CS340', title: 'Cloud Infrastructure', credits: 3, difficulty: 'intermediate' }],
        suggestedProjects: [{ id: 'PRJ_08', title: 'Multi-Container Deployment Sandbox', domain: 'DevOps', difficulty: 'intermediate' }],
      },
    ],
    alignedJobsCount: 5,
  },
  {
    roleId: 'role_frontend_developer',
    title: 'Frontend Developer',
    slug: 'frontend-developer',
    category: 'Web Development',
    demandLevel: 'Very High',
    averageSalaryRange: { min: 75000, max: 115000, currency: 'USD' },
    growthRate: '+16% through 2030',
    summary: 'Focuses on client-side state management, modern component design systems with React and TypeScript, and cross-browser rendering optimization.',
    compatibilityScore: 78,
    fitLevel: 'High Fit',
    scoreBreakdown: {
      coreSkillsPoints: 60,
      preferredSkillsPoints: 6,
      evidenceDepthPoints: 6,
      courseworkPoints: 6,
      interestBonusPoints: 0,
      totalRawScore: 78,
      finalScore: 78,
    },
    matchingSkills: [
      { skillId: 'sk_html_css', name: 'HTML5 & Modern CSS', category: 'Web Development', tier: 'foundational', competenceType: 'course_exposure', proficiencyLevel: 'intermediate', isCore: true },
      { skillId: 'sk_javascript', name: 'JavaScript / TypeScript', category: 'Programming', tier: 'foundational', competenceType: 'project_demonstrated', proficiencyLevel: 'advanced', isCore: true },
      { skillId: 'sk_react', name: 'React.js & Next.js', category: 'Web Development', tier: 'intermediate', competenceType: 'project_demonstrated', proficiencyLevel: 'intermediate', isCore: true },
    ],
    missingSkills: [
      { skillId: 'sk_graphql', name: 'GraphQL & Apollo Client', category: 'Web Development', tier: 'advanced', isCore: false, prerequisites: ['sk_nodejs'], isBottleneckPrerequisite: true },
      { skillId: 'sk_web_sec', name: 'Web Application Security', category: 'Cybersecurity', tier: 'advanced', isCore: false, prerequisites: ['sk_cyber_sec'], isBottleneckPrerequisite: true },
    ],
    missingRequiredSkills: [],
    missingPreferredSkills: [
      { skillId: 'sk_graphql', name: 'GraphQL & Apollo Client', category: 'Web Development', tier: 'advanced', isCore: false, prerequisites: ['sk_nodejs'], isBottleneckPrerequisite: true },
      { skillId: 'sk_web_sec', name: 'Web Application Security', category: 'Cybersecurity', tier: 'advanced', isCore: false, prerequisites: ['sk_cyber_sec'], isBottleneckPrerequisite: true },
    ],
    skillGapsCount: 2,
    prerequisiteBottlenecks: [
      { skillId: 'sk_nodejs', skillName: 'Node.js', blocksSkillId: 'sk_graphql', blocksSkillName: 'GraphQL & Apollo' },
    ],
    recommendedNextCourse: {
      courseId: 'CS315',
      code: 'CS315',
      title: 'Advanced Client-Side Architecture & GraphQL',
      credits: 3,
      difficulty: 'advanced',
      reason: 'Elevates frontend candidate profile with modern GraphQL data fetching',
    },
    recommendedCourses: [
      { courseId: 'CS315', code: 'CS315', title: 'Advanced Client-Side Architecture & GraphQL', credits: 3, difficulty: 'advanced' },
    ],
    explanation: 'High compatibility (78/100 role-compatibility score). Student satisfies all 3 mandatory core requirements (HTML/CSS, JS/TS, React). Key frontend capabilities are demonstrated via project work. Candidate is ready to pursue frontend internships immediately while acquiring GraphQL electives.',
    learningPath: [
      {
        step: 1,
        skillId: 'sk_graphql',
        skillName: 'GraphQL & Apollo Client',
        category: 'Web Development',
        tier: 'advanced',
        isCore: false,
        isPrerequisiteBottleneck: false,
        reason: 'Preferred high-impact elective for modern React teams',
        prerequisites: ['sk_nodejs'],
        suggestedCourses: [{ id: 'CS315', code: 'CS315', title: 'GraphQL & Client Data', credits: 3, difficulty: 'advanced' }],
        suggestedProjects: [{ id: 'PRJ_09', title: 'Real-time Collaborative Dashboard', domain: 'Web', difficulty: 'advanced' }],
      },
    ],
    alignedJobsCount: 4,
  },
  {
    roleId: 'role_data_analyst',
    title: 'Data Analyst',
    slug: 'data-analyst',
    category: 'Data Science & AI',
    demandLevel: 'High',
    averageSalaryRange: { min: 70000, max: 105000, currency: 'USD' },
    growthRate: '+14% through 2030',
    summary: 'Specializes in exploratory data analysis, statistical tests, data wrangling with Pandas/NumPy, and relational data querying with SQL.',
    compatibilityScore: 65,
    fitLevel: 'Moderate Fit',
    scoreBreakdown: {
      coreSkillsPoints: 45,
      preferredSkillsPoints: 5,
      evidenceDepthPoints: 4,
      courseworkPoints: 6,
      interestBonusPoints: 5,
      totalRawScore: 65,
      finalScore: 65,
    },
    matchingSkills: [
      { skillId: 'sk_python', name: 'Python', category: 'Programming', tier: 'foundational', competenceType: 'course_exposure', proficiencyLevel: 'intermediate', isCore: true },
      { skillId: 'sk_sql', name: 'Relational Database Design (SQL)', category: 'Programming', tier: 'foundational', competenceType: 'course_exposure', proficiencyLevel: 'intermediate', isCore: true },
      { skillId: 'sk_math_stats', name: 'Linear Algebra & Statistics', category: 'Data Science & AI', tier: 'foundational', competenceType: 'course_exposure', proficiencyLevel: 'intermediate', isCore: true },
    ],
    missingSkills: [
      { skillId: 'sk_data_analysis', name: 'Data Analysis (Pandas/NumPy)', category: 'Data Science & AI', tier: 'intermediate', isCore: true, prerequisites: ['sk_python', 'sk_math_stats'], isBottleneckPrerequisite: false },
    ],
    missingRequiredSkills: [
      { skillId: 'sk_data_analysis', name: 'Data Analysis (Pandas/NumPy)', category: 'Data Science & AI', tier: 'intermediate', isCore: true, prerequisites: ['sk_python', 'sk_math_stats'], isBottleneckPrerequisite: false },
    ],
    missingPreferredSkills: [],
    skillGapsCount: 1,
    prerequisiteBottlenecks: [],
    recommendedNextCourse: {
      courseId: 'DS201',
      code: 'DS201',
      title: 'Applied Data Analysis & Exploratory Visualization',
      credits: 4,
      difficulty: 'intermediate',
      reason: 'Teaches primary missing requirement Pandas/NumPy data wrangling',
    },
    recommendedCourses: [
      { courseId: 'DS201', code: 'DS201', title: 'Applied Data Analysis & Exploratory Visualization', credits: 4, difficulty: 'intermediate' },
    ],
    explanation: 'Moderate compatibility (65/100 role-compatibility score). Student demonstrates solid theoretical footing with Python, SQL, and Linear Algebra coursework. Bridging the remaining gap in Pandas and visualization will elevate this to High Fit within one academic module.',
    learningPath: [
      {
        step: 1,
        skillId: 'sk_data_analysis',
        skillName: 'Data Analysis (Pandas/NumPy)',
        category: 'Data Science & AI',
        tier: 'intermediate',
        isCore: true,
        isPrerequisiteBottleneck: false,
        reason: 'Essential daily toolchain for data analysis positions',
        prerequisites: ['sk_python', 'sk_math_stats'],
        suggestedCourses: [{ id: 'DS201', code: 'DS201', title: 'Data Analysis in Python', credits: 4, difficulty: 'intermediate' }],
        suggestedProjects: [{ id: 'PRJ_03', title: 'Campus Energy Consumption Analytics', domain: 'Data Science', difficulty: 'intermediate' }],
      },
    ],
    alignedJobsCount: 3,
  },
  {
    roleId: 'role_backend_developer',
    title: 'Backend Developer',
    slug: 'backend-developer',
    category: 'Software Engineering',
    demandLevel: 'Very High',
    averageSalaryRange: { min: 82000, max: 125000, currency: 'USD' },
    growthRate: '+18% through 2030',
    summary: 'Designs, implements, and maintains scalable server architectures, resilient APIs, and transactional database persistence layers.',
    compatibilityScore: 58,
    fitLevel: 'Moderate Fit',
    scoreBreakdown: {
      coreSkillsPoints: 40,
      preferredSkillsPoints: 5,
      evidenceDepthPoints: 4,
      courseworkPoints: 4,
      interestBonusPoints: 5,
      totalRawScore: 58,
      finalScore: 58,
    },
    matchingSkills: [
      { skillId: 'sk_javascript', name: 'JavaScript / TypeScript', category: 'Programming', tier: 'foundational', competenceType: 'project_demonstrated', proficiencyLevel: 'advanced', isCore: true },
      { skillId: 'sk_sql', name: 'Relational Database Design (SQL)', category: 'Programming', tier: 'foundational', competenceType: 'course_exposure', proficiencyLevel: 'intermediate', isCore: true },
    ],
    missingSkills: [
      { skillId: 'sk_nodejs', name: 'Node.js & Express API Design', category: 'Web Development', tier: 'intermediate', isCore: true, prerequisites: ['sk_javascript'], isBottleneckPrerequisite: false },
      { skillId: 'sk_nosql', name: 'NoSQL Multi-Model Persistence', category: 'Programming', tier: 'intermediate', isCore: false, prerequisites: ['sk_sql'], isBottleneckPrerequisite: false },
    ],
    missingRequiredSkills: [
      { skillId: 'sk_nodejs', name: 'Node.js & Express API Design', category: 'Web Development', tier: 'intermediate', isCore: true, prerequisites: ['sk_javascript'], isBottleneckPrerequisite: false },
    ],
    missingPreferredSkills: [
      { skillId: 'sk_nosql', name: 'NoSQL Multi-Model Persistence', category: 'Programming', tier: 'intermediate', isCore: false, prerequisites: ['sk_sql'], isBottleneckPrerequisite: false },
    ],
    skillGapsCount: 2,
    prerequisiteBottlenecks: [],
    recommendedNextCourse: {
      courseId: 'CS302',
      code: 'CS302',
      title: 'Backend API Design & Distributed Node.js',
      credits: 4,
      difficulty: 'intermediate',
      reason: 'Core server framework requirement for backend roles',
    },
    recommendedCourses: [
      { courseId: 'CS302', code: 'CS302', title: 'Backend API Design & Distributed Node.js', credits: 4, difficulty: 'intermediate' },
    ],
    explanation: 'Moderate compatibility (58/100 role-compatibility score). Strong command of relational SQL and TypeScript provides an excellent foundation. Completing server middleware and NoSQL persistence coursework will bridge core backend requirements.',
    learningPath: [
      {
        step: 1,
        skillId: 'sk_nodejs',
        skillName: 'Node.js & Express API Design',
        category: 'Web Development',
        tier: 'intermediate',
        isCore: true,
        isPrerequisiteBottleneck: false,
        reason: 'Required core backend framework',
        prerequisites: ['sk_javascript'],
        suggestedCourses: [{ id: 'CS302', code: 'CS302', title: 'Backend API Design', credits: 4, difficulty: 'intermediate' }],
        suggestedProjects: [{ id: 'PRJ_05', title: 'Scalable Microservices Gateway', domain: 'Backend', difficulty: 'intermediate' }],
      },
    ],
    alignedJobsCount: 4,
  },
  {
    roleId: 'role_data_engineer',
    title: 'Data Engineer',
    slug: 'data-engineer',
    category: 'Data Science & AI',
    demandLevel: 'Very High',
    averageSalaryRange: { min: 92000, max: 138000, currency: 'USD' },
    growthRate: '+22% through 2030',
    summary: 'Builds scalable data aggregation pipelines, ETL/ELT workflows, distributed storage, and streaming infrastructure.',
    compatibilityScore: 48,
    fitLevel: 'Moderate Fit',
    scoreBreakdown: {
      coreSkillsPoints: 30,
      preferredSkillsPoints: 5,
      evidenceDepthPoints: 4,
      courseworkPoints: 4,
      interestBonusPoints: 5,
      totalRawScore: 48,
      finalScore: 48,
    },
    matchingSkills: [
      { skillId: 'sk_python', name: 'Python', category: 'Programming', tier: 'foundational', competenceType: 'course_exposure', proficiencyLevel: 'intermediate', isCore: true },
      { skillId: 'sk_sql', name: 'Relational Database Design (SQL)', category: 'Programming', tier: 'foundational', competenceType: 'course_exposure', proficiencyLevel: 'intermediate', isCore: true },
    ],
    missingSkills: [
      { skillId: 'sk_nosql', name: 'NoSQL Multi-Model Persistence', category: 'Programming', tier: 'intermediate', isCore: true, prerequisites: ['sk_sql'], isBottleneckPrerequisite: false },
      { skillId: 'sk_linux', name: 'Linux Shell & Administration', category: 'Cloud & DevOps', tier: 'foundational', isCore: true, prerequisites: [], isBottleneckPrerequisite: true },
    ],
    missingRequiredSkills: [
      { skillId: 'sk_nosql', name: 'NoSQL Multi-Model Persistence', category: 'Programming', tier: 'intermediate', isCore: true, prerequisites: ['sk_sql'], isBottleneckPrerequisite: false },
      { skillId: 'sk_linux', name: 'Linux Shell & Administration', category: 'Cloud & DevOps', tier: 'foundational', isCore: true, prerequisites: [], isBottleneckPrerequisite: true },
    ],
    missingPreferredSkills: [],
    skillGapsCount: 2,
    prerequisiteBottlenecks: [
      { skillId: 'sk_linux', skillName: 'Linux Shell', blocksSkillId: 'sk_dist_systems', blocksSkillName: 'Distributed Systems' },
    ],
    recommendedNextCourse: {
      courseId: 'CS320',
      code: 'CS320',
      title: 'Linux Systems Administration & Shell Scripting',
      credits: 3,
      difficulty: 'foundational',
      reason: 'Essential foundational prerequisite for pipeline automation',
    },
    recommendedCourses: [
      { courseId: 'CS320', code: 'CS320', title: 'Linux Systems Administration & Shell Scripting', credits: 3, difficulty: 'foundational' },
    ],
    explanation: 'Moderate compatibility (48/100 role-compatibility score). Core Python and SQL competencies are established. Linux systems administration and NoSQL polyglot storage represent the next crucial development milestones.',
    learningPath: [
      {
        step: 1,
        skillId: 'sk_linux',
        skillName: 'Linux Shell & Administration',
        category: 'Cloud & DevOps',
        tier: 'foundational',
        isCore: true,
        isPrerequisiteBottleneck: true,
        reason: 'Core operating environment for big data infrastructure',
        prerequisites: [],
        suggestedCourses: [{ id: 'CS320', code: 'CS320', title: 'Linux Systems', credits: 3, difficulty: 'foundational' }],
        suggestedProjects: [{ id: 'PRJ_04', title: 'Automated Log ETL Pipeline', domain: 'Data Engineering', difficulty: 'intermediate' }],
      },
    ],
    alignedJobsCount: 2,
  },
  {
    roleId: 'role_ml_engineer',
    title: 'Machine Learning Engineer',
    slug: 'machine-learning-engineer',
    category: 'Data Science & AI',
    demandLevel: 'Very High',
    averageSalaryRange: { min: 96000, max: 146000, currency: 'USD' },
    growthRate: '+24% through 2030',
    summary: 'Develops, validates, benchmarks, and deploys predictive statistical models and machine learning pipelines into production.',
    compatibilityScore: 42,
    fitLevel: 'Moderate Fit',
    scoreBreakdown: {
      coreSkillsPoints: 30,
      preferredSkillsPoints: 2,
      evidenceDepthPoints: 2,
      courseworkPoints: 3,
      interestBonusPoints: 5,
      totalRawScore: 42,
      finalScore: 42,
    },
    matchingSkills: [
      { skillId: 'sk_python', name: 'Python', category: 'Programming', tier: 'foundational', competenceType: 'course_exposure', proficiencyLevel: 'intermediate', isCore: true },
      { skillId: 'sk_math_stats', name: 'Linear Algebra & Statistics', category: 'Data Science & AI', tier: 'foundational', competenceType: 'course_exposure', proficiencyLevel: 'intermediate', isCore: true },
    ],
    missingSkills: [
      { skillId: 'sk_data_analysis', name: 'Data Analysis (Pandas/NumPy)', category: 'Data Science & AI', tier: 'intermediate', isCore: true, prerequisites: ['sk_python', 'sk_math_stats'], isBottleneckPrerequisite: true },
      { skillId: 'sk_ml', name: 'Classical Machine Learning', category: 'Data Science & AI', tier: 'intermediate', isCore: true, prerequisites: ['sk_data_analysis', 'sk_math_stats'], isBottleneckPrerequisite: true },
    ],
    missingRequiredSkills: [
      { skillId: 'sk_data_analysis', name: 'Data Analysis (Pandas/NumPy)', category: 'Data Science & AI', tier: 'intermediate', isCore: true, prerequisites: ['sk_python', 'sk_math_stats'], isBottleneckPrerequisite: true },
      { skillId: 'sk_ml', name: 'Classical Machine Learning', category: 'Data Science & AI', tier: 'intermediate', isCore: true, prerequisites: ['sk_data_analysis', 'sk_math_stats'], isBottleneckPrerequisite: true },
    ],
    missingPreferredSkills: [],
    skillGapsCount: 2,
    prerequisiteBottlenecks: [
      { skillId: 'sk_data_analysis', skillName: 'Data Analysis (Pandas)', blocksSkillId: 'sk_ml', blocksSkillName: 'Classical Machine Learning' },
    ],
    recommendedNextCourse: {
      courseId: 'CS410',
      code: 'CS410',
      title: 'Machine Learning Theory & Scikit-Learn Pipelines',
      credits: 4,
      difficulty: 'intermediate',
      reason: 'Core machine learning modeling framework and cross-validation',
    },
    recommendedCourses: [
      { courseId: 'CS410', code: 'CS410', title: 'Machine Learning Theory & Scikit-Learn Pipelines', credits: 4, difficulty: 'intermediate' },
    ],
    explanation: 'Moderate compatibility (42/100 role-compatibility score). Excellent mathematical and programming baseline with Python and Linear Algebra. Prerequisite bottleneck: Data Analysis must be reinforced before attempting complex statistical modeling.',
    learningPath: [
      {
        step: 1,
        skillId: 'sk_data_analysis',
        skillName: 'Data Analysis (Pandas/NumPy)',
        category: 'Data Science & AI',
        tier: 'intermediate',
        isCore: true,
        isPrerequisiteBottleneck: true,
        reason: 'Required prerequisite for machine learning feature engineering',
        prerequisites: ['sk_python', 'sk_math_stats'],
        suggestedCourses: [{ id: 'DS201', code: 'DS201', title: 'Data Analysis in Python', credits: 4, difficulty: 'intermediate' }],
        suggestedProjects: [{ id: 'PRJ_03', title: 'Tabular Feature Engineering Sandbox', domain: 'Data Science', difficulty: 'intermediate' }],
      },
      {
        step: 2,
        skillId: 'sk_ml',
        skillName: 'Classical Machine Learning',
        category: 'Data Science & AI',
        tier: 'intermediate',
        isCore: true,
        isPrerequisiteBottleneck: false,
        reason: 'Mandatory core requirement for Machine Learning Engineer',
        prerequisites: ['sk_data_analysis', 'sk_math_stats'],
        suggestedCourses: [{ id: 'CS410', code: 'CS410', title: 'Machine Learning Theory', credits: 4, difficulty: 'intermediate' }],
        suggestedProjects: [{ id: 'PRJ_06', title: 'Predictive Churn Model', domain: 'Machine Learning', difficulty: 'intermediate' }],
      },
    ],
    alignedJobsCount: 2,
  },
  {
    roleId: 'role_ai_engineer',
    title: 'AI Engineer',
    slug: 'ai-engineer',
    category: 'Data Science & AI',
    demandLevel: 'Very High',
    averageSalaryRange: { min: 105000, max: 158000, currency: 'USD' },
    growthRate: '+28% through 2030',
    summary: 'Focuses on deep learning architectures, transfer learning, vector embeddings, fine-tuning, and Retrieval-Augmented Generation (RAG).',
    compatibilityScore: 28,
    fitLevel: 'Emerging Fit',
    scoreBreakdown: {
      coreSkillsPoints: 15,
      preferredSkillsPoints: 0,
      evidenceDepthPoints: 2,
      courseworkPoints: 3,
      interestBonusPoints: 8,
      totalRawScore: 28,
      finalScore: 28,
    },
    matchingSkills: [
      { skillId: 'sk_python', name: 'Python', category: 'Programming', tier: 'foundational', competenceType: 'course_exposure', proficiencyLevel: 'intermediate', isCore: true },
    ],
    missingSkills: [
      { skillId: 'sk_ml', name: 'Classical Machine Learning', category: 'Data Science & AI', tier: 'intermediate', isCore: true, prerequisites: ['sk_data_analysis', 'sk_math_stats'], isBottleneckPrerequisite: true },
      { skillId: 'sk_deep_learning', name: 'Deep Learning & Neural Networks', category: 'Data Science & AI', tier: 'advanced', isCore: true, prerequisites: ['sk_ml'], isBottleneckPrerequisite: true },
      { skillId: 'sk_nlp', name: 'Natural Language Processing', category: 'Data Science & AI', tier: 'advanced', isCore: true, prerequisites: ['sk_deep_learning'], isBottleneckPrerequisite: true },
    ],
    missingRequiredSkills: [
      { skillId: 'sk_ml', name: 'Classical Machine Learning', category: 'Data Science & AI', tier: 'intermediate', isCore: true, prerequisites: ['sk_data_analysis', 'sk_math_stats'], isBottleneckPrerequisite: true },
      { skillId: 'sk_deep_learning', name: 'Deep Learning & Neural Networks', category: 'Data Science & AI', tier: 'advanced', isCore: true, prerequisites: ['sk_ml'], isBottleneckPrerequisite: true },
      { skillId: 'sk_nlp', name: 'Natural Language Processing', category: 'Data Science & AI', tier: 'advanced', isCore: true, prerequisites: ['sk_deep_learning'], isBottleneckPrerequisite: true },
    ],
    missingPreferredSkills: [],
    skillGapsCount: 3,
    prerequisiteBottlenecks: [
      { skillId: 'sk_ml', skillName: 'Classical ML', blocksSkillId: 'sk_deep_learning', blocksSkillName: 'Deep Learning' },
      { skillId: 'sk_deep_learning', skillName: 'Deep Learning', blocksSkillId: 'sk_nlp', blocksSkillName: 'Natural Language Processing' },
    ],
    recommendedNextCourse: {
      courseId: 'CS410',
      code: 'CS410',
      title: 'Machine Learning Theory & Scikit-Learn Pipelines',
      credits: 4,
      difficulty: 'intermediate',
      reason: 'First step in multi-tier dependency chain before deep neural networks',
    },
    recommendedCourses: [
      { courseId: 'CS410', code: 'CS410', title: 'Machine Learning Theory & Scikit-Learn Pipelines', credits: 4, difficulty: 'intermediate' },
    ],
    explanation: 'Emerging compatibility (28/100 role-compatibility score). Student holds basic Python skills. Deep multi-tier prerequisite chain detected: Classical ML must precede Deep Learning, which in turn precedes NLP and Generative AI systems.',
    learningPath: [
      {
        step: 1,
        skillId: 'sk_ml',
        skillName: 'Classical Machine Learning',
        category: 'Data Science & AI',
        tier: 'intermediate',
        isCore: true,
        isPrerequisiteBottleneck: true,
        reason: 'Prerequisite for neural architectures',
        prerequisites: ['sk_data_analysis', 'sk_math_stats'],
        suggestedCourses: [{ id: 'CS410', code: 'CS410', title: 'Machine Learning Theory', credits: 4, difficulty: 'intermediate' }],
        suggestedProjects: [{ id: 'PRJ_06', title: 'Predictive Model Baseline', domain: 'ML', difficulty: 'intermediate' }],
      },
      {
        step: 2,
        skillId: 'sk_deep_learning',
        skillName: 'Deep Learning & Neural Networks',
        category: 'Data Science & AI',
        tier: 'advanced',
        isCore: true,
        isPrerequisiteBottleneck: true,
        reason: 'Core foundational architecture for AI engineering',
        prerequisites: ['sk_ml'],
        suggestedCourses: [{ id: 'CS420', code: 'CS420', title: 'Deep Learning with PyTorch', credits: 4, difficulty: 'advanced' }],
        suggestedProjects: [{ id: 'PRJ_01', title: 'CNN Image Classifier', domain: 'Deep Learning', difficulty: 'advanced' }],
      },
    ],
    alignedJobsCount: 1,
  },
  {
    roleId: 'role_cloud_engineer',
    title: 'Cloud Engineer',
    slug: 'cloud-engineer',
    category: 'Cloud & DevOps',
    demandLevel: 'High',
    averageSalaryRange: { min: 88000, max: 135000, currency: 'USD' },
    growthRate: '+19% through 2030',
    summary: 'Specializes in AWS/GCP architecture, VPC networking, Linux administration, and containerized deployment topologies.',
    compatibilityScore: 25,
    fitLevel: 'Emerging Fit',
    scoreBreakdown: {
      coreSkillsPoints: 15,
      preferredSkillsPoints: 0,
      evidenceDepthPoints: 2,
      courseworkPoints: 3,
      interestBonusPoints: 5,
      totalRawScore: 25,
      finalScore: 25,
    },
    matchingSkills: [],
    missingSkills: [
      { skillId: 'sk_linux', name: 'Linux Shell & Administration', category: 'Cloud & DevOps', tier: 'foundational', isCore: true, prerequisites: [], isBottleneckPrerequisite: true },
      { skillId: 'sk_docker', name: 'Docker & Containerization', category: 'Cloud & DevOps', tier: 'intermediate', isCore: true, prerequisites: ['sk_linux'], isBottleneckPrerequisite: true },
      { skillId: 'sk_cloud_aws', name: 'Cloud Infrastructure (AWS/GCP)', category: 'Cloud & DevOps', tier: 'advanced', isCore: true, prerequisites: ['sk_docker', 'sk_linux'], isBottleneckPrerequisite: false },
      { skillId: 'sk_networks', name: 'Computer Networks & Protocols', category: 'Cybersecurity', tier: 'foundational', isCore: true, prerequisites: [], isBottleneckPrerequisite: false },
    ],
    missingRequiredSkills: [
      { skillId: 'sk_linux', name: 'Linux Shell & Administration', category: 'Cloud & DevOps', tier: 'foundational', isCore: true, prerequisites: [], isBottleneckPrerequisite: true },
      { skillId: 'sk_docker', name: 'Docker & Containerization', category: 'Cloud & DevOps', tier: 'intermediate', isCore: true, prerequisites: ['sk_linux'], isBottleneckPrerequisite: true },
      { skillId: 'sk_cloud_aws', name: 'Cloud Infrastructure (AWS/GCP)', category: 'Cloud & DevOps', tier: 'advanced', isCore: true, prerequisites: ['sk_docker', 'sk_linux'], isBottleneckPrerequisite: false },
      { skillId: 'sk_networks', name: 'Computer Networks & Protocols', category: 'Cybersecurity', tier: 'foundational', isCore: true, prerequisites: [], isBottleneckPrerequisite: false },
    ],
    missingPreferredSkills: [],
    skillGapsCount: 4,
    prerequisiteBottlenecks: [
      { skillId: 'sk_linux', skillName: 'Linux Shell', blocksSkillId: 'sk_docker', blocksSkillName: 'Docker' },
    ],
    recommendedNextCourse: {
      courseId: 'CS320',
      code: 'CS320',
      title: 'Linux Systems Administration & Shell Scripting',
      credits: 3,
      difficulty: 'foundational',
      reason: 'Essential prerequisite for Docker and cloud VPC operations',
    },
    recommendedCourses: [
      { courseId: 'CS320', code: 'CS320', title: 'Linux Systems Administration & Shell Scripting', credits: 3, difficulty: 'foundational' },
    ],
    explanation: 'Emerging compatibility (25/100 role-compatibility score). Student currently possesses 0 of 4 mandatory cloud infrastructure skills. Linux administration and networking represent critical first milestones before cloud platforms.',
    learningPath: [
      {
        step: 1,
        skillId: 'sk_linux',
        skillName: 'Linux Shell & Administration',
        category: 'Cloud & DevOps',
        tier: 'foundational',
        isCore: true,
        isPrerequisiteBottleneck: true,
        reason: 'Mandatory OS baseline for cloud VMs and containers',
        prerequisites: [],
        suggestedCourses: [{ id: 'CS320', code: 'CS320', title: 'Linux Systems', credits: 3, difficulty: 'foundational' }],
        suggestedProjects: [{ id: 'PRJ_04', title: 'Linux Server Automation', domain: 'Cloud', difficulty: 'intermediate' }],
      },
    ],
    alignedJobsCount: 1,
  },
  {
    roleId: 'role_devops_engineer',
    title: 'DevOps Engineer',
    slug: 'devops-engineer',
    category: 'Cloud & DevOps',
    demandLevel: 'Very High',
    averageSalaryRange: { min: 94000, max: 142000, currency: 'USD' },
    growthRate: '+21% through 2030',
    summary: 'Connects development and operations through automated CI/CD pipelines, container orchestration, and continuous monitoring.',
    compatibilityScore: 22,
    fitLevel: 'Emerging Fit',
    scoreBreakdown: {
      coreSkillsPoints: 12,
      preferredSkillsPoints: 0,
      evidenceDepthPoints: 2,
      courseworkPoints: 3,
      interestBonusPoints: 5,
      totalRawScore: 22,
      finalScore: 22,
    },
    matchingSkills: [],
    missingSkills: [
      { skillId: 'sk_linux', name: 'Linux Shell & Administration', category: 'Cloud & DevOps', tier: 'foundational', isCore: true, prerequisites: [], isBottleneckPrerequisite: true },
      { skillId: 'sk_docker', name: 'Docker & Containerization', category: 'Cloud & DevOps', tier: 'intermediate', isCore: true, prerequisites: ['sk_linux'], isBottleneckPrerequisite: true },
      { skillId: 'sk_kubernetes', name: 'Kubernetes Orchestration', category: 'Cloud & DevOps', tier: 'advanced', isCore: true, prerequisites: ['sk_docker'], isBottleneckPrerequisite: false },
      { skillId: 'sk_ci_cd', name: 'CI/CD Pipelines', category: 'Cloud & DevOps', tier: 'intermediate', isCore: true, prerequisites: ['sk_linux', 'sk_docker'], isBottleneckPrerequisite: false },
    ],
    missingRequiredSkills: [
      { skillId: 'sk_linux', name: 'Linux Shell & Administration', category: 'Cloud & DevOps', tier: 'foundational', isCore: true, prerequisites: [], isBottleneckPrerequisite: true },
      { skillId: 'sk_docker', name: 'Docker & Containerization', category: 'Cloud & DevOps', tier: 'intermediate', isCore: true, prerequisites: ['sk_linux'], isBottleneckPrerequisite: true },
      { skillId: 'sk_kubernetes', name: 'Kubernetes Orchestration', category: 'Cloud & DevOps', tier: 'advanced', isCore: true, prerequisites: ['sk_docker'], isBottleneckPrerequisite: false },
      { skillId: 'sk_ci_cd', name: 'CI/CD Pipelines', category: 'Cloud & DevOps', tier: 'intermediate', isCore: true, prerequisites: ['sk_linux', 'sk_docker'], isBottleneckPrerequisite: false },
    ],
    missingPreferredSkills: [],
    skillGapsCount: 4,
    prerequisiteBottlenecks: [
      { skillId: 'sk_linux', skillName: 'Linux Shell', blocksSkillId: 'sk_docker', blocksSkillName: 'Docker' },
    ],
    recommendedNextCourse: {
      courseId: 'CS320',
      code: 'CS320',
      title: 'Linux Systems Administration & Shell Scripting',
      credits: 3,
      difficulty: 'foundational',
      reason: 'Foundation of shell automation and deployment scripts',
    },
    recommendedCourses: [
      { courseId: 'CS320', code: 'CS320', title: 'Linux Systems Administration & Shell Scripting', credits: 3, difficulty: 'foundational' },
    ],
    explanation: 'Emerging compatibility (22/100 role-compatibility score). Core container orchestration and CI/CD tools require Linux shell foundation as a hard prerequisite.',
    learningPath: [
      {
        step: 1,
        skillId: 'sk_linux',
        skillName: 'Linux Shell & Administration',
        category: 'Cloud & DevOps',
        tier: 'foundational',
        isCore: true,
        isPrerequisiteBottleneck: true,
        reason: 'Foundational prerequisite for shell scripting and Docker',
        prerequisites: [],
        suggestedCourses: [{ id: 'CS320', code: 'CS320', title: 'Linux Systems', credits: 3, difficulty: 'foundational' }],
        suggestedProjects: [{ id: 'PRJ_04', title: 'Automated CI Scripts', domain: 'DevOps', difficulty: 'intermediate' }],
      },
    ],
    alignedJobsCount: 2,
  },
  {
    roleId: 'role_cybersecurity_analyst',
    title: 'Cybersecurity Analyst',
    slug: 'cybersecurity-analyst',
    category: 'Cybersecurity',
    demandLevel: 'Very High',
    averageSalaryRange: { min: 86000, max: 130000, currency: 'USD' },
    growthRate: '+25% through 2030',
    summary: 'Specializes in TCP/IP packet inspection, cryptographic key management, penetration testing, and web application attack mitigation.',
    compatibilityScore: 18,
    fitLevel: 'Emerging Fit',
    scoreBreakdown: {
      coreSkillsPoints: 10,
      preferredSkillsPoints: 0,
      evidenceDepthPoints: 0,
      courseworkPoints: 3,
      interestBonusPoints: 5,
      totalRawScore: 18,
      finalScore: 18,
    },
    matchingSkills: [],
    missingSkills: [
      { skillId: 'sk_networks', name: 'Computer Networks & Protocols', category: 'Cybersecurity', tier: 'foundational', isCore: true, prerequisites: [], isBottleneckPrerequisite: true },
      { skillId: 'sk_cyber_sec', name: 'Network Security & Cryptography', category: 'Cybersecurity', tier: 'intermediate', isCore: true, prerequisites: ['sk_networks'], isBottleneckPrerequisite: true },
      { skillId: 'sk_web_sec', name: 'Web Application Security', category: 'Cybersecurity', tier: 'advanced', isCore: true, prerequisites: ['sk_cyber_sec', 'sk_nodejs'], isBottleneckPrerequisite: false },
      { skillId: 'sk_linux', name: 'Linux Shell & Administration', category: 'Cloud & DevOps', tier: 'foundational', isCore: true, prerequisites: [], isBottleneckPrerequisite: false },
    ],
    missingRequiredSkills: [
      { skillId: 'sk_networks', name: 'Computer Networks & Protocols', category: 'Cybersecurity', tier: 'foundational', isCore: true, prerequisites: [], isBottleneckPrerequisite: true },
      { skillId: 'sk_cyber_sec', name: 'Network Security & Cryptography', category: 'Cybersecurity', tier: 'intermediate', isCore: true, prerequisites: ['sk_networks'], isBottleneckPrerequisite: true },
      { skillId: 'sk_web_sec', name: 'Web Application Security', category: 'Cybersecurity', tier: 'advanced', isCore: true, prerequisites: ['sk_cyber_sec', 'sk_nodejs'], isBottleneckPrerequisite: false },
      { skillId: 'sk_linux', name: 'Linux Shell & Administration', category: 'Cloud & DevOps', tier: 'foundational', isCore: true, prerequisites: [], isBottleneckPrerequisite: false },
    ],
    missingPreferredSkills: [],
    skillGapsCount: 4,
    prerequisiteBottlenecks: [
      { skillId: 'sk_networks', skillName: 'Computer Networks', blocksSkillId: 'sk_cyber_sec', blocksSkillName: 'Cryptography & Security' },
    ],
    recommendedNextCourse: {
      courseId: 'CS310',
      code: 'CS310',
      title: 'Computer Networks & Packet Architecture',
      credits: 4,
      difficulty: 'foundational',
      reason: 'Mandatory prerequisite before cryptography and penetration testing',
    },
    recommendedCourses: [
      { courseId: 'CS310', code: 'CS310', title: 'Computer Networks & Packet Architecture', credits: 4, difficulty: 'foundational' },
    ],
    explanation: 'Emerging compatibility (18/100 role-compatibility score). Student has acquired 0 of 4 security core skills. Highly specialized domain requiring foundational computer networking and cryptographic protocols.',
    learningPath: [
      {
        step: 1,
        skillId: 'sk_networks',
        skillName: 'Computer Networks & Protocols',
        category: 'Cybersecurity',
        tier: 'foundational',
        isCore: true,
        isPrerequisiteBottleneck: true,
        reason: 'Required networking concepts before studying intrusion defense',
        prerequisites: [],
        suggestedCourses: [{ id: 'CS310', code: 'CS310', title: 'Computer Networks', credits: 4, difficulty: 'foundational' }],
        suggestedProjects: [{ id: 'PRJ_07', title: 'Packet Capture & Wireshark Analyzer', domain: 'Security', difficulty: 'intermediate' }],
      },
    ],
    alignedJobsCount: 1,
  },
];

export function CareerDiscoveryView({ studentId }: CareerDiscoveryViewProps) {
  const student = SAMPLE_STUDENTS[studentId] || SAMPLE_STUDENTS['STU_001'];
  const [recommendations, setRecommendations] = useState<RoleRecommendation[]>(FALLBACK_ROLES);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Mode Switcher: 'discover' (Learning-to-Career) | 'career-to-learning' (Target Role) | 'saved' (Saved Pathways)
  const [activeMode, setActiveMode] = useState<'discover' | 'career-to-learning' | 'saved'>('discover');

  // Career-to-Learning Target Role State
  const [selectedTargetRoleId, setSelectedTargetRoleId] = useState<string>('role_backend_developer');
  const [targetRolePath, setTargetRolePath] = useState<RoleRecommendation | null>(null);
  const [targetRoleLoading, setTargetRoleLoading] = useState<boolean>(false);

  // Saved Pathways State (Backend + localStorage persistence)
  const [savedPathways, setSavedPathways] = useState<Array<{ roleId: string; roleTitle: string; savedAt?: string; notes?: string }>>([]);
  const [savedLoading, setSavedLoading] = useState<boolean>(false);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [fitFilter, setFitFilter] = useState<'all' | 'high' | 'moderate' | 'emerging'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'gaps' | 'salary' | 'title'>('score');

  // Multi-Role Comparison selection (up to 5 roles simultaneously)
  const [comparedRoleIds, setComparedRoleIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Modals
  const [activeLearningPathRole, setActiveLearningPathRole] = useState<RoleRecommendation | null>(null);
  const [activeJobModalRole, setActiveJobModalRole] = useState<RoleRecommendation | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
        const res = await fetch(`${apiUrl}/career-discovery/recommendations/${studentId}`);
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const data = await res.json();
        if (isMounted && data.recommendations && data.recommendations.length > 0) {
          setRecommendations(data.recommendations);
        }
      } catch (err: any) {
        // Use rich calibrated fallback dataset
        console.warn('Using calibrated career discovery fallback dataset:', err.message);
        if (isMounted) {
          setRecommendations(FALLBACK_ROLES);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecommendations();
    return () => {
      isMounted = false;
    };
  }, [studentId]);

  // Load saved pathways from backend (graceful fallback to localStorage)
  useEffect(() => {
    let isMounted = true;
    const fetchSaved = async () => {
      setSavedLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
        const res = await fetch(`${apiUrl}/career-discovery/saved/${studentId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.savedPathways && Array.isArray(data.savedPathways)) {
            setSavedPathways(data.savedPathways);
            try {
              localStorage.setItem(`saved_pathways_${studentId}`, JSON.stringify(data.savedPathways));
            } catch {}
            return;
          }
        }
      } catch (err: any) {
        console.warn('Backend saved pathways unavailable, falling back to local storage:', err.message);
      } finally {
        if (isMounted) setSavedLoading(false);
      }

      try {
        const local = localStorage.getItem(`saved_pathways_${studentId}`);
        if (local && isMounted) {
          setSavedPathways(JSON.parse(local));
        }
      } catch {}
    };

    fetchSaved();
    return () => {
      isMounted = false;
    };
  }, [studentId]);

  // Load target role path for Career-to-Learning mode
  const fetchTargetRolePathway = async (roleId: string) => {
    setTargetRoleLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const res = await fetch(`${apiUrl}/career-discovery/roles/${roleId}/path/${studentId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.pathway) {
          setTargetRolePath(data.pathway);
          return;
        }
      }
    } catch (err: any) {
      console.warn('Backend target role pathway fetch failed, falling back to local calculation:', err.message);
    } finally {
      setTargetRoleLoading(false);
    }

    // Local fallback
    const found =
      recommendations.find((r) => r.roleId === roleId || r.slug === roleId) ||
      FALLBACK_ROLES.find((r) => r.roleId === roleId || r.slug === roleId);
    if (found) {
      setTargetRolePath(found);
    }
  };

  useEffect(() => {
    fetchTargetRolePathway(selectedTargetRoleId);
  }, [selectedTargetRoleId, recommendations]);

  // Toggle Save Pathway (Bookmark)
  const handleToggleSave = async (role: RoleRecommendation) => {
    const isAlreadySaved = savedPathways.some((p) => p.roleId === role.roleId);
    const updated = isAlreadySaved
      ? savedPathways.filter((p) => p.roleId !== role.roleId)
      : [
          ...savedPathways,
          {
            roleId: role.roleId,
            roleTitle: role.title,
            savedAt: new Date().toISOString(),
          },
        ];

    setSavedPathways(updated);
    try {
      localStorage.setItem(`saved_pathways_${studentId}`, JSON.stringify(updated));
    } catch {}

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    try {
      if (isAlreadySaved) {
        await fetch(`${apiUrl}/career-discovery/saved/${studentId}/${role.roleId}`, {
          method: 'DELETE',
        });
      } else {
        await fetch(`${apiUrl}/career-discovery/saved/${studentId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roleId: role.roleId,
            roleTitle: role.title,
          }),
        });
      }
    } catch (err: any) {
      console.warn('Saved pathway sync degraded gracefully to local storage:', err.message);
    }
  };

  // Export Pathway as JSON
  const handleExportPathway = (role: RoleRecommendation) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(role, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${role.slug || role.roleId}_pathway.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export Comparison Matrix as JSON
  const handleExportComparison = () => {
    const payload = {
      studentId,
      studentName: student?.name,
      exportedAt: new Date().toISOString(),
      rolesCount: comparedRoles.length,
      comparedRoles: comparedRoles.map((r) => ({
        roleId: r.roleId,
        title: r.title,
        category: r.category,
        compatibilityScore: r.compatibilityScore,
        fitLevel: r.fitLevel,
        scoreBreakdown: r.scoreBreakdown,
        matchingSkills: r.matchingSkills.map((s) => ({
          name: s.name,
          competenceType: s.competenceType,
          proficiencyLevel: s.proficiencyLevel,
        })),
        missingRequiredSkills: r.missingRequiredSkills.map((s) => s.name),
        missingPreferredSkills: r.missingPreferredSkills.map((s) => s.name),
        prerequisiteBottlenecks: r.prerequisiteBottlenecks,
        recommendedNextCourse: r.recommendedNextCourse,
        averageSalaryRange: r.averageSalaryRange,
        learningPathTotalSteps: r.learningPath.length,
      })),
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `career_pathways_comparison_${studentId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Available categories
  const categories = useMemo(() => {
    const set = new Set(recommendations.map((r) => r.category));
    return ['all', ...Array.from(set)];
  }, [recommendations]);

  // Filtered & Sorted Recommendations
  const filteredRecommendations = useMemo(() => {
    return recommendations
      .filter((role) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = role.title.toLowerCase().includes(q);
          const matchesCategory = role.category.toLowerCase().includes(q);
          const matchesSkills = role.matchingSkills.some((s) => s.name.toLowerCase().includes(q));
          if (!matchesTitle && !matchesCategory && !matchesSkills) return false;
        }

        // Fit Level filter
        if (fitFilter === 'high' && role.fitLevel !== 'High Fit') return false;
        if (fitFilter === 'moderate' && role.fitLevel !== 'Moderate Fit') return false;
        if (fitFilter === 'emerging' && role.fitLevel !== 'Emerging Fit') return false;

        // Category filter
        if (categoryFilter !== 'all' && role.category !== categoryFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'score') return b.compatibilityScore - a.compatibilityScore;
        if (sortBy === 'gaps') return a.skillGapsCount - b.skillGapsCount;
        if (sortBy === 'salary') return b.averageSalaryRange.max - a.averageSalaryRange.max;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [recommendations, searchQuery, fitFilter, categoryFilter, sortBy]);

  // Toggle selection for comparison (up to 5 roles)
  const toggleRoleComparison = (roleId: string) => {
    setComparedRoleIds((prev) => {
      if (prev.includes(roleId)) {
        return prev.filter((id) => id !== roleId);
      }
      if (prev.length >= 5) {
        return [...prev.slice(1), roleId]; // keep max 5
      }
      return [...prev, roleId];
    });
  };

  const comparedRoles = useMemo(() => {
    return recommendations.filter((r) => comparedRoleIds.includes(r.roleId));
  }, [recommendations, comparedRoleIds]);

  const highFitCount = recommendations.filter((r) => r.fitLevel === 'High Fit').length;
  const moderateFitCount = recommendations.filter((r) => r.fitLevel === 'Moderate Fit').length;
  const emergingFitCount = recommendations.filter((r) => r.fitLevel === 'Emerging Fit').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ── Mode Switcher Tab Navigation ─────────────────────────────────────────── */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-1.5 backdrop-blur-xl flex flex-wrap sm:flex-nowrap items-center gap-2 shadow-xl">
        <button
          onClick={() => setActiveMode('discover')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeMode === 'discover'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Compass className="w-4 h-4 text-indigo-300" />
          <span>Learning-to-Career (Discover Roles)</span>
        </button>

        <button
          onClick={() => setActiveMode('career-to-learning')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeMode === 'career-to-learning'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Route className="w-4 h-4 text-purple-300" />
          <span>Career-to-Learning (Target Role Path)</span>
        </button>

        <button
          onClick={() => setActiveMode('saved')}
          className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeMode === 'saved'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <BookMarked className="w-4 h-4 text-amber-300" />
          <span>Saved Pathways</span>
          {savedPathways.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {savedPathways.length}
            </span>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MODE 1: LEARNING-TO-CAREER (DISCOVER ROLES)                                 */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeMode === 'discover' && (
        <div className="space-y-8 animate-fadeIn">
          {/* ── Top Discovery Header ─────────────────────────────────────────────── */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                  Learning-to-Career Discovery Engine
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Personalized Role Recommendations for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{student?.name || studentId}</span>
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Evaluating your completed courses, acquired skills, and project evidence against 10 representative technical roles using deterministic Neo4j graph traversal. No predetermined role selection required.
                </p>
              </div>

              {/* Quick Metrics Bar */}
              <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
                <div className="bg-slate-950/70 border border-emerald-500/20 rounded-xl p-3.5 min-w-[110px] text-center">
                  <div className="text-2xl font-black text-emerald-400">{highFitCount}</div>
                  <div className="text-[11px] font-medium text-emerald-300/80">High Fit (≥70)</div>
                </div>
                <div className="bg-slate-950/70 border border-amber-500/20 rounded-xl p-3.5 min-w-[110px] text-center">
                  <div className="text-2xl font-black text-amber-400">{moderateFitCount}</div>
                  <div className="text-[11px] font-medium text-amber-300/80">Moderate (40-69)</div>
                </div>
                <div className="bg-slate-950/70 border border-slate-700/50 rounded-xl p-3.5 min-w-[110px] text-center">
                  <div className="text-2xl font-black text-slate-400">{emergingFitCount}</div>
                  <div className="text-[11px] font-medium text-slate-500">Emerging (&lt;40)</div>
                </div>
              </div>
            </div>

            {/* Informative Guidance Banner */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-start gap-3 text-xs text-slate-400">
              <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-300 font-medium">Transparency Guarantee:</strong> Each percentage indicates a{' '}
                <span className="text-indigo-300 font-semibold">Role-Compatibility Score</span> derived from verified skills, coursework, and projects. It is{' '}
                <em>not a probability of getting hired</em>, but an objective assessment of syllabus and competence coverage.
              </p>
            </div>
          </div>

          {/* ── Filters & Search Controls ────────────────────────────────────────── */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search roles, categories, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800 text-xs">
                <button
                  onClick={() => setFitFilter('all')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    fitFilter === 'all' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({recommendations.length})
                </button>
                <button
                  onClick={() => setFitFilter('high')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    fitFilter === 'high' ? 'bg-emerald-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  High Fit ({highFitCount})
                </button>
                <button
                  onClick={() => setFitFilter('moderate')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    fitFilter === 'moderate' ? 'bg-amber-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Moderate ({moderateFitCount})
                </button>
                <button
                  onClick={() => setFitFilter('emerging')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    fitFilter === 'emerging' ? 'bg-slate-700 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Emerging ({emergingFitCount})
                </button>
              </div>

              {/* Sort By Dropdown */}
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="score">Sort: Compatibility Score ↓</option>
                <option value="gaps">Sort: Fewest Skill Gaps</option>
                <option value="salary">Sort: Average Salary ↓</option>
                <option value="title">Sort: Alphabetical</option>
              </select>
            </div>
          </div>

          {/* ── Floating Sticky Comparison Bar (When 1+ roles selected) ──────────── */}
          {comparedRoleIds.length > 0 && (
            <div className="sticky top-4 z-30 bg-indigo-950/90 border border-indigo-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 animate-slideDown">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Split className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    Comparing {comparedRoleIds.length} of 5 Selected Roles
                  </div>
                  <div className="text-xs text-indigo-300">
                    {comparedRoles.map((r) => r.title).join(' vs ')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCompareModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/30"
                >
                  <Split className="w-3.5 h-3.5" />
                  Open Side-by-Side Comparison
                </button>
                <button
                  onClick={handleExportComparison}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                  title="Export comparison matrix as JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
                <button
                  onClick={() => setComparedRoleIds([])}
                  className="text-indigo-300 hover:text-white px-3 py-2 text-xs rounded-lg hover:bg-indigo-900/50 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* ── Main Role Cards Grid ─────────────────────────────────── */}
          {filteredRecommendations.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-lg font-bold text-white">No roles matched your filters</h3>
              <p className="text-sm text-slate-400">
                Try adjusting your search query, fit threshold, or domain filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFitFilter('all');
                  setCategoryFilter('all');
                }}
                className="mt-2 text-xs text-indigo-400 hover:underline"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
              {filteredRecommendations.map((role) => {
                const isCompared = comparedRoleIds.includes(role.roleId);
                const isSaved = savedPathways.some((p) => p.roleId === role.roleId);

                // Styling by fit level
                const fitColor =
                  role.fitLevel === 'High Fit'
                    ? {
                        border: 'border-emerald-500/30 hover:border-emerald-500/50',
                        badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                        scoreText: 'text-emerald-400',
                        progressBg: 'bg-emerald-500',
                      }
                    : role.fitLevel === 'Moderate Fit'
                    ? {
                        border: 'border-amber-500/30 hover:border-amber-500/50',
                        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                        scoreText: 'text-amber-400',
                        progressBg: 'bg-amber-500',
                      }
                    : {
                        border: 'border-slate-800 hover:border-slate-700',
                        badge: 'bg-slate-800 text-slate-400 border-slate-700',
                        scoreText: 'text-slate-400',
                        progressBg: 'bg-slate-600',
                      };

                return (
                  <div
                    key={role.roleId}
                    className={`bg-slate-900/85 border ${fitColor.border} rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:translate-y-[-2px] relative overflow-hidden`}
                  >
                    {/* Top card header */}
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                              {role.category}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${fitColor.badge}`}>
                              {role.fitLevel}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {role.growthRate}
                            </span>
                          </div>
                          <h2 className="text-xl font-bold text-white tracking-tight">
                            {role.title}
                          </h2>
                        </div>

                        {/* Top Card Action Icons: Compare, Save, Export */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => toggleRoleComparison(role.roleId)}
                            title="Select for comparison (up to 5)"
                            className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all ${
                              isCompared
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            {isCompared ? <Check className="w-3.5 h-3.5" /> : <Split className="w-3.5 h-3.5" />}
                            {isCompared ? 'Selected' : 'Compare'}
                          </button>

                          <button
                            onClick={() => handleToggleSave(role)}
                            title={isSaved ? 'Saved to profile (click to remove)' : 'Save pathway to profile'}
                            className={`text-xs p-1.5 rounded-lg border flex items-center transition-all ${
                              isSaved
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                                : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            {isSaved ? (
                              <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Bookmark className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            onClick={() => handleExportPathway(role)}
                            title="Export pathway JSON"
                            className="text-xs p-1.5 rounded-lg border bg-slate-950/70 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200 transition-all"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Role-Compatibility Score Display */}
                      <div className="mt-5 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
                        <div className="flex items-baseline justify-between">
                          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-indigo-400" />
                            Role-Compatibility Score
                          </div>
                          <div className="text-right">
                            <span className={`text-2xl font-black ${fitColor.scoreText}`}>
                              {role.compatibilityScore}%
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${fitColor.progressBg} transition-all duration-700 rounded-full`}
                            style={{ width: `${role.compatibilityScore}%` }}
                          />
                        </div>

                        {/* Transparent Score Points Breakdown */}
                        <div className="grid grid-cols-4 gap-1.5 text-[10px] pt-1 border-t border-slate-800/60 text-center">
                          <div className="text-slate-400">
                            Core: <span className="text-slate-200 font-semibold">{role.scoreBreakdown.coreSkillsPoints}/60</span>
                          </div>
                          <div className="text-slate-400">
                            Pref: <span className="text-slate-200 font-semibold">{role.scoreBreakdown.preferredSkillsPoints}/20</span>
                          </div>
                          <div className="text-slate-400">
                            Evidence: <span className="text-slate-200 font-semibold">{role.scoreBreakdown.evidenceDepthPoints}/10</span>
                          </div>
                          <div className="text-slate-400">
                            Course: <span className="text-slate-200 font-semibold">{role.scoreBreakdown.courseworkPoints}/10</span>
                          </div>
                        </div>
                      </div>

                      {/* Summary & Explanation */}
                      <p className="mt-4 text-xs text-slate-300/90 leading-relaxed italic border-l-2 border-indigo-500/50 pl-3">
                        &ldquo;{role.explanation}&rdquo;
                      </p>

                      {/* Matching Skills */}
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Matching Skills ({role.matchingSkills.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {role.matchingSkills.length === 0 ? (
                            <span className="text-[11px] text-slate-500 italic">No matching skills acquired yet</span>
                          ) : (
                            role.matchingSkills.map((s) => {
                              const badgeStyle =
                                s.competenceType === 'project_demonstrated'
                                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                  : s.competenceType === 'verified'
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20';

                              return (
                                <span
                                  key={s.skillId}
                                  title={s.evidenceDescription || s.competenceType}
                                  className={`text-[11px] px-2 py-0.5 rounded-md border font-medium ${badgeStyle}`}
                                >
                                  {s.name}
                                  {s.competenceType === 'project_demonstrated' && ' 🚀'}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Missing Skills & Gaps */}
                      <div className="mt-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            Skill Gaps ({role.skillGapsCount})
                          </span>
                          {role.prerequisiteBottlenecks.length > 0 && (
                            <span className="text-[10px] text-rose-400 font-medium">
                              ⚠ {role.prerequisiteBottlenecks.length} Prereq Bottleneck{role.prerequisiteBottlenecks.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {role.missingRequiredSkills.map((m) => (
                            <span
                              key={m.skillId}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/25 text-rose-300 font-medium"
                            >
                              * {m.name} (Core)
                            </span>
                          ))}
                          {role.missingPreferredSkills.map((m) => (
                            <span
                              key={m.skillId}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-400"
                            >
                              {m.name} (Elective)
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Recommended Next Course Banner */}
                      {role.recommendedNextCourse && (
                        <div className="mt-4 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                              Recommended Next Course
                            </div>
                            <div className="text-xs font-bold text-white truncate">
                              {role.recommendedNextCourse.code} — {role.recommendedNextCourse.title}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {role.recommendedNextCourse.reason}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Action Buttons */}
                    <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-2">
                      <button
                        onClick={() => setActiveLearningPathRole(role)}
                        className="w-full sm:flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        Explore Complete Learning Path
                      </button>

                      <button
                        onClick={() => setActiveJobModalRole(role)}
                        className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        Relevant Jobs ({role.alignedJobsCount})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MODE 2: CAREER-TO-LEARNING (TARGET ROLE LEARNING PATHWAY)                   */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeMode === 'career-to-learning' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-purple-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-3 relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold tracking-wide">
                <Route className="w-3.5 h-3.5 text-purple-400" />
                Goal-Driven Career-to-Learning Engine
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Select Your Target Role to Generate a Personalized Roadmap
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Choose any technical role below. The system evaluates your current profile, performs reverse topological dependency analysis on Neo4j, detects prerequisite bottlenecks, and constructs an optimal prerequisite-respecting learning sequence.
              </p>
            </div>
          </div>

          {/* Target Role Selector Chips */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Choose Target Role ({recommendations.length} Available Technical Paths):
            </div>
            <div className="flex flex-wrap gap-2">
              {recommendations.map((r) => {
                const isSelected = selectedTargetRoleId === r.roleId || selectedTargetRoleId === r.slug;
                return (
                  <button
                    key={r.roleId}
                    onClick={() => setSelectedTargetRoleId(r.roleId)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400'
                        : 'bg-slate-950/80 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{r.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-indigo-700/80 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {r.compatibilityScore}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Role Full Pathway Display */}
          {targetRoleLoading && !targetRolePath ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <Compass className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-400" />
              <p>Analyzing skill dependencies and constructing learning path...</p>
            </div>
          ) : targetRolePath ? (
            <div className="space-y-6">
              {/* Target Role Overview Hero */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                        {targetRolePath.category}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                        {targetRolePath.fitLevel}
                      </span>
                      <span className="text-xs text-slate-400">
                        {targetRolePath.growthRate}
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-white">
                      {targetRolePath.title}
                    </h3>
                    <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                      {targetRolePath.summary}
                    </p>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleToggleSave(targetRolePath)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        savedPathways.some((p) => p.roleId === targetRolePath.roleId)
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                          : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {savedPathways.some((p) => p.roleId === targetRolePath.roleId) ? (
                        <>
                          <BookmarkCheck className="w-4 h-4 text-amber-400" />
                          <span>Saved to Profile</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4" />
                          <span>Save Pathway</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleExportPathway(targetRolePath)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700 flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export (JSON)</span>
                    </button>

                    <button
                      onClick={() => toggleRoleComparison(targetRolePath.roleId)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        comparedRoleIds.includes(targetRolePath.roleId)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Split className="w-4 h-4" />
                      <span>{comparedRoleIds.includes(targetRolePath.roleId) ? 'In Comparison' : 'Compare'}</span>
                    </button>

                    <button
                      onClick={() => setActiveJobModalRole(targetRolePath)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-1.5 transition-all"
                    >
                      <Briefcase className="w-4 h-4" />
                      <span>Jobs ({targetRolePath.alignedJobsCount})</span>
                    </button>
                  </div>
                </div>

                {/* Score & Transparent Breakdown Gauge */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-indigo-400" />
                      Current Profile Compatibility
                    </div>
                    <div className="text-3xl font-black text-indigo-400">
                      {targetRolePath.compatibilityScore}%
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                        style={{ width: `${targetRolePath.compatibilityScore}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-400 pt-1">
                      Role-Compatibility Score based on coursework, acquired skills, and projects.
                    </div>
                  </div>

                  <div className="md:col-span-2 p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Audit Score Breakdown:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Core Skills</div>
                        <div className="text-base font-bold text-white">
                          {targetRolePath.scoreBreakdown.coreSkillsPoints} <span className="text-slate-500 text-xs">/ 60</span>
                        </div>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Preferred Skills</div>
                        <div className="text-base font-bold text-white">
                          {targetRolePath.scoreBreakdown.preferredSkillsPoints} <span className="text-slate-500 text-xs">/ 20</span>
                        </div>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Evidence Depth</div>
                        <div className="text-base font-bold text-white">
                          {targetRolePath.scoreBreakdown.evidenceDepthPoints} <span className="text-slate-500 text-xs">/ 10</span>
                        </div>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Coursework Align</div>
                        <div className="text-base font-bold text-white">
                          {targetRolePath.scoreBreakdown.courseworkPoints} <span className="text-slate-500 text-xs">/ 10</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skill Coverage & Gap Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Matching Skills */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Acquired & Demonstrated Skills ({targetRolePath.matchingSkills.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {targetRolePath.matchingSkills.length === 0 ? (
                        <div className="text-xs text-slate-500 italic">No matching skills found in your profile yet</div>
                      ) : (
                        targetRolePath.matchingSkills.map((s) => (
                          <span
                            key={s.skillId}
                            className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 font-medium"
                          >
                            {s.name} {s.competenceType === 'project_demonstrated' ? '🚀' : ''}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Skill Gaps */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      Missing Skills to Acquire ({targetRolePath.skillGapsCount})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {targetRolePath.missingRequiredSkills.map((m) => (
                        <span
                          key={m.skillId}
                          className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/25 font-medium"
                        >
                          * {m.name} (Mandatory)
                        </span>
                      ))}
                      {targetRolePath.missingPreferredSkills.map((m) => (
                        <span
                          key={m.skillId}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 font-medium"
                        >
                          {m.name} (Elective)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Prerequisite Bottlenecks Alert */}
                {targetRolePath.prerequisiteBottlenecks.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      Prerequisite Dependency Bottlenecks Detected:
                    </div>
                    <p className="text-amber-200/80">
                      The following foundational skills must be learned first before downstream specialization skills become unlockable:
                    </p>
                    <ul className="list-disc pl-5 pt-1 space-y-0.5">
                      {targetRolePath.prerequisiteBottlenecks.map((b) => (
                        <li key={b.skillId}>
                          <strong>{b.skillName}</strong> blocks <em>{b.blocksSkillName}</em>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Next Course Immediate Step */}
                {targetRolePath.recommendedNextCourse && (
                  <div className="p-4 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                        Immediate Recommended Course to Enroll
                      </div>
                      <div className="text-sm font-bold text-white truncate">
                        {targetRolePath.recommendedNextCourse.code} — {targetRolePath.recommendedNextCourse.title}
                      </div>
                      <div className="text-xs text-slate-300">
                        {targetRolePath.recommendedNextCourse.reason}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Complete Step-by-Step Topological DAG Roadmap */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
                <div>
                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    <Compass className="w-5 h-5 text-indigo-400" />
                    Topological Learning Sequence for {targetRolePath.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Prerequisite-respecting DAG schedule. Courses address missing knowledge, followed by hands-on portfolio projects to establish demonstrable evidence.
                  </p>
                </div>

                <div className="space-y-6 pt-2">
                  {targetRolePath.learningPath.length === 0 ? (
                    <div className="text-center py-8 text-emerald-400 font-semibold">
                      🎉 You already satisfy all required skills for this role!
                    </div>
                  ) : (
                    targetRolePath.learningPath.map((step) => (
                      <div
                        key={step.skillId}
                        className="relative pl-8 pb-6 border-l-2 border-indigo-500/30 last:border-l-0 last:pb-0"
                      >
                        {/* Step Marker Badge */}
                        <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-slate-950 border-2 border-indigo-500 flex items-center justify-center text-xs font-bold text-indigo-400 shadow-md">
                          {step.step}
                        </div>

                        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-bold text-white">{step.skillName}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                  step.isCore
                                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 font-semibold'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {step.isCore ? 'Mandatory Core' : 'Elective'}
                              </span>
                              <span className="text-[10px] text-slate-500 capitalize">Tier: {step.tier}</span>
                            </div>
                          </div>

                          <p className="text-xs text-slate-400">{step.reason}</p>

                          {/* Suggested Courses */}
                          {step.suggestedCourses.length > 0 && (
                            <div className="pt-2 border-t border-slate-800/60">
                              <div className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1 mb-1.5">
                                <BookOpen className="w-3.5 h-3.5" /> Suggested Campus Courses:
                              </div>
                              <div className="space-y-1.5">
                                {step.suggestedCourses.map((c) => (
                                  <div
                                    key={c.id}
                                    className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg flex justify-between items-center"
                                  >
                                    <span className="font-medium">
                                      {c.code} — {c.title}
                                    </span>
                                    <span className="text-[10px] text-slate-500">{c.credits} Credits • {c.difficulty}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Suggested Projects */}
                          {step.suggestedProjects.length > 0 && (
                            <div className="pt-2 border-t border-slate-800/60">
                              <div className="text-[11px] font-semibold text-purple-400 flex items-center gap-1 mb-1.5">
                                <FolderGit2 className="w-3.5 h-3.5" /> Practice Portfolio Project:
                              </div>
                              <div className="space-y-1.5">
                                {step.suggestedProjects.map((p) => (
                                  <div
                                    key={p.id}
                                    className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg flex justify-between items-center"
                                  >
                                    <span className="font-medium">{p.title}</span>
                                    <span className="text-[10px] text-slate-500">Domain: {p.domain}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MODE 3: SAVED PATHWAYS (PERSISTED BOOKMARKS)                                */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeMode === 'saved' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
            <div className="space-y-2 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold tracking-wide">
                <BookMarked className="w-3.5 h-3.5 text-amber-400" />
                Persisted Career Pathways
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Saved Career Pathways for <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-indigo-400">{student?.name || studentId}</span>
              </h2>
              <p className="text-sm text-slate-400 max-w-2xl">
                Review, export, and continue tracking your chosen career pathways. All saved pathways are backed by MongoDB and synchronized across sessions.
              </p>
            </div>
          </div>

          {/* Empty State */}
          {savedPathways.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-16 text-center space-y-4">
              <BookMarked className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Saved Pathways Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Explore recommended roles in Learning-to-Career or target specific roles in Career-to-Learning and click the Bookmark icon to save them here.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveMode('discover')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Compass className="w-3.5 h-3.5" />
                  Explore Recommended Roles
                </button>
                <button
                  onClick={() => setActiveMode('career-to-learning')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Route className="w-3.5 h-3.5" />
                  Target Specific Role
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedPathways.map((sp) => {
                const roleData =
                  recommendations.find((r) => r.roleId === sp.roleId) ||
                  FALLBACK_ROLES.find((r) => r.roleId === sp.roleId);

                return (
                  <div
                    key={sp.roleId}
                    className="bg-slate-900/85 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-xl"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                            {roleData?.category || 'Technical Path'}
                          </div>
                          <h3 className="text-lg font-bold text-white">
                            {sp.roleTitle || roleData?.title}
                          </h3>
                        </div>
                        <button
                          onClick={() => {
                            if (roleData) {
                              handleToggleSave(roleData);
                            } else {
                              setSavedPathways((prev) => prev.filter((p) => p.roleId !== sp.roleId));
                            }
                          }}
                          title="Remove bookmark"
                          className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {roleData && (
                        <div className="space-y-2">
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="text-slate-400">Compatibility:</span>
                            <span className="font-bold text-indigo-400">{roleData.compatibilityScore}%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${roleData.compatibilityScore}%` }}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-400">
                            <div>
                              Matching: <strong className="text-emerald-400">{roleData.matchingSkills.length}</strong>
                            </div>
                            <div>
                              Gaps: <strong className="text-rose-400">{roleData.skillGapsCount}</strong>
                            </div>
                          </div>

                          {roleData.recommendedNextCourse && (
                            <div className="text-[11px] bg-indigo-950/40 p-2 rounded-lg border border-indigo-500/20 text-indigo-300">
                              Next: <strong>{roleData.recommendedNextCourse.code}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      {sp.savedAt && (
                        <div className="text-[10px] text-slate-500">
                          Saved: {new Date(sp.savedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                      {roleData && (
                        <>
                          <button
                            onClick={() => setActiveLearningPathRole(roleData)}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                          >
                            <Compass className="w-3.5 h-3.5" />
                            Roadmap
                          </button>
                          <button
                            onClick={() => handleExportPathway(roleData)}
                            title="Export JSON"
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl text-xs border border-slate-700 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleRoleComparison(roleData.roleId)}
                            title="Compare"
                            className={`p-2 rounded-xl text-xs border transition-colors ${
                              comparedRoleIds.includes(roleData.roleId)
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                          >
                            <Split className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modal 1: Side-by-Side Comparison Matrix ──────────────────────────── */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scaleUp">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Split className="w-5 h-5 text-indigo-400" />
                  Side-by-Side Technical Role Comparison
                </h3>
                <p className="text-xs text-slate-400">
                  Comparing {comparedRoles.length} of 5 selected role architectures based on your profile
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportComparison}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                  title="Export comparison matrix as JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Matrix (JSON)
                </button>
                <button
                  onClick={() => setIsCompareModalOpen(false)}
                  className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="p-3 text-xs font-bold text-slate-400 w-1/4">Evaluation Metric</th>
                    {comparedRoles.map((r) => (
                      <th key={r.roleId} className="p-3 text-sm font-bold text-white">
                        {r.title}
                        <div className="text-[10px] font-normal text-indigo-400">{r.category}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  <tr>
                    <td className="p-3 font-semibold text-slate-400">Role-Compatibility Score</td>
                    {comparedRoles.map((r) => (
                      <td key={r.roleId} className="p-3">
                        <span className="text-base font-black text-indigo-400">
                          {r.compatibilityScore}%
                        </span>
                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {r.fitLevel}
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="p-3 font-semibold text-slate-400">Matching Core Skills</td>
                    {comparedRoles.map((r) => (
                      <td key={r.roleId} className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {r.matchingSkills.filter((s) => s.isCore).map((s) => (
                            <span key={s.skillId} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px]">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="p-3 font-semibold text-slate-400">Missing Core Skills</td>
                    {comparedRoles.map((r) => (
                      <td key={r.roleId} className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {r.missingRequiredSkills.map((m) => (
                            <span key={m.skillId} className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px]">
                              {m.name}
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="p-3 font-semibold text-slate-400">Identified Bottlenecks</td>
                    {comparedRoles.map((r) => (
                      <td key={r.roleId} className="p-3 text-[11px] text-amber-300">
                        {r.prerequisiteBottlenecks.length === 0 ? (
                          <span className="text-slate-500">None detected</span>
                        ) : (
                          r.prerequisiteBottlenecks.map((b) => (
                            <div key={b.skillId}>• {b.skillName} → {b.blocksSkillName}</div>
                          ))
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="p-3 font-semibold text-slate-400">Recommended Next Course</td>
                    {comparedRoles.map((r) => (
                      <td key={r.roleId} className="p-3 text-xs text-slate-200">
                        {r.recommendedNextCourse ? (
                          <span className="font-semibold text-indigo-300">
                            {r.recommendedNextCourse.code} — {r.recommendedNextCourse.title}
                          </span>
                        ) : (
                          <span className="text-slate-500">N/A</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="p-3 font-semibold text-slate-400">Average Salary Range</td>
                    {comparedRoles.map((r) => (
                      <td key={r.roleId} className="p-3 font-medium text-slate-300">
                        ${r.averageSalaryRange.min.toLocaleString()} - ${r.averageSalaryRange.max.toLocaleString()}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="p-3 font-semibold text-slate-400">Learning Path Steps</td>
                    {comparedRoles.map((r) => (
                      <td key={r.roleId} className="p-3 text-xs text-slate-300">
                        <span className="font-bold text-indigo-400">{r.learningPath.length} DAG Steps</span>
                        <div className="text-[10px] text-slate-500">Prerequisites respected</div>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="p-3 font-semibold text-slate-400">Detailed Roadmap</td>
                    {comparedRoles.map((r) => (
                      <td key={r.roleId} className="p-3">
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => {
                              setIsCompareModalOpen(false);
                              setActiveLearningPathRole(r);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-sm"
                          >
                            <Compass className="w-3 h-3" />
                            Explore Roadmap
                          </button>
                          <button
                            onClick={() => toggleRoleComparison(r.roleId)}
                            className="text-slate-400 hover:text-rose-400 text-[10px] py-0.5 text-center transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Complete Learning Path Roadmap ──────────────────────────── */}
      {activeLearningPathRole && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scaleUp">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-400" />
                  Learning Path Roadmap: {activeLearningPathRole.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Step-by-step topological skill acquisition path calculated via Neo4j DAG dependencies
                </p>
              </div>
              <button
                onClick={() => setActiveLearningPathRole(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeLearningPathRole.learningPath.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white">All Role Requirements Satisfied!</p>
                  <p className="text-xs text-slate-400">You hold all required core skills for this role.</p>
                </div>
              ) : (
                activeLearningPathRole.learningPath.map((step) => (
                  <div
                    key={step.skillId}
                    className="relative pl-8 pb-6 border-l-2 border-indigo-500/30 last:border-l-0 last:pb-0"
                  >
                    {/* Step Icon Badge */}
                    <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-slate-950 border-2 border-indigo-500 flex items-center justify-center text-xs font-bold text-indigo-400 shadow-md">
                      {step.step}
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{step.skillName}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              step.isCore ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {step.isCore ? 'Mandatory Core' : 'Elective'}
                            </span>
                            <span className="text-[10px] text-slate-500 capitalize">Tier: {step.tier}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{step.reason}</p>
                        </div>
                      </div>

                      {/* Suggested Courses */}
                      {step.suggestedCourses.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/60">
                          <div className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1 mb-1">
                            <BookOpen className="w-3 h-3" /> Suggested Courses:
                          </div>
                          <div className="space-y-1">
                            {step.suggestedCourses.map((c) => (
                              <div key={c.id} className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg flex justify-between items-center">
                                <span>{c.code} — {c.title}</span>
                                <span className="text-[10px] text-slate-500">{c.credits} Credits</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested Projects */}
                      {step.suggestedProjects.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/60">
                          <div className="text-[11px] font-semibold text-purple-400 flex items-center gap-1 mb-1">
                            <FolderGit2 className="w-3 h-3" /> Suggested Practice Project:
                          </div>
                          <div className="space-y-1">
                            {step.suggestedProjects.map((p) => (
                              <div key={p.id} className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg">
                                {p.title} <span className="text-[10px] text-slate-500">({p.domain})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
              <button
                onClick={() => setActiveLearningPathRole(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Close Roadmap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 3: Aligned Job Listings ────────────────────────────────────── */}
      {activeJobModalRole && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-scaleUp">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-400" />
                  Active Campus Listings for {activeJobModalRole.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Campus placement partnerships aligned with this technical career profile
                </p>
              </div>
              <button
                onClick={() => setActiveJobModalRole(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-white">Junior {activeJobModalRole.title}</h4>
                    <p className="text-xs text-indigo-400">Campus Innovation Partners / Tech Lab</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Full-time
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Seeking graduating seniors with demonstrable competence in {activeJobModalRole.title} toolchains.
                </p>
                <div className="pt-2 flex justify-between items-center text-[11px] text-slate-500">
                  <span>Salary Range: ${activeJobModalRole.averageSalaryRange.min.toLocaleString()} - ${activeJobModalRole.averageSalaryRange.max.toLocaleString()}</span>
                  <span className="text-indigo-400 flex items-center gap-1 font-medium">Apply via Portal <ExternalLink className="w-3 h-3" /></span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-white">{activeJobModalRole.title} Intern</h4>
                    <p className="text-xs text-indigo-400">Campus Cloud Research Consortium</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Summer Internship
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Hands-on engineering internship working alongside faculty and enterprise mentors.
                </p>
                <div className="pt-2 flex justify-between items-center text-[11px] text-slate-500">
                  <span>Stipend: Competitive Campus Rate</span>
                  <span className="text-indigo-400 flex items-center gap-1 font-medium">Apply via Portal <ExternalLink className="w-3 h-3" /></span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
              <button
                onClick={() => setActiveJobModalRole(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Close Listings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
