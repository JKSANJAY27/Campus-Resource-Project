import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getApiBaseUrl,
  setApiBaseUrl,
  resetApiBaseUrl,
  getPersistedStudentId,
  persistStudentId,
  clearPersistedStudentId,
  getSavedJobs,
  toggleSaveJob,
  isJobSaved,
  getActiveGoal,
  setActiveGoal,
  DEFAULT_API_URL,
} from '../src/api/client';
import type { NormalizedJob } from '../src/types';

// Mock AsyncStorage in-memory
const storage = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) || null),
    setItem: vi.fn(async (key: string, val: string) => {
      storage.set(key, val);
    }),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
    clear: vi.fn(async () => {
      storage.clear();
    }),
  },
}));

describe('Mobile API Client & Storage Suite', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  describe('1. Dynamic API Base URL Management', () => {
    it('should default to port 5000 API URL when no custom URL is persisted', async () => {
      const url = await getApiBaseUrl();
      expect(url).toBe(DEFAULT_API_URL);
      expect(url).toContain(':5000');
    });

    it('should allow setting a custom Android emulator IP and strip trailing slashes', async () => {
      await setApiBaseUrl('http://10.0.2.2:5000/api/v1/');
      const updated = await getApiBaseUrl();
      expect(updated).toBe('http://10.0.2.2:5000/api/v1');
    });

    it('should reset API base URL to default', async () => {
      await setApiBaseUrl('http://192.168.1.100:5000/api/v1');
      expect(await getApiBaseUrl()).toBe('http://192.168.1.100:5000/api/v1');

      await resetApiBaseUrl();
      expect(await getApiBaseUrl()).toBe(DEFAULT_API_URL);
    });
  });

  describe('2. Student Session Persistence', () => {
    it('should persist and retrieve studentId', async () => {
      expect(await getPersistedStudentId()).toBeNull();

      await persistStudentId('stu_aarav_patel_001');
      expect(await getPersistedStudentId()).toBe('stu_aarav_patel_001');

      await clearPersistedStudentId();
      expect(await getPersistedStudentId()).toBeNull();
    });
  });

  describe('3. Local Job Bookmarking (AsyncStorage)', () => {
    const mockJob: NormalizedJob = {
      id: 'job_001',
      externalId: 'ext_001',
      provider: 'jobicy',
      sourceName: 'Jobicy',
      title: 'Backend Engineer',
      company: 'Tech Corp',
      companyLogo: null,
      description: 'Node.js & PostgreSQL engineer',
      excerpt: 'Build scalable APIs',
      location: 'Remote',
      workArrangement: 'remote',
      employmentType: 'full-time',
      experienceLevel: 'entry',
      category: 'Software Engineering',
      tags: ['Node.js', 'PostgreSQL'],
      publicationDate: '2026-10-10T00:00:00.000Z',
      originalUrl: 'https://example.com/jobs/1',
      retrievedAt: '2026-10-11T00:00:00.000Z',
      isLive: true,
      attribution: {
        text: 'Jobicy',
        url: 'https://jobicy.com',
        required: true,
      },
    };

    it('should toggle bookmark on and off', async () => {
      expect(await isJobSaved('job_001')).toBe(false);

      const added = await toggleSaveJob(mockJob);
      expect(added).toBe(true);
      expect(await isJobSaved('job_001')).toBe(true);

      const saved = await getSavedJobs();
      expect(saved.length).toBe(1);
      expect(saved[0].title).toBe('Backend Engineer');

      const removed = await toggleSaveJob(mockJob);
      expect(removed).toBe(false);
      expect(await isJobSaved('job_001')).toBe(false);
      expect(await getSavedJobs()).toHaveLength(0);
    });
  });

  describe('4. Active Career Goal Persistence', () => {
    it('should persist and clear active target goal', async () => {
      expect(await getActiveGoal()).toBeNull();

      await setActiveGoal({
        roleId: 'role_backend_developer',
        roleTitle: 'Backend Developer',
        completedStepCount: 3,
        totalSteps: 7,
        updatedAt: '2026-10-11T12:00:00.000Z',
      });

      const goal = await getActiveGoal();
      expect(goal).not.toBeNull();
      expect(goal?.roleId).toBe('role_backend_developer');
      expect(goal?.completedStepCount).toBe(3);

      await setActiveGoal(null);
      expect(await getActiveGoal()).toBeNull();
    });
  });
});
