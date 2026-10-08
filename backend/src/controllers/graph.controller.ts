import { Request, Response } from 'express';
import { graphService } from '../services/graph.service.js';
import { asyncHandler, ok } from './helpers.js';
import { dbManager } from '../config/database.js';
import { verifyNeo4jSeed } from '../repositories/neo4j/schema.js';

export class GraphController {
  // 1. Skill prerequisites
  public getSkillPrerequisites = asyncHandler(async (req: Request, res: Response) => {
    const { skillId } = req.params;
    const maxDepth = req.query.maxDepth ? parseInt(req.query.maxDepth as string, 10) : 5;
    const prerequisites = await graphService.getSkillPrerequisites(skillId, maxDepth);
    ok(res, prerequisites);
  });

  // 2. Job required skills
  public getJobRequiredSkills = asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const jobSkills = await graphService.getJobRequiredSkills(jobId);
    ok(res, jobSkills);
  });

  // 3. Student current skills
  public getStudentCurrentSkills = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const skills = await graphService.getStudentCurrentSkills(studentId);
    ok(res, skills);
  });

  // 4. Missing skills
  public getMissingSkills = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const { targetType, targetId } = req.query as { targetType: 'job' | 'project' | 'skill'; targetId: string };
    const missing = await graphService.getMissingSkills(studentId, targetType, targetId);
    ok(res, missing);
  });

  // 5. Courses teaching missing skills
  public getCoursesTeachingMissingSkills = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const { targetType, targetId } = req.query as { targetType: 'job' | 'project' | 'skill'; targetId: string };
    const courses = await graphService.getCoursesTeachingMissingSkills(studentId, targetType, targetId);
    ok(res, courses);
  });

  // 6. Projects matching student skills
  public getProjectsMatchingStudentSkills = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const minMatchRatio = req.query.minMatchRatio ? parseFloat(req.query.minMatchRatio as string) : 0.0;
    const projects = await graphService.getProjectsMatchingStudentSkills(studentId, minMatchRatio);
    ok(res, projects);
  });

  // 7. Related resources
  public getRelatedResources = asyncHandler(async (req: Request, res: Response) => {
    const { entityId } = req.params;
    const type = (req.query.type as 'skill' | 'course') || 'skill';
    const resources = await graphService.getRelatedResources(entityId, type);
    ok(res, resources);
  });

  // 8. Common interests between students
  public getCommonInterestsBetweenStudents = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const peers = await graphService.getCommonInterestsBetweenStudents(studentId, limit);
    ok(res, peers);
  });

  // 9. Shortest path between two skills
  public getShortestPathBetweenSkills = asyncHandler(async (req: Request, res: Response) => {
    const { startSkillId, endSkillId } = req.params;
    const path = await graphService.getShortestPathBetweenSkills(startSkillId, endSkillId);
    ok(res, path);
  });

  // 10. Multi-hop dependency paths
  public getMultiHopDependencyPaths = asyncHandler(async (req: Request, res: Response) => {
    const { entityType, id } = req.params as { entityType: 'skill' | 'course'; id: string };
    const maxHops = req.query.maxHops ? parseInt(req.query.maxHops as string, 10) : 5;
    const paths = await graphService.getMultiHopDependencyPaths(entityType, id, maxHops);
    ok(res, paths);
  });

  // 11. Connected opportunities around skill
  public getConnectedOpportunitiesAroundSkill = asyncHandler(async (req: Request, res: Response) => {
    const { skillId } = req.params;
    const opportunities = await graphService.getConnectedOpportunitiesAroundSkill(skillId);
    ok(res, opportunities);
  });

  // 12. Alternative routes to target skill
  public getAlternativeRoutesToTargetSkill = asyncHandler(async (req: Request, res: Response) => {
    const { targetSkillId } = req.params;
    const routes = await graphService.getAlternativeRoutesToTargetSkill(targetSkillId);
    ok(res, routes);
  });

  // Seed verification endpoint
  public verifyGraphSeed = asyncHandler(async (_req: Request, res: Response) => {
    const session = dbManager.getNeo4jSession();
    try {
      const verification = await verifyNeo4jSeed(session);
      ok(res, verification, 'Graph seed verification complete');
    } finally {
      await session.close().catch(() => {});
    }
  });
}

export const graphController = new GraphController();
