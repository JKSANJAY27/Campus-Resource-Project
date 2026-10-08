import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendationService, ROLE_SKILL_MAP } from '../src/services/recommendation.service.js';
import { graphRepository } from '../src/repositories/neo4j/graph.repository.js';
import { recommendationRepository } from '../src/repositories/neo4j/recommendation.repository.js';

// Mock dependencies
vi.mock('../src/repositories/neo4j/graph.repository.js', () => ({
  graphRepository: {
    findStudentCurrentSkills: vi.fn(),
    findMissingSkills: vi.fn(),
    findSkillPrerequisites: vi.fn(),
    findCoursesTeachingMissingSkills: vi.fn(),
    findJobRequiredSkills: vi.fn(),
    findProjectsMatchingStudentSkills: vi.fn(),
  },
}));

vi.mock('../src/repositories/neo4j/recommendation.repository.js', () => ({
  recommendationRepository: {
    findStudentInterests: vi.fn(),
    findStudentCompletedCourses: vi.fn(),
    findAllJobsWithSkills: vi.fn(),
    findAllProjectsWithSkills: vi.fn(),
    findAllCoursesWithSkills: vi.fn(),
    findResourcesForSkills: vi.fn(),
    findSkillPopularity: vi.fn(),
    findShortestPrerequisitePath: vi.fn(),
  },
}));

describe('Phase 5: Recommendation Engine - Unit Tests', () => {
  let service: RecommendationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RecommendationService();
  });

  // ==========================================================================
  // 1. Input Validation & Error Handling
  // ==========================================================================
  describe('Input Validation & Error Handling', () => {
    it('should throw 400 if studentId, targetType, or targetId is missing in skill gap analysis', async () => {
      await expect(service.getSkillGapAnalysis('', 'job', 'j_01')).rejects.toMatchObject({
        status: 400,
        message: 'studentId, targetType, and targetId are required',
      });
      await expect(service.getSkillGapAnalysis('stu_01', 'job', '')).rejects.toMatchObject({
        status: 400,
      });
    });

    it('should throw 400 if invalid targetType is provided', async () => {
      await expect(service.getSkillGapAnalysis('stu_01', 'invalid' as any, 'j_01')).rejects.toMatchObject({
        status: 400,
        message: 'targetType must be one of: job, project, skill',
      });
    });

    it('should throw 400 if studentId is missing in learning path recommendation', async () => {
      await expect(service.getLearningPathRecommendation('', 'ai-ml-engineer')).rejects.toMatchObject({
        status: 400,
        message: 'studentId is required',
      });
    });

    it('should throw 400 if studentId is missing in recommended courses', async () => {
      await expect(service.getRecommendedCourses('')).rejects.toMatchObject({
        status: 400,
        message: 'studentId is required',
      });
    });

    it('should throw 400 if studentId or jobId is missing in job readiness analysis', async () => {
      await expect(service.getJobReadinessAnalysis('', 'j_01')).rejects.toMatchObject({
        status: 400,
        message: 'studentId and jobId are required',
      });
      await expect(service.getJobReadinessAnalysis('stu_01', '')).rejects.toMatchObject({
        status: 400,
      });
    });

    it('should throw 404 if job does not exist in job readiness analysis', async () => {
      vi.mocked(graphRepository.findJobRequiredSkills).mockResolvedValueOnce(null as any);
      await expect(service.getJobReadinessAnalysis('stu_01', 'nonexistent_job')).rejects.toMatchObject({
        status: 404,
        message: 'Job not found with ID: nonexistent_job',
      });
    });
  });

  // ==========================================================================
  // 2. Deterministic Skill Gap Analysis
  // ==========================================================================
  describe('Deterministic Skill Gap Analysis', () => {
    it('should accurately calculate match ratio, missing skills, and readiness level', async () => {
      // Setup: student knows Python (sk_python)
      vi.mocked(graphRepository.findStudentCurrentSkills).mockResolvedValue([
        { skillId: 'sk_python', name: 'Python', category: 'Programming', level: 'intermediate' },
      ]);

      // Job requires: Python, Classical ML, and Docker
      vi.mocked(graphRepository.findJobRequiredSkills).mockResolvedValue({
        jobId: 'job_ml',
        title: 'ML Intern',
        company: 'AI Corp',
        requiredSkills: [
          { skillId: 'sk_python', name: 'Python', category: 'Programming', tier: 'foundational' },
          { skillId: 'sk_ml', name: 'Classical Machine Learning', category: 'Data Science & AI', tier: 'intermediate' },
          { skillId: 'sk_docker', name: 'Docker', category: 'Cloud & DevOps', tier: 'intermediate' },
        ],
      });

      // Missing skills returned by graph query
      vi.mocked(graphRepository.findMissingSkills).mockResolvedValue([
        { skillId: 'sk_ml', name: 'Classical Machine Learning', category: 'Data Science & AI' },
        { skillId: 'sk_docker', name: 'Docker', category: 'Cloud & DevOps' },
      ]);

      // Prerequisites for missing skills
      vi.mocked(graphRepository.findSkillPrerequisites).mockImplementation(async (skillId) => {
        if (skillId === 'sk_ml') {
          return [
            { prerequisiteId: 'sk_math_stats', name: 'Linear Algebra & Statistics', category: 'Data Science & AI', tier: 'foundational', depth: 1 },
          ];
        }
        return [];
      });

      const analysis = await service.getSkillGapAnalysis('stu_01', 'job', 'job_ml');

      expect(analysis.studentId).toBe('stu_01');
      expect(analysis.target.id).toBe('job_ml');
      expect(analysis.matchedSkills).toHaveLength(1);
      expect(analysis.matchedSkills[0].id).toBe('sk_python');
      expect(analysis.missingSkills).toHaveLength(2);
      expect(analysis.missingSkills.map((s) => s.id)).toEqual(['sk_ml', 'sk_docker']);

      // 1 out of 3 = 33.3%
      expect(analysis.readinessPercentage).toBe(33.3);
      expect(analysis.readinessLevel).toBe('Low');

      // Verify explanation string mentions matched and missing skills
      expect(analysis.summary).toContain('Python');
      expect(analysis.summary).toContain('Classical Machine Learning');
      expect(analysis.summary).toContain('33.3% readiness');
    });

    it('should assign High readiness when student possesses 80% of skills', async () => {
      vi.mocked(graphRepository.findStudentCurrentSkills).mockResolvedValue([
        { skillId: 'sk_python', name: 'Python', category: 'Programming', level: 'advanced' },
        { skillId: 'sk_sql', name: 'SQL', category: 'Programming', level: 'advanced' },
        { skillId: 'sk_linux', name: 'Linux', category: 'Cloud & DevOps', level: 'intermediate' },
        { skillId: 'sk_docker', name: 'Docker', category: 'Cloud & DevOps', level: 'intermediate' },
      ]);

      vi.mocked(graphRepository.findJobRequiredSkills).mockResolvedValue({
        jobId: 'job_backend',
        title: 'Backend Engineer',
        company: 'CloudBase',
        requiredSkills: [
          { skillId: 'sk_python', name: 'Python', category: 'Programming', tier: 'foundational' },
          { skillId: 'sk_sql', name: 'SQL', category: 'Programming', tier: 'foundational' },
          { skillId: 'sk_linux', name: 'Linux', category: 'Cloud & DevOps', tier: 'foundational' },
          { skillId: 'sk_docker', name: 'Docker', category: 'Cloud & DevOps', tier: 'intermediate' },
          { skillId: 'sk_kubernetes', name: 'Kubernetes', category: 'Cloud & DevOps', tier: 'advanced' },
        ],
      });

      vi.mocked(graphRepository.findMissingSkills).mockResolvedValue([
        { skillId: 'sk_kubernetes', name: 'Kubernetes', category: 'Cloud & DevOps' },
      ]);

      const analysis = await service.getSkillGapAnalysis('stu_01', 'job', 'job_backend');
      expect(analysis.readinessPercentage).toBe(80);
      expect(analysis.readinessLevel).toBe('High');
    });
  });

  // ==========================================================================
  // 3. Learning Path Recommendation - Topological Dependency Ordering
  // ==========================================================================
  describe('Learning Path Recommendation', () => {
    it('should order missing skills topologically according to prerequisite dependencies', async () => {
      // Student already knows Python
      vi.mocked(graphRepository.findStudentCurrentSkills).mockResolvedValue([
        { skillId: 'sk_python', name: 'Python', category: 'Programming', level: 'intermediate' },
      ]);

      // Prerequisite dependencies:
      // sk_math_stats: []
      // sk_data_analysis: [sk_python, sk_math_stats]
      // sk_ml: [sk_data_analysis, sk_math_stats]
      // sk_deep_learning: [sk_ml]
      vi.mocked(graphRepository.findSkillPrerequisites).mockImplementation(async (skillId) => {
        if (skillId === 'sk_math_stats') return [];
        if (skillId === 'sk_data_analysis') {
          return [
            { prerequisiteId: 'sk_python', name: 'Python', category: 'Programming', tier: 'foundational', depth: 1 },
            { prerequisiteId: 'sk_math_stats', name: 'Linear Algebra & Statistics', category: 'Data Science & AI', tier: 'foundational', depth: 1 },
          ];
        }
        if (skillId === 'sk_ml') {
          return [
            { prerequisiteId: 'sk_data_analysis', name: 'Data Analysis', category: 'Data Science & AI', tier: 'intermediate', depth: 1 },
            { prerequisiteId: 'sk_math_stats', name: 'Linear Algebra & Statistics', category: 'Data Science & AI', tier: 'foundational', depth: 1 },
          ];
        }
        if (skillId === 'sk_deep_learning') {
          return [
            { prerequisiteId: 'sk_ml', name: 'Classical Machine Learning', category: 'Data Science & AI', tier: 'intermediate', depth: 1 },
          ];
        }
        return [];
      });

      vi.mocked(graphRepository.findCoursesTeachingMissingSkills).mockResolvedValue([
        {
          courseId: 'crs_stats',
          code: 'MATH201',
          title: 'Statistics & Linear Algebra',
          department: 'Mathematics',
          credits: 4,
          difficulty: 'introductory',
          taughtSkillIds: ['sk_math_stats'],
        },
      ]);

      vi.mocked(recommendationRepository.findResourcesForSkills).mockResolvedValue([
        {
          resourceId: 'res_01',
          title: '3Blue1Brown Linear Algebra',
          type: 'Video Series',
          difficulty: 'beginner',
          taughtSkills: [{ id: 'sk_math_stats', name: 'Linear Algebra', category: 'Math' }],
        },
      ]);

      const path = await service.getLearningPathRecommendation('stu_01', 'data-scientist');

      expect(path.studentId).toBe('stu_01');
      expect(path.alreadyAcquiredSkills.map((s) => s.id)).toContain('sk_python');

      const stepSkillIds = path.orderedLearningPath.map((step) => step.skillId);

      // Verify Topological Property:
      // math_stats must appear BEFORE data_analysis
      const mathIndex = stepSkillIds.indexOf('sk_math_stats');
      const dataAnalysisIndex = stepSkillIds.indexOf('sk_data_analysis');
      const mlIndex = stepSkillIds.indexOf('sk_ml');
      const dlIndex = stepSkillIds.indexOf('sk_deep_learning');

      expect(mathIndex).toBeLessThan(dataAnalysisIndex);
      expect(dataAnalysisIndex).toBeLessThan(mlIndex);
      expect(mlIndex).toBeLessThan(dlIndex);

      // Verify each step has human-readable reason & suggested items
      expect(path.orderedLearningPath[0].step).toBe(1);
      expect(path.orderedLearningPath[0].reason).toBeDefined();
      expect(path.explanation).toContain('Personalized graph learning path');
    });
  });

  // ==========================================================================
  // 4. Deterministic Course Recommendation Scoring
  // ==========================================================================
  describe('Deterministic Course Recommendation', () => {
    it('should rank courses teaching new matching skills above courses teaching known skills, and filter completed courses', async () => {
      // Student has Python
      vi.mocked(graphRepository.findStudentCurrentSkills).mockResolvedValue([
        { skillId: 'sk_python', name: 'Python', category: 'Programming', level: 'intermediate' },
      ]);

      // Student completed crs_completed
      vi.mocked(recommendationRepository.findStudentCompletedCourses).mockResolvedValue([
        { courseId: 'crs_completed', code: 'CS100', title: 'Intro to CS', grade: 'A' },
      ]);

      // Student interest: Data Science & AI
      vi.mocked(recommendationRepository.findStudentInterests).mockResolvedValue([
        { skillId: 'sk_ml', name: 'Machine Learning', category: 'Data Science & AI' },
      ]);

      // Popularity map
      vi.mocked(recommendationRepository.findSkillPopularity).mockResolvedValue(
        new Map([['sk_ml', 25], ['sk_python', 50]])
      );

      // Available courses
      vi.mocked(recommendationRepository.findAllCoursesWithSkills).mockResolvedValue([
        // Course A: Already completed -> should be excluded
        {
          courseId: 'crs_completed',
          code: 'CS100',
          title: 'Intro to CS',
          department: 'Data Science & AI',
          credits: 3,
          difficulty: 'introductory',
          taughtSkills: [{ id: 'sk_python', name: 'Python', category: 'Programming', tier: 'foundational' }],
          prerequisiteCourseIds: [],
        },
        // Course B: Teaches new skill matching interest
        {
          courseId: 'crs_ml',
          code: 'CS401',
          title: 'Applied Machine Learning',
          department: 'Data Science & AI',
          credits: 4,
          difficulty: 'intermediate',
          taughtSkills: [{ id: 'sk_ml', name: 'Machine Learning', category: 'Data Science & AI', tier: 'intermediate' }],
          prerequisiteCourseIds: ['crs_completed'],
        },
        // Course C: Teaches already known skill Python
        {
          courseId: 'crs_py',
          code: 'CS201',
          title: 'Advanced Python',
          department: 'Computer Science',
          credits: 3,
          difficulty: 'introductory',
          taughtSkills: [{ id: 'sk_python', name: 'Python', category: 'Programming', tier: 'foundational' }],
          prerequisiteCourseIds: [],
        },
      ]);

      const recommendations = await service.getRecommendedCourses('stu_01', 5);

      // crs_completed should NOT be in recommendations
      expect(recommendations.find((c) => c.courseId === 'crs_completed')).toBeUndefined();

      // crs_ml should rank higher than crs_py because it teaches a new skill that matches student interest
      expect(recommendations.length).toBe(2);
      expect(recommendations[0].courseId).toBe('crs_ml');
      expect(recommendations[1].courseId).toBe('crs_py');
      expect(recommendations[0].score).toBeGreaterThan(recommendations[1].score);

      // Verify explanation explains why
      expect(recommendations[0].explanation).toContain('teaches 1 new skill');
      expect(recommendations[0].explanation).toContain('all prerequisite courses completed');
    });
  });

  // ==========================================================================
  // 5. Deterministic Project Recommendation Scoring
  // ==========================================================================
  describe('Deterministic Project Recommendation', () => {
    it('should recommend projects offering strong skill compatibility and growth', async () => {
      vi.mocked(graphRepository.findStudentCurrentSkills).mockResolvedValue([
        { skillId: 'sk_python', name: 'Python', category: 'Programming', level: 'intermediate' },
        { skillId: 'sk_ml', name: 'Classical Machine Learning', category: 'Data Science & AI', level: 'intermediate' },
      ]);

      vi.mocked(recommendationRepository.findStudentInterests).mockResolvedValue([
        { skillId: 'sk_ml', name: 'Machine Learning', category: 'Artificial Intelligence' },
      ]);

      vi.mocked(recommendationRepository.findSkillPopularity).mockResolvedValue(new Map());

      vi.mocked(recommendationRepository.findAllProjectsWithSkills).mockResolvedValue([
        // Project A: Matches 2 skills, introduces 1 new skill (Docker) in AI domain
        {
          projectId: 'proj_ai',
          title: 'Computer Vision Sorter',
          domain: 'Artificial Intelligence',
          difficulty: 'intermediate',
          requiredSkills: [
            { id: 'sk_python', name: 'Python', category: 'Programming', tier: 'foundational' },
            { id: 'sk_ml', name: 'Classical Machine Learning', category: 'Data Science & AI', tier: 'intermediate' },
            { id: 'sk_docker', name: 'Docker', category: 'Cloud & DevOps', tier: 'intermediate' },
          ],
        },
        // Project B: Matches 0 skills
        {
          projectId: 'proj_web',
          title: 'E-Commerce Frontend',
          domain: 'Web Development',
          difficulty: 'advanced',
          requiredSkills: [
            { id: 'sk_javascript', name: 'JavaScript', category: 'Programming', tier: 'foundational' },
            { id: 'sk_react', name: 'React', category: 'Web Development', tier: 'intermediate' },
          ],
        },
      ]);

      const recs = await service.getRecommendedProjects('stu_01', 5);

      expect(recs.length).toBe(2);
      expect(recs[0].projectId).toBe('proj_ai');
      expect(recs[0].matchedSkills).toHaveLength(2);
      expect(recs[0].skillsToAcquire).toHaveLength(1);
      expect(recs[0].skillsToAcquire[0].id).toBe('sk_docker');
      expect(recs[0].score).toBeGreaterThan(recs[1].score);
      expect(recs[0].explanation).toContain('you have 2 of 3 required skills');
    });
  });

  // ==========================================================================
  // 6. Job Readiness Analysis & Career Verdict
  // ==========================================================================
  describe('Job Readiness Analysis', () => {
    it('should generate preparation steps and accurate verdict for candidate readiness', async () => {
      vi.mocked(graphRepository.findStudentCurrentSkills).mockResolvedValue([
        { skillId: 'sk_python', name: 'Python', category: 'Programming', level: 'intermediate' },
        { skillId: 'sk_sql', name: 'SQL', category: 'Programming', level: 'intermediate' },
        { skillId: 'sk_linux', name: 'Linux', category: 'Cloud & DevOps', level: 'intermediate' },
      ]);

      vi.mocked(graphRepository.findJobRequiredSkills).mockResolvedValue({
        jobId: 'job_devops',
        title: 'DevOps Engineer',
        company: 'Cloud Corp',
        requiredSkills: [
          { skillId: 'sk_python', name: 'Python', category: 'Programming', tier: 'foundational' },
          { skillId: 'sk_sql', name: 'SQL', category: 'Programming', tier: 'foundational' },
          { skillId: 'sk_linux', name: 'Linux', category: 'Cloud & DevOps', tier: 'foundational' },
          { skillId: 'sk_docker', name: 'Docker', category: 'Cloud & DevOps', tier: 'intermediate' },
        ],
      });

      vi.mocked(graphRepository.findSkillPrerequisites).mockResolvedValue([]);
      vi.mocked(graphRepository.findCoursesTeachingMissingSkills).mockResolvedValue([]);
      vi.mocked(recommendationRepository.findResourcesForSkills).mockResolvedValue([]);

      // Student has 3 out of 4 skills = 75% -> Ready to Apply
      const readiness = await service.getJobReadinessAnalysis('stu_01', 'job_devops');

      expect(readiness.readinessPercentage).toBe(75);
      expect(readiness.readinessVerdict).toBe('Ready to Apply');
      expect(readiness.matchedSkills).toHaveLength(3);
      expect(readiness.missingSkills).toHaveLength(1);
      expect(readiness.missingSkills[0].id).toBe('sk_docker');
      expect(readiness.recommendedLearningPath).toHaveLength(1);
      expect(readiness.recommendedLearningPath[0].skillId).toBe('sk_docker');
    });
  });

  // ==========================================================================
  // 7. Available Roles
  // ==========================================================================
  describe('Available Roles', () => {
    it('should list all predefined ontology career roles', () => {
      const roles = service.getAvailableRoles();
      expect(roles.length).toBeGreaterThan(5);
      const roleIds = roles.map((r) => r.id);
      expect(roleIds).toContain('ai-ml-engineer');
      expect(roleIds).toContain('full-stack-developer');
      expect(roleIds).toContain('backend-engineer');
    });
  });
});
