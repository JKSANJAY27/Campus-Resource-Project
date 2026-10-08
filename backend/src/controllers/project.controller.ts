import { Request, Response } from 'express';
import { projectService } from '../services/project.service.js';
import { asyncHandler, ok, paginated, parseQueryOptions } from './helpers.js';

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await projectService.createProject(req.body), 'Project created', 201);
});

export const getProject = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await projectService.getProject(req.params.projectId));
});

export const listProjects = asyncHandler(async (req: Request, res: Response) => {
  const opts = {
    ...parseQueryOptions(req),
    domain: req.query.domain as string | undefined,
    difficulty: req.query.difficulty as string | undefined,
    skillId: req.query.skillId as string | undefined,
    technology: req.query.technology as string | undefined,
    mentor: req.query.mentor as string | undefined,
  };
  paginated(res, await projectService.listProjects(opts));
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await projectService.updateProject(req.params.projectId, req.body), 'Project updated');
});

export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await projectService.deleteProject(req.params.projectId), 'Project deleted');
});

export const getQualifiedProjects = asyncHandler(async (req: Request, res: Response) => {
  const skillIds = (req.query.skillIds as string)?.split(',') ?? [];
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  ok(res, await projectService.getQualifiedProjects(skillIds, limit));
});

export const getProjectStats = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await projectService.getProjectStats());
});

export const getTechnologyUsage = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await projectService.getTechnologyUsage(req.query.limit ? Number(req.query.limit) : 20));
});

export const getStudentParticipation = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await projectService.getStudentParticipation(req.query.limit ? Number(req.query.limit) : 10));
});
