import { Router } from 'express';
import { graphController } from '../controllers/graph.controller.js';

export const graphRouter = Router();

// Graph integrity & seed verification
graphRouter.get('/verify-seed', graphController.verifyGraphSeed);

// 1. Skill prerequisites
graphRouter.get('/skills/:skillId/prerequisites', graphController.getSkillPrerequisites);

// 2. Job required skills
graphRouter.get('/jobs/:jobId/skills', graphController.getJobRequiredSkills);

// 3. Student current skills
graphRouter.get('/students/:studentId/skills', graphController.getStudentCurrentSkills);

// 4. Missing skills for student
graphRouter.get('/students/:studentId/missing-skills', graphController.getMissingSkills);

// 5. Courses teaching missing skills
graphRouter.get('/students/:studentId/courses-for-missing', graphController.getCoursesTeachingMissingSkills);

// 6. Projects matching student skills
graphRouter.get('/students/:studentId/matching-projects', graphController.getProjectsMatchingStudentSkills);

// 7. Related resources
graphRouter.get('/resources/related/:entityId', graphController.getRelatedResources);

// 8. Common interests between students (peer discovery)
graphRouter.get('/students/:studentId/peers', graphController.getCommonInterestsBetweenStudents);

// 9. Shortest path between two skills
graphRouter.get('/skills/shortest-path/:startSkillId/:endSkillId', graphController.getShortestPathBetweenSkills);

// 10. Multi-hop dependency paths
graphRouter.get('/dependencies/:entityType/:id', graphController.getMultiHopDependencyPaths);

// 11. Connected opportunities around skill
graphRouter.get('/skills/:skillId/opportunities', graphController.getConnectedOpportunitiesAroundSkill);

// 12. Alternative routes to target skill
graphRouter.get('/skills/:targetSkillId/alternative-routes', graphController.getAlternativeRoutesToTargetSkill);
