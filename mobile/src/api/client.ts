/**
 * API client for the Campus Resource backend.
 * Uses AsyncStorage to persist studentId, custom API host, bookmarked jobs, and active goals.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CareerRole,
  RoleRecommendation,
  CareerToLearningPath,
  PathwayComparison,
  SavedPathway,
  NormalizedJob,
  JobSearchParams,
  JobDescriptionAnalysis,
  RoleJobMarketSummary,
  ProfileSummaryResponse,
} from '../types';

// Default to backend default port 5000 (can be updated dynamically in Settings)
export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

const STUDENT_ID_KEY = '@campus_career:studentId';
const API_URL_KEY = '@campus_career:apiUrl';
const SAVED_JOBS_KEY = '@campus_career:savedJobs';
const ACTIVE_GOAL_KEY = '@campus_career:activeGoal';

// In-memory cached Base URL for fast synchronous lookups
let cachedBaseUrl: string = DEFAULT_API_URL;

export async function initApiClient(): Promise<string> {
  try {
    const custom = await AsyncStorage.getItem(API_URL_KEY);
    if (custom) {
      cachedBaseUrl = custom.replace(/\/+$/, '');
    }
  } catch {}
  return cachedBaseUrl;
}

export async function getApiBaseUrl(): Promise<string> {
  const custom = await AsyncStorage.getItem(API_URL_KEY);
  return custom ? custom.replace(/\/+$/, '') : DEFAULT_API_URL;
}

export async function setApiBaseUrl(url: string): Promise<void> {
  const clean = url.trim().replace(/\/+$/, '');
  cachedBaseUrl = clean;
  await AsyncStorage.setItem(API_URL_KEY, clean);
}

export async function resetApiBaseUrl(): Promise<void> {
  cachedBaseUrl = DEFAULT_API_URL;
  await AsyncStorage.removeItem(API_URL_KEY);
}

// ── HTTP Request Helper ────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = await getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      },
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
    }

    if (!res.ok) {
      throw new Error(json?.error ?? json?.message ?? `Request failed with status ${res.status}`);
    }

    return json as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Network timeout: Unable to connect to backend at ${baseUrl}. Ensure backend is running.`);
    }
    throw err;
  }
}

function get<T>(path: string) {
  return request<T>(path, { method: 'GET' });
}

function post<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

function put<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

function del<T>(path: string) {
  return request<T>(path, { method: 'DELETE' });
}

// ── Student ID persistence ────────────────────────────────────────────────────

export async function getPersistedStudentId(): Promise<string | null> {
  return AsyncStorage.getItem(STUDENT_ID_KEY);
}

export async function persistStudentId(id: string): Promise<void> {
  await AsyncStorage.setItem(STUDENT_ID_KEY, id);
}

export async function clearPersistedStudentId(): Promise<void> {
  await AsyncStorage.removeItem(STUDENT_ID_KEY);
}

// ── Student Profile Endpoints ─────────────────────────────────────────────────

export interface OnboardPayload {
  studentId: string;
  name: string;
  email: string;
  rollNumber: string;
  department: string;
  degree: string;
  branch: string;
  institution: string;
  graduationYear: number;
  currentSemester: number;
  cgpa?: number;
  interests?: string[];
  careerInterests?: string[];
  preferredLocations?: string[];
  workArrangement?: 'remote' | 'hybrid' | 'onsite' | 'any';
  roleLevelPreference?: 'internship' | 'entry_level' | 'experienced' | 'any';
  completedCourses?: Array<{ courseId: string; grade: string; completedSemester: number; status: string }>;
  skills?: Array<{ skillId: string; level: string; competenceType: string; evidenceDescription?: string }>;
  customProjects?: Array<{
    title: string;
    description?: string;
    technologiesUsed: string[];
    skillsDemonstrated: string[];
    role?: string;
    link?: string;
  }>;
  certifications?: Array<{ name: string; issuer: string; issueDate?: string; credentialUrl?: string }>;
}

export function onboardStudent(payload: OnboardPayload) {
  return post<any>('/students/onboard', payload);
}

export function getStudentSummary(studentId: string): Promise<ProfileSummaryResponse> {
  return get<ProfileSummaryResponse>(`/students/${studentId}/summary`);
}

export function updateStudent(studentId: string, data: Partial<OnboardPayload>) {
  return put<any>(`/students/${studentId}`, data);
}

export function addStudentSkill(
  studentId: string,
  data: { skillId: string; level: string; competenceType: string; evidenceDescription?: string }
) {
  return post<any>(`/students/${studentId}/skills`, data);
}

export function removeStudentSkill(studentId: string, skillId: string) {
  return del<any>(`/students/${studentId}/skills/${skillId}`);
}

export function addStudentCourse(
  studentId: string,
  data: { courseId: string; grade: string; completedSemester: number; status: string }
) {
  return post<any>(`/students/${studentId}/courses`, data);
}

export function removeStudentCourse(studentId: string, courseId: string) {
  return del<any>(`/students/${studentId}/courses/${courseId}`);
}

export function addCustomProject(studentId: string, data: any) {
  return post<any>(`/students/${studentId}/custom-projects`, data);
}

export function removeCustomProject(studentId: string, projectId: string) {
  return del<any>(`/students/${studentId}/custom-projects/${projectId}`);
}

// ── Course & Skill Catalogues ─────────────────────────────────────────────────

export function getCourses(params?: { search?: string; department?: string; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.department) q.set('department', params.department);
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return get<{ courses: any[]; total: number }>(`/courses${qs ? `?${qs}` : ''}`);
}

export function getSkills(params?: { search?: string; category?: string; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.category) q.set('category', params.category);
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return get<{ skills: any[]; total: number }>(`/skills${qs ? `?${qs}` : ''}`);
}

// ── Career Discovery Endpoints ────────────────────────────────────────────────

export async function getCareerRoles(): Promise<CareerRole[]> {
  const res = await get<{ success: boolean; roles: CareerRole[] }>('/career-discovery/roles');
  return res.roles || [];
}

export async function getCareerRoleById(roleId: string): Promise<CareerRole> {
  const res = await get<{ success: boolean; role: CareerRole }>(`/career-discovery/roles/${roleId}`);
  return res.role;
}

export async function getCareerRoleJobs(roleId: string, limit: number = 5): Promise<NormalizedJob[]> {
  const res = await get<{ success: boolean; jobs: NormalizedJob[] }>(
    `/career-discovery/roles/${roleId}/jobs?limit=${limit}`
  );
  return res.jobs || [];
}

export async function getCareerRecommendations(studentId: string): Promise<{
  studentId: string;
  evaluatedRolesCount: number;
  recommendations: RoleRecommendation[];
}> {
  return get<{
    studentId: string;
    evaluatedRolesCount: number;
    recommendations: RoleRecommendation[];
  }>(`/career-discovery/recommendations/${studentId}`);
}

export async function getCareerToLearningPath(
  roleId: string,
  studentId: string
): Promise<CareerToLearningPath> {
  return get<CareerToLearningPath>(`/career-discovery/roles/${roleId}/path/${studentId}`);
}

export async function compareCareerPathways(
  roleIds: string[],
  studentId: string
): Promise<PathwayComparison> {
  return post<PathwayComparison>('/career-discovery/compare', {
    roleIds,
    studentId,
  });
}

export async function getSavedPathways(studentId: string): Promise<SavedPathway[]> {
  const res = await get<{ success: boolean; pathways: SavedPathway[] }>(
    `/career-discovery/saved/${studentId}`
  );
  return res.pathways || [];
}

export async function saveCareerPathway(
  studentId: string,
  roleId: string,
  roleTitle: string,
  notes?: string
): Promise<any> {
  return post(`/career-discovery/saved/${studentId}`, {
    roleId,
    roleTitle,
    notes,
  });
}

export async function removeSavedCareerPathway(
  studentId: string,
  roleId: string
): Promise<any> {
  return del(`/career-discovery/saved/${studentId}/${roleId}`);
}

// ── Live Jobs & Providers ─────────────────────────────────────────────────────

export async function searchJobs(params: JobSearchParams = {}): Promise<{
  jobs: NormalizedJob[];
  total: number;
  provider: string;
}> {
  const q = new URLSearchParams();
  if (params.keyword) q.set('keyword', params.keyword);
  if (params.location) q.set('location', params.location);
  if (params.category) q.set('category', params.category);
  if (params.workArrangement) q.set('workArrangement', params.workArrangement);
  if (params.employmentType) q.set('employmentType', params.employmentType);
  if (params.experienceLevel) q.set('experienceLevel', params.experienceLevel);
  if (params.limit) q.set('limit', String(params.limit));
  if (params.page) q.set('page', String(params.page));
  if (params.forceFresh) q.set('forceFresh', 'true');

  const qs = q.toString();
  const res = await get<{
    success: boolean;
    jobs: NormalizedJob[];
    total: number;
    provider: string;
  }>(`/jobs/search${qs ? `?${qs}` : ''}`);

  return {
    jobs: res.jobs || [],
    total: res.total || (res.jobs ? res.jobs.length : 0),
    provider: res.provider || 'unknown',
  };
}

export async function getJobById(jobId: string): Promise<NormalizedJob> {
  const res = await get<{ success: boolean; job: NormalizedJob }>(`/jobs/${jobId}`);
  return res.job || (res as any);
}

export async function getProvidersStatus(): Promise<any> {
  return get('/jobs/providers/status');
}

// ── Job Description Analysis Endpoints ────────────────────────────────────────

export async function analyzeJobText(payload: {
  text: string;
  title?: string;
  company?: string;
  studentId?: string;
  forceFresh?: boolean;
}): Promise<JobDescriptionAnalysis> {
  const res = await post<{ success: boolean; analysis: JobDescriptionAnalysis }>(
    '/jobs/analyze',
    payload
  );
  return res.analysis;
}

export async function analyzeJobListing(
  jobId: string,
  studentId?: string,
  forceFresh?: boolean
): Promise<JobDescriptionAnalysis> {
  const q = new URLSearchParams();
  if (studentId) q.set('studentId', studentId);
  if (forceFresh) q.set('forceFresh', 'true');
  const qs = q.toString();

  const res = await get<{ success: boolean; analysis: JobDescriptionAnalysis }>(
    `/jobs/${jobId}/analysis${qs ? `?${qs}` : ''}`
  );
  return res.analysis;
}

export async function getRoleMarketSummary(
  roleId: string,
  sampleSize: number = 5
): Promise<RoleJobMarketSummary> {
  const res = await get<{ success: boolean; summary: RoleJobMarketSummary }>(
    `/roles/${roleId}/market-summary?sampleSize=${sampleSize}`
  );
  return res.summary;
}

// ── Local Bookmarked Jobs Management ──────────────────────────────────────────

export async function getSavedJobs(): Promise<NormalizedJob[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_JOBS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function toggleSaveJob(job: NormalizedJob): Promise<boolean> {
  try {
    const saved = await getSavedJobs();
    const exists = saved.some((j) => j.id === job.id);
    let updated: NormalizedJob[];
    if (exists) {
      updated = saved.filter((j) => j.id !== job.id);
    } else {
      updated = [job, ...saved];
    }
    await AsyncStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(updated));
    return !exists;
  } catch {
    return false;
  }
}

export async function isJobSaved(jobId: string): Promise<boolean> {
  try {
    const saved = await getSavedJobs();
    return saved.some((j) => j.id === jobId);
  } catch {
    return false;
  }
}

// ── Active Career Goal Persistence ────────────────────────────────────────────

export interface ActiveCareerGoal {
  roleId: string;
  roleTitle: string;
  targetSemester?: number;
  targetDate?: string;
  completedStepCount: number;
  totalSteps: number;
  updatedAt: string;
}

export async function getActiveGoal(): Promise<ActiveCareerGoal | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_GOAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setActiveGoal(goal: ActiveCareerGoal | null): Promise<void> {
  try {
    if (!goal) {
      await AsyncStorage.removeItem(ACTIVE_GOAL_KEY);
    } else {
      await AsyncStorage.setItem(ACTIVE_GOAL_KEY, JSON.stringify(goal));
    }
  } catch {}
}

// ── Multi-Model NoSQL Backend Sync Functions ──────────────────────────────────

export async function syncSavedJobToBackend(studentId: string, jobId: string): Promise<any> {
  try {
    return await post(`/students/${studentId}/saved-jobs`, { jobId });
  } catch {
    return null;
  }
}

export async function removeSavedJobFromBackend(studentId: string, jobId: string): Promise<any> {
  try {
    return await del(`/students/${studentId}/saved-jobs/${jobId}`);
  } catch {
    return null;
  }
}

export async function syncSavedRoleToBackend(studentId: string, roleId: string): Promise<any> {
  try {
    return await post(`/students/${studentId}/saved-roles`, { roleId });
  } catch {
    return null;
  }
}

export async function removeSavedRoleFromBackend(studentId: string, roleId: string): Promise<any> {
  try {
    return await del(`/students/${studentId}/saved-roles/${roleId}`);
  } catch {
    return null;
  }
}

export async function recordMilestoneToBackend(
  studentId: string,
  milestoneId: string,
  roleId?: string,
  metadata?: Record<string, any>
): Promise<any> {
  try {
    return await post(`/students/${studentId}/milestones`, { milestoneId, roleId, metadata });
  } catch {
    return null;
  }
}

export async function recordActivityEventToBackend(
  studentId: string,
  actionType: string,
  targetEntityType: string,
  targetEntityId: string,
  metadata?: Record<string, any>
): Promise<any> {
  try {
    return await post('/activity/events', {
      studentId,
      actionType,
      targetEntityType,
      targetEntityId,
      metadata,
    });
  } catch {
    return null;
  }
}

// ── Diagnostics ───────────────────────────────────────────────────────────────

export async function testApiHealth(): Promise<{
  ok: boolean;
  latencyMs: number;
  status: string;
  url: string;
  error?: string;
}> {
  const baseUrl = await getApiBaseUrl();
  const start = Date.now();
  try {
    const hostOnly = baseUrl.replace(/\/api\/v1\/?$/, '');
    const res = await fetch(`${hostOnly}/health`, { method: 'GET' });
    const latencyMs = Date.now() - start;
    if (res.ok) {
      return { ok: true, latencyMs, status: `${res.status} OK`, url: `${hostOnly}/health` };
    }
    return { ok: false, latencyMs, status: `HTTP ${res.status}`, url: `${hostOnly}/health` };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return { ok: false, latencyMs, status: 'Failed', url: baseUrl, error: err.message };
  }
}
