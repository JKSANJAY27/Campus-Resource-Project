'use client';

import React, { useState, useCallback } from 'react';
import {
  Beaker,
  Database,
  Layers,
  Zap,
  HardDrive,
  GitBranch,
  ShieldAlert,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Play,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Activity,
  Server,
  ArrowRight,
  BarChart3,
  Cpu,
} from 'lucide-react';
import { CALIBRATED_FALLBACK_DEMOS } from './advancedNoSqlFallbackData';

// ============================================================================
// Types
// ============================================================================

interface DemoStep {
  step: number;
  label: string;
  detail: string;
  latencyMs?: number;
  result?: any;
}

interface DemoResult {
  title: string;
  category: 'actual' | 'simulated' | 'hybrid';
  database: string;
  description: string;
  whySimulated?: string;
  limitations?: string[];
  steps: DemoStep[];
  metrics?: Record<string, unknown>;
  educationalNotes: string[];
}

interface AllDemosResponse {
  success: boolean;
  phase: number;
  totalDurationMs: number;
  demoCount: number;
  summary: { actual: number; simulated: number; hybrid: number };
  demonstrations: DemoResult[];
}

// ============================================================================
// Constants
// ============================================================================

const DEMO_CARDS = [
  {
    id: 'mongo-sharding',
    title: 'MongoDB Sharding',
    icon: Database,
    color: 'emerald',
    description: 'Hash vs. range shard key distribution',
    tag: 'Simulated',
  },
  {
    id: 'cassandra-partitioning',
    title: 'Cassandra Partitioning',
    icon: HardDrive,
    color: 'amber',
    description: 'Partition key queries & token ring',
    tag: 'Actual',
  },
  {
    id: 'cassandra-replication',
    title: 'Cassandra Replication',
    icon: Server,
    color: 'amber',
    description: 'RF, consistency levels & failure scenarios',
    tag: 'Simulated',
  },
  {
    id: 'neo4j-indexing',
    title: 'Neo4j Indexing',
    icon: GitBranch,
    color: 'blue',
    description: 'Index scan vs. label scan with EXPLAIN',
    tag: 'Actual',
  },
  {
    id: 'mongo-indexing',
    title: 'MongoDB Indexing',
    icon: BarChart3,
    color: 'emerald',
    description: 'IXSCAN vs. COLLSCAN with explain()',
    tag: 'Actual',
  },
  {
    id: 'redis-ttl',
    title: 'Redis TTL & Eviction',
    icon: Zap,
    color: 'rose',
    description: 'Key expiration, PERSIST, eviction policy',
    tag: 'Actual',
  },
  {
    id: 'eventual-consistency',
    title: 'Eventual Consistency',
    icon: RefreshCw,
    color: 'purple',
    description: 'Cross-store drift & staleness windows',
    tag: 'Hybrid',
  },
  {
    id: 'degraded-service',
    title: 'Degraded Service',
    icon: ShieldAlert,
    color: 'slate',
    description: 'Failure handling & resilience matrix',
    tag: 'Hybrid',
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string; glow: string }> = {
  emerald: {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-800/50',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300',
    glow: 'shadow-emerald-500/10',
  },
  amber: {
    bg: 'bg-amber-950/40',
    border: 'border-amber-800/50',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300',
    glow: 'shadow-amber-500/10',
  },
  blue: {
    bg: 'bg-blue-950/40',
    border: 'border-blue-800/50',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300',
    glow: 'shadow-blue-500/10',
  },
  rose: {
    bg: 'bg-rose-950/40',
    border: 'border-rose-800/50',
    text: 'text-rose-400',
    badge: 'bg-rose-500/20 text-rose-300',
    glow: 'shadow-rose-500/10',
  },
  purple: {
    bg: 'bg-purple-950/40',
    border: 'border-purple-800/50',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300',
    glow: 'shadow-purple-500/10',
  },
  slate: {
    bg: 'bg-slate-900/60',
    border: 'border-slate-700/50',
    text: 'text-slate-400',
    badge: 'bg-slate-500/20 text-slate-300',
    glow: 'shadow-slate-500/10',
  },
};

// ============================================================================
// Sub-Components
// ============================================================================

function CategoryBadge({ category }: { category: string }) {
  const colorMap: Record<string, string> = {
    actual: 'bg-green-500/20 text-green-300 border-green-500/30',
    simulated: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    hybrid: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  };

  const iconMap: Record<string, React.ReactNode> = {
    actual: <CheckCircle2 className="w-3 h-3" />,
    simulated: <Info className="w-3 h-3" />,
    hybrid: <Activity className="w-3 h-3" />,
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colorMap[category] || colorMap.simulated}`}>
      {iconMap[category]}
      {category}
    </span>
  );
}

function StepCard({ step, isLast }: { step: DemoStep; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-[15px] top-[32px] bottom-0 w-px bg-slate-700/50" />
      )}

      <div className="flex gap-3">
        {/* Step number circle */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 z-10">
          {step.step}
        </div>

        <div className="flex-1 min-w-0 pb-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h5 className="text-sm font-semibold text-slate-200 leading-tight">{step.label}</h5>
            {step.latencyMs !== undefined && (
              <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                <Clock className="w-3 h-3" />
                {step.latencyMs}ms
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">{step.detail}</p>

          {step.result && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition"
            >
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {expanded ? 'Hide result data' : 'Show result data'}
            </button>
          )}

          {expanded && step.result && (
            <pre className="mt-2 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-64 overflow-y-auto">
              {JSON.stringify(step.result, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function DemoResultPanel({ demo }: { demo: DemoResult }) {
  const [showNotes, setShowNotes] = useState(false);
  const [showLimitations, setShowLimitations] = useState(false);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-800/60">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 className="text-base font-bold text-white">{demo.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Database: {demo.database}</p>
          </div>
          <CategoryBadge category={demo.category} />
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{demo.description}</p>

        {demo.whySimulated && (
          <div className="mt-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
            <h6 className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider mb-1">Why simulated?</h6>
            <p className="text-[11px] text-yellow-200/70 leading-relaxed">{demo.whySimulated}</p>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="p-5">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Execution Steps</h4>
        <div className="space-y-0">
          {demo.steps.map((step, i) => (
            <StepCard key={step.step} step={step} isLast={i === demo.steps.length - 1} />
          ))}
        </div>
      </div>

      {/* Educational Notes */}
      {demo.educationalNotes.length > 0 && (
        <div className="px-5 pb-4">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition mb-2"
          >
            {showNotes ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Educational Notes ({demo.educationalNotes.length})
          </button>
          {showNotes && (
            <ul className="space-y-1.5 pl-1">
              {demo.educationalNotes.map((note, i) => (
                <li key={i} className="flex gap-2 text-[11px] text-slate-400 leading-relaxed">
                  <span className="text-indigo-500 mt-0.5 flex-shrink-0">•</span>
                  {note}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Limitations */}
      {demo.limitations && demo.limitations.length > 0 && (
        <div className="px-5 pb-5">
          <button
            onClick={() => setShowLimitations(!showLimitations)}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition mb-2"
          >
            {showLimitations ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Limitations ({demo.limitations.length})
          </button>
          {showLimitations && (
            <ul className="space-y-1.5 pl-1">
              {demo.limitations.map((lim, i) => (
                <li key={i} className="flex gap-2 text-[11px] text-amber-200/60 leading-relaxed">
                  <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                  {lim}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AdvancedNoSqlDemoView() {
  const [loading, setLoading] = useState(false);
  const [loadingSingle, setLoadingSingle] = useState<string | null>(null);
  const [allResults, setAllResults] = useState<AllDemosResponse | null>(null);
  const [singleResult, setSingleResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [isOfflineFallback, setIsOfflineFallback] = useState<boolean>(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

  const DEMO_INDEX_MAP: Record<string, number> = {
    'mongo-sharding': 0,
    'cassandra-partitioning': 1,
    'cassandra-replication': 2,
    'neo4j-indexing': 3,
    'mongo-indexing': 4,
    'redis-ttl': 5,
    'eventual-consistency': 6,
    'degraded-service': 7,
  };

  const runAllDemos = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSingleResult(null);
    setActiveDemo(null);
    setIsOfflineFallback(false);
    try {
      const res = await fetch(`${apiUrl}/nosql-demos`);
      const data = await res.json();
      if (data.success) {
        setAllResults(data);
      } else {
        setError(data.error || 'Failed to run demonstrations');
      }
    } catch (_err: any) {
      // Fallback to calibrated demonstration suite
      setIsOfflineFallback(true);
      setAllResults(CALIBRATED_FALLBACK_DEMOS);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const runSingleDemo = useCallback(async (demoId: string) => {
    setLoadingSingle(demoId);
    setError(null);
    setAllResults(null);
    setActiveDemo(demoId);
    setIsOfflineFallback(false);
    try {
      const res = await fetch(`${apiUrl}/nosql-demos/${demoId}`);
      const data = await res.json();
      if (data.success) {
        setSingleResult(data.demonstration);
      } else {
        setError(data.error || 'Failed to run demonstration');
      }
    } catch (_err: any) {
      // Fallback to single calibrated demo
      setIsOfflineFallback(true);
      const idx = DEMO_INDEX_MAP[demoId] ?? 0;
      setSingleResult(CALIBRATED_FALLBACK_DEMOS.demonstrations[idx]);
    } finally {
      setLoadingSingle(null);
    }
  }, [apiUrl]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-600/25">
            <Beaker className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white leading-tight">
              Phase 12: Advanced NoSQL Demonstrations
            </h1>
            <p className="text-sm text-slate-400">
              Live experiments & educational simulations across all 4 database engines
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="font-semibold text-green-400">Actual</span>
            <span>— runs against live database instances</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="font-semibold text-yellow-400">Simulated</span>
            <span>— educational illustration (infrastructure impractical)</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="font-semibold text-blue-400">Hybrid</span>
            <span>— mix of live queries and educational modeling</span>
          </div>
        </div>
      </div>

      {/* Run All Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={runAllDemos}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-bold shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Running all 8 demos…
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run All Demonstrations
            </>
          )}
        </button>

        {allResults && (
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="font-mono text-cyan-400">{allResults.totalDurationMs.toFixed(0)}ms total</span>
            <span>•</span>
            <span>{allResults.summary.actual} actual</span>
            <span>•</span>
            <span>{allResults.summary.simulated} simulated</span>
            <span>•</span>
            <span>{allResults.summary.hybrid} hybrid</span>
          </div>
        )}
      </div>

      {/* Demo Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {DEMO_CARDS.map((card) => {
          const Icon = card.icon;
          const colors = COLOR_MAP[card.color] || COLOR_MAP.slate;
          const isActive = activeDemo === card.id;
          const isLoading = loadingSingle === card.id;

          return (
            <button
              key={card.id}
              onClick={() => runSingleDemo(card.id)}
              disabled={isLoading}
              className={`group relative p-4 rounded-xl border text-left transition-all duration-200 ${
                isActive
                  ? `${colors.bg} ${colors.border} shadow-lg ${colors.glow}`
                  : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/60'
              } disabled:opacity-60`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? colors.bg : 'bg-slate-800/80'}`}>
                  <Icon className={`w-4 h-4 ${isActive ? colors.text : 'text-slate-400 group-hover:text-slate-300'}`} />
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${colors.badge}`}>
                  {card.tag}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-200 mb-0.5 leading-tight">{card.title}</h4>
              <p className="text-[10px] text-slate-500 leading-snug">{card.description}</p>

              {isLoading && (
                <div className="absolute inset-0 bg-slate-900/50 rounded-xl flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-red-300">Error</h4>
            <p className="text-xs text-red-200/70 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Offline Fallback Notice */}
      {isOfflineFallback && (
        <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 flex items-center gap-3">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <p className="text-xs text-cyan-200/90">
            <strong className="text-cyan-300">Calibrated Demonstration Mode:</strong> Backend server is offline or unreachable. Demonstrating using deterministic baseline measurements calibrated from local container benchmarks.
          </p>
        </div>
      )}

      {/* Single Demo Result */}
      {singleResult && !allResults && (
        <DemoResultPanel demo={singleResult} />
      )}

      {/* All Demos Results */}
      {allResults && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white">
                All {allResults.demoCount} Demonstrations Complete
              </h3>
            </div>
            <span className="text-xs font-mono text-cyan-400">
              Total: {allResults.totalDurationMs.toFixed(0)}ms
            </span>
          </div>

          {/* Individual results */}
          <div className="space-y-4">
            {allResults.demonstrations.map((demo, i) => (
              <DemoResultPanel key={i} demo={demo} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !allResults && !singleResult && !error && (
        <div className="text-center py-16">
          <Beaker className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-500 mb-2">No demonstrations run yet</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Click <strong>"Run All Demonstrations"</strong> to execute all 8 NoSQL demos in sequence,
            or click any individual card above to run a single demonstration.
          </p>
        </div>
      )}
    </div>
  );
}
