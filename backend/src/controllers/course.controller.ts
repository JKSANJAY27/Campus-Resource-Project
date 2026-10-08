import { Request, Response } from 'express';
import { courseService } from '../services/course.service.js';
import { asyncHandler, ok, paginated, parseQueryOptions } from './helpers.js';

export const createCourse = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await courseService.createCourse(req.body), 'Course created', 201);
});

export const getCourse = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await courseService.getCourse(req.params.courseId));
});

export const getCourseByCode = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await courseService.getCourseByCode(req.params.code));
});

export const listCourses = asyncHandler(async (req: Request, res: Response) => {
  const opts = {
    ...parseQueryOptions(req),
    department: req.query.department as string | undefined,
    difficulty: req.query.difficulty as string | undefined,
    skillId: req.query.skillId as string | undefined,
  };
  paginated(res, await courseService.listCourses(opts));
});

export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await courseService.updateCourse(req.params.courseId, req.body), 'Course updated');
});

export const deleteCourse = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await courseService.deleteCourse(req.params.courseId), 'Course deleted');
});

export const getPrerequisites = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await courseService.getPrerequisites(req.params.courseId));
});

export const getCoursePopularity = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await courseService.getCoursePopularity(req.query.limit ? Number(req.query.limit) : 10));
});

export const getDepartmentDistribution = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await courseService.getDepartmentDistribution());
});

export const getCourseSkillMatrix = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await courseService.getCourseSkillMatrix(req.query.limit ? Number(req.query.limit) : 20));
});

export const findBySkills = asyncHandler(async (req: Request, res: Response) => {
  const skillIds = (req.query.skillIds as string)?.split(',') ?? [];
  ok(res, await courseService.findBySkills(skillIds));
});
