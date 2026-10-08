'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Star,
  Code2,
  Tag,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { SAMPLE_STUDENTS } from './StudentProfileView';

interface ProjectRecommendationsViewProps {
  studentId: string;
}

interface ProjectRecommendationItem {
  id: string;
  title: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  techStack: string[];
  skillsReinforced: string[];
  matchScore: number;
  explanation: string;
}

export function ProjectRecommendationsView({ studentId }: ProjectRecommendationsViewProps) {
  const student = SAMPLE_STUDENTS[studentId] || SAMPLE_STUDENTS['STU_001'];
  const [projects, setProjects] = useState<ProjectRecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const defaultProjects: ProjectRecommendationItem[] = [
    {
      id: 'PRJ_01',
      title: 'Autonomous Campus Facility Vision Classifier',
      category: 'Computer Vision & Deep Learning',
      difficulty: 'Intermediate',
      techStack: ['Python', 'PyTorch', 'OpenCV', 'FastAPI', 'Docker'],
      skillsReinforced: ['Deep Learning', 'PyTorch', 'Computer Vision'],
      matchScore: 94,
      explanation:
        'Reinforces hands-on PyTorch and Convolutional Neural Networks, which directly closes the largest missing skill gap between your current skillset and your target role (AI/ML Engineer).',
    },
    {
      id: 'PRJ_02',
      title: 'Graph-Powered Prerequisite Dependency & Path Engine',
      category: 'Graph Algorithms & Knowledge Bases',
      difficulty: 'Advanced',
      techStack: ['Python', 'Neo4j', 'Cypher', 'Redis', 'Docker'],
      skillsReinforced: ['Data Structures', 'Graph Databases', 'Topological Sorting'],
      matchScore: 89,
      explanation:
        'Applies your advanced Data Structures and Python skills to real-world graph traversals and index-free adjacency, preparing you for systems engineering interviews.',
    },
    {
      id: 'PRJ_03',
      title: 'Real-time Event Streaming & Telemetry Pipeline',
      category: 'Big Data & Distributed Systems',
      difficulty: 'Advanced',
      techStack: ['Python', 'Apache Cassandra', 'Kafka', 'Docker'],
      skillsReinforced: ['Cassandra', 'LSM-Trees', 'Distributed Systems'],
      matchScore: 81,
      explanation:
        'Provides experiential exposure to append-heavy distributed logging, demonstrating understanding of wide-column partition and clustering key mechanics.',
    },
    {
      id: 'PRJ_04',
      title: 'Microservices Cache-Aside Acceleration Layer',
      category: 'Backend & High-Concurrency Systems',
      difficulty: 'Intermediate',
      techStack: ['Node.js', 'Redis', 'Express', 'Jest'],
      skillsReinforced: ['In-Memory Caching', 'Rate Limiting', 'TTL Eviction'],
      matchScore: 76,
      explanation:
        'Recommended because modern AI/ML inference serving architectures require sub-millisecond in-memory caching to withstand high-volume student traffic.',
    },
  ];

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
        const res = await fetch(`${apiUrl}/recommendations/students/${student.id}/projects`);
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          setProjects(
            json.data.map((p: any) => ({
              id: p.projectId || p.id,
              title: p.title || 'Innovative Campus Project',
              category: p.category || 'Applied Engineering',
              difficulty: p.difficulty || 'Intermediate',
              techStack: p.techStack || ['Python', 'Docker'],
              skillsReinforced: p.skillsRequired || ['Software Engineering'],
              matchScore: Math.round((p.finalScore || p.score || 0.82) * 100),
              explanation: p.explanation || 'Recommended based on skill graph overlap.',
            }))
          );
        } else {
          setProjects(defaultProjects);
        }
      } catch {
        setProjects(defaultProjects);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [student.id]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <FolderGit2 className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-indigo-300">Phase 5 Project Matching</span>
            </div>
            <h2 className="text-xl font-bold text-white">Recommended Capstone & Portfolio Projects</h2>
            <p className="text-xs text-slate-400 mt-1">
              Ranked hands-on projects designed to bridge practical skill deficits for <strong className="text-slate-200">{student.name}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Target: <strong className="text-indigo-400">{student.targetCareer}</strong></span>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {projects.map((proj, idx) => (
          <div
            key={proj.id || idx}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
          >
            <div>
              {/* Header Row */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">{proj.category}</span>
                  <h3 className="text-base font-bold text-white leading-snug">{proj.title}</h3>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 shrink-0 ${
                    proj.matchScore >= 90
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : proj.matchScore >= 80
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  <Star className="w-3 h-3 fill-current" />
                  {proj.matchScore}% Match
                </span>
              </div>

              {/* Badges: Difficulty & Tech Stack */}
              <div className="flex items-center gap-2 flex-wrap mt-3">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    proj.difficulty === 'Advanced'
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                      : proj.difficulty === 'Intermediate'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  }`}
                >
                  {proj.difficulty}
                </span>

                {proj.techStack.map((tech, tIdx) => (
                  <span
                    key={tIdx}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-300 border border-slate-800"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Explanation Box */}
            <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-indigo-300 mb-1">
                <HelpCircle className="w-3.5 h-3.5" />
                Why this was recommended:
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">{proj.explanation}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
