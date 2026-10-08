'use client';

import React, { useState, useEffect } from 'react';
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  FolderGit2,
  Briefcase,
  ChevronRight,
  TrendingUp,
  Award,
  Sparkles,
  ArrowRight,
  Info,
  Clock,
  ExternalLink,
  Target,
  GraduationCap,
} from 'lucide-react';

interface LearningPathStep {
  step: number;
  skillId: string;
  skillName: string;
  category: string;
  tier: string;
  reason: string;
  prerequisites: string[];
  suggestedCourses: Array<{
    id: string;
    code: string;
    title: string;
    difficulty: string;
  }>;
  suggestedResources: Array<{
    id: string;
    title: string;
    type: string;
    difficulty: string;
  }>;
}

interface LearningPathData {
  studentId: string;
  targetRole: string;
  currentSkills: Array<{ id: string; name: string }>;
  targetSkills: Array<{ id: string; name: string }>;
  alreadyAcquiredSkills: Array<{ id: string; name: string }>;
  missingSkills: Array<{ id: string; name: string }>;
  orderedLearningPath: LearningPathStep[];
  estimatedSteps: number;
  explanation: string;
}

interface CourseRec {
  courseId: string;
  code: string;
  title: string;
  department: string;
  credits: number;
  difficulty: string;
  score: number;
  taughtSkills: Array<{ id: string; name: string }>;
  newSkillsForStudent: Array<{ id: string; name: string }>;
  prerequisitesMet: boolean;
  explanation: string;
}

interface ProjectRec {
  projectId: string;
  title: string;
  domain: string;
  difficulty: string;
  score: number;
  requiredSkills: Array<{ id: string; name: string }>;
  matchedSkills: Array<{ id: string; name: string }>;
  skillsToAcquire: Array<{ id: string; name: string }>;
  explanation: string;
}

interface JobRec {
  jobId: string;
  title: string;
  company: string;
  type: string;
  preferredDomain: string;
  score: number;
  readinessPercentage: number;
  matchedSkills: Array<{ id: string; name: string }>;
  missingSkills: Array<{ id: string; name: string }>;
  explanation: string;
}

const PRESET_STUDENTS = [
  { id: 'stu_001', name: 'Aarav Sharma (Year 3 - AI Aspirant)', role: 'ai-ml-engineer' },
  { id: 'stu_002', name: 'Diya Patel (Year 2 - Web Enthusiast)', role: 'full-stack-developer' },
  { id: 'stu_003', name: 'Rohan Verma (Year 4 - Cloud & DevOps)', role: 'cloud-devops-engineer' },
  { id: 'stu_004', name: 'Ananya Iyer (Year 3 - Data Science)', role: 'data-scientist' },
];

const PRESET_ROLES = [
  { id: 'ai-ml-engineer', label: 'AI/ML Engineer' },
  { id: 'full-stack-developer', label: 'Full-Stack Developer' },
  { id: 'backend-engineer', label: 'Backend Engineer' },
  { id: 'data-scientist', label: 'Data Scientist' },
  { id: 'cloud-devops-engineer', label: 'Cloud & DevOps Engineer' },
  { id: 'cybersecurity-analyst', label: 'Cybersecurity Analyst' },
];

export function RecommendationDashboard() {
  const [selectedStudent, setSelectedStudent] = useState<string>('stu_001');
  const [targetRole, setTargetRole] = useState<string>('ai-ml-engineer');
  const [activeTab, setActiveTab] = useState<'path' | 'courses' | 'projects' | 'jobs'>('path');

  const [loading, setLoading] = useState<boolean>(false);
  const [learningPath, setLearningPath] = useState<LearningPathData | null>(null);
  const [courses, setCourses] = useState<CourseRec[]>([]);
  const [projects, setProjects] = useState<ProjectRec[]>([]);
  const [jobs, setJobs] = useState<JobRec[]>([]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

  useEffect(() => {
    fetchRecommendations();
  }, [selectedStudent, targetRole]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      // 1. Fetch Learning Path
      const pathRes = await fetch(`${apiUrl}/recommendations/students/${selectedStudent}/learning-path?targetRole=${targetRole}`);
      if (pathRes.ok) {
        const pathJson = await pathRes.json();
        setLearningPath(pathJson.data);
      } else {
        // Fallback demo state
        setLearningPath(getDemoLearningPath(targetRole));
      }

      // 2. Fetch Courses
      const crsRes = await fetch(`${apiUrl}/recommendations/students/${selectedStudent}/courses?limit=6`);
      if (crsRes.ok) {
        const crsJson = await crsRes.json();
        setCourses(crsJson.data);
      } else {
        setCourses(getDemoCourses());
      }

      // 3. Fetch Projects
      const prjRes = await fetch(`${apiUrl}/recommendations/students/${selectedStudent}/projects?limit=6`);
      if (prjRes.ok) {
        const prjJson = await prjRes.json();
        setProjects(prjJson.data);
      } else {
        setProjects(getDemoProjects());
      }

      // 4. Fetch Jobs
      const jobRes = await fetch(`${apiUrl}/recommendations/students/${selectedStudent}/jobs?limit=6`);
      if (jobRes.ok) {
        const jobJson = await jobRes.json();
        setJobs(jobJson.data);
      } else {
        setJobs(getDemoJobs());
      }
    } catch {
      // Offline fallback mock data
      setLearningPath(getDemoLearningPath(targetRole));
      setCourses(getDemoCourses());
      setProjects(getDemoProjects());
      setJobs(getDemoJobs());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 mt-8">
      {/* Controls Header */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Phase 5 Deterministic Graph Engine
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">Explainable Recommendation & Learning Path Graph</h2>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic multi-criteria scoring over Neo4j prerequisite topologies with transparent explanations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-medium">Select Student Profile</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
              >
                {PRESET_STUDENTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-medium">Career Goal / Role</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
              >
                {PRESET_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('path')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'path'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Compass className="w-4 h-4" />
            Learning Path Roadmap
            {learningPath && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-800 text-[10px]">
                {learningPath.orderedLearningPath.length} steps
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'courses'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Course Recommendations
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'projects'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FolderGit2 className="w-4 h-4" />
            Project Recommendations
          </button>

          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'jobs'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Job Opportunities & Readiness
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Traversing dependency graph & calculating transparent scores...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: LEARNING PATH ROADMAP */}
          {activeTab === 'path' && learningPath && (
            <div className="space-y-6">
              {/* Summary Banner */}
              <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-300">Target Goal: {learningPath.targetRole}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{learningPath.explanation}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-xs text-slate-400">Acquired</span>
                    <p className="text-base font-bold text-emerald-400">{learningPath.alreadyAcquiredSkills.length}</p>
                  </div>
                  <div className="text-center px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-xs text-slate-400">Remaining</span>
                    <p className="text-base font-bold text-indigo-400">{learningPath.missingSkills.length}</p>
                  </div>
                </div>
              </div>

              {/* Already Acquired Skills Chips */}
              {learningPath.alreadyAcquiredSkills.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 block mb-2">
                    Verified Acquired Skills in Graph:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {learningPath.alreadyAcquiredSkills.map((sk) => (
                      <span
                        key={sk.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {sk.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Step by Step Topological Roadmap */}
              <div className="relative border-l-2 border-indigo-900/60 ml-4 pl-6 space-y-6">
                {learningPath.orderedLearningPath.map((step) => (
                  <div key={step.step} className="relative group">
                    {/* Step marker */}
                    <div className="absolute -left-[35px] top-1.5 w-7 h-7 rounded-full bg-slate-900 border-2 border-indigo-500 flex items-center justify-center text-xs font-bold text-indigo-400 shadow-md">
                      {step.step}
                    </div>

                    {/* Step Card */}
                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-white">{step.skillName}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300">
                            {step.tier}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {step.category}
                          </span>
                        </div>
                      </div>

                      {/* Explainability Callout */}
                      <div className="my-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2">
                        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{step.reason}</span>
                      </div>

                      {/* Suggested Courses & Resources */}
                      {(step.suggestedCourses.length > 0 || step.suggestedResources.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800/60">
                          {step.suggestedCourses.length > 0 && (
                            <div>
                              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mb-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                                Recommended Campus Course:
                              </span>
                              {step.suggestedCourses.map((c) => (
                                <div
                                  key={c.id}
                                  className="text-xs p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-200 flex justify-between"
                                >
                                  <span className="font-medium truncate">{c.title}</span>
                                  <span className="text-[10px] font-mono text-indigo-400 ml-2">{c.code}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {step.suggestedResources.length > 0 && (
                            <div>
                              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mb-1.5">
                                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                                Interactive Resource:
                              </span>
                              {step.suggestedResources.map((r) => (
                                <div
                                  key={r.id}
                                  className="text-xs p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-200 flex justify-between"
                                >
                                  <span className="font-medium truncate">{r.title}</span>
                                  <span className="text-[10px] text-slate-400 ml-2">{r.type}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: COURSE RECOMMENDATIONS */}
          {activeTab === 'courses' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((c) => (
                <div
                  key={c.courseId}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {c.code}
                      </span>
                      <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <TrendingUp className="w-3 h-3" />
                        <span>Score: {c.score}</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-white">{c.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{c.department} • {c.credits} Credits</p>

                    <div className="my-3 space-y-1.5">
                      <span className="text-[11px] text-slate-400 block font-medium">Teaches Skills:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {c.taughtSkills.map((sk) => (
                          <span
                            key={sk.id}
                            className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700/60"
                          >
                            {sk.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80">
                    <p className="text-[11px] text-slate-300 leading-snug italic">"{c.explanation}"</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: PROJECT RECOMMENDATIONS */}
          {activeTab === 'projects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((p) => (
                <div
                  key={p.projectId}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {p.domain}
                      </span>
                      <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Award className="w-3 h-3" />
                        <span>Score: {p.score}</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-white">{p.title}</h3>
                    <span className="inline-block mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Difficulty: {p.difficulty}
                    </span>

                    <div className="my-3 space-y-2">
                      <div>
                        <span className="text-[11px] text-emerald-400 font-medium block mb-1">
                          Matched Student Skills ({p.matchedSkills.length}):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {p.matchedSkills.map((sk) => (
                            <span
                              key={sk.id}
                              className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                            >
                              {sk.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {p.skillsToAcquire.length > 0 && (
                        <div>
                          <span className="text-[11px] text-indigo-400 font-medium block mb-1">
                            Skills to Acquire for Growth ({p.skillsToAcquire.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {p.skillsToAcquire.map((sk) => (
                              <span
                                key={sk.id}
                                className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                              >
                                {sk.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80">
                    <p className="text-[11px] text-slate-300 leading-snug italic">"{p.explanation}"</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: JOB READINESS & OPPORTUNITIES */}
          {activeTab === 'jobs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((j) => (
                <div
                  key={j.jobId}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-300">{j.company}</span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                          j.readinessPercentage >= 75
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : j.readinessPercentage >= 40
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {j.readinessPercentage}% Ready
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-white">{j.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{j.preferredDomain} • {j.type}</p>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full my-3 overflow-hidden">
                      <div
                        className={`h-full ${
                          j.readinessPercentage >= 75
                            ? 'bg-emerald-500'
                            : j.readinessPercentage >= 40
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${j.readinessPercentage}%` }}
                      />
                    </div>

                    <div className="my-2 space-y-1.5">
                      <div className="text-[11px] text-slate-400">
                        <span className="text-emerald-400 font-semibold">{j.matchedSkills.length} Matched</span>
                        {' • '}
                        <span className="text-rose-400 font-semibold">{j.missingSkills.length} Missing</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80">
                    <p className="text-[11px] text-slate-300 leading-snug italic">"{j.explanation}"</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Fallback Mock Generators for Offline/Preview Demonstration
function getDemoLearningPath(role: string): LearningPathData {
  return {
    studentId: 'stu_001',
    targetRole: role === 'ai-ml-engineer' ? 'AI/ML Engineer' : 'Full-Stack Developer',
    currentSkills: [
      { id: 'sk_python', name: 'Python' },
      { id: 'sk_javascript', name: 'JavaScript / TypeScript' },
    ],
    targetSkills: [
      { id: 'sk_python', name: 'Python' },
      { id: 'sk_math_stats', name: 'Linear Algebra & Statistics' },
      { id: 'sk_data_analysis', name: 'Data Analysis' },
      { id: 'sk_ml', name: 'Classical Machine Learning' },
      { id: 'sk_deep_learning', name: 'Deep Learning' },
      { id: 'sk_genai', name: 'Generative AI' },
    ],
    alreadyAcquiredSkills: [
      { id: 'sk_python', name: 'Python' },
    ],
    missingSkills: [
      { id: 'sk_math_stats', name: 'Linear Algebra & Statistics' },
      { id: 'sk_data_analysis', name: 'Data Analysis' },
      { id: 'sk_ml', name: 'Classical Machine Learning' },
      { id: 'sk_deep_learning', name: 'Deep Learning' },
    ],
    orderedLearningPath: [
      {
        step: 1,
        skillId: 'sk_math_stats',
        skillName: 'Linear Algebra & Statistics',
        category: 'Data Science & AI',
        tier: 'foundational',
        reason: 'Essential mathematical prerequisite with zero pending dependencies.',
        prerequisites: [],
        suggestedCourses: [
          { id: 'crs_math', code: 'MATH201', title: 'Calculus & Linear Algebra for Computing', difficulty: 'introductory' },
        ],
        suggestedResources: [
          { id: 'res_01', title: 'Essence of Linear Algebra (3Blue1Brown)', type: 'Video Series', difficulty: 'beginner' },
        ],
      },
      {
        step: 2,
        skillId: 'sk_data_analysis',
        skillName: 'Data Analysis (Pandas & NumPy)',
        category: 'Data Science & AI',
        tier: 'intermediate',
        reason: 'Directly builds on Python and foundational matrix mathematics.',
        prerequisites: ['sk_python', 'sk_math_stats'],
        suggestedCourses: [
          { id: 'crs_data', code: 'CS305', title: 'Exploratory Data Wrangling & Analytics', difficulty: 'intermediate' },
        ],
        suggestedResources: [
          { id: 'res_02', title: 'Interactive NumPy Matrix Operations Lab', type: 'Interactive Lab', difficulty: 'intermediate' },
        ],
      },
      {
        step: 3,
        skillId: 'sk_ml',
        skillName: 'Classical Machine Learning',
        category: 'Data Science & AI',
        tier: 'intermediate',
        reason: 'Core machine learning algorithms requiring completed data analysis preparation.',
        prerequisites: ['sk_data_analysis', 'sk_math_stats'],
        suggestedCourses: [
          { id: 'crs_ml', code: 'CS410', title: 'Pattern Recognition & Supervised Learning', difficulty: 'intermediate' },
        ],
        suggestedResources: [
          { id: 'res_03', title: 'Scikit-Learn Machine Learning Cookbook', type: 'Textbook', difficulty: 'intermediate' },
        ],
      },
      {
        step: 4,
        skillId: 'sk_deep_learning',
        skillName: 'Deep Learning & Neural Networks',
        category: 'Data Science & AI',
        tier: 'advanced',
        reason: 'Advanced neural architectures building directly upon classical ML foundations.',
        prerequisites: ['sk_ml'],
        suggestedCourses: [
          { id: 'crs_dl', code: 'CS502', title: 'Deep Neural Architectures & PyTorch', difficulty: 'advanced' },
        ],
        suggestedResources: [
          { id: 'res_04', title: 'Deep Learning Specialization Series', type: 'Video Series', difficulty: 'advanced' },
        ],
      },
    ],
    estimatedSteps: 4,
    explanation:
      'Personalized graph learning path for AI/ML Engineer. You already possess Python. Sequence of 4 steps ordered by dependency graph prerequisites so foundational mathematical requirements are satisfied before training neural models.',
  };
}

function getDemoCourses(): CourseRec[] {
  return [
    {
      courseId: 'crs_01',
      code: 'CS410',
      title: 'Pattern Recognition & Machine Learning',
      department: 'Computer Science & Engineering',
      credits: 4,
      difficulty: 'intermediate',
      score: 0.92,
      taughtSkills: [
        { id: 'sk_ml', name: 'Machine Learning' },
        { id: 'sk_data_analysis', name: 'Data Analysis' },
      ],
      newSkillsForStudent: [
        { id: 'sk_ml', name: 'Machine Learning' },
        { id: 'sk_data_analysis', name: 'Data Analysis' },
      ],
      prerequisitesMet: true,
      explanation: 'Recommended because: teaches 2 new core skills; all prerequisite courses completed; matches your AI interest domain.',
    },
    {
      courseId: 'crs_02',
      code: 'MATH201',
      title: 'Linear Algebra & Computational Statistics',
      department: 'Mathematics & Data Science',
      credits: 3,
      difficulty: 'introductory',
      score: 0.86,
      taughtSkills: [{ id: 'sk_math_stats', name: 'Linear Algebra & Statistics' }],
      newSkillsForStudent: [{ id: 'sk_math_stats', name: 'Linear Algebra & Statistics' }],
      prerequisitesMet: true,
      explanation: 'Recommended because: satisfies key foundational prerequisite for downstream Machine Learning models.',
    },
    {
      courseId: 'crs_03',
      code: 'CS315',
      title: 'Distributed Cloud Persistence & DevOps',
      department: 'Computer Science & Engineering',
      credits: 4,
      difficulty: 'intermediate',
      score: 0.74,
      taughtSkills: [{ id: 'sk_docker', name: 'Docker' }, { id: 'sk_nosql', name: 'NoSQL Multi-Model Persistence' }],
      newSkillsForStudent: [{ id: 'sk_docker', name: 'Docker' }],
      prerequisitesMet: true,
      explanation: 'Recommended because: teaches containerization and distributed data engineering.',
    },
  ];
}

function getDemoProjects(): ProjectRec[] {
  return [
    {
      projectId: 'proj_01',
      title: 'Autonomous Vision Robot Navigation System',
      domain: 'Artificial Intelligence',
      difficulty: 'intermediate',
      score: 0.88,
      requiredSkills: [
        { id: 'sk_python', name: 'Python' },
        { id: 'sk_ml', name: 'Machine Learning' },
        { id: 'sk_computer_vision', name: 'Computer Vision' },
      ],
      matchedSkills: [{ id: 'sk_python', name: 'Python' }],
      skillsToAcquire: [
        { id: 'sk_ml', name: 'Machine Learning' },
        { id: 'sk_computer_vision', name: 'Computer Vision' },
      ],
      explanation: 'Recommended project because: you already possess Python; introduces practical ML vision growth; aligns with AI interest.',
    },
    {
      projectId: 'proj_02',
      title: 'Multi-Tenant Microservices API Gateway',
      domain: 'Full-Stack Web Development',
      difficulty: 'advanced',
      score: 0.79,
      requiredSkills: [
        { id: 'sk_javascript', name: 'JavaScript / TypeScript' },
        { id: 'sk_docker', name: 'Docker' },
        { id: 'sk_nosql', name: 'NoSQL' },
      ],
      matchedSkills: [{ id: 'sk_javascript', name: 'JavaScript / TypeScript' }],
      skillsToAcquire: [{ id: 'sk_docker', name: 'Docker' }, { id: 'sk_nosql', name: 'NoSQL' }],
      explanation: 'Recommended project because: leverages existing TypeScript background while developing cloud infrastructure competencies.',
    },
  ];
}

function getDemoJobs(): JobRec[] {
  return [
    {
      jobId: 'job_01',
      title: 'Machine Learning Engineer Intern',
      company: 'NeuralFlow Technologies',
      type: 'internship',
      preferredDomain: 'Artificial Intelligence',
      score: 0.85,
      readinessPercentage: 60,
      matchedSkills: [{ id: 'sk_python', name: 'Python' }],
      missingSkills: [
        { id: 'sk_ml', name: 'Machine Learning' },
        { id: 'sk_deep_learning', name: 'Deep Learning' },
      ],
      explanation: 'Recommended because: 60% baseline qualification; matches career objective; missing skills bridgeable in 2 learning steps.',
    },
    {
      jobId: 'job_02',
      title: 'Junior Backend & Cloud Developer',
      company: 'DataSphere Cloud Inc.',
      type: 'full_time',
      preferredDomain: 'Distributed Systems',
      score: 0.81,
      readinessPercentage: 75,
      matchedSkills: [
        { id: 'sk_python', name: 'Python' },
        { id: 'sk_javascript', name: 'JavaScript' },
      ],
      missingSkills: [{ id: 'sk_docker', name: 'Docker' }],
      explanation: 'Recommended because: 75% ready to apply; strong language foundation; requires only containerization upskilling.',
    },
  ];
}
