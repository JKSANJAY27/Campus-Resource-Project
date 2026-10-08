'use client';

import React from 'react';
import {
  User,
  RefreshCw,
  Database,
  Layers,
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
  Menu,
} from 'lucide-react';
import { SAMPLE_STUDENTS } from './StudentProfileView';

interface DatabaseHealth {
  status: 'connected' | 'disconnected' | 'error';
  latencyMs: number;
}

interface TopNavbarProps {
  currentStudentId: string;
  onSelectStudent: (id: string) => void;
  health: {
    mongodb: DatabaseHealth;
    neo4j: DatabaseHealth;
    redis: DatabaseHealth;
    cassandra: DatabaseHealth;
  } | null;
  onRefreshHealth: () => void;
  loadingHealth: boolean;
  onToggleSidebar?: () => void;
}

export function TopNavbar({
  currentStudentId,
  onSelectStudent,
  health,
  onRefreshHealth,
  loadingHealth,
  onToggleSidebar,
}: TopNavbarProps) {
  const currentStudent = SAMPLE_STUDENTS[currentStudentId] || SAMPLE_STUDENTS['STU_001'];

  const getStatusDot = (db?: DatabaseHealth) => {
    if (db?.status === 'connected') {
      return <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm shadow-emerald-400" />;
    }
    return <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />;
  };

  return (
    <header className="h-16 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur">
      {/* Left Area: Mobile Menu Trigger + Global Context Title */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <div className="hidden sm:block">
          <span className="text-xs text-slate-400">Context:</span>
          <span className="text-xs font-bold text-white ml-1">Academic Resource Intelligence</span>
        </div>
      </div>

      {/* Center / Right: Global Student Switcher & DB Health Pills */}
      <div className="flex items-center gap-4">
        {/* Database Health Status Indicators */}
        <div className="hidden lg:flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            {getStatusDot(health?.mongodb)}
            <span>Mongo</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            {getStatusDot(health?.neo4j)}
            <span>Neo4j</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            {getStatusDot(health?.redis)}
            <span>Redis</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            {getStatusDot(health?.cassandra)}
            <span>Cassandra</span>
          </div>

          <button
            onClick={onRefreshHealth}
            disabled={loadingHealth}
            className="text-slate-500 hover:text-slate-300 ml-1 transition"
            title="Refresh database connection health"
          >
            <RefreshCw className={`w-3 h-3 ${loadingHealth ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

        {/* Global Student Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
          <User className="w-4 h-4 text-indigo-400" />
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Active Student</span>
            <select
              value={currentStudentId}
              onChange={(e) => onSelectStudent(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              {Object.values(SAMPLE_STUDENTS).map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                  {s.name} ({s.id})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
