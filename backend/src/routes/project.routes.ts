import { Router } from 'express';
import {
  createProject, getProject, listProjects, updateProject, deleteProject,
  getQualifiedProjects, getProjectStats, getTechnologyUsage, getStudentParticipation,
} from '../controllers/project.controller.js';

export const projectRouter = Router();

projectRouter.get('/analytics/stats', getProjectStats);
projectRouter.get('/analytics/technology-usage', getTechnologyUsage);
projectRouter.get('/analytics/student-participation', getStudentParticipation);
projectRouter.get('/search/qualified', getQualifiedProjects);

projectRouter.post('/', createProject);
projectRouter.get('/', listProjects);
projectRouter.get('/:projectId', getProject);
projectRouter.put('/:projectId', updateProject);
projectRouter.delete('/:projectId', deleteProject);
