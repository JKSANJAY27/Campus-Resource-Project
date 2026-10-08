import { Router } from 'express';
import { recommendationController } from '../controllers/recommendation.controller.js';

export const recommendationRouter = Router();

// Available career roles for learning path
// GET /api/v1/recommendations/roles
recommendationRouter.get('/roles', recommendationController.getAvailableRoles);

// 1. Skill gap analysis
// GET /api/v1/recommendations/students/:studentId/skill-gap?targetType=job&targetId=xxx
recommendationRouter.get('/students/:studentId/skill-gap', recommendationController.getSkillGap);

// 2. Learning path recommendation
// GET /api/v1/recommendations/students/:studentId/learning-path?targetRole=ai-ml-engineer
recommendationRouter.get('/students/:studentId/learning-path', recommendationController.getLearningPath);

// 3. Recommended courses
// GET /api/v1/recommendations/students/:studentId/courses?limit=10
recommendationRouter.get('/students/:studentId/courses', recommendationController.getRecommendedCourses);

// 4. Recommended projects
// GET /api/v1/recommendations/students/:studentId/projects?limit=10
recommendationRouter.get('/students/:studentId/projects', recommendationController.getRecommendedProjects);

// 5. Recommended jobs
// GET /api/v1/recommendations/students/:studentId/jobs?limit=10
recommendationRouter.get('/students/:studentId/jobs', recommendationController.getRecommendedJobs);

// 6. Job readiness analysis
// GET /api/v1/recommendations/students/:studentId/job-readiness/:jobId
recommendationRouter.get('/students/:studentId/job-readiness/:jobId', recommendationController.getJobReadiness);

// 7. Recommended resources
// GET /api/v1/recommendations/students/:studentId/resources?limit=10
recommendationRouter.get('/students/:studentId/resources', recommendationController.getRecommendedResources);
