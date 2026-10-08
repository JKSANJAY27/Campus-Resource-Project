'use client';

import React, { useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Award,
  TrendingUp,
  Target,
  Sparkles,
  FileCheck,
  ChevronRight,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { SAMPLE_STUDENTS } from './StudentProfileView';

interface JobReadinessViewProps {
  studentId: string;
}

interface JobRoleEvaluation {
  id: string;
  companyOrOrg: string;
  title: string;
  location: string;
  matchScore: number;
  readinessLevel: 'High' | 'Moderate' | 'Developing';
  requiredSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  interviewChecklist: Array<{ item: string; ready: boolean }>;
  explanation: string;
}

export function JobReadinessView({ studentId }: JobReadinessViewProps) {
  const student = SAMPLE_STUDENTS[studentId] || SAMPLE_STUDENTS['STU_001'];
  const [selectedJobIndex, setSelectedJobIndex] = useState(0);

  const candidateJobs: JobRoleEvaluation[] = [
    {
      id: 'JOB_01',
      companyOrOrg: 'DeepMind Research Campus Lab',
      title: 'Junior Machine Learning Research Engineer',
      location: 'Tech Innovation Quad, Building A',
      matchScore: 78,
      readinessLevel: 'Moderate',
      requiredSkills: ['Python', 'Linear Algebra', 'Machine Learning', 'Deep Learning', 'PyTorch'],
      matchedSkills: ['Python', 'Linear Algebra', 'Data Structures'],
      missingSkills: ['Machine Learning', 'Deep Learning', 'PyTorch'],
      interviewChecklist: [
        { item: 'Core Python data modeling & algorithmic efficiency', ready: true },
        { item: 'Matrix decomposition, eigenvalues & vector spaces', ready: true },
        { item: 'Gradient descent optimization & backpropagation derivations', ready: false },
        { item: 'PyTorch custom dataset loaders & training loop implementation', ready: false },
        { item: 'Convolutional neural network architecture design', ready: false },
      ],
      explanation:
        'Your strong foundation in Python and Linear Algebra places you in the top 25th percentile for theoretical readiness. Completing course CS420 and project PRJ_01 will bring your readiness score to 96%.',
    },
    {
      id: 'JOB_02',
      companyOrOrg: 'Campus Systems & Cloud Operations',
      title: 'Full-Stack Software Development Engineer',
      location: 'Engineering Hub, Floor 3',
      matchScore: 65,
      readinessLevel: 'Moderate',
      requiredSkills: ['JavaScript', 'TypeScript', 'Node.js', 'MongoDB', 'Docker'],
      matchedSkills: ['Data Structures', 'SQL', 'Python'],
      missingSkills: ['JavaScript', 'TypeScript', 'Node.js', 'Docker'],
      interviewChecklist: [
        { item: 'Asynchronous event loop mechanics in Node.js', ready: false },
        { item: 'RESTful API contract design & rate limiting', ready: false },
        { item: 'Relational vs Document schema normalization trade-offs', ready: true },
        { item: 'Containerization using Docker multi-stage builds', ready: false },
      ],
      explanation:
        'Moderate fit. Your data structures background enables rapid grasping of backend fundamentals, but you lack verified coursework in TypeScript and container orchestration.',
    },
    {
      id: 'JOB_03',
      companyOrOrg: 'FinTech Analytics & High-Throughput Labs',
      title: 'Distributed Data Systems Engineer',
      location: 'Commerce & Data Quad',
      matchScore: 82,
      readinessLevel: 'High',
      requiredSkills: ['Python', 'SQL', 'Data Structures', 'MongoDB', 'Apache Cassandra'],
      matchedSkills: ['Python', 'SQL', 'Data Structures'],
      missingSkills: ['Apache Cassandra', 'LSM-Trees'],
      interviewChecklist: [
        { item: 'B-Tree vs Log-Structured Merge-Tree storage engines', ready: true },
        { item: 'Partition key and clustering key schema optimization', ready: false },
        { item: 'ACID transactional boundaries vs BASE eventual consistency', ready: true },
        { item: 'High-throughput append benchmarking and latency profiling', ready: true },
      ],
      explanation:
        'High readiness fit. Your database coursework and solid Python foundation align well with campus data streaming roles. Familiarizing yourself with Cassandra partition keys will finalize interview qualification.',
    },
  ];

  const currentJob = candidateJobs[selectedJobIndex] || candidateJobs[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Briefcase className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-indigo-300">Phase 5 Career Graph Matching</span>
            </div>
            <h2 className="text-xl font-bold text-white">Job Readiness & Placement Assessment</h2>
            <p className="text-xs text-slate-400 mt-1">
              Comprehensive role qualification, skill checklist, and interview readiness for <strong className="text-slate-200">{student.name}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Role Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {candidateJobs.map((job, idx) => (
          <button
            key={job.id}
            onClick={() => setSelectedJobIndex(idx)}
            className={`text-left p-4 rounded-xl border transition flex flex-col justify-between ${
              selectedJobIndex === idx
                ? 'bg-indigo-600/10 border-indigo-500 shadow-md shadow-indigo-500/10'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{job.companyOrOrg}</span>
              <div className="text-sm font-bold text-white leading-tight">{job.title}</div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80 w-full">
              <span
                className={`text-xs font-bold ${
                  job.matchScore >= 80 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {job.matchScore}% Match
              </span>
              <span className="text-[10px] text-slate-400 font-medium">{job.readinessLevel} Readiness</span>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Job Detailed Evaluation */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
        {/* Job Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
          <div>
            <span className="text-xs text-indigo-400 font-semibold">{currentJob.companyOrOrg}</span>
            <h3 className="text-xl font-bold text-white mt-0.5">{currentJob.title}</h3>
            <p className="text-xs text-slate-400 mt-1">{currentJob.location}</p>
          </div>

          <div className="flex items-baseline gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-3xl font-extrabold text-indigo-400">{currentJob.matchScore}%</span>
            <span className="text-xs text-slate-400">Match Index</span>
          </div>
        </div>

        {/* Why Recommended Explanation Callout */}
        <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs">
          <div className="font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Graph Alignment Explanation
          </div>
          <p className="text-slate-300 leading-relaxed">{currentJob.explanation}</p>
        </div>

        {/* Grid: Matched vs Missing Skills */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Matched */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <h4 className="text-xs font-bold text-emerald-300 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Verified Core Competencies ({currentJob.matchedSkills.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {currentJob.matchedSkills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold"
                >
                  {s} ✓
                </span>
              ))}
            </div>
          </div>

          {/* Missing */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <h4 className="text-xs font-bold text-amber-300 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Skills to Acquire Prior to Interview ({currentJob.missingSkills.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {currentJob.missingSkills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold"
                >
                  {s} ✗
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Technical Interview Readiness Checklist */}
        <div className="pt-2">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-indigo-400" />
            Technical Interview Preparation Checklist
          </h4>
          <div className="space-y-2">
            {currentJob.interviewChecklist.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  {item.ready ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                  )}
                  <span className={item.ready ? 'text-slate-200' : 'text-slate-400'}>{item.item}</span>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    item.ready
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.ready ? 'Ready' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
