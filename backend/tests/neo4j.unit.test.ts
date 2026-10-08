import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphRepository } from '../src/repositories/neo4j/graph.repository.js';
import { GraphService } from '../src/services/graph.service.js';
import { int } from 'neo4j-driver';

// Mock driver & session factory
function createMockDriver(recordsToReturn: any[] = []) {
  const mockSession = {
    run: vi.fn().mockResolvedValue({
      records: recordsToReturn,
    }),
    close: vi.fn().mockResolvedValue(undefined),
  };

  const mockDriver = {
    session: vi.fn().mockReturnValue(mockSession),
  };

  return { mockDriver: mockDriver as any, mockSession };
}

describe('Neo4j Graph Layer - Unit Tests', () => {
  describe('GraphService Input Validation & Error Handling', () => {
    let service: GraphService;

    beforeEach(() => {
      service = new GraphService();
    });

    it('should throw 400 if skillId is missing for prerequisites', async () => {
      await expect(service.getSkillPrerequisites('')).rejects.toMatchObject({
        status: 400,
        message: 'Skill ID is required',
      });
    });

    it('should throw 400 if jobId is missing for job required skills', async () => {
      await expect(service.getJobRequiredSkills('')).rejects.toMatchObject({
        status: 400,
        message: 'Job ID is required',
      });
    });

    it('should throw 400 if studentId is missing for current skills', async () => {
      await expect(service.getStudentCurrentSkills('')).rejects.toMatchObject({
        status: 400,
        message: 'Student ID is required',
      });
    });

    it('should throw 400 if invalid targetType is provided for missing skills', async () => {
      await expect(service.getMissingSkills('stu_01', 'invalid' as any, 'target_01')).rejects.toMatchObject({
        status: 400,
        message: 'targetType must be one of: job, project, skill',
      });
    });

    it('should throw 400 if start or end skill ID is missing for shortest path', async () => {
      await expect(service.getShortestPathBetweenSkills('', 'sk_02')).rejects.toMatchObject({
        status: 400,
        message: 'startSkillId and endSkillId are required',
      });
    });

    it('should throw 400 if invalid entityType is passed to multi-hop dependencies', async () => {
      await expect(service.getMultiHopDependencyPaths('invalid' as any, 'id_01')).rejects.toMatchObject({
        status: 400,
        message: 'entityType must be either skill or course',
      });
    });
  });

  describe('GraphRepository Query Execution & Data Mapping', () => {
    it('1. findSkillPrerequisites should map records and depth correctly', async () => {
      const mockRecords = [
        {
          get: (key: string) => {
            const map: Record<string, any> = {
              prerequisiteId: 'sk_python',
              name: 'Python Programming',
              category: 'Programming',
              tier: 'foundational',
              depth: int(1),
            };
            return map[key];
          },
        },
        {
          get: (key: string) => {
            const map: Record<string, any> = {
              prerequisiteId: 'sk_math',
              name: 'Linear Algebra',
              category: 'Foundations',
              tier: 'foundational',
              depth: int(2),
            };
            return map[key];
          },
        },
      ];

      const { mockDriver, mockSession } = createMockDriver(mockRecords);
      const repo = new GraphRepository(mockDriver);

      const result = await repo.findSkillPrerequisites('sk_ml', 3);

      expect(mockSession.run).toHaveBeenCalledTimes(1);
      const cypher = mockSession.run.mock.calls[0][0];
      expect(cypher).toContain('SKILL_PREREQUISITE_OF*1..3');
      expect(result).toHaveLength(2);
      expect(result[0].prerequisiteId).toBe('sk_python');
      expect(result[0].depth).toBe(1);
      expect(result[1].depth).toBe(2);
    });

    it('2. findJobRequiredSkills should return job details and array of skills', async () => {
      const mockRecords = [
        {
          get: (key: string) => {
            const map: Record<string, any> = {
              jobId: 'job_01',
              title: 'Backend Engineer',
              company: 'Stripe',
              type: 'full_time',
              preferredDomain: 'Distributed Systems',
              skills: [
                { id: 'sk_cpp', name: 'C++', category: 'Programming', tier: 'intermediate' },
                { id: 'sk_linux', name: 'Linux', category: 'Systems', tier: 'foundational' },
              ],
            };
            return map[key];
          },
        },
      ];

      const { mockDriver } = createMockDriver(mockRecords);
      const repo = new GraphRepository(mockDriver);

      const result = await repo.findJobRequiredSkills('job_01');
      expect(result).not.toBeNull();
      expect(result?.job.title).toBe('Backend Engineer');
      expect(result?.requiredSkills).toHaveLength(2);
      expect(result?.requiredSkills[0].name).toBe('C++');
    });

    it('3. findStudentCurrentSkills should unpack student skills with proficiency level', async () => {
      const mockRecords = [
        {
          get: (key: string) => {
            const map: Record<string, any> = {
              skillId: 'sk_python',
              name: 'Python',
              category: 'Programming',
              tier: 'foundational',
              level: 'advanced',
            };
            return map[key];
          },
        },
      ];

      const { mockDriver } = createMockDriver(mockRecords);
      const repo = new GraphRepository(mockDriver);

      const result = await repo.findStudentCurrentSkills('stu_0001');
      expect(result).toHaveLength(1);
      expect(result[0].skillId).toBe('sk_python');
      expect(result[0].level).toBe('advanced');
    });

    it('4. findMissingSkills should support job, project, and skill targets', async () => {
      const mockRecords = [
        {
          get: (key: string) => {
            const map: Record<string, any> = {
              skillId: 'sk_docker',
              name: 'Docker Containerization',
              category: 'Cloud & DevOps',
              tier: 'intermediate',
            };
            return map[key];
          },
        },
      ];

      const { mockDriver, mockSession } = createMockDriver(mockRecords);
      const repo = new GraphRepository(mockDriver);

      const jobMissing = await repo.findMissingSkills('stu_0001', 'job', 'job_04');
      expect(mockSession.run.mock.calls[0][0]).toContain('JOB_REQUIRES');
      expect(jobMissing).toHaveLength(1);
      expect(jobMissing[0].name).toBe('Docker Containerization');

      await repo.findMissingSkills('stu_0001', 'project', 'prj_01');
      expect(mockSession.run.mock.calls[1][0]).toContain('PROJECT_REQUIRES');

      await repo.findMissingSkills('stu_0001', 'skill', 'sk_deep_learning');
      expect(mockSession.run.mock.calls[2][0]).toContain('SKILL_PREREQUISITE_OF');
    });

    it('5. findCoursesTeachingMissingSkills should return courses covering target skills', async () => {
      const mockRecords = [
        {
          get: (key: string) => {
            const map: Record<string, any> = {
              courseId: 'crs_ml',
              code: 'CS401',
              title: 'Applied Machine Learning',
              department: 'CSE',
              credits: int(4),
              difficulty: 'intermediate',
              taughtMissing: [{ id: 'sk_ml', name: 'Machine Learning' }],
              prereqCodes: ['CS201'],
            };
            return map[key];
          },
        },
      ];

      const { mockDriver } = createMockDriver(mockRecords);
      const repo = new GraphRepository(mockDriver);

      const result = await repo.findCoursesTeachingMissingSkills(['sk_ml']);
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('CS401');
      expect(result[0].credits).toBe(4);
      expect(result[0].prerequisiteCourseCodes).toContain('CS201');
    });

    it('6. findProjectsMatchingStudentSkills should return projects sorted by matchRatio', async () => {
      const mockRecords = [
        {
          get: (key: string) => {
            const map: Record<string, any> = {
              projectId: 'prj_01',
              title: 'Autonomous Drone Navigation',
              domain: 'Robotics & AI',
              difficulty: 'advanced',
              requiredSkillCount: int(4),
              matchedSkillCount: int(3),
              matchRatio: 0.75,
              matchedSkills: [{ id: 'sk_python', name: 'Python' }],
              missingSkills: [{ id: 'sk_ros', name: 'ROS' }],
            };
            return map[key];
          },
        },
      ];

      const { mockDriver } = createMockDriver(mockRecords);
      const repo = new GraphRepository(mockDriver);

      const result = await repo.findProjectsMatchingStudentSkills('stu_0001', 0.5);
      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe('prj_01');
      expect(result[0].matchRatio).toBe(0.75);
      expect(result[0].matchedSkillCount).toBe(3);
    });

    it('7. findRelatedResources should return resources for skill or course', async () => {
      const mockRecords = [
        {
          get: (key: string) => {
            const map: Record<string, any> = {
              resourceId: 'res_01',
              title: 'Fast.ai Deep Learning Course',
              type: 'Video Series',
              skillsTaught: [{ id: 'sk_dl', name: 'Deep Learning' }],
            };
            return map[key];
          },
        },
      ];

      const { mockDriver, mockSession } = createMockDriver(mockRecords);
      const repo = new GraphRepository(mockDriver);

      const resSkill = await repo.findRelatedResources('sk_dl', 'skill');
      expect(mockSession.run.mock.calls[0][0]).toContain('RESOURCE_TEACHES');
      expect(resSkill).toHaveLength(1);

      await repo.findRelatedResources('crs_ml', 'course');
      expect(mockSession.run.mock.calls[1][0]).toContain('COURSE_TEACHES');
    });

    it('8. findCommonInterestsBetweenStudents should compute overlap score', async () => {
      const mockRecords = [
        {
          get: (key: string) => {
            const map: Record<string, any> = {
              peerId: 'stu_0002',
              name: 'Ananya Verma',
              department: 'CSE',
              semester: int(6),
              sharedSkills: ['Python', 'SQL'],
              sharedCourses: ['CS201'],
              sharedClubs: ['Coding Club'],
              overlapScore: int(10),
            };
            return map[key];
          },
        },
      ];

      const { mockDriver } = createMockDriver(mockRecords);
      const repo = new GraphRepository(mockDriver);

      const peers = await repo.findCommonInterestsBetweenStudents('stu_0001', 5);
      expect(peers).toHaveLength(1);
      expect(peers[0].peerId).toBe('stu_0002');
      expect(peers[0].totalOverlapScore).toBe(10);
      expect(peers[0].sharedSkills).toContain('Python');
    });

    it('9. findShortestPathBetweenSkills should return shortestPath result nodes', async () => {
      const mockRecords = [
        {
          get: (key: string) => {
            const map: Record<string, any> = {
              distance: int(2),
              pathNodes: [
                { id: 'sk_python', name: 'Python', tier: 'foundational', category: 'Programming' },
                { id: 'sk_ml', name: 'Machine Learning', tier: 'intermediate', category: 'AI' },
                { id: 'sk_dl', name: 'Deep Learning', tier: 'advanced', category: 'AI' },
              ],
            };
            return map[key];
          },
        },
      ];

      const { mockDriver, mockSession } = createMockDriver(mockRecords);
      const repo = new GraphRepository(mockDriver);

      const path = await repo.findShortestPathBetweenSkills('sk_python', 'sk_dl');
      expect(mockSession.run.mock.calls[0][0]).toContain('shortestPath');
      expect(path).not.toBeNull();
      expect(path?.distance).toBe(2);
      expect(path?.path).toHaveLength(3);
    });

    it('10. findMultiHopDependencyPaths should return all multi-hop chains', async () => {
      const mockRecords = [
        {
          get: (key: string) => {
            const map: Record<string, any> = {
              hops: int(2),
              nodeChain: [
                { id: 'sk_math', name: 'Calculus' },
                { id: 'sk_ml', name: 'ML' },
                { id: 'sk_genai', name: 'GenAI' },
              ],
            };
            return map[key];
          },
        },
      ];

      const { mockDriver } = createMockDriver(mockRecords);
      const repo = new GraphRepository(mockDriver);

      const chains = await repo.findMultiHopDependencyPaths('skill', 'sk_genai', 4);
      expect(chains).toHaveLength(1);
      expect(chains[0].hops).toBe(2);
      expect(chains[0].nodeChain).toHaveLength(3);
    });

    it('11. findConnectedOpportunitiesAroundSkill should return 360-degree neighborhood', async () => {
      const mockRecords = [
        {
          get: (key: string) => {
            const map: Record<string, any> = {
              skillId: 'sk_react',
              name: 'React.js',
              category: 'Web Development',
              tier: 'intermediate',
              courses: [{ id: 'crs_web', code: 'CS305', title: 'Web Development', difficulty: 'intermediate' }],
              projects: [{ id: 'prj_web', title: 'Campus Portal', domain: 'Web', difficulty: 'intermediate' }],
              jobs: [{ id: 'job_02', title: 'Frontend Dev', company: 'Vercel', type: 'internship' }],
              resources: [{ id: 'res_05', title: 'React Docs', type: 'Cheatsheet' }],
              talentCount: int(42),
            };
            return map[key];
          },
        },
      ];

      const { mockDriver } = createMockDriver(mockRecords);
      const repo = new GraphRepository(mockDriver);

      const opps = await repo.findConnectedOpportunitiesAroundSkill('sk_react');
      expect(opps).not.toBeNull();
      expect(opps?.skill.name).toBe('React.js');
      expect(opps?.courses).toHaveLength(1);
      expect(opps?.projects).toHaveLength(1);
      expect(opps?.jobs).toHaveLength(1);
      expect(opps?.studentTalentCount).toBe(42);
    });

    it('12. findAlternativeRoutesToTargetSkill should identify root prerequisites and paths', async () => {
      const mockRecords = [
        {
          get: (key: string) => {
            const map: Record<string, any> = {
              targetSkillId: 'sk_k8s',
              targetSkillName: 'Kubernetes',
              directCourses: [{ id: 'crs_devops', code: 'CS410', title: 'Cloud DevOps' }],
              roots: [{ id: 'sk_linux', name: 'Linux', tier: 'foundational' }],
              paths: [
                {
                  length: int(2),
                  chain: [
                    { id: 'sk_linux', name: 'Linux' },
                    { id: 'sk_docker', name: 'Docker' },
                    { id: 'sk_k8s', name: 'Kubernetes' },
                  ],
                },
              ],
            };
            return map[key];
          },
        },
      ];

      const { mockDriver } = createMockDriver(mockRecords);
      const repo = new GraphRepository(mockDriver);

      const routes = await repo.findAlternativeRoutesToTargetSkill('sk_k8s');
      expect(routes).not.toBeNull();
      expect(routes?.targetSkillId).toBe('sk_k8s');
      expect(routes?.directCourses).toHaveLength(1);
      expect(routes?.rootPrerequisites).toHaveLength(1);
      expect(routes?.routes).toHaveLength(1);
      expect(routes?.routes[0].chain).toHaveLength(3);
    });
  });
});
