'use client';

import React from 'react';
import {
  Compass,
  Database,
  Layers,
  Zap,
  Activity,
  Award,
  BookOpen,
  FolderGit2,
  Briefcase,
  ArrowRight,
  TrendingUp,
  Cpu,
  GraduationCap,
  Users,
  Building,
  ShieldCheck,
  CheckCircle2,
  Beaker,
} from 'lucide-react';
import { SAMPLE_STUDENTS } from './StudentProfileView';

interface HomeDashboardViewProps {
  studentId: string;
  onNavigate: (view: string) => void;
}

export function HomeDashboardView({ studentId, onNavigate }: HomeDashboardViewProps) {
  const student = SAMPLE_STUDENTS[studentId] || SAMPLE_STUDENTS['STU_001'];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Multi-Model NoSQL Capstone Platform
              </span>
              <span className="text-xs text-slate-400">Computer Science & Data Engineering</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">
              Campus Resource Dependency & Recommendation Graph
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Active Session: <strong className="text-white">{student.name}</strong> ({student.id}) • Major: {student.major} • Target: <strong className="text-indigo-400">{student.targetCareer}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('learning-path')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition"
            >
              <Compass className="w-4 h-4" />
              <span>Personalized Learning Path</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Database Architecture KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MongoDB Card */}
        <div
          onClick={() => onNavigate('profile')}
          className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 p-4 rounded-xl cursor-pointer transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-emerald-400">MongoDB</span>
            <span className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">Document Store</div>
            <div className="text-xs text-slate-400 mt-1">Source of Truth for Profiles, Catalogs & Clubs</div>
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold mt-3 flex items-center gap-1 group-hover:translate-x-1 transition">
            <span>Explore Student Profiles</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Neo4j Card */}
        <div
          onClick={() => onNavigate('graph-explorer')}
          className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 p-4 rounded-xl cursor-pointer transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-blue-400">Neo4j</span>
            <span className="p-1.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">Property Graph</div>
            <div className="text-xs text-slate-400 mt-1">Prerequisite DAGs, Cycles & Index-Free Hopping</div>
          </div>
          <div className="text-[11px] text-blue-400 font-semibold mt-3 flex items-center gap-1 group-hover:translate-x-1 transition">
            <span>Launch Graph Explorer</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Redis Card */}
        <div
          onClick={() => onNavigate('metrics')}
          className="bg-slate-900/80 border border-slate-800 hover:border-rose-500/40 p-4 rounded-xl cursor-pointer transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-rose-400">Redis</span>
            <span className="p-1.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Zap className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">18.6x Speedup</div>
            <div className="text-xs text-slate-400 mt-1">In-Memory Cache-Aside & Dynamic Rate Limiting</div>
          </div>
          <div className="text-[11px] text-rose-400 font-semibold mt-3 flex items-center gap-1 group-hover:translate-x-1 transition">
            <span>View Cache Metrics</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Cassandra Card */}
        <div
          onClick={() => onNavigate('analytics')}
          className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 p-4 rounded-xl cursor-pointer transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-amber-400">Apache Cassandra</span>
            <span className="p-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Activity className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">Wide-Column</div>
            <div className="text-xs text-slate-400 mt-1">Append-Heavy Activity Streams & Audit Logging</div>
          </div>
          <div className="text-[11px] text-amber-400 font-semibold mt-3 flex items-center gap-1 group-hover:translate-x-1 transition">
            <span>View Activity Telemetry</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Middle Section: Quick Nav Modules Grid */}
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
          Campus Intelligence Navigation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Skill Gap Analysis */}
          <div
            onClick={() => onNavigate('skill-gap')}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition space-y-3"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <TrendingUp className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-white">Skill Gap Analysis</h4>
                <p className="text-[11px] text-slate-400">Compares skills against candidate career roles</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Find missing competencies and prerequisite chains in your graph profile before interviews.
            </p>
          </div>

          {/* Course Recommendations */}
          <div
            onClick={() => onNavigate('courses')}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition space-y-3"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <BookOpen className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-white">Course Recommendations</h4>
                <p className="text-[11px] text-slate-400">Ranked academic courses with explanations</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Discovers coursework matching your career targets with prerequisite verification.
            </p>
          </div>

          {/* Project Recommendations */}
          <div
            onClick={() => onNavigate('projects')}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition space-y-3"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <FolderGit2 className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-white">Project Recommendations</h4>
                <p className="text-[11px] text-slate-400">Hands-on applied portfolio builders</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Reinforces missing skills with experiential projects designed for industry recruiters.
            </p>
          </div>

          {/* Job Readiness */}
          <div
            onClick={() => onNavigate('job-readiness')}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition space-y-3"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Briefcase className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-white">Job Readiness Assessment</h4>
                <p className="text-[11px] text-slate-400">Interview checklists & role readiness index</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Assesses qualification for campus research labs and technical placement openings.
            </p>
          </div>

          {/* Resource Catalog */}
          <div
            onClick={() => onNavigate('resources')}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition space-y-3"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Building className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-white">Resource Catalog</h4>
                <p className="text-[11px] text-slate-400">Hardware, textbooks & research library</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Search and record views for campus GPU compute nodes, libraries, and textbooks.
            </p>
          </div>

          {/* NoSQL Educational Lab (Phase 10) */}
          <div
            onClick={() => onNavigate('nosql-architecture')}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition space-y-3"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <GraduationCap className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-white">Phase 10: Educational Lab</h4>
                <p className="text-[11px] text-slate-400">Architecture & syllabus topics</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore multi-model persistence rationale, cache invalidation, and comparative tradeoffs.
            </p>
          </div>

          {/* Advanced NoSQL Demos (Phase 12) */}
          <div
            onClick={() => onNavigate('advanced-nosql-demos')}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition space-y-3"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Beaker className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-white">Phase 12: Advanced NoSQL Demos</h4>
                <p className="text-[11px] text-slate-400">8 Live & Simulated Architecture Modules</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sharding, partition tokens, replication & consistency levels, B-tree vs IXSCAN, Redis eviction, eventual consistency drift, and resilience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
