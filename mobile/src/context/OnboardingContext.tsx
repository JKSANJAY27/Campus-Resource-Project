/**
 * OnboardingContext — persists the multi-step onboarding state
 * across the wizard screens without prop-drilling.
 */
import React, { createContext, useContext, useState, ReactNode } from 'react';
import type {
  WorkArrangement,
  RoleLevelPreference,
  StudentSkill,
  StudentCompletedCourse,
  StudentCustomProject,
  StudentCertification,
} from '../types';

export interface OnboardingState {
  // Step 1 — Basic info
  name: string;
  email: string;
  rollNumber: string;
  // Step 2 — Academic details
  degree: string;
  branch: string;
  department: string;
  institution: string;
  graduationYear: number;
  currentSemester: number;
  cgpa: number;
  // Step 3 — Courses
  completedCourses: StudentCompletedCourse[];
  // Step 4 — Skills
  skills: StudentSkill[];
  // Step 5 — Projects
  customProjects: StudentCustomProject[];
  // Step 6 — Certifications
  certifications: StudentCertification[];
  // Step 7 — Career preferences
  interests: string[];
  careerInterests: string[];
  preferredLocations: string[];
  workArrangement: WorkArrangement;
  roleLevelPreference: RoleLevelPreference;
}

const DEFAULT: OnboardingState = {
  name: '',
  email: '',
  rollNumber: '',
  degree: 'B.Tech',
  branch: '',
  department: '',
  institution: '',
  graduationYear: new Date().getFullYear() + 2,
  currentSemester: 1,
  cgpa: 0,
  completedCourses: [],
  skills: [],
  customProjects: [],
  certifications: [],
  interests: [],
  careerInterests: [],
  preferredLocations: [],
  workArrangement: 'any',
  roleLevelPreference: 'internship',
};

interface OnboardingCtx {
  state: OnboardingState;
  update: (partial: Partial<OnboardingState>) => void;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingCtx | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(DEFAULT);

  const update = (partial: Partial<OnboardingState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  const reset = () => setState(DEFAULT);

  return (
    <OnboardingContext.Provider value={{ state, update, reset }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingCtx {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  return ctx;
}
