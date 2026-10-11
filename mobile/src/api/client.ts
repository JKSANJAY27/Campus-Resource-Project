/**
 * API client for the Campus Resource backend.
 * Uses AsyncStorage to persist the studentId across sessions.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change to your machine's IP when testing on a physical device
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

const STUDENT_ID_KEY = '@campus_career:studentId';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
    ...options,
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(json?.error ?? json?.message ?? `Request failed: ${res.status}`);
  }

  return json as T;
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

// ── Student endpoints ─────────────────────────────────────────────────────────

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

export function getStudentSummary(studentId: string) {
  return get<any>(`/students/${studentId}/summary`);
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

// ── Course catalogue ──────────────────────────────────────────────────────────

export function getCourses(params?: { search?: string; department?: string; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.department) q.set('department', params.department);
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return get<{ courses: any[]; total: number }>(`/courses${qs ? `?${qs}` : ''}`);
}

// ── Skill catalogue ───────────────────────────────────────────────────────────

export function getSkills(params?: { search?: string; category?: string; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.category) q.set('category', params.category);
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return get<{ skills: any[]; total: number }>(`/skills${qs ? `?${qs}` : ''}`);
}
