import { Request, Response } from 'express';
import { skillService } from '../services/skill.service.js';
import { asyncHandler, ok, paginated, parseQueryOptions } from './helpers.js';

export const createSkill = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await skillService.createSkill(req.body), 'Skill created', 201);
});

export const getSkill = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await skillService.getSkill(req.params.skillId));
});

export const listSkills = asyncHandler(async (req: Request, res: Response) => {
  const opts = {
    ...parseQueryOptions(req),
    category: req.query.category as string | undefined,
    tier: req.query.tier as string | undefined,
  };
  paginated(res, await skillService.listSkills(opts));
});

export const updateSkill = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await skillService.updateSkill(req.params.skillId, req.body), 'Skill updated');
});

export const deleteSkill = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await skillService.deleteSkill(req.params.skillId), 'Skill deleted');
});

export const getPrerequisiteTree = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await skillService.getPrerequisiteTree(req.params.skillId));
});

export const getDependents = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await skillService.getDependents(req.params.skillId));
});

export const getSkillDemand = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await skillService.getSkillDemand(req.query.limit ? Number(req.query.limit) : 20));
});

export const getCategoryTierMatrix = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await skillService.getCategoryTierMatrix());
});
