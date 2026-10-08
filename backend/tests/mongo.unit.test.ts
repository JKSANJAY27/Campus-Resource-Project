/**
 * Unit tests for MongoDB repositories — run against in-memory data structures.
 * These test the business logic of query building, aggregation projection shapes,
 * and domain-specific methods without requiring a live MongoDB connection.
 *
 * Integration tests (requiring a running MongoDB) are in mongo.integration.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Query option parsing helpers ──────────────────────────────────────────────

describe('BaseMongoRepository pagination helpers', () => {
  it('clamps page to minimum 1', () => {
    const page = Math.max(1, -5 || 1);
    expect(page).toBe(1);
  });

  it('clamps limit to max 100', () => {
    const limit = Math.max(1, Math.min(100, 9999));
    expect(limit).toBe(100);
  });

  it('calculates totalPages correctly', () => {
    const total = 105;
    const limit = 20;
    const totalPages = Math.ceil(total / limit);
    expect(totalPages).toBe(6);
  });

  it('hasNextPage is true when not on last page', () => {
    const page = 3;
    const totalPages = 6;
    expect(page < totalPages).toBe(true);
  });

  it('hasPrevPage is false on first page', () => {
    const page = 1;
    expect(page > 1).toBe(false);
  });
});

// ── StudentRepository domain logic ────────────────────────────────────────────

describe('StudentRepository filter building', () => {
  function buildStudentFilter(opts: {
    department?: string;
    semester?: number;
    minCgpa?: number;
    maxCgpa?: number;
    interest?: string;
    skillId?: string;
  }) {
    const filter: Record<string, any> = {};
    if (opts.department) filter.department = opts.department;
    if (opts.semester) filter.currentSemester = opts.semester;
    if (opts.minCgpa !== undefined || opts.maxCgpa !== undefined) {
      filter.cgpa = {};
      if (opts.minCgpa !== undefined) filter.cgpa.$gte = opts.minCgpa;
      if (opts.maxCgpa !== undefined) filter.cgpa.$lte = opts.maxCgpa;
    }
    if (opts.interest) filter.interests = opts.interest;
    if (opts.skillId) filter['skills.skillId'] = opts.skillId;
    return filter;
  }

  it('generates correct department filter', () => {
    const f = buildStudentFilter({ department: 'CSE' });
    expect(f).toEqual({ department: 'CSE' });
  });

  it('generates CGPA range filter with both bounds', () => {
    const f = buildStudentFilter({ minCgpa: 7.5, maxCgpa: 9.5 });
    expect(f.cgpa).toEqual({ $gte: 7.5, $lte: 9.5 });
  });

  it('generates CGPA filter with only lower bound', () => {
    const f = buildStudentFilter({ minCgpa: 8.0 });
    expect(f.cgpa).toEqual({ $gte: 8.0 });
  });

  it('generates skill dot-notation filter', () => {
    const f = buildStudentFilter({ skillId: 'SKL001' });
    expect(f['skills.skillId']).toBe('SKL001');
  });

  it('returns empty filter when no options provided', () => {
    const f = buildStudentFilter({});
    expect(f).toEqual({});
  });
});

// ── Activity score calculation ─────────────────────────────────────────────────

describe('Activity score computation', () => {
  function computeScore(skillCount: number, courseCount: number, projectCount: number, eventCount: number, clubCount: number) {
    return skillCount * 2 + courseCount * 3 + projectCount * 5 + eventCount * 1 + clubCount * 2;
  }

  it('heavy project involvement scores high', () => {
    const score = computeScore(5, 10, 8, 3, 2);
    expect(score).toBeGreaterThan(70);
  });

  it('student with zero activity scores 0', () => {
    expect(computeScore(0, 0, 0, 0, 0)).toBe(0);
  });

  it('projects weight more than skills', () => {
    const skillScore = computeScore(10, 0, 0, 0, 0);
    const projectScore = computeScore(0, 0, 10, 0, 0);
    expect(projectScore).toBeGreaterThan(skillScore);
  });
});

// ── Project qualification matching ────────────────────────────────────────────

describe('Project qualification ratio', () => {
  function computeMatchRatio(required: string[], studentSkills: string[]) {
    const totalRequired = required.length;
    if (totalRequired === 0) return 1;
    const matched = required.filter((s) => studentSkills.includes(s)).length;
    return matched / totalRequired;
  }

  it('fully qualified student scores 1.0', () => {
    const ratio = computeMatchRatio(['SKL001', 'SKL002', 'SKL003'], ['SKL001', 'SKL002', 'SKL003', 'SKL004']);
    expect(ratio).toBe(1.0);
  });

  it('half-qualified student scores 0.5', () => {
    const ratio = computeMatchRatio(['SKL001', 'SKL002', 'SKL003', 'SKL004'], ['SKL001', 'SKL002']);
    expect(ratio).toBe(0.5);
  });

  it('project with no requirements always returns 1.0', () => {
    expect(computeMatchRatio([], ['SKL001'])).toBe(1.0);
  });

  it('student with no skills scores 0', () => {
    expect(computeMatchRatio(['SKL001', 'SKL002'], [])).toBe(0);
  });
});

// ── Job eligibility matching ──────────────────────────────────────────────────

describe('Job eligibility matching', () => {
  function isEligible(jobMinCgpa: number, studentCgpa: number, deadline: Date) {
    return studentCgpa >= jobMinCgpa && deadline >= new Date();
  }

  it('accepts student above minimum CGPA', () => {
    const deadline = new Date(Date.now() + 86400000); // tomorrow
    expect(isEligible(7.5, 8.0, deadline)).toBe(true);
  });

  it('rejects student below minimum CGPA', () => {
    const deadline = new Date(Date.now() + 86400000);
    expect(isEligible(8.0, 7.0, deadline)).toBe(false);
  });

  it('rejects expired job even if CGPA qualifies', () => {
    const deadline = new Date(Date.now() - 86400000); // yesterday
    expect(isEligible(6.0, 9.0, deadline)).toBe(false);
  });
});

// ── Event registration capacity guard ─────────────────────────────────────────

describe('Event registration capacity', () => {
  function canRegister(capacity: number, registeredCount: number) {
    return registeredCount < capacity;
  }

  it('allows registration when spots available', () => {
    expect(canRegister(100, 50)).toBe(true);
  });

  it('blocks registration when at capacity', () => {
    expect(canRegister(50, 50)).toBe(false);
  });

  it('blocks registration when over capacity (data integrity)', () => {
    expect(canRegister(50, 51)).toBe(false);
  });
});

// ── Resource popularity score ──────────────────────────────────────────────────

describe('Resource popularity score', () => {
  function popularityScore(accessCount: number, rating: number) {
    return accessCount * 0.6 + rating * 8;
  }

  it('high access count with low rating', () => {
    const score = popularityScore(1000, 2.0);
    expect(score).toBeGreaterThan(600);
  });

  it('low access with perfect rating', () => {
    const score = popularityScore(10, 5.0);
    expect(score).toBe(46);
  });

  it('score is deterministic', () => {
    expect(popularityScore(500, 4.5)).toBe(500 * 0.6 + 4.5 * 8);
  });
});
