/**
 * @api {*} /api/v1/students Student Routes
 *
 * CRUD:
 *   POST   /api/v1/students                          - Create student
 *   GET    /api/v1/students                          - List students (paginated, filterable)
 *   GET    /api/v1/students/:studentId               - Get student by ID
 *   PUT    /api/v1/students/:studentId               - Update student
 *   DELETE /api/v1/students/:studentId               - Delete student
 *
 * Sub-documents:
 *   POST   /api/v1/students/:studentId/skills        - Add/update a skill
 *   POST   /api/v1/students/:studentId/courses       - Record completed course
 *   POST   /api/v1/students/:studentId/clubs         - Join a club
 *   POST   /api/v1/students/:studentId/events        - Attend an event
 *
 * Analytics:
 *   GET    /api/v1/students/analytics/most-active    - Most active students (activity score)
 *   GET    /api/v1/students/analytics/skill-distribution - Skill distribution
 *   GET    /api/v1/students/analytics/departments    - Department statistics
 */
import { Router } from 'express';
import {
  createStudent,
  getStudent,
  listStudents,
  updateStudent,
  deleteStudent,
  addSkill,
  addCompletedCourse,
  joinClub,
  attendEvent,
  getMostActiveStudents,
  getSkillDistribution,
  getDepartmentStats,
} from '../controllers/student.controller.js';

export const studentRouter = Router();

// Analytics (must be before /:studentId to avoid param conflict)
studentRouter.get('/analytics/most-active', getMostActiveStudents);
studentRouter.get('/analytics/skill-distribution', getSkillDistribution);
studentRouter.get('/analytics/departments', getDepartmentStats);

// CRUD
studentRouter.post('/', createStudent);
studentRouter.get('/', listStudents);
studentRouter.get('/:studentId', getStudent);
studentRouter.put('/:studentId', updateStudent);
studentRouter.delete('/:studentId', deleteStudent);

// Sub-documents
studentRouter.post('/:studentId/skills', addSkill);
studentRouter.post('/:studentId/courses', addCompletedCourse);
studentRouter.post('/:studentId/clubs', joinClub);
studentRouter.post('/:studentId/events', attendEvent);
