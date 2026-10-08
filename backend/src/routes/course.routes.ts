/**
 * @api {*} /api/v1/courses Course Routes
 *
 * CRUD:
 *   POST   /api/v1/courses                           - Create course
 *   GET    /api/v1/courses                           - List courses (paginated, filterable)
 *   GET    /api/v1/courses/code/:code                - Get course by code
 *   GET    /api/v1/courses/:courseId                 - Get course by ID
 *   PUT    /api/v1/courses/:courseId                 - Update course
 *   DELETE /api/v1/courses/:courseId                 - Delete course
 *
 * Queries:
 *   GET    /api/v1/courses/:courseId/prerequisites   - Get prerequisite courses
 *   GET    /api/v1/courses/search/by-skills          - Courses that teach given skills (?skillIds=a,b)
 *
 * Analytics:
 *   GET    /api/v1/courses/analytics/popularity      - Course popularity by enrollment
 *   GET    /api/v1/courses/analytics/departments     - Department distribution
 *   GET    /api/v1/courses/analytics/skill-matrix    - Skills taught per course
 */
import { Router } from 'express';
import {
  createCourse,
  getCourse,
  getCourseByCode,
  listCourses,
  updateCourse,
  deleteCourse,
  getPrerequisites,
  getCoursePopularity,
  getDepartmentDistribution,
  getCourseSkillMatrix,
  findBySkills,
} from '../controllers/course.controller.js';

export const courseRouter = Router();

// Analytics
courseRouter.get('/analytics/popularity', getCoursePopularity);
courseRouter.get('/analytics/departments', getDepartmentDistribution);
courseRouter.get('/analytics/skill-matrix', getCourseSkillMatrix);

// Search
courseRouter.get('/search/by-skills', findBySkills);
courseRouter.get('/code/:code', getCourseByCode);

// CRUD
courseRouter.post('/', createCourse);
courseRouter.get('/', listCourses);
courseRouter.get('/:courseId', getCourse);
courseRouter.put('/:courseId', updateCourse);
courseRouter.delete('/:courseId', deleteCourse);

// Sub-queries
courseRouter.get('/:courseId/prerequisites', getPrerequisites);
