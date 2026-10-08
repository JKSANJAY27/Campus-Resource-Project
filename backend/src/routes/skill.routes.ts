import { Router } from 'express';
import {
  createSkill, getSkill, listSkills, updateSkill, deleteSkill,
  getPrerequisiteTree, getDependents, getSkillDemand, getCategoryTierMatrix,
} from '../controllers/skill.controller.js';

export const skillRouter = Router();

skillRouter.get('/analytics/demand', getSkillDemand);
skillRouter.get('/analytics/category-matrix', getCategoryTierMatrix);

skillRouter.post('/', createSkill);
skillRouter.get('/', listSkills);
skillRouter.get('/:skillId', getSkill);
skillRouter.put('/:skillId', updateSkill);
skillRouter.delete('/:skillId', deleteSkill);
skillRouter.get('/:skillId/prerequisites/tree', getPrerequisiteTree);
skillRouter.get('/:skillId/dependents', getDependents);
