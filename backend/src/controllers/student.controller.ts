import { Request, Response } from 'express';
import { studentService } from '../services/student.service.js';
import { asyncHandler, ok, paginated, parseQueryOptions } from './helpers.js';

// ── CRUD ───────────────────────────────────────────────────────────

export const createStudent = asyncHandler(async (req: Request, res: Response) => {
  const student = await studentService.createStudent(req.body);
  ok(res, student, 'Student created successfully', 201);
});

export const getStudent = asyncHandler(async (req: Request, res: Response) => {
  const student = await studentService.getStudent(req.params.studentId);
  ok(res, student);
});

export const listStudents = asyncHandler(async (req: Request, res: Response) => {
  const opts = {
    ...parseQueryOptions(req),
    department: req.query.department as string | undefined,
    semester: req.query.semester ? Number(req.query.semester) : undefined,
    minCgpa: req.query.minCgpa ? Number(req.query.minCgpa) : undefined,
    maxCgpa: req.query.maxCgpa ? Number(req.query.maxCgpa) : undefined,
    interest: req.query.interest as string | undefined,
    skillId: req.query.skillId as string | undefined,
  };
  const result = await studentService.listStudents(opts);
  paginated(res, result);
});

export const updateStudent = asyncHandler(async (req: Request, res: Response) => {
  const student = await studentService.updateStudent(req.params.studentId, req.body);
  ok(res, student, 'Student updated successfully');
});

export const deleteStudent = asyncHandler(async (req: Request, res: Response) => {
  const result = await studentService.deleteStudent(req.params.studentId);
  ok(res, result, 'Student deleted successfully');
});

// ── SUB-DOCUMENTS ──────────────────────────────────────────────────

export const addSkill = asyncHandler(async (req: Request, res: Response) => {
  const { skillId, level } = req.body;
  const student = await studentService.addSkill(req.params.studentId, skillId, level);
  ok(res, student, 'Skill added successfully');
});

export const addCompletedCourse = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, grade, completedSemester } = req.body;
  const student = await studentService.addCompletedCourse(
    req.params.studentId,
    courseId,
    grade,
    completedSemester
  );
  ok(res, student, 'Course completion recorded');
});

export const joinClub = asyncHandler(async (req: Request, res: Response) => {
  const { clubId, role } = req.body;
  const student = await studentService.joinClub(req.params.studentId, clubId, role);
  ok(res, student, 'Club membership added');
});

export const attendEvent = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = req.body;
  const student = await studentService.attendEvent(req.params.studentId, eventId);
  ok(res, student, 'Event attendance recorded');
});

// ── ANALYTICS ──────────────────────────────────────────────────────

export const getMostActiveStudents = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  ok(res, await studentService.getMostActiveStudents(limit));
});

export const getSkillDistribution = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await studentService.getSkillDistribution());
});

export const getDepartmentStats = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await studentService.getDepartmentStats());
});
