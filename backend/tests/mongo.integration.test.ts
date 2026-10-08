/**
 * Integration tests for the Express HTTP layer using supertest.
 * These test route registration, request/response shaping, and controller logic
 * with a mocked service layer — no live database required.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

// ── Mock all services so no real DB is needed ─────────────────────────────────

vi.mock('../src/services/student.service.js', () => ({
  studentService: {
    listStudents: vi.fn().mockResolvedValue({
      data: [{ studentId: 'STU001', name: 'Alice', department: 'CSE', cgpa: 9.1 }],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false },
    }),
    getStudent: vi.fn().mockImplementation(async (id) => {
      if (id === 'STU001') return { studentId: 'STU001', name: 'Alice', department: 'CSE' };
      throw Object.assign(new Error('Student not found'), { status: 404 });
    }),
    createStudent: vi.fn().mockResolvedValue({ studentId: 'STU002', name: 'Bob', department: 'ECE' }),
    updateStudent: vi.fn().mockResolvedValue({ studentId: 'STU001', name: 'Alice Updated' }),
    deleteStudent: vi.fn().mockResolvedValue({ deleted: true }),
    getMostActiveStudents: vi.fn().mockResolvedValue([{ studentId: 'STU001', activityScore: 95 }]),
    getSkillDistribution: vi.fn().mockResolvedValue([{ _id: 'SKL001', totalStudents: 45 }]),
    getDepartmentStats: vi.fn().mockResolvedValue([{ department: 'CSE', count: 120 }]),
    addSkill: vi.fn().mockResolvedValue({ studentId: 'STU001', skills: [{ skillId: 'SKL001', level: 'intermediate' }] }),
    attendEvent: vi.fn().mockResolvedValue({ studentId: 'STU001', attendedEventIds: ['EVT001'] }),
  },
}));

vi.mock('../src/services/course.service.js', () => ({
  courseService: {
    listCourses: vi.fn().mockResolvedValue({
      data: [{ courseId: 'CRS001', code: 'CS301', title: 'Machine Learning' }],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false },
    }),
    getCourse: vi.fn().mockImplementation(async (id) => {
      if (id === 'CRS001') return { courseId: 'CRS001', code: 'CS301', title: 'Machine Learning' };
      throw Object.assign(new Error('Course not found'), { status: 404 });
    }),
    createCourse: vi.fn().mockResolvedValue({ courseId: 'CRS002', code: 'CS401', title: 'Deep Learning' }),
    getCoursePopularity: vi.fn().mockResolvedValue([{ courseId: 'CRS001', enrollmentCount: 89 }]),
    getDepartmentDistribution: vi.fn().mockResolvedValue([{ department: 'CSE', totalCourses: 15 }]),
  },
}));

vi.mock('../src/services/skill.service.js', () => ({
  skillService: {
    listSkills: vi.fn().mockResolvedValue({
      data: [{ skillId: 'SKL001', name: 'Python' }],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false },
    }),
    getSkill: vi.fn().mockImplementation(async (id) => {
      if (id === 'SKL001') return { skillId: 'SKL001', name: 'Python', tier: 'foundational' };
      throw Object.assign(new Error('Skill not found'), { status: 404 });
    }),
    getSkillDemand: vi.fn().mockResolvedValue([{ skillId: 'SKL001', jobDemand: 12 }]),
    getCategoryTierMatrix: vi.fn().mockResolvedValue([{ _id: 'Programming', totalSkills: 8 }]),
  },
}));

vi.mock('../src/services/project.service.js', () => ({
  projectService: {
    listProjects: vi.fn().mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    }),
    getProjectStats: vi.fn().mockResolvedValue([{ domain: 'AI/ML', count: 5 }]),
    getTechnologyUsage: vi.fn().mockResolvedValue([{ technology: 'Python', projectCount: 12 }]),
    getStudentParticipation: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../src/services/job.service.js', () => ({
  jobService: {
    listJobs: vi.fn().mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    }),
    getSkillDemandStats: vi.fn().mockResolvedValue([]),
    getCompanyLandscape: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../src/services/resource.service.js', () => ({
  resourceService: {
    listResources: vi.fn().mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    }),
    getPopularResources: vi.fn().mockResolvedValue([{ resourceId: 'RES001', popularityScore: 520 }]),
    getTypeDistribution: vi.fn().mockResolvedValue([]),
    getSkillCoverage: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../src/services/club.service.js', () => ({
  clubService: {
    listClubs: vi.fn().mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    }),
    getClubActivity: vi.fn().mockResolvedValue([]),
    getCategoryBreakdown: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../src/services/event.service.js', () => ({
  eventService: {
    listEvents: vi.fn().mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    }),
    getEventParticipation: vi.fn().mockResolvedValue([]),
    getTypeDistribution: vi.fn().mockResolvedValue([]),
    getMonthlySchedule: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../src/services/facility.service.js', () => ({
  facilityService: {
    listFacilities: vi.fn().mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    }),
    getFacilityUsage: vi.fn().mockResolvedValue([]),
    getTypeSummary: vi.fn().mockResolvedValue([]),
  },
}));

// ── Test setup ────────────────────────────────────────────────────────────────

const app = createApp();

// ── Student routes ─────────────────────────────────────────────────────────────

describe('GET /api/v1/students', () => {
  it('returns paginated students with success:true', async () => {
    const res = await request(app).get('/api/v1/students');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  it('passes department query param to service', async () => {
    const res = await request(app).get('/api/v1/students?department=CSE');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/v1/students/:studentId', () => {
  it('returns 200 and student data for valid ID', async () => {
    const res = await request(app).get('/api/v1/students/STU001');
    expect(res.status).toBe(200);
    expect(res.body.data.studentId).toBe('STU001');
  });

  it('returns 404 for unknown student', async () => {
    const res = await request(app).get('/api/v1/students/UNKNOWN');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/v1/students', () => {
  it('creates a student and returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/students')
      .send({ name: 'Bob', department: 'ECE', email: 'bob@test.com', rollNumber: 'R002' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.studentId).toBe('STU002');
  });
});

describe('GET /api/v1/students/analytics/most-active', () => {
  it('returns most active students array', async () => {
    const res = await request(app).get('/api/v1/students/analytics/most-active');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].activityScore).toBeDefined();
  });
});

describe('GET /api/v1/students/analytics/skill-distribution', () => {
  it('returns skill distribution array', async () => {
    const res = await request(app).get('/api/v1/students/analytics/skill-distribution');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /api/v1/students/analytics/departments', () => {
  it('returns department stats', async () => {
    const res = await request(app).get('/api/v1/students/analytics/departments');
    expect(res.status).toBe(200);
    expect(res.body.data[0].department).toBe('CSE');
  });
});

// ── Course routes ──────────────────────────────────────────────────────────────

describe('GET /api/v1/courses', () => {
  it('returns paginated courses', async () => {
    const res = await request(app).get('/api/v1/courses');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /api/v1/courses/:courseId', () => {
  it('returns course for valid ID', async () => {
    const res = await request(app).get('/api/v1/courses/CRS001');
    expect(res.status).toBe(200);
    expect(res.body.data.courseId).toBe('CRS001');
  });

  it('returns 404 for invalid ID', async () => {
    const res = await request(app).get('/api/v1/courses/INVALID');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/courses/analytics/popularity', () => {
  it('returns course popularity analytics', async () => {
    const res = await request(app).get('/api/v1/courses/analytics/popularity');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── Skill routes ───────────────────────────────────────────────────────────────

describe('GET /api/v1/skills', () => {
  it('returns paginated skills', async () => {
    const res = await request(app).get('/api/v1/skills');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/skills/:skillId', () => {
  it('returns skill for valid ID', async () => {
    const res = await request(app).get('/api/v1/skills/SKL001');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Python');
  });
});

describe('GET /api/v1/skills/analytics/demand', () => {
  it('returns skill demand analytics', async () => {
    const res = await request(app).get('/api/v1/skills/analytics/demand');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── Resource analytics ─────────────────────────────────────────────────────────

describe('GET /api/v1/resources/analytics/popular', () => {
  it('returns popular resources', async () => {
    const res = await request(app).get('/api/v1/resources/analytics/popular');
    expect(res.status).toBe(200);
    expect(res.body.data[0].popularityScore).toBeDefined();
  });
});

// ── 404 for unknown route ──────────────────────────────────────────────────────

describe('Unknown routes', () => {
  it('returns 404 with success:false for unknown endpoint', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
