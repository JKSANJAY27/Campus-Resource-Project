'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Briefcase,
  Target,
  Sparkles,
  BookOpen,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { SAMPLE_STUDENTS } from './StudentProfileView';

interface SkillGapViewProps {
  studentId: string;
}

interface CareerRoleSpec {
  title: string;
  department: string;
  requiredSkills: string[];
  prerequisites: Record<string, string[]>;
  description: string;
}

const CAREER_ROLES: Record<string, CareerRoleSpec> = {
  'AI/ML Engineer': {
    title: 'AI/ML Engineer',
    department: 'Artificial Intelligence & Data',
    requiredSkills: ['Python', 'Linear Algebra', 'Machine Learning', 'Deep Learning', 'PyTorch', 'Data Structures'],
    prerequisites: {
      'Machine Learning': ['Python', 'Linear Algebra'],
      'Deep Learning': ['Machine Learning'],
      'PyTorch': ['Python', 'Deep Learning'],
    },
    description: 'Designs, develops, and deploys deep neural networks, computer vision, and NLP systems.',
  },
  'Full-Stack Web Architect': {
    title: 'Full-Stack Web Architect',
    department: 'Software Engineering',
    requiredSkills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'MongoDB', 'Docker', 'HTML & CSS'],
    prerequisites: {
      'TypeScript': ['JavaScript'],
      'React': ['JavaScript', 'HTML & CSS'],
      'Node.js': ['JavaScript'],
      'MongoDB': ['Database Systems'],
    },
    description: 'Builds end-to-end distributed web applications, reactive user interfaces, and resilient backend microservices.',
  },
  'Data Systems Engineer': {
    title: 'Data Systems Engineer',
    department: 'Big Data & Cloud',
    requiredSkills: ['Python', 'Database Systems', 'MongoDB', 'Apache Cassandra', 'Apache Spark', 'Distributed Systems'],
    prerequisites: {
      'MongoDB': ['Database Systems'],
      'Apache Cassandra': ['Database Systems', 'Distributed Systems'],
      'Apache Spark': ['Python', 'Distributed Systems'],
    },
    description: 'Architects fault-tolerant polyglot databases, distributed stream pipelines, and data warehouse infrastructure.',
  },
  'Cloud & DevOps Specialist': {
    title: 'Cloud & DevOps Specialist',
    department: 'Infrastructure & SRE',
    requiredSkills: ['Linux Administration', 'Docker', 'Kubernetes', 'Computer Networks', 'CI/CD Pipelines', 'Bash Scripting'],
    prerequisites: {
      'Docker': ['Linux Administration'],
      'Kubernetes': ['Docker', 'Computer Networks'],
      'CI/CD Pipelines': ['Bash Scripting', 'Docker'],
    },
    description: 'Automates cloud infrastructure deployment, container orchestration, telemetry observability, and zero-downtime releases.',
  },
};

export function SkillGapView({ studentId }: SkillGapViewProps) {
  const student = SAMPLE_STUDENTS[studentId] || SAMPLE_STUDENTS['STU_001'];
  const [selectedRole, setSelectedRole] = useState<string>(student.targetCareer || 'AI/ML Engineer');

  const roleSpec = CAREER_ROLES[selectedRole] || CAREER_ROLES['AI/ML Engineer'];
  const studentSkillNames = new Set(student.skills.map((s) => s.name.toLowerCase()));

  const matchedSkills = roleSpec.requiredSkills.filter((req) =>
    studentSkillNames.has(req.toLowerCase())
  );
  const missingSkills = roleSpec.requiredSkills.filter(
    (req) => !studentSkillNames.has(req.toLowerCase())
  );

  const matchPercentage = Math.round((matchedSkills.length / roleSpec.requiredSkills.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Target className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-indigo-300">Phase 5 Graph Intelligence</span>
            </div>
            <h2 className="text-xl font-bold text-white">Skill Gap & Role Readiness Analysis</h2>
            <p className="text-xs text-slate-400 mt-1">
              Evaluates student <strong className="text-slate-200">{student.name}</strong> against campus career profiles using Neo4j graph traversals.
            </p>
          </div>

          {/* Role Selector Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
            {Object.keys(CAREER_ROLES).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedRole === role
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress & Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Match Percentage Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Overall Role Match</span>
            <span className="text-[11px] font-mono text-indigo-400">{matchedSkills.length}/{roleSpec.requiredSkills.length} Skills</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-extrabold ${matchPercentage >= 70 ? 'text-emerald-400' : matchPercentage >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
              {matchPercentage}%
            </span>
            <span className="text-xs text-slate-400 font-medium">Readiness Index</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                matchPercentage >= 70 ? 'bg-emerald-500' : matchPercentage >= 40 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${matchPercentage}%` }}
            />
          </div>
        </div>

        {/* Matched Skills Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Verified Acquired Skills</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">{matchedSkills.length}</div>
          <p className="text-[11px] text-slate-400 mt-2">
            Prerequisites satisfied in current graph profile.
          </p>
        </div>

        {/* Missing Skills Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Skill Gaps to Bridge</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">{missingSkills.length}</div>
          <p className="text-[11px] text-slate-400 mt-2">
            Identified through DAG difference query in Neo4j.
          </p>
        </div>
      </div>

      {/* Main Breakdown: Matched vs Missing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Matched Skills List */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Skills You Already Have ({matchedSkills.length})</h3>
          </div>

          <div className="space-y-3">
            {matchedSkills.map((skill, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-200">{skill}</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Satisfied
                </span>
              </div>
            ))}
            {matchedSkills.length === 0 && (
              <div className="text-xs text-slate-500 py-6 text-center">
                No overlapping skills acquired yet for this role.
              </div>
            )}
          </div>
        </div>

        {/* Missing Skills List & Prerequisites */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Missing Required Skills & Dependencies ({missingSkills.length})</h3>
          </div>

          <div className="space-y-3">
            {missingSkills.map((skill, index) => {
              const prereqs = roleSpec.prerequisites[skill] || [];
              const unmetPrereqs = prereqs.filter((p) => !studentSkillNames.has(p.toLowerCase()));

              return (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-200">{skill}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      Priority Gap #{index + 1}
                    </span>
                  </div>

                  {prereqs.length > 0 && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-500">Prerequisites:</span>
                      {prereqs.map((p, pIdx) => {
                        const satisfied = studentSkillNames.has(p.toLowerCase());
                        return (
                          <span
                            key={pIdx}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                              satisfied
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {p} {satisfied ? '✓' : '✗'}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Graph Cypher Query Callout */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
        <Layers className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-white mb-1">Neo4j Cypher Evaluation Trace</div>
          <code className="block bg-slate-900 p-2.5 rounded-lg text-indigo-300 font-mono text-[11px] border border-slate-800 overflow-x-auto">
            MATCH (j:Job &#123;title: &apos;{selectedRole}&apos;&#125;)-[:JOB_REQUIRES_SKILL]-&gt;(req:Skill)
            OPTIONAL MATCH (s:Student &#123;studentId: &apos;{student.id}&apos;&#125;)-[:STUDENT_HAS_SKILL]-&gt;(req)
            WHERE s IS NULL
            RETURN req.name AS missingSkill, [(req)&lt;-[:SKILL_PREREQUISITE_OF]-(pre) | pre.name] AS prerequisites
          </code>
        </div>
      </div>
    </div>
  );
}
