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

export const onboardStudent = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.body.studentId || (req.params.studentId as string) || `STU_${Date.now()}`;
  const student = await studentService.onboardOrUpdateStudent(studentId, req.body);
  ok(res, student, 'Student profile onboarded/updated successfully', 200);
});

export const getProfileSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await studentService.getProfileSummary(req.params.studentId);
  ok(res, summary, 'Student profile summary retrieved successfully');
});

export const removeSkill = asyncHandler(async (req: Request, res: Response) => {
  const student = await studentService.removeSkill(req.params.studentId, req.params.skillId);
  ok(res, student, 'Skill removed successfully');
});

export const removeCompletedCourse = asyncHandler(async (req: Request, res: Response) => {
  const student = await studentService.removeCompletedCourse(req.params.studentId, req.params.courseId);
  ok(res, student, 'Completed course removed successfully');
});

export const addCustomProject = asyncHandler(async (req: Request, res: Response) => {
  const student = await studentService.addOrUpdateCustomProject(req.params.studentId, req.body);
  ok(res, student, 'Project added successfully');
});

export const removeCustomProject = asyncHandler(async (req: Request, res: Response) => {
  const student = await studentService.removeCustomProject(req.params.studentId, req.params.projectId);
  ok(res, student, 'Project removed successfully');
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

// ── CAREER PERSISTENCE HANDLERS ────────────────────────────────────

export const saveJob = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const { jobId } = req.body;
  if (!jobId) {
    res.status(400).json({ success: false, error: 'BadRequest', message: 'jobId is required' });
    return;
  }
  const result = await studentService.saveJob(studentId, jobId);
  ok(res, result, 'Job saved successfully');
});

export const removeSavedJob = asyncHandler(async (req: Request, res: Response) => {
  const { studentId, jobId } = req.params;
  const result = await studentService.removeSavedJob(studentId, jobId);
  ok(res, result, 'Saved job removed successfully');
});

export const getSavedJobs = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const savedJobs = await studentService.getSavedJobs(studentId);
  ok(res, savedJobs, 'Saved jobs retrieved successfully');
});

export const saveRole = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const { roleId } = req.body;
  if (!roleId) {
    res.status(400).json({ success: false, error: 'BadRequest', message: 'roleId is required' });
    return;
  }
  const result = await studentService.saveRole(studentId, roleId);
  ok(res, result, 'Role saved successfully');
});

export const removeSavedRole = asyncHandler(async (req: Request, res: Response) => {
  const { studentId, roleId } = req.params;
  const result = await studentService.removeSavedRole(studentId, roleId);
  ok(res, result, 'Saved role removed successfully');
});

export const getSavedRoles = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const savedRoles = await studentService.getSavedRoles(studentId);
  ok(res, savedRoles, 'Saved roles retrieved successfully');
});

export const completeLearningMilestone = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const { milestoneId, roleId, metadata } = req.body;
  if (!milestoneId) {
    res.status(400).json({ success: false, error: 'BadRequest', message: 'milestoneId is required' });
    return;
  }
  const result = await studentService.completeLearningMilestone(studentId, milestoneId, roleId, metadata);
  ok(res, result, 'Learning milestone completed and logged to Cassandra');
});
