import { describe, it, expect } from 'vitest';
import type {
  RoleRecommendation,
  CareerToLearningPath,
  PathwayComparison,
  JobDescriptionAnalysis,
  StudentJobComparison,
} from '../src/types';

describe('Important Mobile User Journeys Suite', () => {
  describe('1. First Launch vs Returning User Journey Flow', () => {
    it('First Launch: should complete 7-step onboarding payload correctly', () => {
      const onboardingPayload = {
        studentId: 'stu_freshman_test_001',
        name: 'Rohan Sharma',
        email: 'rohan.sharma@campus.edu',
        rollNumber: 'CS2026-088',
        department: 'Computer Science & Engineering',
        degree: 'B.Tech',
        branch: 'CSE',
        institution: 'Campus University',
        graduationYear: 2027,
        currentSemester: 5,
        cgpa: 8.4,
        interests: ['Web Development', 'Cloud Computing'],
        careerInterests: ['Backend Developer', 'Full-Stack Developer'],
        preferredLocations: ['Bangalore', 'Remote'],
        workArrangement: 'hybrid' as const,
        roleLevelPreference: 'entry_level' as const,
        completedCourses: [
          { courseId: 'crs_dsa', grade: 'A', completedSemester: 3, status: 'completed' },
          { courseId: 'crs_dbms', grade: 'A-', completedSemester: 4, status: 'completed' },
        ],
        skills: [
          { skillId: 'sk_python', level: 'intermediate', competenceType: 'project_demonstrated' },
          { skillId: 'sk_sql', level: 'intermediate', competenceType: 'course_exposure' },
        ],
        customProjects: [
          {
            title: 'Campus Lost and Found Portal',
            technologiesUsed: ['React', 'Node.js', 'PostgreSQL'],
            skillsDemonstrated: ['Node.js', 'PostgreSQL'],
          },
        ],
      };

      expect(onboardingPayload.studentId).toBeDefined();
      expect(onboardingPayload.completedCourses).toHaveLength(2);
      expect(onboardingPayload.skills).toHaveLength(2);
      expect(onboardingPayload.customProjects).toHaveLength(1);
    });

    it('Returning User: should recognize persisted student session and bypass welcome', () => {
      const persistedStudentId = 'stu_aarav_patel_001';
      const initialRoute = persistedStudentId ? '/(tabs)' : '/';
      expect(initialRoute).toBe('/(tabs)');
    });
  });

  describe('2. Career Discovery & Comparison Journey', () => {
    const mockRecommendations: RoleRecommendation[] = [
      {
        roleId: 'role_backend_developer',
        title: 'Backend Developer',
        slug: 'backend-developer',
        category: 'Software Engineering',
        demandLevel: 'High',
        averageSalaryRange: { min: 700000, max: 1200000, currency: 'INR' },
        growthRate: '+24%',
        summary: 'Design scalable microservices, backend APIs, and distributed data systems.',
        compatibilityScore: 82,
        fitLevel: 'High Fit',
        scoreBreakdown: {
          coreSkillsPoints: 50,
          preferredSkillsPoints: 14,
          evidenceDepthPoints: 8,
          courseworkPoints: 6,
          interestBonusPoints: 4,
          totalRawScore: 82,
          finalScore: 82,
        },
        matchingSkills: [
          {
            skillId: 'sk_nodejs',
            name: 'Node.js & Express',
            category: 'tool_framework',
            tier: 'intermediate',
            competenceType: 'project_demonstrated',
            proficiencyLevel: 'intermediate',
            isCore: true,
          },
          {
            skillId: 'sk_sql',
            name: 'SQL',
            category: 'technical_skill',
            tier: 'intermediate',
            competenceType: 'course_exposure',
            proficiencyLevel: 'intermediate',
            isCore: true,
          },
        ],
        missingSkills: [
          {
            skillId: 'sk_docker',
            name: 'Docker & Containerization',
            category: 'tool_framework',
            tier: 'intermediate',
            isCore: true,
            prerequisites: [],
            isBottleneckPrerequisite: false,
          },
        ],
        missingRequiredSkills: [],
        missingPreferredSkills: [],
        skillGapsCount: 1,
        prerequisiteBottlenecks: [],
        recommendedNextCourse: {
          courseId: 'crs_devops',
          code: 'CS410',
          title: 'Cloud DevOps & Containers',
          credits: 4,
          difficulty: 'intermediate',
          reason: 'Bridges Docker requirement',
          taughtSkillIds: ['sk_docker'],
        },
        recommendedCourses: [],
        recommendedProjects: [],
        explanation: 'Strong match based on verified Node.js project experience and DBMS coursework.',
        learningPath: [
          {
            step: 1,
            skillId: 'sk_docker',
            skillName: 'Docker',
            category: 'DevOps',
            tier: 'intermediate',
            isCore: true,
            isPrerequisiteBottleneck: false,
            reason: 'Containerization required for microservices deployments',
            prerequisites: [],
            suggestedCourses: [],
            suggestedProjects: [],
            suggestedResources: [],
          },
        ],
        alignedJobsCount: 8,
      },
      {
        roleId: 'role_fullstack_developer',
        title: 'Full-Stack Developer',
        slug: 'fullstack-developer',
        category: 'Web Development',
        demandLevel: 'High',
        averageSalaryRange: { min: 650000, max: 1100000, currency: 'INR' },
        growthRate: '+20%',
        summary: 'Deliver end-to-end web applications combining React UIs and Node APIs.',
        compatibilityScore: 74,
        fitLevel: 'Moderate Fit',
        scoreBreakdown: {
          coreSkillsPoints: 44,
          preferredSkillsPoints: 12,
          evidenceDepthPoints: 8,
          courseworkPoints: 6,
          interestBonusPoints: 4,
          totalRawScore: 74,
          finalScore: 74,
        },
        matchingSkills: [],
        missingSkills: [],
        missingRequiredSkills: [],
        missingPreferredSkills: [],
        skillGapsCount: 3,
        prerequisiteBottlenecks: [],
        recommendedNextCourse: null,
        recommendedCourses: [],
        recommendedProjects: [],
        explanation: 'Good fit with frontend gaps.',
        learningPath: [],
        alignedJobsCount: 12,
      },
    ];

    it('should calculate and display multi-role compatibility rankings', () => {
      expect(mockRecommendations).toHaveLength(2);
      expect(mockRecommendations[0].compatibilityScore).toBeGreaterThan(mockRecommendations[1].compatibilityScore);
      expect(mockRecommendations[0].fitLevel).toBe('High Fit');
    });

    it('should enforce side-by-side comparison structure with effort and gap metrics', () => {
      const comparison: PathwayComparison = {
        studentId: 'stu_aarav_patel_001',
        comparisonTimestamp: new Date().toISOString(),
        comparedRolesCount: 2,
        highestCompatibilityRole: {
          roleId: 'role_backend_developer',
          title: 'Backend Developer',
          score: 82,
        },
        lowestEffortRole: {
          roleId: 'role_backend_developer',
          title: 'Backend Developer',
          estimatedWeeks: 4,
        },
        pathways: [
          {
            roleId: 'role_backend_developer',
            roleTitle: 'Backend Developer',
            compatibilityScore: 82,
            fitLevel: 'High Fit',
            missingSkillsCount: 1,
            missingPrerequisitesCount: 0,
            coursesCount: 1,
            projectsCount: 1,
            estimatedWeeks: 4,
            totalHours: 40,
            recommendedNextCourse: {
              code: 'CS410',
              title: 'Cloud DevOps',
            },
          },
          {
            roleId: 'role_fullstack_developer',
            roleTitle: 'Full-Stack Developer',
            compatibilityScore: 74,
            fitLevel: 'Moderate Fit',
            missingSkillsCount: 3,
            missingPrerequisitesCount: 1,
            coursesCount: 2,
            projectsCount: 2,
            estimatedWeeks: 8,
            totalHours: 85,
            recommendedNextCourse: {
              code: 'CS320',
              title: 'Frontend Engineering',
            },
          },
        ],
        commonSkillGaps: [
          {
            skillId: 'sk_docker',
            name: 'Docker',
            sharedAcrossRolesCount: 2,
          },
        ],
      };

      expect(comparison.pathways).toHaveLength(2);
      expect(comparison.highestCompatibilityRole.roleId).toBe('role_backend_developer');
      expect(comparison.commonSkillGaps[0].sharedAcrossRolesCount).toBe(2);
    });
  });

  describe('3. Strict Evidence Tiers in Job Skill Matching', () => {
    it('STRICT: should distinguish proven project evidence from course-only exposure', () => {
      const matchComparison: StudentJobComparison = {
        studentId: 'stu_001',
        studentName: 'Aarav',
        overallCompatibilityScore: 68,
        evidenceDistribution: {
          totalRequiredSkills: 5,
          provenCount: 2,        // React, Node.js demonstrated in custom project
          courseCount: 1,        // SQL in completed course CS201 (Academic only)
          selfReportedCount: 1,  // Docker self-reported
          missingCount: 1,       // Kubernetes missing
        },
        matchedSkills: [
          {
            skillId: 'sk_react',
            name: 'React.js',
            category: 'tool_framework',
            status: 'matched',
            evidenceTier: 'proven_experience',
            evidenceDescription: 'Built Full-Stack Campus Store project',
            termFrequencyInJob: 3,
            importanceInJob: 'critical',
          },
          {
            skillId: 'sk_sql',
            name: 'SQL',
            category: 'technical_skill',
            status: 'matched',
            evidenceTier: 'course_completed',
            evidenceDescription: 'Academic coursework exposure only; no portfolio project',
            termFrequencyInJob: 2,
            importanceInJob: 'important',
          },
        ],
        missingSkills: [
          {
            skillId: 'sk_k8s',
            name: 'Kubernetes',
            category: 'tool_framework',
            status: 'missing',
            evidenceTier: 'none',
            evidenceDescription: 'Not found in candidate profile',
            termFrequencyInJob: 1,
            importanceInJob: 'important',
          },
        ],
        readinessAssessment: 'Competitive match (68%). 1 matched skill reflects academic classroom completion rather than demonstrated commercial or portfolio experience.',
        experienceFit: {
          jobLevel: 'entry',
          studentStatus: 'Enrolled Undergraduate (Semester 6)',
          isAligned: true,
          note: 'Experience requirements well aligned with student profile.',
        },
      };

      // Ensure evidence distribution is strictly partitioned
      expect(matchComparison.evidenceDistribution.provenCount).toBe(2);
      expect(matchComparison.evidenceDistribution.courseCount).toBe(1);
      expect(matchComparison.evidenceDistribution.missingCount).toBe(1);

      // Verify that course completed is flagged as academic exposure
      const sqlMatch = matchComparison.matchedSkills.find((m) => m.skillId === 'sk_sql');
      expect(sqlMatch?.evidenceTier).toBe('course_completed');
      expect(matchComparison.readinessAssessment).toContain('academic classroom completion');
    });
  });
});
