import { describe, it, expect, beforeEach } from 'vitest';
import { careerDiscoveryService, StudentProfileInput } from '../src/services/career-discovery.service.js';
import { CURATED_CAREER_ROLES } from '../src/constants/career-roles.data.js';

describe('Learning-to-Career Discovery Module - Unit Tests', () => {
  beforeEach(() => {
    // Service initializes with static ontology definitions
  });

  describe('1. Catalogue Integrity & Role Coverage', () => {
    it('should provide a structured catalogue with at least 10 representative technical roles', async () => {
      const roles = await careerDiscoveryService.loadAllRoles();
      expect(roles.length).toBeGreaterThanOrEqual(10);

      const titles = roles.map((r) => r.title);
      expect(titles).toContain('Frontend Developer');
      expect(titles).toContain('Backend Developer');
      expect(titles).toContain('Full-Stack Developer');
      expect(titles).toContain('Data Analyst');
      expect(titles).toContain('Data Engineer');
      expect(titles).toContain('Machine Learning Engineer');
      expect(titles).toContain('AI Engineer');
      expect(titles).toContain('Cloud Engineer');
      expect(titles).toContain('DevOps Engineer');
      expect(titles).toContain('Cybersecurity Analyst');
    });

    it('each role should specify valid core required skills, salary range, and descriptions', async () => {
      const roles = await careerDiscoveryService.loadAllRoles();
      for (const role of roles) {
        expect(role.roleId).toBeDefined();
        expect(role.title).toBeDefined();
        expect(role.category).toBeDefined();
        expect(role.requiredSkillIds.length).toBeGreaterThan(0);
        expect(role.averageSalaryRange.min).toBeGreaterThan(0);
        expect(role.averageSalaryRange.max).toBeGreaterThan(role.averageSalaryRange.min);
        expect(['High', 'Very High', 'Moderate']).toContain(role.demandLevel);
      }
    });
  });

  describe('2. Student with Very Few Completed Courses / Minimal Skills', () => {
    const beginnerStudent: StudentProfileInput = {
      studentId: 'stu_beginner_001',
      name: 'Freshman Alex',
      currentSemester: 1,
      cgpa: 7.2,
      interests: ['Software Engineering'],
      skills: [
        {
          skillId: 'sk_python',
          name: 'Python',
          level: 'beginner',
          competenceType: 'course_exposure',
        },
      ],
      completedCourses: [
        {
          courseId: 'CS101',
          code: 'CS101',
          title: 'Introduction to Programming & Python',
          grade: 'B+',
          status: 'completed',
          taughtSkillIds: ['sk_python'],
        },
      ],
      customProjects: [],
    };

    it('should evaluate all roles without runtime errors and assign emerging/low fit', async () => {
      const result = await careerDiscoveryService.discoverRolesForStudent(beginnerStudent);

      expect(result.evaluatedRolesCount).toBeGreaterThanOrEqual(10);
      expect(result.highFitCount).toBe(0); // Cannot be high fit with only 1 beginner skill
      expect(result.emergingFitCount).toBeGreaterThan(0);

      for (const rec of result.recommendations) {
        // Label must be role-compatibility score, between 0 and 100
        expect(rec.compatibilityScore).toBeGreaterThanOrEqual(0);
        expect(rec.compatibilityScore).toBeLessThanOrEqual(100);
        expect(rec.compatibilityScore).toBeLessThan(50); // Minimal skills yield low scores
        expect(rec.skillGapsCount).toBeGreaterThan(0);
        expect(rec.explanation).toBeDefined();
        expect(rec.explanation.toLowerCase()).toContain('role-compatibility score');
        expect(rec.explanation).not.toContain('probability of getting hired');
      }
    });

    it('should identify prerequisite bottlenecks and recommend introductory courses', async () => {
      const result = await careerDiscoveryService.discoverRolesForStudent(beginnerStudent);
      const feRole = result.recommendations.find((r) => r.title === 'Frontend Developer');

      expect(feRole).toBeDefined();
      expect(feRole?.matchingSkills.length).toBe(0); // Alex has no HTML/CSS or JS
      expect(feRole?.missingRequiredSkills.length).toBe(3); // HTML/CSS, JS, React

      // Prerequisite bottleneck: React requires JavaScript & HTML/CSS
      const reactGap = feRole?.missingRequiredSkills.find((m) => m.name.toLowerCase().includes('react'));
      expect(reactGap?.isBottleneckPrerequisite).toBe(true);
      expect(feRole?.prerequisiteBottlenecks.length).toBeGreaterThan(0);

      // Learning path should order prerequisites before advanced skills
      expect(feRole?.learningPath.length).toBeGreaterThan(0);
      const step1 = feRole?.learningPath[0];
      expect(step1?.step).toBe(1);
    });
  });

  describe('3. Student with Skills Matching Several Different Roles (Cross-Domain)', () => {
    const webDeveloperStudent: StudentProfileInput = {
      studentId: 'stu_polymath_web',
      name: 'Priya Sharma',
      currentSemester: 6,
      cgpa: 8.9,
      interests: ['Full-Stack Web Development', 'Cloud & DevOps'],
      careerInterests: ['Full-Stack Developer', 'Frontend Developer', 'Backend Developer'],
      skills: [
        {
          skillId: 'sk_html_css',
          name: 'HTML5 & Modern CSS',
          level: 'advanced',
          competenceType: 'project_demonstrated',
          evidenceDescription: 'Built custom responsive e-commerce web application',
        },
        {
          skillId: 'sk_javascript',
          name: 'JavaScript / TypeScript',
          level: 'advanced',
          competenceType: 'project_demonstrated',
          evidenceDescription: 'Implemented full typed TypeScript microservices',
        },
        {
          skillId: 'sk_react',
          name: 'React.js & Next.js',
          level: 'intermediate',
          competenceType: 'project_demonstrated',
        },
        {
          skillId: 'sk_nodejs',
          name: 'Node.js & Express API Design',
          level: 'intermediate',
          competenceType: 'course_exposure',
        },
        {
          skillId: 'sk_sql',
          name: 'Relational Database Design (SQL)',
          level: 'intermediate',
          competenceType: 'course_exposure',
        },
      ],
      completedCourses: [
        {
          courseId: 'CS201',
          code: 'CS201',
          title: 'Web Technologies & Frontend Architectures',
          grade: 'A',
          status: 'completed',
          taughtSkillIds: ['sk_html_css', 'sk_javascript', 'sk_react'],
        },
        {
          courseId: 'CS202',
          code: 'CS202',
          title: 'Database Systems & SQL Normalization',
          grade: 'A',
          status: 'completed',
          taughtSkillIds: ['sk_sql'],
        },
      ],
      customProjects: [
        {
          title: 'Campus Food Delivery Platform',
          skillsDemonstrated: ['sk_html_css', 'sk_javascript', 'sk_react'],
        },
      ],
    };

    it('should rank Frontend, Backend, and Full-Stack highly, but rank unrelated roles lower', async () => {
      const result = await careerDiscoveryService.discoverRolesForStudent(webDeveloperStudent);

      expect(result.highFitCount).toBeGreaterThanOrEqual(1);

      const topRoles = result.recommendations.slice(0, 3).map((r) => r.title);
      expect(topRoles).toContain('Frontend Developer');
      expect(topRoles).toContain('Full-Stack Developer');

      const frontendRec = result.recommendations.find((r) => r.title === 'Frontend Developer');
      expect(frontendRec?.fitLevel).toBe('High Fit');
      expect(frontendRec?.compatibilityScore).toBeGreaterThanOrEqual(75);
      expect(frontendRec?.matchingSkills.length).toBeGreaterThanOrEqual(3);

      // Cybersecurity and AI Engineer must rank significantly lower (non-equal recommendation)
      const cyberRec = result.recommendations.find((r) => r.title === 'Cybersecurity Analyst');
      const aiRec = result.recommendations.find((r) => r.title === 'AI Engineer');

      expect(frontendRec!.compatibilityScore).toBeGreaterThan(cyberRec!.compatibilityScore + 25);
      expect(frontendRec!.compatibilityScore).toBeGreaterThan(aiRec!.compatibilityScore + 25);
      expect(cyberRec?.fitLevel).toBe('Emerging Fit');
    });

    it('should produce a detailed score breakdown for transparent auditing', async () => {
      const result = await careerDiscoveryService.discoverRolesForStudent(webDeveloperStudent);
      const fsRec = result.recommendations.find((r) => r.title === 'Full-Stack Developer');

      expect(fsRec).toBeDefined();
      const b = fsRec!.scoreBreakdown;

      // Priya has all 5 core skills: sk_html_css, sk_javascript, sk_react, sk_nodejs, sk_sql
      expect(b.coreSkillsPoints).toBe(60); // 100% of 60 pts
      expect(b.evidenceDepthPoints).toBeGreaterThan(0); // Projects reinforce skills
      expect(b.courseworkPoints).toBeGreaterThan(0); // Courses reinforce skills
      expect(b.finalScore).toBeGreaterThanOrEqual(70);
      expect(fsRec?.fitLevel).toBe('High Fit');
    });
  });

  describe('4. Student with Data Science & AI Specialization', () => {
    const aiStudent: StudentProfileInput = {
      studentId: 'stu_ai_researcher',
      name: 'Rohan Varma',
      currentSemester: 7,
      cgpa: 9.3,
      interests: ['Artificial Intelligence', 'Data Science & Analytics'],
      careerInterests: ['Machine Learning Engineer', 'AI Engineer'],
      skills: [
        {
          skillId: 'sk_python',
          name: 'Python',
          level: 'advanced',
          competenceType: 'project_demonstrated',
        },
        {
          skillId: 'sk_math_stats',
          name: 'Linear Algebra & Statistics',
          level: 'advanced',
          competenceType: 'verified',
        },
        {
          skillId: 'sk_data_analysis',
          name: 'Data Analysis (Pandas/NumPy)',
          level: 'advanced',
          competenceType: 'project_demonstrated',
        },
        {
          skillId: 'sk_ml',
          name: 'Classical Machine Learning',
          level: 'advanced',
          competenceType: 'project_demonstrated',
        },
        {
          skillId: 'sk_deep_learning',
          name: 'Deep Learning & Neural Networks',
          level: 'intermediate',
          competenceType: 'project_demonstrated',
        },
        {
          skillId: 'sk_nlp',
          name: 'Natural Language Processing',
          level: 'intermediate',
          competenceType: 'project_demonstrated',
        },
      ],
      completedCourses: [
        {
          courseId: 'AI401',
          code: 'AI401',
          title: 'Deep Learning & Neural Architectures',
          grade: 'A+',
          status: 'completed',
          taughtSkillIds: ['sk_deep_learning', 'sk_nlp'],
        },
      ],
      customProjects: [
        {
          title: 'Transformer Sentiment Analysis Engine',
          skillsDemonstrated: ['sk_python', 'sk_deep_learning', 'sk_nlp'],
        },
      ],
      certifications: [
        {
          name: 'DeepLearning.AI TensorFlow Specialization',
          associatedSkillIds: ['sk_deep_learning', 'sk_ml'],
        },
      ],
    };

    it('should rank ML Engineer and AI Engineer at the very top with High Fit', async () => {
      const result = await careerDiscoveryService.discoverRolesForStudent(aiStudent);

      const topRole = result.recommendations[0];
      expect(['Machine Learning Engineer', 'AI Engineer']).toContain(topRole.title);
      expect(topRole.fitLevel).toBe('High Fit');
      expect(topRole.compatibilityScore).toBeGreaterThanOrEqual(80);

      // Verify that explanation details strong project and verified credentials
      expect(topRole.explanation).toContain('project evidence');
      expect(topRole.explanation).toContain('mandatory core skills');
    });

    it('should recommend relevant elective skills and next courses', async () => {
      const result = await careerDiscoveryService.discoverRolesForStudent(aiStudent);
      const aiRec = result.recommendations.find((r) => r.title === 'AI Engineer');

      expect(aiRec).toBeDefined();
      // Core skills are satisfied: python, ml, deep_learning, nlp
      expect(aiRec?.missingRequiredSkills.length).toBe(0);

      // Preferred skills: genai, computer_vision, docker, cloud_aws
      expect(aiRec?.missingPreferredSkills.length).toBeGreaterThan(0);
      expect(aiRec?.explanation).toContain('preferred electives');
    });
  });

  describe('5. Student with Broad Generalist Skill Set', () => {
    const generalistStudent: StudentProfileInput = {
      studentId: 'stu_generalist_001',
      name: 'Sam Chen',
      currentSemester: 4,
      cgpa: 8.0,
      interests: ['Computer Science'],
      skills: [
        { skillId: 'sk_python', level: 'intermediate', competenceType: 'self_reported' },
        { skillId: 'sk_javascript', level: 'intermediate', competenceType: 'self_reported' },
        { skillId: 'sk_sql', level: 'intermediate', competenceType: 'self_reported' },
        { skillId: 'sk_linux', level: 'intermediate', competenceType: 'self_reported' },
      ],
    };

    it('should show moderate compatibility across multiple domains without declaring false mastery', async () => {
      const result = await careerDiscoveryService.discoverRolesForStudent(generalistStudent);

      // Multiple roles should have Moderate Fit (40 - 69 score)
      expect(result.moderateFitCount).toBeGreaterThanOrEqual(2);

      for (const rec of result.recommendations) {
        expect(rec.scoreBreakdown.evidenceDepthPoints).toBe(0); // Self-reported only, no project evidence
        expect(rec.explanation).toContain('self-reported');
      }
    });

    it('should clearly rank roles according to matching core requirements', async () => {
      const result = await careerDiscoveryService.discoverRolesForStudent(generalistStudent);

      // Roles requiring SQL + Linux (e.g. Data Engineer) should rank differently from roles requiring React
      const deRole = result.recommendations.find((r) => r.title === 'Data Engineer');
      const feRole = result.recommendations.find((r) => r.title === 'Frontend Developer');

      expect(deRole).toBeDefined();
      expect(feRole).toBeDefined();

      // Sam has 3 of 4 core Data Engineer skills (python, sql, linux), but only 1 of 3 Frontend skills (javascript)
      expect(deRole!.compatibilityScore).toBeGreaterThan(feRole!.compatibilityScore);
    });
  });
});
