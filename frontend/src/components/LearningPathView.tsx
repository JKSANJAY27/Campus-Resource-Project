'use client';

import React, { useState } from 'react';
import {
  Compass,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  FolderGit2,
  Briefcase,
  Layers,
  Sparkles,
  Award,
  ChevronDown,
} from 'lucide-react';
import { SAMPLE_STUDENTS } from './StudentProfileView';

interface LearningPathViewProps {
  studentId: string;
}

interface PathStage {
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  items: Array<{
    title: string;
    subtitle?: string;
    tag?: string;
    completed?: boolean;
    details?: string;
  }>;
}

export function LearningPathView({ studentId }: LearningPathViewProps) {
  const student = SAMPLE_STUDENTS[studentId] || SAMPLE_STUDENTS['STU_001'];
  const [selectedRole, setSelectedRole] = useState(student.targetCareer || 'AI/ML Engineer');

  // Multi-tier vertical learning path stages matching the explicit user prompt requirement:
  // Current Skills -> Missing Prerequisites -> Required Skills -> Courses -> Projects -> Target Job
  const getStagesForRole = (role: string): PathStage[] => {
    if (role === 'Full-Stack Web Architect') {
      return [
        {
          title: '1. Current Skills',
          badge: 'Foundation',
          badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
          description: 'Skills verified in student profile and documented in MongoDB.',
          items: [
            { title: 'JavaScript (ES6+)', subtitle: 'Advanced', completed: true, details: 'Core language foundation' },
            { title: 'HTML5 & Responsive CSS', subtitle: 'Advanced', completed: true, details: 'DOM & layout manipulation' },
            { title: 'React', subtitle: 'Intermediate', completed: true, details: 'Component state & hooks' },
          ],
        },
        {
          title: '2. Missing Prerequisites',
          badge: 'Prerequisite Gap',
          badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
          description: 'Topological dependencies required before advancing to distributed systems.',
          items: [
            { title: 'Relational & NoSQL Database Concepts', subtitle: 'Prerequisite of Backend Microservices', completed: false, details: 'ACID vs BASE, BSON vs Relational schemas' },
            { title: 'Asynchronous Event Loop Mechanics', subtitle: 'Prerequisite of High-Concurrency Node.js', completed: false, details: 'Event queues, promises, microtasks' },
          ],
        },
        {
          title: '3. Required Target Skills',
          badge: 'Target Competencies',
          badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
          description: 'Essential capabilities defined in target job ontology.',
          items: [
            { title: 'TypeScript & Type Systems', subtitle: 'Priority #1', tag: 'High Impact', details: 'Static typing for large distributed codebases' },
            { title: 'Express & Node.js Microservices', subtitle: 'Priority #2', tag: 'Core', details: 'RESTful API architecture & rate limiting' },
            { title: 'MongoDB Data Modeling & Indexes', subtitle: 'Priority #3', tag: 'Database', details: 'Aggregation pipelines and indexing strategies' },
            { title: 'Docker Containerization', subtitle: 'Priority #4', tag: 'DevOps', details: 'Multi-stage builds and isolated container environments' },
          ],
        },
        {
          title: '4. Recommended Courses',
          badge: 'Academic Curriculum',
          badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
          description: 'Ranked coursework that closes prerequisite and skill gaps.',
          items: [
            { title: 'CS340: Distributed Web Systems Architecture', subtitle: '4 Credits • Prof. H. Vance', tag: 'Score: 96%', details: 'Covers Node.js microservices, Redis caching, and Docker' },
            { title: 'CS315: Advanced Modern Database Systems', subtitle: '3 Credits • Prof. M. Stone', tag: 'Score: 89%', details: 'Hands-on MongoDB, Cassandra, and Neo4j architectures' },
          ],
        },
        {
          title: '5. Hands-On Projects',
          badge: 'Applied Portfolio',
          badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
          description: 'Practical repository projects proving competency to employers.',
          items: [
            { title: 'Distributed Event-Driven Campus Portal', subtitle: 'Tech: Node.js, Redis, MongoDB, Docker', tag: 'Intermediate', details: 'Implements cache-aside architecture and rate limiting' },
            { title: 'Real-time Polyglot Collaborative Kanban', subtitle: 'Tech: React, TypeScript, WebSockets, Cassandra', tag: 'Advanced', details: 'Append-heavy audit stream and instant UI reactivity' },
          ],
        },
        {
          title: '6. Target Job Milestone',
          badge: 'Career Destination',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          description: 'Final qualification status for campus recruitment.',
          items: [
            { title: 'Full-Stack Web Architect', subtitle: 'Senior Campus Placement Eligibility', tag: 'Target Achieved', details: 'Ready for technical interviews and system design rounds' },
          ],
        },
      ];
    }

    // Default: AI/ML Engineer
    return [
      {
        title: '1. Current Skills',
        badge: 'Foundation',
        badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
        description: 'Verified capabilities currently recorded in the student graph.',
        items: [
          { title: 'Python Programming', subtitle: 'Advanced Proficiency', completed: true, details: 'Object-oriented programming, NumPy, Pandas' },
          { title: 'Data Structures & Algorithms', subtitle: 'Advanced Proficiency', completed: true, details: 'Graph algorithms, trees, complexity analysis' },
          { title: 'Linear Algebra', subtitle: 'Intermediate Proficiency', completed: true, details: 'Matrix operations, eigenvalues, vector spaces' },
        ],
      },
      {
        title: '2. Missing Prerequisites',
        badge: 'Prerequisite Gap',
        badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
        description: 'DAG dependencies that must be satisfied before taking Deep Learning.',
        items: [
          { title: 'Multivariate Calculus & Optimization', subtitle: 'Prerequisite of Gradient Descent & Backprop', completed: false, details: 'Partial derivatives, chain rule, Hessian matrices' },
          { title: 'Probability & Inferential Statistics', subtitle: 'Prerequisite of Bayesian & Probabilistic Models', completed: false, details: 'Distributions, maximum likelihood estimation' },
        ],
      },
      {
        title: '3. Required Target Skills',
        badge: 'Target Competencies',
        badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
        description: 'Target skill nodes in Neo4j connected via JOB_REQUIRES_SKILL.',
        items: [
          { title: 'Machine Learning Fundamentals', subtitle: 'Priority #1', tag: 'Core', details: 'Supervised & unsupervised learning, cross-validation' },
          { title: 'Deep Neural Networks (CNN & RNN)', subtitle: 'Priority #2', tag: 'Specialized', details: 'Feedforward networks, backpropagation, convolutional layers' },
          { title: 'PyTorch Framework', subtitle: 'Priority #3', tag: 'Tooling', details: 'Autograd tensors, training loops, model checkpointing' },
          { title: 'Model Deployment & Dockerization', subtitle: 'Priority #4', tag: 'Production', details: 'Serving models via FastAPI and containerized runtimes' },
        ],
      },
      {
        title: '4. Recommended Courses',
        badge: 'Academic Curriculum',
        badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
        description: 'Topological sequence of courses resolving the skill prerequisites.',
        items: [
          { title: 'CS420: Applied Machine Learning', subtitle: '4 Credits • Prof. K. Patel', tag: 'Match: 95%', details: 'Covers Scikit-Learn, mathematical foundations, and supervised algorithms' },
          { title: 'CS480: Deep Neural Networks & Computer Vision', subtitle: '4 Credits • Prof. S. Ramesh', tag: 'Match: 91%', details: 'PyTorch deep learning, backpropagation, and CNN architectures' },
        ],
      },
      {
        title: '5. Hands-On Projects',
        badge: 'Applied Portfolio',
        badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
        description: 'Project nodes in Neo4j reinforcing missing skills through experiential learning.',
        items: [
          { title: 'Autonomous Multi-Class Vision Classifier', subtitle: 'PyTorch, ResNet, FastAPI, Docker', tag: 'Difficulty: Intermediate', details: 'Trains deep CNN on campus facility imagery with 94% accuracy' },
          { title: 'Personalized Campus Recommendation Engine', subtitle: 'Neo4j, Python, Cypher, Redis', tag: 'Difficulty: Advanced', details: 'Constructs topological student-course dependency graphs' },
        ],
      },
      {
        title: '6. Target Job Milestone',
        badge: 'Career Destination',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        description: 'Final qualification status for campus recruitment.',
        items: [
          { title: 'AI/ML Research & Development Engineer', subtitle: 'Target Readiness: 100%', tag: 'Career Goal', details: 'All graph prerequisite dependencies satisfied' },
        ],
      },
    ];
  };

  const stages = getStagesForRole(selectedRole);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Compass className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-indigo-300">Phase 5 Topological Reasoning</span>
            </div>
            <h2 className="text-xl font-bold text-white">Personalized Learning Path Roadmap</h2>
            <p className="text-xs text-slate-400 mt-1">
              Sequential dependency pipeline generated via Neo4j topological sort over prerequisite DAGs for <strong className="text-slate-200">{student.name}</strong>.
            </p>
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            {['AI/ML Engineer', 'Full-Stack Web Architect'].map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
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

      {/* Vertical Directed Flow Visualizer */}
      <div className="relative max-w-4xl mx-auto space-y-6 py-4">
        {stages.map((stage, sIdx) => (
          <React.Fragment key={sIdx}>
            {/* Stage Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs font-bold border border-indigo-500/30">
                    {sIdx + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{stage.title}</h3>
                    <p className="text-[11px] text-slate-400">{stage.description}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border self-start sm:self-auto ${stage.badgeColor}`}>
                  {stage.badge}
                </span>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {stage.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {item.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-slate-100">{item.title}</span>
                      </div>
                      {item.tag && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
                          {item.tag}
                        </span>
                      )}
                    </div>

                    {item.details && (
                      <p className="text-[11px] text-slate-400 pl-4">{item.details}</p>
                    )}

                    {item.subtitle && (
                      <div className="text-[10px] text-slate-500 pl-4 font-mono">{item.subtitle}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Vertical Flow Arrow (shown between stages) */}
            {sIdx < stages.length - 1 && (
              <div className="flex flex-col items-center justify-center my-1">
                <div className="w-0.5 h-4 bg-gradient-to-b from-indigo-500 to-indigo-400" />
                <div className="w-7 h-7 rounded-full bg-slate-900 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-md">
                  <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
                </div>
                <div className="w-0.5 h-4 bg-gradient-to-b from-indigo-400 to-indigo-500" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
