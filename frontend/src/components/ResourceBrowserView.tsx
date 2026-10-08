'use client';

import React, { useState } from 'react';
import {
  Search,
  BookMarked,
  Filter,
  Cpu,
  BookOpen,
  Globe,
  Star,
  CheckCircle2,
  Clock,
  Layers,
  ExternalLink,
  Activity,
} from 'lucide-react';

interface CampusResource {
  id: string;
  title: string;
  category: 'Textbook' | 'Hardware/Compute' | 'Online Portal' | 'Research Paper' | 'Tutoring';
  skillsTaught: string[];
  location: string;
  isDigital: boolean;
  availability: 'Available' | 'High Demand' | 'Instant Access';
  rating: number;
  totalViews: number;
  description: string;
}

export function ResourceBrowserView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loggedMessage, setLoggedMessage] = useState('');

  const resources: CampusResource[] = [
    {
      id: 'RES_01',
      title: 'Deep Learning with PyTorch (Manning Publications)',
      category: 'Textbook',
      skillsTaught: ['PyTorch', 'Deep Learning', 'Python'],
      location: 'Main Science Library, Reserve Shelf CS-48',
      isDigital: false,
      availability: 'Available',
      rating: 4.9,
      totalViews: 342,
      description: 'Comprehensive guide covering tensor operations, autograd, and building production convolutional networks.',
    },
    {
      id: 'RES_02',
      title: 'Turing GPU Supercluster (NVIDIA A100 80GB)',
      category: 'Hardware/Compute',
      skillsTaught: ['CUDA', 'Model Training', 'Distributed Systems'],
      location: 'Turing High-Performance Center, Node 14',
      isDigital: true,
      availability: 'High Demand',
      rating: 5.0,
      totalViews: 812,
      description: 'Dedicated multi-GPU cluster reserved for training neural network course assignments and capstone research.',
    },
    {
      id: 'RES_03',
      title: 'Designing Data-Intensive Applications (M. Kleppmann)',
      category: 'Textbook',
      skillsTaught: ['NoSQL Architectures', 'CAP Theorem', 'Replication', 'Partitioning'],
      location: 'Science Library Shelf DS-12',
      isDigital: false,
      availability: 'Available',
      rating: 5.0,
      totalViews: 924,
      description: 'Foundational textbook on distributed databases, consistency models, and stream processing.',
    },
    {
      id: 'RES_04',
      title: 'Campus Cloud Microservices Sandbox Portal',
      category: 'Online Portal',
      skillsTaught: ['Docker', 'Node.js', 'Redis', 'Kubernetes'],
      location: 'https://sandbox.campus.internal:8443',
      isDigital: true,
      availability: 'Instant Access',
      rating: 4.8,
      totalViews: 651,
      description: 'Interactive containerized playground for deploying Express services, Redis caching, and Cassandra nodes.',
    },
    {
      id: 'RES_05',
      title: 'Attention Is All You Need (Vaswani et al., 2017)',
      category: 'Research Paper',
      skillsTaught: ['Transformers', 'Attention Mechanisms', 'NLP'],
      location: 'Campus Digital Library Repository',
      isDigital: true,
      availability: 'Instant Access',
      rating: 4.9,
      totalViews: 1140,
      description: 'Seminal paper introducing transformer architectures for natural language processing and computer vision.',
    },
    {
      id: 'RES_06',
      title: 'Peer Tutoring: Graph Databases & Cypher Traversals',
      category: 'Tutoring',
      skillsTaught: ['Neo4j', 'Cypher', 'Graph Algorithms'],
      location: 'Student Success Center, Room 204',
      isDigital: false,
      availability: 'Available',
      rating: 4.7,
      totalViews: 189,
      description: 'Weekly walk-in tutoring hours conducted by graduate teaching assistants for course projects.',
    },
  ];

  const categories = ['All', 'Textbook', 'Hardware/Compute', 'Online Portal', 'Research Paper', 'Tutoring'];

  const filteredResources = resources.filter((res) => {
    const matchesCategory = selectedCategory === 'All' || res.category === selectedCategory;
    const matchesSearch =
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.skillsTaught.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleRecordView = async (resource: CampusResource) => {
    setLoggedMessage(`Logged view for "${resource.title}" into Cassandra activity partition.`);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      await fetch(`${apiUrl}/activity/resource`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: resource.id,
          studentId: 'STU_001',
          actionType: 'view_resource',
          durationSeconds: 30,
        }),
      }).catch(() => null);
    } catch {
      // offline fallback
    }
    setTimeout(() => setLoggedMessage(''), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <BookMarked className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-indigo-300">Campus Facilities & Assets</span>
            </div>
            <h2 className="text-xl font-bold text-white">Campus Resource Catalog & Learning Hub</h2>
            <p className="text-xs text-slate-400 mt-1">
              Explore textbooks, hardware clusters, digital portals, and research materials connected in our graph.
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by title, skill (e.g. PyTorch, NoSQL, CUDA), or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Logging Toast */}
      {loggedMessage && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>{loggedMessage}</span>
        </div>
      )}

      {/* Resource Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredResources.map((res) => (
          <div
            key={res.id}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
          >
            <div>
              {/* Category & Rating */}
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-950 text-indigo-400 border border-slate-800">
                  {res.category}
                </span>
                <span className="flex items-center gap-1 text-amber-400 font-bold text-xs">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {res.rating.toFixed(1)}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white leading-snug">{res.title}</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{res.description}</p>

              {/* Skills Tags */}
              <div className="flex items-center gap-1.5 flex-wrap mt-3">
                {res.skillsTaught.map((skill, sIdx) => (
                  <span
                    key={sIdx}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-950 text-slate-300 border border-slate-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Meta & Action */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate max-w-[180px]">{res.location}</span>
                <span
                  className={`font-semibold ${
                    res.availability === 'Available' || res.availability === 'Instant Access'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {res.availability}
                </span>
              </div>

              <button
                onClick={() => handleRecordView(res)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/20 text-xs font-semibold transition"
              >
                <span>Access Resource & Record View</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
