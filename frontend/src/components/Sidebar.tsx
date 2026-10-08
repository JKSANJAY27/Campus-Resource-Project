'use client';

import React from 'react';
import {
  Home,
  User,
  Target,
  Compass,
  BookOpen,
  FolderGit2,
  Briefcase,
  BookMarked,
  Layers,
  Activity,
  Zap,
  GitMerge,
  GraduationCap,
  Gauge,
  Cpu,
  ChevronRight,
  Beaker,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const sections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { id: 'overview', label: '1. Home / Dashboard', icon: Home },
        { id: 'profile', label: '2. Student Profile', icon: User },
      ],
    },
    {
      title: 'Academic Intelligence',
      items: [
        { id: 'skill-gap', label: '3. Skill Gap Analysis', icon: Target },
        { id: 'learning-path', label: '4. Learning Path', icon: Compass, badge: 'Roadmap', badgeColor: 'bg-indigo-500/20 text-indigo-300' },
        { id: 'courses', label: '5. Course Recommendations', icon: BookOpen },
        { id: 'projects', label: '6. Project Recommendations', icon: FolderGit2 },
        { id: 'job-readiness', label: '7. Job Readiness', icon: Briefcase },
        { id: 'resources', label: '8. Resource Browser', icon: BookMarked },
      ],
    },
    {
      title: 'Graph & Database Systems',
      items: [
        { id: 'graph-explorer', label: '9. Graph Explorer', icon: Layers, badge: 'ReactFlow', badgeColor: 'bg-blue-500/20 text-blue-300' },
        { id: 'analytics', label: '10. Activity Analytics', icon: Activity, badge: 'Cassandra', badgeColor: 'bg-amber-500/20 text-amber-300' },
        { id: 'metrics', label: '11. Database & Cache Metrics', icon: Zap, badge: 'Redis', badgeColor: 'bg-rose-500/20 text-rose-300' },
        { id: 'admin', label: '12. Admin & Sync Monitor', icon: GitMerge },
      ],
    },
    {
      title: 'Education & Benchmarks',
      items: [
        { id: 'advanced-nosql-demos', label: '14. Advanced NoSQL Demos', icon: Beaker, badge: 'Phase 12', badgeColor: 'bg-cyan-500/20 text-cyan-300' },
        { id: 'nosql-architecture', label: 'NoSQL Architecture & Demos', icon: GraduationCap, badge: 'Phase 10', badgeColor: 'bg-purple-500/20 text-purple-300' },
        { id: 'reproducible-benchmarks', label: '13. Reproducible Benchmarks', icon: Gauge, badge: 'Phase 11', badgeColor: 'bg-emerald-500/20 text-emerald-300' },
        { id: 'benchmarks', label: 'Multi-Model Evaluation', icon: Gauge, badge: 'Phase 9', badgeColor: 'bg-indigo-500/20 text-indigo-300' },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white leading-tight">Campus Graph</h1>
            <p className="text-[10px] text-slate-400">Multi-Model NoSQL Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation Links Scrollable List */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1.5">
              {section.title}
            </h4>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-transparent ${
                        isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[10px] text-slate-500 text-center">
        NoSQL Course Capstone • 4 Polyglot Engines
      </div>
    </aside>
  );
}
