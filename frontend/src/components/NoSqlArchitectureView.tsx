'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  Database,
  Layers,
  Zap,
  Activity,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Play,
  RotateCcw,
  Sliders,
  Terminal,
  Cpu,
  BookOpen,
} from 'lucide-react';

interface ConceptGuide {
  id: string;
  title: string;
  database: string;
  summary: string;
  detailedExplanation: string;
  campusExample: string;
  keyTakeaway: string;
}

const NOSQL_TOPICS: ConceptGuide[] = [
  {
    id: 'sql-vs-nosql',
    title: '1. SQL vs. NoSQL Architectural Paradigms',
    database: 'General Theory',
    summary: 'Relational 3NF tables with joins vs. Polyglot persistence with specialized data models.',
    detailedExplanation:
      'Relational databases (SQL) enforce strict tabular schemas, normalization (3NF) to minimize redundancy, and ACID guarantees via pessimistic locking. However, modeling complex campus relationships (like recursive prerequisite chains and polymorphic student portfolios) leads to an "impedance mismatch" requiring multi-table joins with exponential O(N * M) query complexity. NoSQL relaxes rigid tabular constraints, providing specialized models (Document, Graph, Key-Value, Wide-Column) tailored for specific computational access patterns.',
    campusExample:
      'In our campus project, modeling a student who has 8 skills, 4 club roles, and 6 course prerequisites in SQL would require 5 separate join tables. In MongoDB, the student is a self-contained polymorphic document; in Neo4j, relationships are first-class edges traversed in O(1) time per pointer hop.',
    keyTakeaway: 'Choose SQL for fixed-schema accounting; choose NoSQL for high velocity, polymorphic schemas, or deep relationship traversals.',
  },
  {
    id: 'why-document',
    title: '2. Why Document Databases are Useful Here (MongoDB)',
    database: 'MongoDB',
    summary: 'Flexible schema, polymorphic entities, and expressive aggregation pipelines.',
    detailedExplanation:
      'Document databases store semi-structured data as hierarchical JSON/BSON documents. They excel when entities possess dynamic, varying attributes (schema flexibility) and when entities are frequently retrieved as single coherent units (document-oriented access pattern). Secondary indexing and nested aggregation pipelines allow rich filtering and statistical group rollups.',
    campusExample:
      'Student profiles contain heterogeneous fields: some students have research publication records, others have facility memberships or self-declared project tags. MongoDB allows storing these variations without altering global table schemas or executing schema migrations.',
    keyTakeaway: 'MongoDB acts as our platform’s primary "source of truth" for core entity definitions.',
  },
  {
    id: 'why-keyvalue',
    title: '3. Why Key-Value Databases are Useful Here (Redis)',
    database: 'Redis',
    summary: 'Sub-millisecond in-memory cache-aside speed layer and sliding rate limiting.',
    detailedExplanation:
      'Key-Value stores provide dictionary lookups in O(1) time complexity by operating purely in RAM. Since traversing graph dependencies and querying disk-based document collections introduces latency (5-20ms), Redis is placed in front of primary databases to cache frequently requested responses, student dashboards, and candidate recommendations with Time-To-Live (TTL) expiration.',
    campusExample:
      'When Alex Chen opens the dashboard, the system checks Redis for "dashboard:student:STU_001". On a cache hit, the response returns in 0.8ms, bypassing disk I/O and query planning entirely.',
    keyTakeaway: 'Redis delivers an 18.6x speedup over primary store cold misses.',
  },
  {
    id: 'why-cassandra',
    title: '4. Why Cassandra is Useful for Event Data (Wide-Column)',
    database: 'Apache Cassandra',
    summary: 'High-throughput append-only clickstream ingestion with Log-Structured Merge-Trees.',
    detailedExplanation:
      'Traditional B-Tree databases suffer from write amplification and page lock contention when ingesting millions of append-heavy activity events. Apache Cassandra uses Log-Structured Merge-Trees (LSM): incoming writes are sequentially appended to a CommitLog on disk and sorted in an in-memory Memtable before flushing to immutable SSTables. This yields linear write scalability with zero read-before-write overhead.',
    campusExample:
      'Every time a student views a course, interacts with a project recommendation, or checks resource availability, an immutable event is appended into Cassandra with partition key (student_id, activity_date).',
    keyTakeaway: 'Cassandra handles append-heavy telemetry without degrading the primary MongoDB document database.',
  },
  {
    id: 'why-graph',
    title: '5. Why Graph Databases are Useful for Dependencies (Neo4j)',
    database: 'Neo4j',
    summary: 'Index-Free Adjacency enabling linear-time transitive closure and prerequisite traversals.',
    detailedExplanation:
      'In a graph database, relationships are first-class entities stored as direct double-linked pointers between nodes (Index-Free Adjacency). Traversing from a node to its neighbor does not require searching a secondary index table; the engine simply follows the physical pointer in O(1) time per relationship. This makes multi-hop traversal complexity O(k) relative to the number of traversed edges, rather than O(N) relative to global database size.',
    campusExample:
      'Computing whether Alex Chen satisfies all prerequisites for CS480 requires finding if (:Course {code: "CS480"})-[:REQUIRES_PREREQUISITE*1..3]->(p:Skill) are all possessed by Alex. Neo4j resolves this recursive DAG traversal in 3.8ms.',
    keyTakeaway: 'Graph databases eliminate relational foreign-key joins when modeling prerequisite networks.',
  },
  {
    id: 'acid-vs-base',
    title: '6. ACID vs. BASE Concurrency Paradigms',
    database: 'General Theory',
    summary: 'Strict immediate consistency vs. Basically Available, Soft state, Eventual consistency.',
    detailedExplanation:
      'ACID (Atomicity, Consistency, Isolation, Durability) guarantees strict transactional safety using two-phase locking or multi-version concurrency control (MVCC). In contrast, BASE (Basically Available, Soft state, Eventual consistency) prioritizes system availability across network partitions, accepting transient inconsistency while data propagates asynchronously to replicas.',
    campusExample:
      'Course enrollment and student grade transcripts in MongoDB enforce ACID properties to prevent double-enrollment. In contrast, student clickstream activity logs in Cassandra use BASE: writes succeed immediately, and global order reconciles eventually.',
    keyTakeaway: 'Polyglot systems combine ACID for authoritative assets and BASE for high-volume telemetry.',
  },
  {
    id: 'cap-theorem',
    title: '7. The CAP Theorem in Multi-Model Systems',
    database: 'General Theory',
    summary: 'Brewer’s Theorem: Choosing Consistency (CP) vs. Availability (AP) under partition.',
    detailedExplanation:
      'Under network partition (P), a distributed system cannot simultaneously guarantee both linearizable consistency (C) and 100% availability (A). MongoDB and Redis operate as CP systems (rejecting writes or stepping down when quorum is lost). Cassandra operates as an AP system (accepting writes on any available replica, later reconciling via hinted handoffs and read-repair).',
    campusExample:
      'If the campus network experiences a subnet partition, Cassandra nodes continue logging student clickstreams locally (AP), whereas MongoDB will prevent course catalog modifications until primary replica quorum is restored (CP).',
    keyTakeaway: 'Our polyglot platform consciously combines CP (MongoDB, Redis) with AP (Cassandra).',
  },
  {
    id: 'eventual-consistency',
    title: '8. Eventual Consistency in Synchronization',
    database: 'Service Layer',
    summary: 'How mutations propagate from MongoDB to Neo4j, Redis, and Cassandra.',
    detailedExplanation:
      'Rather than using expensive, fragile distributed transactions (Two-Phase Commit / 2PC) across four heterogeneous databases, our backend employs asynchronous service-layer propagation. When a student adds a skill, MongoDB updates immediately. The backend then propagates the edge to Neo4j, invalidates the Redis cache, and appends a Cassandra audit log.',
    campusExample:
      'For a brief window (e.g. 5-15 milliseconds), the Neo4j graph may still reflect the prior skillset while the propagation worker completes. The system converges to eventual consistency automatically.',
    keyTakeaway: 'Eventual consistency delivers high write throughput while maintaining convergence.',
  },
  {
    id: 'denormalization',
    title: '9. Query-Driven Denormalization',
    database: 'Cassandra / MongoDB',
    summary: 'Duplicating data across tables to optimize specific read query patterns.',
    detailedExplanation:
      'In wide-column stores like Cassandra, joins do not exist. Schemas must be designed strictly around the queries they answer. If the application needs to query activity by student AND activity by resource, the same event is written into two distinct denormalized tables: student_activity_by_day and resource_activity_by_date.',
    campusExample:
      'Writing an event records it to both partition (student_id, date) and partition (resource_id, date). Storage space is traded to guarantee single-partition, sub-5ms read queries without joins.',
    keyTakeaway: 'In Cassandra, model tables for queries, not for normalized entities.',
  },
  {
    id: 'partition-keys',
    title: '10. Partition Keys & Token Rings',
    database: 'Cassandra',
    summary: 'Consistent hashing via Murmur3 to locate the responsible node in a cluster ring.',
    detailedExplanation:
      'The Partition Key is hashed by Cassandra’s partitioner (Murmur3Partitioner) into a 64-bit integer token (between -2^63 and 2^63-1). The cluster ring routes the write directly to the node responsible for that token range. All rows sharing the same partition key reside physically together on the same cluster node.',
    campusExample:
      'In "PRIMARY KEY ((student_id, activity_date), event_timestamp)", the compound partition key (student_id, activity_date) ensures that all events for a student on a specific day are stored on a single node.',
    keyTakeaway: 'Partition keys determine which cluster node holds the data.',
  },
  {
    id: 'clustering-keys',
    title: '11. Clustering Keys & Physical On-Disk Sort Order',
    database: 'Cassandra',
    summary: 'Ordering rows sequentially within a single partition on disk.',
    detailedExplanation:
      'While the partition key determines which node holds the partition, Clustering Keys determine the physical sorted sequence of rows within that partition’s SSTable on disk. By specifying "WITH CLUSTERING ORDER BY (event_timestamp DESC)", Cassandra physically stores the most recent events first.',
    campusExample:
      'Retrieving the student’s latest 20 activities requires reading the first 20 sequential bytes of the SSTable partition, with zero memory sorting required.',
    keyTakeaway: 'Clustering keys govern sequential on-disk row order within a partition.',
  },
  {
    id: 'indexing',
    title: '12. Indexing Strategies across NoSQL Models',
    database: 'MongoDB / Neo4j',
    summary: 'B-Trees vs. Hash Indexes vs. SSTable Bloom Filters vs. Graph Pointers.',
    detailedExplanation:
      'MongoDB uses clustered and secondary B-Trees (WiredTiger) allowing fast logarithmic range searches. Redis uses in-memory Hash Tables with O(1) key lookups. Cassandra uses SSTable index files and in-memory Bloom Filters to rapidly test whether an SSTable contains a partition key without performing disk reads. Neo4j avoids global index traversals by storing pointer records directly on nodes.',
    campusExample:
      'MongoDB indexes student email via unique B-Tree; Cassandra uses Bloom filters to skip irrelevant SSTables; Neo4j uses memory pointer references for skill prerequisite traversals.',
    keyTakeaway: 'Each database model implements indexing tailored to its physical storage medium.',
  },
  {
    id: 'graph-traversal',
    title: '13. Graph Traversal Algorithms & Topological Sorting',
    database: 'Neo4j',
    summary: 'Kahn’s algorithm, Breadth-First Search (BFS), and shortest paths over DAGs.',
    detailedExplanation:
      'Prerequisite dependencies form a Directed Acyclic Graph (DAG). To generate a valid personalized learning path, the system performs a topological sort: any prerequisite skill u must appear before course v if edge (u)-[:PREREQUISITE_OF]->(v) exists. Cycle detection ensures academic catalogs contain no circular dependency deadlocks.',
    campusExample:
      'Our recommendation engine traverses Alex Chen’s graph to find the shortest prerequisite chain connecting Python to AI/ML Engineer: Python -> Machine Learning -> Deep Learning -> Job.',
    keyTakeaway: 'Topological sort guarantees students take courses in strict prerequisite sequence.',
  },
  {
    id: 'polyglot-persistence',
    title: '14. Polyglot Persistence: Synthesis of the 4 Stores',
    database: 'Full Platform',
    summary: 'The right database for the right job, coordinated through unified backend services.',
    detailedExplanation:
      'Polyglot persistence acknowledges that no single database model excels at all access patterns. Rather than compromise on a monolithic relational database or try to use a document store for everything, our campus platform synthesizes MongoDB (entities), Neo4j (relationships), Redis (speed layer), and Cassandra (telemetry).',
    campusExample:
      'A single user click triggers a Redis cache read (0.8ms); on miss, MongoDB loads the student (4.7ms), Neo4j navigates the DAG (10.1ms), Cassandra logs the audit (2.5ms), and Redis warms the cache (0.8ms). Total SLA: ~19ms.',
    keyTakeaway: 'Polyglot persistence delivers optimal performance, scalability, and semantic modeling.',
  },
];

export function NoSqlArchitectureView() {
  const [activeTab, setActiveTab] = useState<'demos' | 'curriculum'>('demos');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('sql-vs-nosql');

  // =========================================================================
  // Interactive Demo 1: Cache Stale-Data & Invalidation Simulator
  // =========================================================================
  const [demo1Step, setDemo1Step] = useState<number>(1);
  const [demo1MongoGpa, setDemo1MongoGpa] = useState<number>(3.82);
  const [demo1RedisGpa, setDemo1RedisGpa] = useState<number>(3.82);
  const [demo1CacheStatus, setDemo1CacheStatus] = useState<'WARM_HIT' | 'STALE' | 'INVALIDATED'>('WARM_HIT');

  const handleUpdateMongoSource = () => {
    setDemo1MongoGpa(3.95); // update source
    setDemo1Step(2);
    setDemo1CacheStatus('STALE');
  };

  const handleInvalidateCache = () => {
    setDemo1Step(3);
    setDemo1CacheStatus('INVALIDATED');
  };

  const handleFetchFreshCache = () => {
    setDemo1RedisGpa(demo1MongoGpa); // re-populates from Mongo
    setDemo1Step(4);
    setDemo1CacheStatus('WARM_HIT');
  };

  const handleResetDemo1 = () => {
    setDemo1Step(1);
    setDemo1MongoGpa(3.82);
    setDemo1RedisGpa(3.82);
    setDemo1CacheStatus('WARM_HIT');
  };

  // =========================================================================
  // Interactive Demo 2: Graph Traversal Stepper
  // =========================================================================
  const [demo2HopIndex, setDemo2HopIndex] = useState<number>(0);
  const graphHops = [
    { from: 'Student (Alex Chen)', to: 'Skill (Python)', rel: 'STUDENT_HAS_SKILL', desc: 'Step 1: Check existing student skills verified in profile' },
    { from: 'Skill (Python)', to: 'Skill (Machine Learning)', rel: 'SKILL_PREREQUISITE_OF', desc: 'Step 2: Traverse prerequisite DAG to identify unlockable skills' },
    { from: 'Skill (Machine Learning)', to: 'Course (CS420)', rel: 'COURSE_TEACHES', desc: 'Step 3: Connect skill to academic course offering' },
    { from: 'Skill (Machine Learning)', to: 'Skill (Deep Learning)', rel: 'SKILL_PREREQUISITE_OF', desc: 'Step 4: Transitive closure hop over 2nd-level prerequisite edge' },
    { from: 'Skill (Deep Learning)', to: 'Job (AI/ML Engineer)', rel: 'JOB_REQUIRES', desc: 'Step 5: Final hop connecting to target career objective' },
  ];

  // =========================================================================
  // Interactive Demo 3: Cassandra Consistent Hashing Token Ring
  // =========================================================================
  const [demo3StudentId, setDemo3StudentId] = useState('STU_001');
  const [demo3Date, setDemo3Date] = useState('2026-10-08');

  // Simulated Murmur3 Token calculation
  const getSimulatedToken = (key: string): { token: string; targetNode: string; angle: number } => {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash |= 0;
    }
    const token = Math.abs(hash * 48271) % 100000;
    const nodeIndex = token % 6;
    const nodes = ['Node-1 (East Rack 1)', 'Node-2 (East Rack 2)', 'Node-3 (West Rack 1)', 'Node-4 (West Rack 2)', 'Node-5 (Central 1)', 'Node-6 (Central 2)'];
    return {
      token: `${token.toString().padStart(6, '0')}`,
      targetNode: nodes[nodeIndex],
      angle: (nodeIndex / 6) * 360,
    };
  };

  const partitionSim = getSimulatedToken(`${demo3StudentId}:${demo3Date}`);
  const selectedTopic = NOSQL_TOPICS.find((t) => t.id === selectedTopicId) || NOSQL_TOPICS[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <GraduationCap className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-indigo-300">Phase 10 Educational Module</span>
            </div>
            <h2 className="text-xl font-bold text-white">NoSQL Architecture & Educational Demonstrations</h2>
            <p className="text-xs text-slate-400 mt-1">
              Academic course concepts contextualized directly in this campus resource intelligence platform.
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('demos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'demos'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Interactive Demos (3)
            </button>
            <button
              onClick={() => setActiveTab('curriculum')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'curriculum'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              14 Syllabus Topics
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE DEMOS */}
      {activeTab === 'demos' && (
        <div className="space-y-6">
          {/* ================================================================= */}
          {/* DEMO 1: Cache Stale-Data & Cache-Aside Simulation */}
          {/* ================================================================= */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold">
                  Demo 1
                </span>
                <h3 className="text-sm font-bold text-white">Cache Staleness & Cache-Aside Invalidation Simulator</h3>
              </div>
              <button
                onClick={handleResetDemo1}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Demo
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Demonstrates what happens when primary source data changes in MongoDB while an in-memory Redis cache
              still holds a prior cached snapshot (stale cache), and how proactive invalidation restores consistency.
            </p>

            {/* Visual State Comparison: Mongo vs Redis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* MongoDB Box */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Database className="w-4 h-4" /> Primary Source (MongoDB)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Collection: students</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg text-xs font-mono text-slate-200 border border-slate-800 space-y-1">
                  <div>studentId: &quot;STU_001&quot;</div>
                  <div>name: &quot;Alex Chen&quot;</div>
                  <div className="text-emerald-300 font-bold">gpa: {demo1MongoGpa.toFixed(2)}</div>
                  <div>lastUpdated: {demo1Step >= 2 ? 'Just now' : 'Yesterday'}</div>
                </div>
              </div>

              {/* Redis Cache Box */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" /> Cache Speed Layer (Redis)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Key: dashboard:student:STU_001</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg text-xs font-mono text-slate-200 border border-slate-800 space-y-1">
                  {demo1CacheStatus === 'INVALIDATED' ? (
                    <div className="text-slate-500 italic py-3 text-center">(nil) Key Expired / Deleted</div>
                  ) : (
                    <>
                      <div>cachedData: &#123; name: &quot;Alex Chen&quot; &#125;</div>
                      <div className={demo1CacheStatus === 'STALE' ? 'text-amber-400 font-bold' : 'text-emerald-300 font-bold'}>
                        cachedGpa: {demo1RedisGpa.toFixed(2)}
                      </div>
                      <div className="text-slate-400 text-[10px]">TTL: 300s Remaining</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Staleness Status Callout */}
            {demo1CacheStatus === 'STALE' && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
                <span>
                  <strong>Stale Cache Alert!</strong> MongoDB has GPA 3.95, but Redis is still serving cached GPA 3.82.
                  A user reading from cache receives stale data until the cache key expires or is explicitly invalidated.
                </span>
              </div>
            )}

            {demo1CacheStatus === 'INVALIDATED' && (
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-400" />
                <span>
                  <strong>Cache Invalidated!</strong> Key &quot;dashboard:student:STU_001&quot; removed from Redis. The next client request will trigger a Cache Miss and reload fresh data from MongoDB.
                </span>
              </div>
            )}

            {/* Stepper Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleUpdateMongoSource}
                disabled={demo1Step >= 2}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition disabled:opacity-40"
              >
                <span>Step 1: Update GPA in MongoDB to 3.95</span>
              </button>

              <button
                onClick={handleInvalidateCache}
                disabled={demo1Step !== 2}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition disabled:opacity-40"
              >
                <span>Step 2: Invalidate Redis Cache (DEL key)</span>
              </button>

              <button
                onClick={handleFetchFreshCache}
                disabled={demo1Step !== 3}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-40"
              >
                <span>Step 3: Read Request (Cache-Aside Miss & Repopulate)</span>
              </button>
            </div>
          </div>

          {/* ================================================================= */}
          {/* DEMO 2: Graph Traversal Stepper */}
          {/* ================================================================= */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold">
                  Demo 2
                </span>
                <h3 className="text-sm font-bold text-white">Graph Traversal & Index-Free Adjacency Step-by-Step Simulator</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Hop {demo2HopIndex + 1} of {graphHops.length}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Shows how Neo4j resolves multi-hop dependency queries by directly dereferencing relationship pointers
              (Index-Free Adjacency in O(1) time per edge) without executing secondary index table joins.
            </p>

            {/* Stepper Display */}
            <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold">
                  {graphHops[demo2HopIndex].from}
                </div>
                <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
                  <span>──[ {graphHops[demo2HopIndex].rel} ]──▶</span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                  {graphHops[demo2HopIndex].to}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <span className="font-semibold text-indigo-400">Traversal Mechanics: </span>
                {graphHops[demo2HopIndex].desc}
              </div>

              {/* Step Navigation Controls */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setDemo2HopIndex((prev) => Math.max(0, prev - 1))}
                  disabled={demo2HopIndex === 0}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs disabled:opacity-40"
                >
                  Previous Hop
                </button>
                <div className="flex items-center gap-1">
                  {graphHops.map((_, idx) => (
                    <span
                      key={idx}
                      className={`w-2.5 h-2.5 rounded-full inline-block ${
                        demo2HopIndex === idx ? 'bg-indigo-500' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setDemo2HopIndex((prev) => Math.min(graphHops.length - 1, prev + 1))}
                  disabled={demo2HopIndex === graphHops.length - 1}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-40"
                >
                  Next Hop
                </button>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* DEMO 3: Cassandra Consistent Hashing Token Ring Visualizer */}
          {/* ================================================================= */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold">
                  Demo 3
                </span>
                <h3 className="text-sm font-bold text-white">Cassandra Consistent Hashing & Token Ring Partition Visualizer</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Murmur3Partitioner</span>
            </div>

            <p className="text-xs text-slate-400">
              Demonstrates how Cassandra partitions time-series records across a masterless peer-to-peer ring using
              consistent hashing on the compound partition key (student_id, activity_date).
            </p>

            {/* Inputs for Token Test */}
            <div className="flex flex-wrap items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Partition Key Part 1 (student_id):</span>
                <select
                  value={demo3StudentId}
                  onChange={(e) => setDemo3StudentId(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-200"
                >
                  <option value="STU_001">STU_001 (Alex Chen)</option>
                  <option value="STU_002">STU_002 (Priya Sharma)</option>
                  <option value="STU_003">STU_003 (David Kim)</option>
                  <option value="STU_004">STU_004 (Emily Watson)</option>
                </select>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Partition Key Part 2 (activity_date):</span>
                <select
                  value={demo3Date}
                  onChange={(e) => setDemo3Date(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-200"
                >
                  <option value="2026-10-08">2026-10-08</option>
                  <option value="2026-10-09">2026-10-09</option>
                  <option value="2026-10-10">2026-10-10</option>
                </select>
              </div>

              <div className="pt-4 sm:pt-0">
                <span className="text-slate-500 text-[10px] block">Calculated Murmur3 Token:</span>
                <span className="font-mono text-amber-400 font-bold">{partitionSim.token}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] block">Assigned Cluster Node:</span>
                <span className="font-bold text-emerald-400">{partitionSim.targetNode}</span>
              </div>
            </div>

            {/* Educational Disclaimer Required by Prompt */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400">
              <strong className="text-slate-300">Academic Disclaimer: </strong>
              This is a conceptual educational visualization demonstrating distributed hashing mechanics and token mapping for course syllabus illustration. It does not constitute a formal distributed systems benchmark or multi-datacenter network experiment.
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: 14 SYLLABUS TOPICS CURRICULUM */}
      {activeTab === 'curriculum' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Topics List */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2 max-h-[700px] overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
              Syllabus Concept Registry ({NOSQL_TOPICS.length})
            </h3>
            {NOSQL_TOPICS.map((topic) => (
              <button
                key={topic.id}
                onClick={() => setSelectedTopicId(topic.id)}
                className={`w-full text-left p-3 rounded-xl transition flex flex-col gap-1 border ${
                  selectedTopicId === topic.id
                    ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{topic.title}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-slate-800 text-indigo-300">
                    {topic.database}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{topic.summary}</p>
              </button>
            ))}
          </div>

          {/* Right Column: In-Depth Topic Detail Panel */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="pb-4 border-b border-slate-800 flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {selectedTopic.database}
                </span>
                <h3 className="text-xl font-bold text-white mt-2">{selectedTopic.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{selectedTopic.summary}</p>
              </div>
            </div>

            {/* Detailed Theoretical Explanation */}
            <div>
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                Theoretical Concept & Architecture
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                {selectedTopic.detailedExplanation}
              </p>
            </div>

            {/* Campus Project Implementation Example */}
            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                Concrete Implementation in this Project
              </h4>
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-slate-300 leading-relaxed">
                {selectedTopic.campusExample}
              </div>
            </div>

            {/* Key Takeaway Callout */}
            <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-xs text-indigo-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                <strong>Academic Synthesis:</strong> {selectedTopic.keyTakeaway}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
