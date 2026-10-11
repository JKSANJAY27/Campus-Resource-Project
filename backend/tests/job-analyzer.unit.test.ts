import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { jobAnalyzerService, JobAnalyzerService } from '../src/services/job-analyzer.service.js';
import { cacheRepository } from '../src/repositories/redis/cache.repository.js';
import { StudentProfileInput } from '../src/services/career-discovery.service.js';

describe('Job Description Analysis & Profile Match Suite (No Paid AI APIs)', () => {
  const app = createApp();
  let analyzer: JobAnalyzerService;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new JobAnalyzerService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Text Sanitization & Preprocessing
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. Text Sanitization & Tokenization', () => {
    it('should strip HTML tags and decode HTML entities cleanly', () => {
      const rawHtml = `
        <p>We are seeking a <strong>Senior Backend Engineer</strong> with deep expertise in Node.js &amp; PostgreSQL.</p>
        <ul>
          <li>Experience with Docker &amp; Kubernetes</li>
          <li>Salary: $120,000 &ndash; $150,000</li>
        </ul>
        <br />
        <p>No phone calls, please.&nbsp;Thank you.</p>
      `;

      const cleaned = analyzer.sanitizeText(rawHtml);

      expect(cleaned).not.toContain('<p>');
      expect(cleaned).not.toContain('<strong>');
      expect(cleaned).not.toContain('<ul>');
      expect(cleaned).not.toContain('<li>');
      expect(cleaned).not.toContain('&amp;');
      expect(cleaned).not.toContain('&nbsp;');
      expect(cleaned).toContain('Node.js & PostgreSQL');
      expect(cleaned).toContain('Docker & Kubernetes');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Known Job Description Extraction Tests
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Known Job Description Extractions', () => {
    it('Example A: Senior Backend Node.js Engineer posting', () => {
      const description = `
        About the Role:
        We are hiring a Senior Backend Engineer to design scalable microservices and database architectures.
        
        Requirements:
        - 5+ years of software engineering experience in a production environment.
        - Strong proficiency in TypeScript, Node.js, and Express.
        - Hands-on experience with PostgreSQL and Redis caching.
        - Solid understanding of Docker containerization and CI/CD pipelines.
        - Experience deploying microservices on Amazon Web Services (AWS) using EC2 and S3.
        - Bachelor's degree in Computer Science or related engineering discipline.
      `;

      const title = 'Senior Backend Engineer';
      const cleanDesc = analyzer.sanitizeText(description);

      const { technicalSkills, toolsAndFrameworks } = analyzer.extractSkills(cleanDesc, title);
      const experience = analyzer.extractExperience(cleanDesc, title);
      const qualifications = analyzer.extractQualifications(cleanDesc);

      // Verify Technical Skills
      const techNames = technicalSkills.map((s) => s.canonicalName);
      expect(techNames).toContain('TypeScript');
      expect(techNames).toContain('SQL (Relational Queries)');
      expect(techNames).toContain('Microservices Architecture');

      // Verify Tools & Frameworks
      const toolNames = toolsAndFrameworks.map((t) => t.canonicalName);
      expect(toolNames).toContain('Node.js & Express');
      expect(toolNames).toContain('PostgreSQL');
      expect(toolNames).toContain('Redis (Caching & In-Memory Store)');
      expect(toolNames).toContain('Docker & Containerization');
      expect(toolNames).toContain('Amazon Web Services (AWS)');
      expect(toolNames).toContain('CI/CD Pipelines & Automation');

      // Verify Experience
      expect(experience.isIdentifiable).toBe(true);
      expect(experience.minYears).toBe(5);
      expect(experience.level).toBe('senior');

      // Verify Education
      expect(qualifications.degrees.length).toBeGreaterThan(0);
      expect(qualifications.degrees[0].level).toBe('bachelors');
    });

    it('Example B: Junior React Frontend Developer posting', () => {
      const description = `
        We are looking for an ambitious Junior Frontend Developer to join our UI team!
        
        Qualifications:
        - 1-2 years of experience with modern frontend web development.
        - Strong foundation in HTML5, CSS3, Flexbox, and CSS Grid.
        - Proficiency in React.js and Next.js.
        - Familiarity with Tailwind CSS and declarative styling.
        - Knowledge of GraphQL queries and Apollo client.
        - Experience writing unit tests with Vitest or Jest.
        - Bachelor's degree or equivalent practical experience.
      `;

      const title = 'Junior Frontend Developer';
      const cleanDesc = analyzer.sanitizeText(description);

      const { technicalSkills, toolsAndFrameworks, methodologies } = analyzer.extractSkills(cleanDesc, title);
      const experience = analyzer.extractExperience(cleanDesc, title);

      // Verify Tools & Frameworks
      const toolNames = toolsAndFrameworks.map((t) => t.canonicalName);
      expect(toolNames).toContain('React.js');
      expect(toolNames).toContain('Next.js');
      expect(toolNames).toContain('HTML5 & Modern CSS');
      expect(toolNames).toContain('Tailwind CSS');
      expect(toolNames).toContain('GraphQL');

      // Verify Testing Methodology
      const methNames = methodologies.map((m) => m.canonicalName);
      expect(methNames).toContain('Automated Testing (Unit & Integration)');

      // Verify Experience (Junior / 1-2 years)
      expect(experience.minYears).toBe(1);
      expect(experience.maxYears).toBe(2);
      expect(experience.level).toBe('entry');
    });

    it('Example C: Machine Learning / Data Science posting', () => {
      const description = `
        AI Research Lab is seeking a Machine Learning Engineer.
        
        Responsibilities:
        - Train and evaluate deep neural networks using PyTorch.
        - Perform exploratory data analysis using Pandas, NumPy, and Scikit-Learn.
        - Apply linear algebra and statistical hypothesis testing to model evaluation.
        - Natural language processing (NLP) model fine-tuning with Transformers.
        - Master's degree in Computer Science, Data Science, or Artificial Intelligence.
      `;

      const title = 'Machine Learning Engineer';
      const cleanDesc = analyzer.sanitizeText(description);

      const { technicalSkills } = analyzer.extractSkills(cleanDesc, title);
      const qualifications = analyzer.extractQualifications(cleanDesc);

      const techNames = technicalSkills.map((s) => s.canonicalName);
      expect(techNames).toContain('Python');
      expect(techNames).toContain('Machine Learning');
      expect(techNames).toContain('Deep Learning & Neural Networks');
      expect(techNames).toContain('Data Analysis (Pandas/NumPy)');
      expect(techNames).toContain('Natural Language Processing (NLP)');
      expect(techNames).toContain('Linear Algebra & Statistics');

      // Verify Master's degree detected
      expect(qualifications.degrees.some((d) => d.level === 'masters')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Polysemy, Ambiguity & Boundary Protection Tests
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Polysemy & Ambiguous Term Protection', () => {
    it('should distinguish Java from JavaScript correctly', () => {
      const javaDesc = 'We build enterprise microservices using Java and Spring Boot.';
      const jsDesc = 'We build browser user interfaces using JavaScript and React.';

      const javaExtracted = analyzer.extractSkills(javaDesc, 'Java Backend Engineer');
      const jsExtracted = analyzer.extractSkills(jsDesc, 'Frontend Engineer');

      const javaTech = javaExtracted.technicalSkills.map((s) => s.canonicalName);
      const jsTech = jsExtracted.technicalSkills.map((s) => s.canonicalName);

      expect(javaTech).toContain('Java');
      expect(javaTech).not.toContain('JavaScript');

      expect(jsTech).toContain('JavaScript');
      expect(jsTech).not.toContain('Java');
    });

    it('should not match normal English words like "go" or "outgoing" as Golang', () => {
      const naturalText = 'You must be able to go to client meetings and have an outgoing, friendly attitude.';
      const extracted = analyzer.extractSkills(naturalText, 'Account Manager');

      const skillNames = extracted.technicalSkills.map((s) => s.canonicalName);
      expect(skillNames).not.toContain('Go (Golang)');
    });

    it('should match Golang when explicitly stated in technical context', () => {
      const goText = 'Our backend stack utilizes Go (Golang) microservices with high concurrent throughput.';
      const extracted = analyzer.extractSkills(goText, 'Go Backend Engineer');

      const skillNames = extracted.technicalSkills.map((s) => s.canonicalName);
      expect(skillNames).toContain('Go (Golang)');
    });

    it('should not match "reactive" or "reactor" as React.js', () => {
      const text = 'Candidate must have a proactive approach and understand reactive programming paradigms.';
      const extracted = analyzer.extractSkills(text, 'Software Engineer');

      const toolNames = extracted.toolsAndFrameworks.map((t) => t.canonicalName);
      expect(toolNames).not.toContain('React.js');
    });

    it('should match C++ accurately with symbols', () => {
      const cppText = 'Perform high-frequency algorithm execution using modern C++ and low-latency memory structures.';
      const extracted = analyzer.extractSkills(cppText, 'C++ Systems Engineer');

      const skillNames = extracted.technicalSkills.map((s) => s.canonicalName);
      expect(skillNames).toContain('C++');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Negation Heuristics Tests
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. Negation Detection', () => {
    it('should not extract skills that are explicitly stated as not required or not needed', () => {
      const text = 'We develop in Node.js and TypeScript. Note: no prior AWS or Docker experience required; we will train on the job.';
      const extracted = analyzer.extractSkills(text, 'Junior Developer');

      const tools = extracted.toolsAndFrameworks.map((t) => t.canonicalName);
      expect(tools).toContain('Node.js & Express');
      // AWS and Docker were in negated context
      expect(tools).not.toContain('Amazon Web Services (AWS)');
      expect(tools).not.toContain('Docker & Containerization');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Student Evidence Comparison & Strict Course vs Project Rules
  // ═══════════════════════════════════════════════════════════════════════════
  describe('5. Student Profile Comparison & Evidence Tiers', () => {
    it('STRICT: should NOT treat a skill in a completed course as equivalent to proven project experience', async () => {
      // Create a test profile:
      // - Practical project in React & Node.js -> 'proven_experience'
      // - Completed course in SQL (Relational Databases) -> 'course_completed' (Academic exposure ONLY)
      // - Self-reported claim in Docker -> 'self_reported'
      // - Kubernetes is required by job, but missing in student -> 'missing'
      const studentProfile: StudentProfileInput = {
        studentId: 'stu_test_evidence_distinction',
        name: 'Aarav Patel',
        department: 'Computer Science & Engineering',
        currentSemester: 6,
        cgpa: 8.8,
        skills: [
          { skillId: 'sk_react', level: 'advanced', competenceType: 'project_demonstrated' },
          { skillId: 'sk_nodejs', level: 'intermediate', competenceType: 'project_demonstrated' },
          { skillId: 'sk_sql', level: 'intermediate', competenceType: 'course_exposure' },
          { skillId: 'sk_docker', level: 'beginner', competenceType: 'self_reported' },
        ],
        completedCourses: [
          {
            courseId: 'crs_dbms',
            code: 'CS201',
            status: 'completed',
            taughtSkillIds: ['sk_sql'],
          } as any,
        ],
        customProjects: [
          {
            projectId: 'proj_ecommerce',
            title: 'Full-Stack Campus Store',
            skillsDemonstrated: ['sk_react', 'sk_nodejs', 'React.js', 'Node.js'],
            technologiesUsed: ['React', 'Node.js', 'Express'],
          },
        ],
      };

      const jobPosting = `
        Hiring Full-Stack Software Engineer.
        Stack: React.js, Node.js, PostgreSQL (SQL), Docker, and Kubernetes.
        Requirements: 2+ years of experience. Bachelor's in CS.
      `;

      const analysis = await analyzer.analyzeJob({
        rawText: jobPosting,
        title: 'Full-Stack Software Engineer',
        company: 'Campus Innovations',
        forceFresh: true,
      });

      // Override profile lookup for test isolation
      const comparison = await analyzer.compareWithStudentProfile(
        {
          technicalSkills: analysis.technicalSkills,
          toolsAndFrameworks: analysis.toolsAndFrameworks,
          experience: analysis.experience,
        },
        studentProfile
      );

      expect(comparison).toBeDefined();

      // Check React / Node.js match -> MUST be proven_experience
      const reactMatch = comparison.matchedSkills.find((m) => m.name.includes('React'));
      expect(reactMatch).toBeDefined();
      expect(reactMatch?.evidenceTier).toBe('proven_experience');

      const nodeMatch = comparison.matchedSkills.find((m) => m.name.includes('Node'));
      expect(nodeMatch).toBeDefined();
      expect(nodeMatch?.evidenceTier).toBe('proven_experience');

      // Check SQL / PostgreSQL match -> MUST be course_completed (NOT proven experience!)
      const sqlMatch = comparison.matchedSkills.find((m) => m.name.includes('SQL') || m.name.includes('PostgreSQL'));
      expect(sqlMatch).toBeDefined();
      expect(sqlMatch?.evidenceTier).toBe('course_completed');
      expect(sqlMatch?.evidenceDescription).toContain('Academic exposure');

      // Check Docker match -> MUST be self_reported
      const dockerMatch = comparison.matchedSkills.find((m) => m.name.includes('Docker'));
      expect(dockerMatch).toBeDefined();
      expect(dockerMatch?.evidenceTier).toBe('self_reported');

      // Check Kubernetes match -> MUST be missing
      const k8sMatch = comparison.missingSkills.find((m) => m.name.includes('Kubernetes'));
      expect(k8sMatch).toBeDefined();
      expect(k8sMatch?.status).toBe('missing');
      expect(k8sMatch?.evidenceTier).toBe('none');

      // Verify distribution counts are segregated
      expect(comparison.evidenceDistribution.provenCount).toBeGreaterThanOrEqual(2); // React, Node
      expect(comparison.evidenceDistribution.courseCount).toBeGreaterThanOrEqual(1); // SQL
      expect(comparison.evidenceDistribution.selfReportedCount).toBeGreaterThanOrEqual(1); // Docker
      expect(comparison.evidenceDistribution.missingCount).toBeGreaterThanOrEqual(1); // Kubernetes

      // Check human-readable readiness note confirms coursework status
      expect(comparison.readinessAssessment).toContain('coursework');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Role-Level Job-Market Summary
  // ═══════════════════════════════════════════════════════════════════════════
  describe('6. Role-Level Job-Market Summary', () => {
    it('should aggregate sampled listings for a role into a market summary', async () => {
      const summary = await analyzer.getRoleMarketSummary('role_backend_developer', undefined, 5, true);

      expect(summary).toBeDefined();
      expect(summary.roleId).toBe('role_backend_developer');
      expect(summary.roleTitle).toBe('Backend Developer');
      expect(summary.sampleSize).toBeGreaterThanOrEqual(3);
      expect(summary.topSkillsInDemand.length).toBeGreaterThan(0);
      expect(summary.topToolsInDemand.length).toBeGreaterThan(0);

      // Check percentages are calculated (0 - 100)
      for (const skill of summary.topSkillsInDemand) {
        expect(skill.percentage).toBeGreaterThanOrEqual(0);
        expect(skill.percentage).toBeLessThanOrEqual(100);
      }

      // Check market variations generated
      expect(summary.marketVariations.length).toBeGreaterThan(0);
      expect(summary.experienceDistribution).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. HTTP Controller Endpoints
  // ═══════════════════════════════════════════════════════════════════════════
  describe('7. HTTP API Endpoints', () => {
    it('POST /api/jobs/analyze: should analyze raw text with 200 OK', async () => {
      const res = await request(app)
        .post('/api/jobs/analyze')
        .send({
          title: 'Full-Stack Software Engineer',
          text: 'Seeking a Full-Stack developer proficient in React.js, Node.js, Express, PostgreSQL, and Docker. 3+ years experience. BS in CS required.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.analysis).toBeDefined();
      expect(res.body.analysis.experience.minYears).toBe(3);
      expect(res.body.analysis.totalSkillsDetected).toBeGreaterThanOrEqual(4);
    });

    it('POST /api/jobs/analyze: should reject empty text with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/jobs/analyze')
        .send({ text: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Bad Request');
    });

    it('GET /api/jobs/:id/analysis: should analyze existing fixture job with 200 OK', async () => {
      const res = await request(app)
        .get('/api/jobs/fixture_backend_01/analysis');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.analysis.title).toContain('Backend');
      expect(res.body.analysis.totalSkillsDetected).toBeGreaterThan(0);
    });

    it('GET /api/roles/:roleId/market-summary: should return aggregated role market summary', async () => {
      const res = await request(app)
        .get('/api/roles/role_backend_developer/market-summary?sampleSize=4');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary.roleId).toBe('role_backend_developer');
      expect(res.body.summary.topSkillsInDemand.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. Redis Caching & Timestamps
  // ═══════════════════════════════════════════════════════════════════════════
  describe('8. Redis Caching & Retrieval Timestamps', () => {
    it('should distinguish fresh results from cached results', async () => {
      const memoryCache = new Map<string, string>();
      vi.spyOn(cacheRepository, 'get').mockImplementation(async (key: string) => memoryCache.get(key) || null);
      vi.spyOn(cacheRepository, 'set').mockImplementation(async (key: string, val: string) => {
        memoryCache.set(key, val);
        return 'OK';
      });

      const text = 'Looking for Python and Django developer with 2 years of experience.';
      const title = 'Python Developer';

      // First run: fresh
      const fresh = await analyzer.analyzeJob({
        rawText: text,
        title,
        forceFresh: true,
      });

      expect(fresh.isFromCache).toBe(false);
      expect(fresh.analyzedAt).toBeDefined();

      // Second run: cached
      const cached = await analyzer.analyzeJob({
        rawText: text,
        title,
        forceFresh: false,
      });

      expect(cached.isFromCache).toBe(true);
      expect(cached.cachedAt).toBe(fresh.analyzedAt);
    });
  });
});
