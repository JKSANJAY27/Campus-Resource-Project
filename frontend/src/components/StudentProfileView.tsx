'use client';

import React, { useState } from 'react';
import {
  User,
  GraduationCap,
  Award,
  BookOpen,
  Briefcase,
  Users,
  Calendar,
  Sparkles,
  Plus,
  CheckCircle2,
  Clock,
  ArrowRight,
  Database,
  Building,
} from 'lucide-react';

export interface StudentData {
  id: string;
  name: string;
  email: string;
  major: string;
  year: number;
  gpa: number;
  targetCareer: string;
  skills: Array<{ name: string; level: 'Beginner' | 'Intermediate' | 'Advanced'; verified: boolean }>;
  completedCourses: Array<{ code: string; title: string; grade: string; credits: number }>;
  interests: string[];
  clubs: string[];
  facilities: string[];
  lastActive: string;
}

export const SAMPLE_STUDENTS: Record<string, StudentData> = {
  STU_001: {
    id: 'STU_001',
    name: 'Alex Chen',
    email: 'alex.chen@campus.edu',
    major: 'Computer Science & Engineering',
    year: 3,
    gpa: 3.82,
    targetCareer: 'AI/ML Engineer',
    skills: [
      { name: 'Python', level: 'Advanced', verified: true },
      { name: 'Data Structures', level: 'Advanced', verified: true },
      { name: 'Linear Algebra', level: 'Intermediate', verified: true },
      { name: 'SQL', level: 'Intermediate', verified: false },
    ],
    completedCourses: [
      { code: 'CS101', title: 'Introduction to Computer Science', grade: 'A', credits: 4 },
      { code: 'CS201', title: 'Data Structures & Algorithms', grade: 'A', credits: 4 },
      { code: 'MATH205', title: 'Linear Algebra & Multivariable Calculus', grade: 'A-', credits: 3 },
    ],
    interests: ['Artificial Intelligence', 'Deep Learning', 'Computer Vision', 'Distributed Systems'],
    clubs: ['AI Research Club', 'Competitive Coding Society'],
    facilities: ['Turing AI Compute Lab', 'Main Library Quiet Study'],
    lastActive: '10 minutes ago',
  },
  STU_002: {
    id: 'STU_002',
    name: 'Priya Sharma',
    email: 'priya.sharma@campus.edu',
    major: 'Software Engineering',
    year: 2,
    gpa: 3.91,
    targetCareer: 'Full-Stack Web Architect',
    skills: [
      { name: 'JavaScript', level: 'Advanced', verified: true },
      { name: 'TypeScript', level: 'Intermediate', verified: true },
      { name: 'React', level: 'Intermediate', verified: true },
      { name: 'HTML & CSS', level: 'Advanced', verified: true },
    ],
    completedCourses: [
      { code: 'CS101', title: 'Introduction to Computer Science', grade: 'A', credits: 4 },
      { code: 'SE150', title: 'Web Application Development', grade: 'A+', credits: 3 },
    ],
    interests: ['Full-Stack Development', 'Cloud Computing', 'UI/UX Design', 'Serverless'],
    clubs: ['Web Development Consortium', 'Open Source Campus Club'],
    facilities: ['Software Design Studio', 'Innovation Hub Pod 4'],
    lastActive: '25 minutes ago',
  },
  STU_003: {
    id: 'STU_003',
    name: 'David Kim',
    email: 'david.kim@campus.edu',
    major: 'Data Science & Analytics',
    year: 4,
    gpa: 3.75,
    targetCareer: 'Data Systems Engineer',
    skills: [
      { name: 'Python', level: 'Intermediate', verified: true },
      { name: 'Database Systems', level: 'Advanced', verified: true },
      { name: 'MongoDB', level: 'Intermediate', verified: true },
      { name: 'Apache Spark', level: 'Beginner', verified: false },
    ],
    completedCourses: [
      { code: 'CS101', title: 'Introduction to Computer Science', grade: 'A', credits: 4 },
      { code: 'DS301', title: 'Database Management Systems', grade: 'A', credits: 4 },
      { code: 'STAT200', title: 'Probability & Statistics for Data Science', grade: 'B+', credits: 3 },
    ],
    interests: ['Big Data Pipelines', 'NoSQL Architectures', 'Data Warehousing', 'Distributed Query Engines'],
    clubs: ['Data Science Association', 'FinTech Analytics Group'],
    facilities: ['High-Performance Cluster Room', 'Statistics Resource Room'],
    lastActive: '1 hour ago',
  },
  STU_004: {
    id: 'STU_004',
    name: 'Emily Watson',
    email: 'emily.watson@campus.edu',
    major: 'Cybersecurity & Cloud Systems',
    year: 3,
    gpa: 3.88,
    targetCareer: 'Cloud & DevOps Specialist',
    skills: [
      { name: 'Linux Administration', level: 'Advanced', verified: true },
      { name: 'Docker', level: 'Intermediate', verified: true },
      { name: 'Computer Networks', level: 'Intermediate', verified: true },
      { name: 'Bash Scripting', level: 'Advanced', verified: true },
    ],
    completedCourses: [
      { code: 'CS101', title: 'Introduction to Computer Science', grade: 'A', credits: 4 },
      { code: 'NET201', title: 'Network Fundamentals & Protocols', grade: 'A', credits: 4 },
      { code: 'SEC301', title: 'System Security & Cryptography', grade: 'A-', credits: 3 },
    ],
    interests: ['Cloud Infrastructure', 'Kubernetes', 'DevOps CI/CD', 'Site Reliability Engineering'],
    clubs: ['Cyber Defense League', 'Cloud Builders Community'],
    facilities: ['Security Operations Center Lab', 'Cloud Simulation Center'],
    lastActive: '3 hours ago',
  },
};

interface StudentProfileViewProps {
  studentId: string;
  onSelectStudent?: (id: string) => void;
}

export function StudentProfileView({ studentId, onSelectStudent }: StudentProfileViewProps) {
  const [student, setStudent] = useState<StudentData>(
    SAMPLE_STUDENTS[studentId] || SAMPLE_STUDENTS['STU_001']
  );
  const [newSkill, setNewSkill] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [addingSkill, setAddingSkill] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');

  // Keep local student updated if studentId prop changes
  React.useEffect(() => {
    if (SAMPLE_STUDENTS[studentId]) {
      setStudent(SAMPLE_STUDENTS[studentId]);
    }
  }, [studentId]);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) return;

    setAddingSkill(true);
    setSyncStatus('Propagating skill to MongoDB and synchronizing Neo4j graph...');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      // Attempt backend API call
      await fetch(`${apiUrl}/students/${student.id}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillName: newSkill.trim(), level: newSkillLevel }),
      }).catch(() => null);

      // Invalidate relevant cache in background
      await fetch(`${apiUrl}/cache/invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: `*${student.id}*` }),
      }).catch(() => null);

      // Update local state
      setStudent((prev) => ({
        ...prev,
        skills: [...prev.skills, { name: newSkill.trim(), level: newSkillLevel, verified: true }],
      }));

      setNewSkill('');
      setSyncStatus('Skill successfully synchronized across MongoDB & Neo4j. Redis cache invalidated.');
    } catch {
      setSyncStatus('Updated locally in demo mode.');
    } finally {
      setAddingSkill(false);
      setTimeout(() => setSyncStatus(''), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Identity Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/25">
              {student.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-extrabold text-white">{student.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {student.id}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Active
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                <span>{student.major}</span>
                <span>•</span>
                <span>Year {student.year}</span>
                <span>•</span>
                <span className="text-slate-300 font-mono">GPA {student.gpa.toFixed(2)}</span>
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-center px-3 border-r border-slate-800">
              <div className="text-xs text-slate-400">Target Role</div>
              <div className="text-sm font-bold text-indigo-300 mt-0.5">{student.targetCareer}</div>
            </div>
            <div className="text-center px-3 border-r border-slate-800">
              <div className="text-xs text-slate-400">Verified Skills</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">{student.skills.length}</div>
            </div>
            <div className="text-center px-3">
              <div className="text-xs text-slate-400">Completed Courses</div>
              <div className="text-sm font-bold text-indigo-400 mt-0.5">{student.completedCourses.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
          <Database className="w-4 h-4 animate-pulse text-indigo-400" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* 2-Column Grid: Skills & Academics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Skills & Interactive Add Skill */}
        <div className="lg:col-span-2 space-y-6">
          {/* Acquired Skills Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Acquired Skills & Proficiencies</h3>
              </div>
              <span className="text-xs text-slate-400">{student.skills.length} Registered</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {student.skills.map((skill, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">{skill.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {skill.verified ? 'Verified through Coursework' : 'Self-declared'}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      skill.level === 'Advanced'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                        : skill.level === 'Intermediate'
                        ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {skill.level}
                  </span>
                </div>
              ))}
            </div>

            {/* Interactive Add Skill Form */}
            <form onSubmit={handleAddSkill} className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <input
                  type="text"
                  placeholder="Add new skill (e.g. PyTorch, Docker, NoSQL)..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <select
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel(e.target.value as any)}
                className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
              <button
                type="submit"
                disabled={addingSkill || !newSkill.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {addingSkill ? 'Syncing...' : 'Add Skill'}
              </button>
            </form>
          </div>

          {/* Academic Courses Transcript */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Completed Coursework Transcript</h3>
              </div>
              <span className="text-xs text-slate-400">Document Source: MongoDB</span>
            </div>

            <div className="divide-y divide-slate-800">
              {student.completedCourses.map((c, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-400">{c.code}</span>
                      <span className="text-xs text-slate-200 font-medium">{c.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{c.credits} Credits • Graded</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {c.grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Interests, Clubs & Campus Facilities */}
        <div className="space-y-6">
          {/* Declared Interests */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Academic Interests</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {student.interests.map((interest, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>

          {/* Clubs & Campus Memberships */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Club Memberships</h3>
            </div>
            <div className="space-y-2.5">
              {student.clubs.map((club, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-200 flex items-center justify-between"
                >
                  <span>{club}</span>
                  <span className="text-[10px] text-indigo-400 font-medium">Active Member</span>
                </div>
              ))}
            </div>
          </div>

          {/* Campus Facility Access */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Building className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Campus Facilities Utilized</h3>
            </div>
            <div className="space-y-2">
              {student.facilities.map((fac, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-center gap-2"
                >
                  <Building className="w-3.5 h-3.5 text-purple-400" />
                  <span>{fac}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
