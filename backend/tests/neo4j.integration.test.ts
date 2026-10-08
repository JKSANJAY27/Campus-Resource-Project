import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

// Mock graphService
vi.mock('../src/services/graph.service.js', () => ({
  graphService: {
    getSkillPrerequisites: vi.fn().mockImplementation(async (id: string, depth: number) => {
      if (id === 'sk_ml') {
        return [
          { prerequisiteId: 'sk_python', name: 'Python', category: 'Programming', tier: 'foundational', depth: 1 },
        ];
      }
      return [];
    }),
    getJobRequiredSkills: vi.fn().mockImplementation(async (id: string) => {
      if (id === 'job_01') {
        return {
          job: { id: 'job_01', title: 'Backend Engineer', company: 'Stripe', type: 'full_time', preferredDomain: 'Distributed Systems' },
          requiredSkills: [{ id: 'sk_cpp', name: 'C++', category: 'Programming', tier: 'intermediate' }],
        };
      }
      throw Object.assign(new Error(`Job not found with ID: ${id}`), { status: 404 });
    }),
    getStudentCurrentSkills: vi.fn().mockImplementation(async (id: string) => {
      return [{ skillId: 'sk_python', name: 'Python', category: 'Programming', tier: 'foundational', level: 'advanced' }];
    }),
    getMissingSkills: vi.fn().mockImplementation(async (studentId: string, targetType: string, targetId: string) => {
      return [{ skillId: 'sk_docker', name: 'Docker', category: 'Cloud', tier: 'intermediate' }];
    }),
    getCoursesTeachingMissingSkills: vi.fn().mockImplementation(async (studentId: string, targetType: string, targetId: string) => {
      return [
        {
          courseId: 'crs_devops',
          code: 'CS410',
          title: 'Cloud DevOps',
          department: 'CSE',
          credits: 4,
          difficulty: 'intermediate',
          taughtMissingSkills: [{ id: 'sk_docker', name: 'Docker' }],
          prerequisiteCourseCodes: ['CS201'],
        },
      ];
    }),
    getProjectsMatchingStudentSkills: vi.fn().mockImplementation(async (studentId: string, minRatio: number) => {
      return [
        {
          projectId: 'prj_01',
          title: 'Campus Cloud Portal',
          domain: 'Cloud',
          difficulty: 'intermediate',
          requiredSkillCount: 2,
          matchedSkillCount: 1,
          matchRatio: 0.5,
          matchedSkills: [{ id: 'sk_python', name: 'Python' }],
          missingSkills: [{ id: 'sk_docker', name: 'Docker' }],
        },
      ];
    }),
    getRelatedResources: vi.fn().mockImplementation(async (entityId: string, type: string) => {
      return [
        {
          resourceId: 'res_01',
          title: 'Python Deep Dive',
          type: 'Video Series',
          skillsTaught: [{ id: 'sk_python', name: 'Python' }],
        },
      ];
    }),
    getCommonInterestsBetweenStudents: vi.fn().mockImplementation(async (studentId: string, limit: number) => {
      return [
        {
          peerId: 'stu_02',
          name: 'Rohan Patel',
          department: 'CSE',
          semester: 4,
          sharedSkills: ['Python'],
          sharedCourses: ['CS101'],
          sharedClubs: ['Coding Club'],
          totalOverlapScore: 7,
        },
      ];
    }),
    getShortestPathBetweenSkills: vi.fn().mockImplementation(async (start: string, end: string) => {
      if (start === 'sk_python' && end === 'sk_dl') {
        return {
          startSkillId: start,
          endSkillId: end,
          distance: 2,
          path: [
            { id: 'sk_python', name: 'Python', tier: 'foundational', category: 'Programming' },
            { id: 'sk_ml', name: 'ML', tier: 'intermediate', category: 'AI' },
            { id: 'sk_dl', name: 'Deep Learning', tier: 'advanced', category: 'AI' },
          ],
        };
      }
      throw Object.assign(new Error(`No path found between ${start} and ${end}`), { status: 404 });
    }),
    getMultiHopDependencyPaths: vi.fn().mockImplementation(async (type: string, id: string, maxHops: number) => {
      return [
        {
          hops: 2,
          nodeChain: [{ id: 'sk_math', name: 'Math' }, { id: 'sk_ml', name: 'ML' }, { id: 'sk_dl', name: 'DL' }],
        },
      ];
    }),
    getConnectedOpportunitiesAroundSkill: vi.fn().mockImplementation(async (id: string) => {
      if (id === 'sk_python') {
        return {
          skill: { id: 'sk_python', name: 'Python', category: 'Programming', tier: 'foundational' },
          courses: [{ id: 'crs_01', code: 'CS101', title: 'Intro to Python', difficulty: 'introductory' }],
          projects: [{ id: 'prj_01', title: 'Data Pipeline', domain: 'Data Science', difficulty: 'intermediate' }],
          jobs: [{ id: 'job_01', title: 'Python Dev', company: 'TechCorp', type: 'full_time' }],
          resources: [{ id: 'res_01', title: 'Python Docs', type: 'Cheatsheet' }],
          studentTalentCount: 50,
        };
      }
      throw Object.assign(new Error(`Skill not found with ID: ${id}`), { status: 404 });
    }),
    getAlternativeRoutesToTargetSkill: vi.fn().mockImplementation(async (id: string) => {
      return {
        targetSkillId: id,
        targetSkillName: 'Kubernetes',
        directCourses: [{ id: 'crs_02', code: 'CS410', title: 'DevOps' }],
        rootPrerequisites: [{ id: 'sk_linux', name: 'Linux', tier: 'foundational' }],
        routes: [{ length: 2, chain: [{ id: 'sk_linux', name: 'Linux' }, { id: 'sk_k8s', name: 'Kubernetes' }] }],
      };
    }),
  },
}));

// Mock database session for seed verification
vi.mock('../src/repositories/neo4j/schema.js', () => ({
  verifyNeo4jSeed: vi.fn().mockResolvedValue({
    nodes: { total: 120, students: 50, skills: 20, courses: 15, projects: 10, technologies: 8, jobs: 5, resources: 5, clubs: 3, events: 2, facilities: 2 },
    relationships: { total: 350, studentHasSkill: 150, courseTeaches: 30, skillPrerequisiteOf: 25 },
    connectedComponents: 1,
    isFullyConnected: true,
  }),
}));

describe('Neo4j Graph REST API - Integration Tests', () => {
  const app = createApp();

  it('GET /api/v1/graph/verify-seed -> returns graph seed verification statistics', async () => {
    const res = await request(app).get('/api/v1/graph/verify-seed');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nodes.total).toBe(120);
    expect(res.body.data.isFullyConnected).toBe(true);
  });

  it('1. GET /api/v1/graph/skills/:skillId/prerequisites -> returns prerequisites', async () => {
    const res = await request(app).get('/api/v1/graph/skills/sk_ml/prerequisites?maxDepth=3');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].prerequisiteId).toBe('sk_python');
  });

  it('2. GET /api/v1/graph/jobs/:jobId/skills -> returns required skills or 404', async () => {
    const res = await request(app).get('/api/v1/graph/jobs/job_01/skills');
    expect(res.status).toBe(200);
    expect(res.body.data.job.title).toBe('Backend Engineer');
    expect(res.body.data.requiredSkills[0].name).toBe('C++');

    const notFound = await request(app).get('/api/v1/graph/jobs/job_unknown/skills');
    expect(notFound.status).toBe(404);
  });

  it('3. GET /api/v1/graph/students/:studentId/skills -> returns student skills', async () => {
    const res = await request(app).get('/api/v1/graph/students/stu_01/skills');
    expect(res.status).toBe(200);
    expect(res.body.data[0].skillId).toBe('sk_python');
    expect(res.body.data[0].level).toBe('advanced');
  });

  it('4. GET /api/v1/graph/students/:studentId/missing-skills -> returns missing skills', async () => {
    const res = await request(app).get('/api/v1/graph/students/stu_01/missing-skills?targetType=job&targetId=job_01');
    expect(res.status).toBe(200);
    expect(res.body.data[0].skillId).toBe('sk_docker');
  });

  it('5. GET /api/v1/graph/students/:studentId/courses-for-missing -> returns remedial courses', async () => {
    const res = await request(app).get('/api/v1/graph/students/stu_01/courses-for-missing?targetType=job&targetId=job_01');
    expect(res.status).toBe(200);
    expect(res.body.data[0].code).toBe('CS410');
  });

  it('6. GET /api/v1/graph/students/:studentId/matching-projects -> returns matched projects', async () => {
    const res = await request(app).get('/api/v1/graph/students/stu_01/matching-projects?minMatchRatio=0.5');
    expect(res.status).toBe(200);
    expect(res.body.data[0].projectId).toBe('prj_01');
    expect(res.body.data[0].matchRatio).toBe(0.5);
  });

  it('7. GET /api/v1/graph/resources/related/:entityId -> returns related resources', async () => {
    const res = await request(app).get('/api/v1/graph/resources/related/sk_python?type=skill');
    expect(res.status).toBe(200);
    expect(res.body.data[0].title).toBe('Python Deep Dive');
  });

  it('8. GET /api/v1/graph/students/:studentId/peers -> returns peer study group matches', async () => {
    const res = await request(app).get('/api/v1/graph/students/stu_01/peers?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.data[0].peerId).toBe('stu_02');
    expect(res.body.data[0].totalOverlapScore).toBe(7);
  });

  it('9. GET /api/v1/graph/skills/shortest-path/:startSkillId/:endSkillId -> returns shortest path', async () => {
    const res = await request(app).get('/api/v1/graph/skills/shortest-path/sk_python/sk_dl');
    expect(res.status).toBe(200);
    expect(res.body.data.distance).toBe(2);
    expect(res.body.data.path).toHaveLength(3);

    const noPath = await request(app).get('/api/v1/graph/skills/shortest-path/sk_unknown/sk_dl');
    expect(noPath.status).toBe(404);
  });

  it('10. GET /api/v1/graph/dependencies/:entityType/:id -> returns dependency chains', async () => {
    const res = await request(app).get('/api/v1/graph/dependencies/skill/sk_dl?maxHops=3');
    expect(res.status).toBe(200);
    expect(res.body.data[0].hops).toBe(2);
  });

  it('11. GET /api/v1/graph/skills/:skillId/opportunities -> returns 360-degree opportunities', async () => {
    const res = await request(app).get('/api/v1/graph/skills/sk_python/opportunities');
    expect(res.status).toBe(200);
    expect(res.body.data.skill.name).toBe('Python');
    expect(res.body.data.studentTalentCount).toBe(50);
  });

  it('12. GET /api/v1/graph/skills/:targetSkillId/alternative-routes -> returns alternate prerequisite paths', async () => {
    const res = await request(app).get('/api/v1/graph/skills/sk_k8s/alternative-routes');
    expect(res.status).toBe(200);
    expect(res.body.data.targetSkillName).toBe('Kubernetes');
    expect(res.body.data.routes).toHaveLength(1);
  });
});
