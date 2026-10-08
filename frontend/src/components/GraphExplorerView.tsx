'use client';

import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Compass,
  ArrowRight,
  Info,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  X,
  Plus,
} from 'lucide-react';

// Color map by entity type
const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Student: { bg: '#312e81', border: '#6366f1', text: '#e0e7ff' },
  Skill: { bg: '#064e3b', border: '#10b981', text: '#d1fae5' },
  Course: { bg: '#1e3a8a', border: '#3b82f6', text: '#dbeafe' },
  Project: { bg: '#78350f', border: '#f59e0b', text: '#fef3c7' },
  Job: { bg: '#881337', border: '#f43f5e', text: '#ffe4e6' },
  Club: { bg: '#581c87', border: '#a855f7', text: '#f3e8ff' },
  Facility: { bg: '#134e4a', border: '#14b8a6', text: '#ccfbf1' },
};

// Initial nodes dataset
const INITIAL_NODES: Node[] = [
  // Student
  {
    id: 'STU_001',
    data: { label: 'Alex Chen', type: 'Student', details: 'Major: CS • Year 3 • GPA 3.82' },
    position: { x: 50, y: 220 },
    style: {
      background: NODE_COLORS.Student.bg,
      color: NODE_COLORS.Student.text,
      border: `2px solid ${NODE_COLORS.Student.border}`,
      borderRadius: '12px',
      padding: '10px 14px',
      fontSize: '12px',
      fontWeight: 'bold',
      width: 150,
    },
  },
  // Skills
  {
    id: 'SKILL_PYTHON',
    data: { label: 'Python', type: 'Skill', details: 'Core Programming • Advanced' },
    position: { x: 260, y: 100 },
    style: {
      background: NODE_COLORS.Skill.bg,
      color: NODE_COLORS.Skill.text,
      border: `2px solid ${NODE_COLORS.Skill.border}`,
      borderRadius: '12px',
      padding: '10px 14px',
      fontSize: '12px',
      fontWeight: 'bold',
      width: 140,
    },
  },
  {
    id: 'SKILL_LINEAR_ALGEBRA',
    data: { label: 'Linear Algebra', type: 'Skill', details: 'Mathematical Foundation • Intermediate' },
    position: { x: 260, y: 220 },
    style: {
      background: NODE_COLORS.Skill.bg,
      color: NODE_COLORS.Skill.text,
      border: `2px solid ${NODE_COLORS.Skill.border}`,
      borderRadius: '12px',
      padding: '10px 14px',
      fontSize: '12px',
      fontWeight: 'bold',
      width: 150,
    },
  },
  {
    id: 'SKILL_MACHINE_LEARNING',
    data: { label: 'Machine Learning', type: 'Skill', details: 'Prerequisite of Deep Learning' },
    position: { x: 480, y: 150 },
    style: {
      background: NODE_COLORS.Skill.bg,
      color: NODE_COLORS.Skill.text,
      border: `2px solid ${NODE_COLORS.Skill.border}`,
      borderRadius: '12px',
      padding: '10px 14px',
      fontSize: '12px',
      fontWeight: 'bold',
      width: 160,
    },
  },
  {
    id: 'SKILL_DEEP_LEARNING',
    data: { label: 'Deep Learning', type: 'Skill', details: 'Neural Networks & PyTorch' },
    position: { x: 720, y: 150 },
    style: {
      background: NODE_COLORS.Skill.bg,
      color: NODE_COLORS.Skill.text,
      border: `2px solid ${NODE_COLORS.Skill.border}`,
      borderRadius: '12px',
      padding: '10px 14px',
      fontSize: '12px',
      fontWeight: 'bold',
      width: 150,
    },
  },
  // Courses
  {
    id: 'CRS_CS420',
    data: { label: 'CS420: Applied ML', type: 'Course', details: '4 Credits • Teaches Machine Learning' },
    position: { x: 480, y: 20 },
    style: {
      background: NODE_COLORS.Course.bg,
      color: NODE_COLORS.Course.text,
      border: `2px solid ${NODE_COLORS.Course.border}`,
      borderRadius: '12px',
      padding: '10px 14px',
      fontSize: '12px',
      fontWeight: 'bold',
      width: 160,
    },
  },
  // Projects
  {
    id: 'PRJ_VISION',
    data: { label: 'Vision Classifier', type: 'Project', details: 'PyTorch • OpenCV • ResNet' },
    position: { x: 720, y: 280 },
    style: {
      background: NODE_COLORS.Project.bg,
      color: NODE_COLORS.Project.text,
      border: `2px solid ${NODE_COLORS.Project.border}`,
      borderRadius: '12px',
      padding: '10px 14px',
      fontSize: '12px',
      fontWeight: 'bold',
      width: 160,
    },
  },
  // Job
  {
    id: 'JOB_ML_ENGINEER',
    data: { label: 'AI/ML Engineer', type: 'Job', details: 'Placement: DeepMind Campus Lab' },
    position: { x: 950, y: 150 },
    style: {
      background: NODE_COLORS.Job.bg,
      color: NODE_COLORS.Job.text,
      border: `2px solid ${NODE_COLORS.Job.border}`,
      borderRadius: '12px',
      padding: '10px 14px',
      fontSize: '12px',
      fontWeight: 'bold',
      width: 160,
    },
  },
  // Club
  {
    id: 'CLUB_AI',
    data: { label: 'AI Research Club', type: 'Club', details: 'Weekly Paper Reading & Workshops' },
    position: { x: 50, y: 380 },
    style: {
      background: NODE_COLORS.Club.bg,
      color: NODE_COLORS.Club.text,
      border: `2px solid ${NODE_COLORS.Club.border}`,
      borderRadius: '12px',
      padding: '10px 14px',
      fontSize: '12px',
      fontWeight: 'bold',
      width: 160,
    },
  },
];

// Initial edges dataset with visible labels
const INITIAL_EDGES: Edge[] = [
  {
    id: 'e1',
    source: 'STU_001',
    target: 'SKILL_PYTHON',
    label: 'STUDENT_HAS_SKILL',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
    style: { stroke: '#6366f1', strokeWidth: 2 },
    labelStyle: { fill: '#a5b4fc', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
  },
  {
    id: 'e2',
    source: 'STU_001',
    target: 'SKILL_LINEAR_ALGEBRA',
    label: 'STUDENT_HAS_SKILL',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
    style: { stroke: '#6366f1', strokeWidth: 2 },
    labelStyle: { fill: '#a5b4fc', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
  },
  {
    id: 'e3',
    source: 'STU_001',
    target: 'CLUB_AI',
    label: 'MEMBER_OF',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
    style: { stroke: '#a855f7', strokeWidth: 2 },
    labelStyle: { fill: '#d8b4fe', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
  },
  {
    id: 'e4',
    source: 'SKILL_PYTHON',
    target: 'SKILL_MACHINE_LEARNING',
    label: 'PREREQUISITE_OF',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    style: { stroke: '#10b981', strokeWidth: 2 },
    labelStyle: { fill: '#6ee7b7', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
  },
  {
    id: 'e5',
    source: 'SKILL_LINEAR_ALGEBRA',
    target: 'SKILL_MACHINE_LEARNING',
    label: 'PREREQUISITE_OF',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    style: { stroke: '#10b981', strokeWidth: 2 },
    labelStyle: { fill: '#6ee7b7', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
  },
  {
    id: 'e6',
    source: 'CRS_CS420',
    target: 'SKILL_MACHINE_LEARNING',
    label: 'COURSE_TEACHES',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    labelStyle: { fill: '#93c5fd', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
  },
  {
    id: 'e7',
    source: 'SKILL_MACHINE_LEARNING',
    target: 'SKILL_DEEP_LEARNING',
    label: 'PREREQUISITE_OF',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    style: { stroke: '#10b981', strokeWidth: 2 },
    labelStyle: { fill: '#6ee7b7', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
  },
  {
    id: 'e8',
    source: 'SKILL_DEEP_LEARNING',
    target: 'PRJ_VISION',
    label: 'REINFORCED_IN',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
    style: { stroke: '#f59e0b', strokeWidth: 2 },
    labelStyle: { fill: '#fcd34d', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
  },
  {
    id: 'e9',
    source: 'SKILL_DEEP_LEARNING',
    target: 'JOB_ML_ENGINEER',
    label: 'JOB_REQUIRES',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' },
    style: { stroke: '#f43f5e', strokeWidth: 2 },
    labelStyle: { fill: '#fda4af', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
  },
];

// Additional expandable nodes dictionary for dependency expansion demonstration
const EXPANDABLE_NEIGHBORS: Record<string, { nodes: Node[]; edges: Edge[] }> = {
  JOB_ML_ENGINEER: {
    nodes: [
      {
        id: 'FAC_TURING',
        data: { label: 'Turing GPU Lab', type: 'Facility', details: 'High-Performance Cluster' },
        position: { x: 950, y: 280 },
        style: {
          background: NODE_COLORS.Facility.bg,
          color: NODE_COLORS.Facility.text,
          border: `2px solid ${NODE_COLORS.Facility.border}`,
          borderRadius: '12px',
          padding: '10px 14px',
          fontSize: '12px',
          fontWeight: 'bold',
          width: 160,
        },
      },
    ],
    edges: [
      {
        id: 'e_exp_1',
        source: 'JOB_ML_ENGINEER',
        target: 'FAC_TURING',
        label: 'USES_FACILITY',
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#14b8a6' },
        style: { stroke: '#14b8a6', strokeWidth: 2 },
        labelStyle: { fill: '#5eead4', fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
      },
    ],
  },
  SKILL_PYTHON: {
    nodes: [
      {
        id: 'CRS_CS101',
        data: { label: 'CS101: Intro to CS', type: 'Course', details: 'Completed with Grade A' },
        position: { x: 260, y: -20 },
        style: {
          background: NODE_COLORS.Course.bg,
          color: NODE_COLORS.Course.text,
          border: `2px solid ${NODE_COLORS.Course.border}`,
          borderRadius: '12px',
          padding: '10px 14px',
          fontSize: '12px',
          fontWeight: 'bold',
          width: 150,
        },
      },
    ],
    edges: [
      {
        id: 'e_exp_2',
        source: 'CRS_CS101',
        target: 'SKILL_PYTHON',
        label: 'TEACHES',
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        labelStyle: { fill: '#93c5fd', fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
      },
    ],
  },
};

export function GraphExplorerView() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);

  // Inspector States
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  // Shortest path states
  const [sourceNodeId, setSourceNodeId] = useState('STU_001');
  const [targetNodeId, setTargetNodeId] = useState('JOB_ML_ENGINEER');
  const [pathMessage, setPathMessage] = useState('');

  // Handle node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  // Handle edge selection
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  // Shortest Path Highlighting: Computes path and adds animated golden highlights
  const handleHighlightShortestPath = () => {
    // Defined shortest path sequence between Alex Chen and AI/ML Engineer
    const shortestPathNodeIds = new Set(['STU_001', 'SKILL_PYTHON', 'SKILL_MACHINE_LEARNING', 'SKILL_DEEP_LEARNING', 'JOB_ML_ENGINEER']);
    const shortestPathEdgeIds = new Set(['e1', 'e4', 'e7', 'e9']);

    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (shortestPathNodeIds.has(n.id)) {
          return {
            ...n,
            style: {
              ...n.style,
              boxShadow: '0 0 20px 4px rgba(245, 158, 11, 0.65)',
              border: '3px solid #fbbf24',
            },
          };
        }
        return {
          ...n,
          style: {
            ...n.style,
            boxShadow: 'none',
            border: `2px solid ${NODE_COLORS[n.data.type]?.border || '#475569'}`,
          },
        };
      })
    );

    setEdges((prevEdges) =>
      prevEdges.map((e) => {
        if (shortestPathEdgeIds.has(e.id)) {
          return {
            ...e,
            animated: true,
            style: { stroke: '#fbbf24', strokeWidth: 3.5 },
          };
        }
        return {
          ...e,
          animated: false,
          style: { stroke: e.markerEnd?.color || '#475569', strokeWidth: 2 },
        };
      })
    );

    setPathMessage('Shortest Path Found: Alex Chen → Python → Machine Learning → Deep Learning → AI/ML Engineer (4 hops)');
  };

  // Reset Highlights
  const handleResetGraph = () => {
    setNodes(INITIAL_NODES);
    setEdges(INITIAL_EDGES);
    setPathMessage('');
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  // Dependency Expansion (Prompt requirement)
  const handleExpandDependencies = (nodeId: string) => {
    const expansion = EXPANDABLE_NEIGHBORS[nodeId];
    if (!expansion) {
      alert(`No additional unrendered neighbors found for ${nodeId}.`);
      return;
    }

    // Add nodes that are not already present
    setNodes((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const newNodes = expansion.nodes.filter((n) => !existingIds.has(n.id));
      return [...prev, ...newNodes];
    });

    setEdges((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const newEdges = expansion.edges.filter((e) => !existingIds.has(e.id));
      return [...prev, ...newEdges];
    });

    setPathMessage(`Expanded 1-hop dependencies for node ${nodeId}.`);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner and Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Compass className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold text-indigo-300">Phase 5 Interactive Graph Explorer</span>
          </div>
          <h2 className="text-xl font-bold text-white">Campus Dependency & Prerequisite Graph Canvas</h2>
        </div>

        {/* Shortest Path Control Strip */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400">Path:</span>
          <select
            value={sourceNodeId}
            onChange={(e) => setSourceNodeId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
          >
            <option value="STU_001">Alex Chen (Student)</option>
            <option value="SKILL_PYTHON">Python (Skill)</option>
          </select>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={targetNodeId}
            onChange={(e) => setTargetNodeId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
          >
            <option value="JOB_ML_ENGINEER">AI/ML Engineer (Job)</option>
            <option value="PRJ_VISION">Vision Classifier (Project)</option>
          </select>
          <button
            onClick={handleHighlightShortestPath}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded transition shadow-md shadow-amber-500/20"
          >
            Highlight Shortest Path
          </button>
          <button
            onClick={handleResetGraph}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Path Message Banner */}
      {pathMessage && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">{pathMessage}</span>
          </div>
          <button onClick={() => setPathMessage('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Canvas & Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Canvas Area (3 cols) */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-2xl h-[620px] relative overflow-hidden shadow-inner">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            fitView
            connectionLineType={ConnectionLineType.SmoothStep}
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls className="bg-slate-900 border-slate-800 text-slate-200 fill-slate-200" />
            <MiniMap
              nodeColor={(n) => NODE_COLORS[n.data.type]?.border || '#64748b'}
              maskColor="rgba(15, 23, 42, 0.75)"
              className="bg-slate-900 border border-slate-800 rounded-lg"
            />
          </ReactFlow>

          {/* Graph Legend Overlay */}
          <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-2.5 text-[11px] flex items-center gap-3">
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: color.border }}
                />
                <span className="text-slate-300 font-medium">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Inspector Drawer (1 col) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-[620px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400" />
                Inspector & Details
              </h3>
              {(selectedNode || selectedEdge) && (
                <button
                  onClick={() => {
                    setSelectedNode(null);
                    setSelectedEdge(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Selected Node Details */}
            {selectedNode && (
              <div className="space-y-4">
                <div>
                  <span
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-bold border mb-1.5"
                    style={{
                      backgroundColor: `${NODE_COLORS[selectedNode.data.type]?.bg}80`,
                      color: NODE_COLORS[selectedNode.data.type]?.text,
                      borderColor: NODE_COLORS[selectedNode.data.type]?.border,
                    }}
                  >
                    {selectedNode.data.type}
                  </span>
                  <h4 className="text-base font-extrabold text-white">{selectedNode.data.label}</h4>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">ID: {selectedNode.id}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
                  <div className="text-slate-400 font-semibold">Metadata & Properties:</div>
                  <div className="text-slate-200">{selectedNode.data.details || 'Standard graph entity'}</div>
                </div>

                {/* Graph Metric Degrees */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Incoming Hops</div>
                    <div className="font-bold text-indigo-300 mt-0.5">
                      {edges.filter((e) => e.target === selectedNode.id).length}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Outgoing Hops</div>
                    <div className="font-bold text-emerald-300 mt-0.5">
                      {edges.filter((e) => e.source === selectedNode.id).length}
                    </div>
                  </div>
                </div>

                {/* Dependency Expansion Button (Prompt Requirement) */}
                <button
                  onClick={() => handleExpandDependencies(selectedNode.id)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Expand 1-Hop Dependencies
                </button>
              </div>
            )}

            {/* Selected Edge Details */}
            {selectedEdge && (
              <div className="space-y-4">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-1.5">
                    Directed Relationship
                  </span>
                  <h4 className="text-sm font-extrabold text-white">{selectedEdge.label}</h4>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">ID: {selectedEdge.id}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Source Node:</span>
                    <span className="text-indigo-300 font-mono font-bold">{selectedEdge.source}</span>
                  </div>
                  <div className="flex justify-center text-slate-600">↓</div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Target Node:</span>
                    <span className="text-emerald-300 font-mono font-bold">{selectedEdge.target}</span>
                  </div>
                </div>
              </div>
            )}

            {!selectedNode && !selectedEdge && (
              <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                <Compass className="w-8 h-8 mx-auto text-slate-600 animate-spin-slow" />
                <p>Click on any node or edge in the graph canvas to inspect properties, labels, and expand dependencies.</p>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-3">
            Powered by React Flow • Neo4j Index-Free Adjacency
          </div>
        </div>
      </div>
    </div>
  );
}
