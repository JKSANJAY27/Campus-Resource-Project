import mongoose from 'mongoose';
import { dbManager } from '../config/database.js';
import { ENV } from '../config/env.js';
import { StudentModel, CourseModel, SkillModel, ProjectModel } from '../models/mongo/index.js';

// ============================================================================
// Phase 12 — Advanced NoSQL Demonstrations Service
//
// Each demonstration module clearly separates:
//   - ACTUAL: Operations executed against real database instances
//   - SIMULATED: Educational illustrations where full distributed
//     infrastructure (multi-node clusters, cross-DC replication) is
//     impractical on a single Docker Compose deployment
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export interface DemoResult {
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

export interface DemoStep {
  step: number;
  label: string;
  detail: string;
  latencyMs?: number;
  result?: unknown;
}

// ============================================================================
// 1. MongoDB Sharding Concepts (Simulated)
// ============================================================================

export async function demoMongoSharding(): Promise<DemoResult> {
  const steps: DemoStep[] = [];
  const start = performance.now();

  // Step 1: Fetch actual documents to use as simulation input
  let docCount = 0;
  let sampleDocs: Array<{ studentId: string; department: string }> = [];
  try {
    if (mongoose.connection.readyState !== 1) {
      await dbManager.connectMongo();
    }
    docCount = await StudentModel.countDocuments();
    sampleDocs = await StudentModel.find({}, { studentId: 1, department: 1, _id: 0 }).lean().limit(200);
    steps.push({
      step: 1,
      label: 'Fetch document metadata from MongoDB',
      detail: `Retrieved ${sampleDocs.length} student documents (out of ${docCount} total) for shard-distribution simulation.`,
      latencyMs: Number((performance.now() - start).toFixed(2)),
    });
  } catch (err: any) {
    steps.push({
      step: 1,
      label: 'Fetch document metadata from MongoDB',
      detail: `Could not connect to MongoDB: ${err.message}. Using synthetic fallback data.`,
      latencyMs: Number((performance.now() - start).toFixed(2)),
    });
    // Synthetic fallback
    const depts = ['Computer Science', 'Electrical Engineering', 'Mathematics', 'Physics', 'Biology'];
    sampleDocs = Array.from({ length: 100 }, (_, i) => ({
      studentId: `STU_${String(i + 1).padStart(3, '0')}`,
      department: depts[i % depts.length],
    }));
    docCount = sampleDocs.length;
  }

  // Step 2: Simulate hash-based sharding
  const numShards = 3;
  const shardBuckets: Record<string, string[]> = {};
  for (let i = 0; i < numShards; i++) shardBuckets[`shard_${i}`] = [];

  const simpleHash = (key: string): number => {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  };

  for (const doc of sampleDocs) {
    const shardIndex = simpleHash(doc.studentId) % numShards;
    shardBuckets[`shard_${shardIndex}`].push(doc.studentId);
  }

  const shardDistribution = Object.entries(shardBuckets).map(([shard, docs]) => ({
    shard,
    documentCount: docs.length,
    percentage: ((docs.length / sampleDocs.length) * 100).toFixed(1) + '%',
    sampleDocIds: docs.slice(0, 5),
  }));

  steps.push({
    step: 2,
    label: 'Simulate hash-based shard key distribution',
    detail: `Distributed ${sampleDocs.length} documents across ${numShards} virtual shards using hash(studentId). Shard key: studentId.`,
    result: shardDistribution,
  });

  // Step 3: Simulate range-based sharding by department
  const rangeShards: Record<string, string[]> = {};
  for (const doc of sampleDocs) {
    const dept = doc.department || 'Unknown';
    if (!rangeShards[dept]) rangeShards[dept] = [];
    rangeShards[dept].push(doc.studentId);
  }
  const rangeDistribution = Object.entries(rangeShards).map(([dept, docs]) => ({
    rangeShard: dept,
    documentCount: docs.length,
    percentage: ((docs.length / sampleDocs.length) * 100).toFixed(1) + '%',
  }));

  steps.push({
    step: 3,
    label: 'Simulate range-based shard key distribution',
    detail: `Range-based sharding on 'department' field. Note: range sharding can create hot partitions if keys are not uniformly distributed.`,
    result: rangeDistribution,
  });

  // Step 4: Hotspot analysis
  const maxBucket = Math.max(...Object.values(shardBuckets).map(b => b.length));
  const minBucket = Math.min(...Object.values(shardBuckets).map(b => b.length));
  const skewRatio = maxBucket > 0 ? (maxBucket / Math.max(minBucket, 1)).toFixed(2) : '1.00';

  steps.push({
    step: 4,
    label: 'Hotspot / skew analysis',
    detail: `Hash-based skew ratio: ${skewRatio}x (ideal: 1.00). A ratio >2.0 indicates poor shard key choice. Range-based sharding on department produces ${Object.keys(rangeShards).length} uneven partitions.`,
    result: { hashSkewRatio: parseFloat(skewRatio), rangeBucketCount: Object.keys(rangeShards).length },
  });

  return {
    title: 'MongoDB Horizontal Scaling / Sharding Concepts',
    category: 'simulated',
    database: 'MongoDB',
    description:
      'Demonstrates how MongoDB sharding distributes documents across virtual shards using hash-based and range-based shard keys. Uses real document IDs fetched from the local MongoDB instance but simulates the multi-shard topology.',
    whySimulated:
      'MongoDB sharding requires a minimum of 3 mongos routers, 3 config server replicas, and at least 2 shard replica sets — far exceeding what is practical on a single Docker Compose deployment for an academic project. Instead, we simulate the distribution algorithm to demonstrate understanding of shard key selection, hash vs. range partitioning, and hotspot analysis.',
    limitations: [
      'No actual mongos router or config server is deployed',
      'Chunk migration and balancer behavior cannot be observed',
      'Cross-shard queries and scatter-gather overhead are not measurable',
      'Real sharding overhead (network latency, config server consensus) is absent',
    ],
    steps,
    metrics: {
      totalDocuments: sampleDocs.length,
      shardCount: numShards,
      hashSkewRatio: parseFloat(skewRatio),
    },
    educationalNotes: [
      'MongoDB uses a shard key to partition data across shards via either hashed or ranged distribution.',
      'Hash-based sharding provides more uniform distribution but sacrifices range query locality.',
      'Range-based sharding preserves query locality for range scans but risks hot partitions.',
      'A good shard key has high cardinality, writes distributed evenly, and supports common query patterns.',
      'In production, each shard is typically a replica set for fault tolerance.',
    ],
  };
}

// ============================================================================
// 2. Cassandra Partitioning (Actual)
// ============================================================================

export async function demoCassandraPartitioning(): Promise<DemoResult> {
  const steps: DemoStep[] = [];
  let isLive = false;

  try {
    const client = dbManager.getCassandraClient();
    const hosts = client.getState()?.getConnectedHosts();
    if (hosts && hosts.length > 0) {
      isLive = true;
    } else {
      await client.connect();
      isLive = !!client.getState()?.getConnectedHosts()?.length;
    }
  } catch {
    isLive = false;
  }

  if (isLive) {
    const client = dbManager.getCassandraClient();

    // Step 1: Describe the table schema and partition keys
    steps.push({
      step: 1,
      label: 'Identify partition keys from schema',
      detail: `Table 'student_activity_by_day': Partition key = (student_id, activity_date). Clustering key = (event_timestamp DESC, event_id ASC). This means all activity for a student on a given day resides on exactly one partition, sorted by timestamp.`,
      result: {
        table: 'student_activity_by_day',
        partitionKey: ['student_id', 'activity_date'],
        clusteringKey: ['event_timestamp DESC', 'event_id ASC'],
      },
    });

    // Step 2: Query WITH partition key (efficient single-partition read)
    const t1 = performance.now();
    let partitionQueryRows = 0;
    try {
      const res = await client.execute(
        `SELECT * FROM ${ENV.CASSANDRA_KEYSPACE}.student_activity_by_day WHERE student_id = ? AND activity_date = ? LIMIT 20`,
        ['STU_001', '2026-01-15'],
        { prepare: true }
      );
      partitionQueryRows = res.rowLength;
    } catch { /* table might be empty */ }
    const t1Elapsed = Number((performance.now() - t1).toFixed(2));

    steps.push({
      step: 2,
      label: 'Query WITH full partition key (single-partition read)',
      detail: `SELECT * FROM student_activity_by_day WHERE student_id='STU_001' AND activity_date='2026-01-15'. Returned ${partitionQueryRows} rows.`,
      latencyMs: t1Elapsed,
      result: { rows: partitionQueryRows, queryType: 'single-partition', efficient: true },
    });

    // Step 3: Query summary table with single-column partition key
    const t2 = performance.now();
    let summaryRows = 0;
    try {
      const res = await client.execute(
        `SELECT * FROM ${ENV.CASSANDRA_KEYSPACE}.daily_activity_summary WHERE activity_date = ?`,
        ['2026-01-15'],
        { prepare: true }
      );
      summaryRows = res.rowLength;
    } catch { /* */ }
    const t2Elapsed = Number((performance.now() - t2).toFixed(2));

    steps.push({
      step: 3,
      label: 'Query daily_activity_summary (single partition key)',
      detail: `Partition key = activity_date only. Clustering by action_type allows efficient per-day rollups. Returned ${summaryRows} rows.`,
      latencyMs: t2Elapsed,
      result: { rows: summaryRows, queryType: 'single-partition' },
    });

    // Step 4: Token function demo
    const t3 = performance.now();
    let tokenResult: string | null = null;
    try {
      const res = await client.execute(
        `SELECT token(student_id, activity_date) AS partition_token FROM ${ENV.CASSANDRA_KEYSPACE}.student_activity_by_day LIMIT 5`
      );
      tokenResult = res.rows.map(r => r['partition_token']?.toString()).filter(Boolean).join(', ');
    } catch { /* */ }
    const t3Elapsed = Number((performance.now() - t3).toFixed(2));

    steps.push({
      step: 4,
      label: 'Inspect token() function for partition placement',
      detail: `token(student_id, activity_date) reveals which virtual node (vnode) owns each partition. Sample tokens: ${tokenResult || '(no data)'}. Cassandra uses a Murmur3 partitioner to hash the partition key into a token in the range [-2^63, 2^63).`,
      latencyMs: t3Elapsed,
    });

  } else {
    // Fallback simulation
    steps.push({
      step: 1,
      label: 'Cassandra not connected — simulating partition behavior',
      detail: 'Using educational simulation of Cassandra partitioning concepts.',
    });

    const tokenRing = Array.from({ length: 256 }, (_, i) => ({
      vnode: i,
      tokenRangeStart: BigInt(-2n ** 63n) + (BigInt(i) * (2n ** 64n / 256n)),
    }));

    const samplePartitions = [
      { key: 'STU_001:2026-01-15', simulatedToken: -4521340982345n },
      { key: 'STU_001:2026-01-16', simulatedToken: 7812341928345n },
      { key: 'STU_002:2026-01-15', simulatedToken: -1234567890123n },
    ];

    steps.push({
      step: 2,
      label: 'Simulated token ring',
      detail: `A ${tokenRing.length}-vnode ring distributes partitions using Murmur3 hash of partition key. Different partition keys land on different vnodes.`,
      result: { vnodeCount: tokenRing.length, samplePartitions },
    });
  }

  return {
    title: 'Cassandra Partitioning',
    category: isLive ? 'actual' : 'simulated',
    database: 'Cassandra',
    description:
      'Demonstrates how Cassandra uses partition keys to place data on specific nodes in the token ring. When Cassandra is live, queries the actual database to show efficient single-partition reads vs. cross-partition scans.',
    whySimulated: isLive
      ? undefined
      : 'Cassandra is not currently connected. Showing educational simulation of the partitioning model.',
    limitations: [
      'Single-node deployment means all partitions reside on the same physical node',
      'Cannot observe true cross-partition latency penalties',
      'Vnode redistribution during node addition is not demonstrable',
    ],
    steps,
    educationalNotes: [
      'Cassandra distributes data by hashing the partition key using the Murmur3 partitioner.',
      'All rows sharing the same partition key are stored together (co-located), enabling efficient reads.',
      'Queries WITHOUT the partition key require a full cluster scan (ALLOW FILTERING), which is expensive.',
      'Composite partition keys (e.g., student_id + activity_date) control data locality granularity.',
      'The clustering key determines the sort order of rows within a partition on disk (SSTable).',
    ],
  };
}

// ============================================================================
// 3. Cassandra Replication Concepts (Simulated)
// ============================================================================

export async function demoCassandraReplication(): Promise<DemoResult> {
  const steps: DemoStep[] = [];

  // Simulate a 6-node ring with RF=3
  const nodes = ['node-A', 'node-B', 'node-C', 'node-D', 'node-E', 'node-F'];
  const rf = 3;

  // Step 1: Show replica placement
  const partitionKey = 'STU_001:2026-01-15';
  const primaryNode = 1; // Simulate hashing places it on node-B
  const replicaNodes = [];
  for (let i = 0; i < rf; i++) {
    replicaNodes.push(nodes[(primaryNode + i) % nodes.length]);
  }

  steps.push({
    step: 1,
    label: 'Replica placement with RF=3 on a 6-node ring',
    detail: `Partition key '${partitionKey}' hashes to token owned by ${nodes[primaryNode]}. With RF=3, replicas are placed on the next ${rf - 1} nodes clockwise: ${replicaNodes.join(' → ')}.`,
    result: { partitionKey, replicationFactor: rf, replicas: replicaNodes },
  });

  // Step 2: Consistency level scenarios
  const consistencyScenarios = [
    {
      level: 'ONE',
      description: 'Write acknowledged after 1 replica confirms. Fastest writes, weakest durability guarantee.',
      nodesRequired: 1,
      tolerateFailures: rf - 1,
      strongConsistency: false,
    },
    {
      level: 'QUORUM',
      description: `Write acknowledged after ${Math.floor(rf / 2) + 1} of ${rf} replicas confirm. Balances latency and consistency. If R + W > RF (e.g., QUORUM reads + QUORUM writes), strong consistency is achieved.`,
      nodesRequired: Math.floor(rf / 2) + 1,
      tolerateFailures: rf - Math.floor(rf / 2) - 1,
      strongConsistency: true,
    },
    {
      level: 'ALL',
      description: `Write acknowledged after all ${rf} replicas confirm. Strongest consistency, but a single replica failure blocks the write.`,
      nodesRequired: rf,
      tolerateFailures: 0,
      strongConsistency: true,
    },
  ];

  steps.push({
    step: 2,
    label: 'Consistency level scenarios',
    detail: 'Cassandra allows tunable consistency per query. The trade-off is between latency, availability, and consistency strength.',
    result: consistencyScenarios,
  });

  // Step 3: Failure scenario simulation
  const failureScenarios = [
    {
      scenario: 'node-C goes down',
      affectedPartitions: 'Partitions where node-C is a replica',
      clOne: { available: true, reason: `${rf - 1} replicas still available; CL=ONE needs only 1` },
      clQuorum: { available: true, reason: `${rf - 1} replicas available >= QUORUM(${Math.floor(rf / 2) + 1})` },
      clAll: { available: false, reason: 'CL=ALL requires all 3 replicas; 1 is down' },
    },
    {
      scenario: 'node-B and node-C both go down',
      affectedPartitions: 'Partitions where both are replicas',
      clOne: { available: true, reason: '1 replica still available for CL=ONE' },
      clQuorum: { available: false, reason: `Only 1 replica available < QUORUM(${Math.floor(rf / 2) + 1})` },
      clAll: { available: false, reason: 'Only 1 of 3 replicas available' },
    },
  ];

  steps.push({
    step: 3,
    label: 'Failure impact on availability at different consistency levels',
    detail: 'Demonstrates how node failures affect read/write availability depending on the chosen consistency level.',
    result: failureScenarios,
  });

  // Step 4: Hinted handoff and read repair
  steps.push({
    step: 4,
    label: 'Hinted handoff & read repair (educational)',
    detail: 'When a replica is temporarily down, the coordinator stores a "hint" and replays the write when the node recovers (hinted handoff). On read, if replicas disagree, Cassandra triggers a "read repair" to reconcile divergent values using the latest timestamp (last-write-wins). Anti-entropy repair (nodetool repair) periodically ensures all replicas converge.',
  });

  return {
    title: 'Cassandra Replication Concepts',
    category: 'simulated',
    database: 'Cassandra',
    description:
      'Simulates how Cassandra replicates data across a multi-node cluster with configurable replication factor and consistency levels.',
    whySimulated:
      'Our Docker Compose deployment runs a single Cassandra node. Multi-node replication requires a cluster of at least 3 nodes with inter-node gossip networking, which would consume excessive resources on a student laptop and add operational complexity disproportionate to the educational value. The simulation faithfully demonstrates the algorithmic concepts.',
    limitations: [
      'No actual multi-node gossip or token negotiation occurs',
      'Hinted handoff and read repair cannot be observed in practice',
      'Network partition behavior between Cassandra nodes is not testable',
      'Actual write latency differences between CL=ONE and CL=QUORUM cannot be measured',
    ],
    steps,
    educationalNotes: [
      'Replication factor (RF) controls how many copies of each partition exist in the cluster.',
      'Consistency level (CL) controls how many replicas must acknowledge a read/write before success.',
      'Strong consistency is achieved when R + W > RF (e.g., QUORUM reads + QUORUM writes with RF=3).',
      'Cassandra favors availability (AP in CAP) — it remains writable even if some replicas are down, at the cost of potential stale reads.',
      'Read repair and anti-entropy repair are background mechanisms to converge divergent replicas.',
    ],
  };
}

// ============================================================================
// 4. Neo4j Indexing (Actual)
// ============================================================================

export async function demoNeo4jIndexing(): Promise<DemoResult> {
  const steps: DemoStep[] = [];
  let isLive = false;

  try {
    const session = dbManager.getNeo4jSession();
    try {
      const res = await session.run('RETURN 1 AS ping');
      isLive = res.records.length > 0;
    } finally {
      await session.close();
    }
  } catch {
    isLive = false;
  }

  if (isLive) {
    // Step 1: List existing indexes
    let session = dbManager.getNeo4jSession();
    let indexList: Array<{ name: string; type: string; labelsOrTypes: string; properties: string; state: string }> = [];
    try {
      const res = await session.run('SHOW INDEXES YIELD name, type, labelsOrTypes, properties, state');
      indexList = res.records.map(r => ({
        name: r.get('name'),
        type: r.get('type'),
        labelsOrTypes: JSON.stringify(r.get('labelsOrTypes')),
        properties: JSON.stringify(r.get('properties')),
        state: r.get('state'),
      }));
    } catch { /* Community edition might restrict SHOW INDEXES */ }
    finally { await session.close(); }

    steps.push({
      step: 1,
      label: 'List existing Neo4j indexes',
      detail: `Found ${indexList.length} indexes in the graph database.`,
      result: indexList.slice(0, 15),
    });

    // Step 2: Query WITH index — lookup by indexed property
    session = dbManager.getNeo4jSession();
    const t1 = performance.now();
    let indexedRows = 0;
    try {
      const res = await session.run(`MATCH (s:Skill {name: 'Python'}) RETURN s.id AS id, s.name AS name, s.category AS category`);
      indexedRows = res.records.length;
    } catch { /* */ }
    finally { await session.close(); }
    const t1Elapsed = Number((performance.now() - t1).toFixed(2));

    steps.push({
      step: 2,
      label: 'Query WITH index: MATCH (s:Skill {name: "Python"})',
      detail: `Property 'name' has an index (skill_name_idx). The index allows O(log n) lookup instead of full label scan. Returned ${indexedRows} node(s).`,
      latencyMs: t1Elapsed,
    });

    // Step 3: Query WITH index — EXPLAIN plan
    session = dbManager.getNeo4jSession();
    let planDescription = '';
    try {
      const res = await session.run(`EXPLAIN MATCH (s:Skill {name: 'Python'}) RETURN s`);
      const plan = res.summary?.plan;
      if (plan) {
        const extractOps = (p: any, depth = 0): string => {
          const indent = '  '.repeat(depth);
          let result = `${indent}${p.operatorType}`;
          if (p.arguments) {
            const details = p.arguments['Details'] || p.arguments['string-representation'] || '';
            if (details) result += ` (${details})`;
          }
          if (p.children) {
            for (const child of p.children) {
              result += '\n' + extractOps(child, depth + 1);
            }
          }
          return result;
        };
        planDescription = extractOps(plan);
      }
    } catch { planDescription = '(EXPLAIN not available)'; }
    finally { await session.close(); }

    steps.push({
      step: 3,
      label: 'EXPLAIN query plan (indexed lookup)',
      detail: `The Neo4j planner uses NodeIndexSeek when an index exists, avoiding a full NodeByLabelScan.`,
      result: { plan: planDescription || '(plan extraction not supported in this driver version)' },
    });

    // Step 4: Query WITHOUT index — unindexed property lookup for comparison
    session = dbManager.getNeo4jSession();
    const t2 = performance.now();
    let unindexedRows = 0;
    try {
      // 'description' is typically not indexed
      const res = await session.run(`MATCH (s:Skill) WHERE s.description CONTAINS 'programming' RETURN count(s) AS cnt`);
      unindexedRows = res.records[0]?.get('cnt')?.toNumber?.() ?? 0;
    } catch { /* */ }
    finally { await session.close(); }
    const t2Elapsed = Number((performance.now() - t2).toFixed(2));

    steps.push({
      step: 4,
      label: 'Query WITHOUT index: WHERE s.description CONTAINS "programming"',
      detail: `Property 'description' has no index. Neo4j must perform a full NodeByLabelScan and filter. Returned ${unindexedRows} matching node(s).`,
      latencyMs: t2Elapsed,
    });

    // Step 5: Comparison summary
    steps.push({
      step: 5,
      label: 'Index vs. full scan comparison',
      detail: `Indexed lookup: ${t1Elapsed}ms. Unindexed scan: ${t2Elapsed}ms. Ratio: ${t2Elapsed > 0 ? (t2Elapsed / Math.max(t1Elapsed, 0.01)).toFixed(2) : 'N/A'}x. Note: with small datasets, the difference may be marginal; the benefit grows with scale.`,
      result: {
        indexedMs: t1Elapsed,
        unindexedMs: t2Elapsed,
        speedupRatio: t2Elapsed > 0 ? Number((t2Elapsed / Math.max(t1Elapsed, 0.01)).toFixed(2)) : null,
      },
    });
  } else {
    steps.push({
      step: 1,
      label: 'Neo4j not connected',
      detail: 'Unable to perform live index demonstration. Neo4j indexes include uniqueness constraints (B+tree backed), range indexes for property lookups, and full-text indexes backed by Lucene. They convert O(n) label scans into O(log n) lookups.',
    });
  }

  return {
    title: 'Neo4j Indexing',
    category: isLive ? 'actual' : 'simulated',
    database: 'Neo4j',
    description:
      'Lists real indexes, runs indexed vs. unindexed queries, and shows EXPLAIN plans to demonstrate how Neo4j indexes convert full label scans into efficient lookups.',
    limitations: [
      'Small dataset may not show dramatic latency differences',
      'Community Edition has limited index types compared to Enterprise',
      'EXPLAIN plan detail varies by driver version',
    ],
    steps,
    educationalNotes: [
      'Neo4j supports B+tree (range), text, point, and full-text (Lucene) indexes.',
      'Uniqueness constraints automatically create a backing index.',
      'Without an index, MATCH (n:Label {prop: value}) performs a full NodeByLabelScan — O(n).',
      'With an index, the same query uses NodeIndexSeek — O(log n).',
      'Composite indexes on multiple properties support queries that filter on all indexed properties.',
      'Use EXPLAIN / PROFILE to inspect query plans and verify index usage.',
    ],
  };
}

// ============================================================================
// 5. MongoDB Indexing (Actual)
// ============================================================================

export async function demoMongoIndexing(): Promise<DemoResult> {
  const steps: DemoStep[] = [];

  let isLive = false;
  try {
    if (mongoose.connection.readyState !== 1) {
      await dbManager.connectMongo();
    }
    isLive = mongoose.connection.readyState === 1;
  } catch {
    isLive = false;
  }

  if (isLive) {
    // Step 1: List indexes on the students collection
    const indexInfo = await StudentModel.collection.indexes();
    steps.push({
      step: 1,
      label: 'List indexes on "students" collection',
      detail: `Found ${indexInfo.length} indexes.`,
      result: indexInfo.map(idx => ({
        name: idx.name,
        key: idx.key,
        unique: idx.unique || false,
      })),
    });

    // Step 2: Indexed query with explain
    const t1 = performance.now();
    const explainIndexed = await StudentModel.collection
      .find({ studentId: 'STU_001' })
      .explain('executionStats');
    const t1Elapsed = Number((performance.now() - t1).toFixed(2));

    const indexedStats = {
      executionTimeMs: (explainIndexed as any)?.executionStats?.executionTimeMillis ?? null,
      totalDocsExamined: (explainIndexed as any)?.executionStats?.totalDocsExamined ?? null,
      totalKeysExamined: (explainIndexed as any)?.executionStats?.totalKeysExamined ?? null,
      nReturned: (explainIndexed as any)?.executionStats?.nReturned ?? null,
      stage: (explainIndexed as any)?.executionStats?.executionStages?.stage
        ?? (explainIndexed as any)?.queryPlanner?.winningPlan?.stage ?? null,
    };

    steps.push({
      step: 2,
      label: 'Indexed query: find({ studentId: "STU_001" })',
      detail: `Field 'studentId' has a unique index. MongoDB uses an IXSCAN (index scan) rather than a COLLSCAN (collection scan).`,
      latencyMs: t1Elapsed,
      result: indexedStats,
    });

    // Step 3: Non-indexed query with explain
    const t2 = performance.now();
    const explainUnindexed = await StudentModel.collection
      .find({ 'completedCourses.grade': 'A+', cgpa: { $gte: 8.0 } })
      .explain('executionStats');
    const t2Elapsed = Number((performance.now() - t2).toFixed(2));

    const unindexedStats = {
      executionTimeMs: (explainUnindexed as any)?.executionStats?.executionTimeMillis ?? null,
      totalDocsExamined: (explainUnindexed as any)?.executionStats?.totalDocsExamined ?? null,
      totalKeysExamined: (explainUnindexed as any)?.executionStats?.totalKeysExamined ?? null,
      nReturned: (explainUnindexed as any)?.executionStats?.nReturned ?? null,
      stage: (explainUnindexed as any)?.executionStats?.executionStages?.stage
        ?? (explainUnindexed as any)?.queryPlanner?.winningPlan?.stage ?? null,
    };

    steps.push({
      step: 3,
      label: 'Non-indexed query: find({ "completedCourses.grade": "A+", cgpa: { $gte: 8.0 } })',
      detail: `This compound filter may fall back to a COLLSCAN if no matching compound index exists, examining all documents.`,
      latencyMs: t2Elapsed,
      result: unindexedStats,
    });

    // Step 4: Aggregation pipeline with index usage
    const t3 = performance.now();
    const aggResult = await StudentModel.aggregate([
      { $match: { department: 'Computer Science' } },
      { $group: { _id: '$currentSemester', count: { $sum: 1 }, avgCgpa: { $avg: '$cgpa' } } },
      { $sort: { _id: 1 } },
    ]);
    const t3Elapsed = Number((performance.now() - t3).toFixed(2));

    steps.push({
      step: 4,
      label: 'Aggregation pipeline: $match → $group → $sort',
      detail: `Aggregated students by semester in department "Computer Science". The $match stage can use the department index to reduce the scan set before grouping.`,
      latencyMs: t3Elapsed,
      result: aggResult.slice(0, 8),
    });

    // Step 5: Comparison
    steps.push({
      step: 5,
      label: 'Index effectiveness summary',
      detail: `Indexed lookup examined ${indexedStats.totalKeysExamined ?? '?'} key(s) and ${indexedStats.totalDocsExamined ?? '?'} doc(s). Unindexed query examined ${unindexedStats.totalDocsExamined ?? '?'} doc(s). Indexes dramatically reduce the working set for selective queries.`,
      result: {
        indexedDocsExamined: indexedStats.totalDocsExamined,
        unindexedDocsExamined: unindexedStats.totalDocsExamined,
        indexedLatencyMs: t1Elapsed,
        unindexedLatencyMs: t2Elapsed,
      },
    });
  } else {
    steps.push({
      step: 1,
      label: 'MongoDB not connected',
      detail: 'MongoDB indexes include single-field, compound, multikey (array), text, and hashed indexes. They convert collection scans O(n) into B-tree lookups O(log n). Use explain("executionStats") to verify index usage.',
    });
  }

  return {
    title: 'MongoDB Indexing',
    category: isLive ? 'actual' : 'simulated',
    database: 'MongoDB',
    description:
      'Runs real explain() plans on indexed vs. non-indexed queries against the live MongoDB instance, showing IXSCAN vs. COLLSCAN behavior and documents examined.',
    limitations: [
      'Small datasets may not show dramatic latency differences',
      'Explain plan format varies across MongoDB versions',
    ],
    steps,
    educationalNotes: [
      'MongoDB uses B-tree indexes (WiredTiger engine) for efficient key-ordered lookups.',
      'IXSCAN = Index Scan (efficient); COLLSCAN = Collection Scan (full table scan).',
      'Compound indexes support queries on any prefix of the indexed fields.',
      'Multikey indexes automatically index each element of an array field.',
      'Text indexes enable full-text search with $text queries.',
      'Use createIndex(), dropIndex(), and explain() to manage and verify indexes.',
      'Covering queries (where all returned fields are in the index) avoid fetching documents entirely.',
    ],
  };
}

// ============================================================================
// 6. Redis TTL and Eviction Behavior (Actual)
// ============================================================================

export async function demoRedisTtlEviction(): Promise<DemoResult> {
  const steps: DemoStep[] = [];
  let isLive = false;

  const redis = dbManager.getRedisClient();
  try {
    if (redis.status !== 'ready') {
      await Promise.race([
        redis.connect().catch(() => {}),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000)),
      ]).catch(() => {});
    }
    isLive = redis.status === 'ready';
  } catch {
    isLive = false;
  }

  if (isLive) {
    const prefix = 'phase12:ttl_demo:';

    // Step 1: Set keys with different TTLs
    const ttlExperiments = [
      { key: `${prefix}short`, value: 'expires-in-3s', ttl: 3 },
      { key: `${prefix}medium`, value: 'expires-in-10s', ttl: 10 },
      { key: `${prefix}long`, value: 'expires-in-60s', ttl: 60 },
      { key: `${prefix}persistent`, value: 'no-expiry', ttl: -1 },
    ];

    for (const exp of ttlExperiments) {
      if (exp.ttl > 0) {
        await redis.set(exp.key, exp.value, 'EX', exp.ttl);
      } else {
        await redis.set(exp.key, exp.value);
      }
    }

    steps.push({
      step: 1,
      label: 'Set keys with different TTL values',
      detail: `Created 4 keys with TTLs of 3s, 10s, 60s, and no-expiry. Redis uses lazy expiration (checked on access) and active expiration (periodic sampling of keys with TTL).`,
      result: ttlExperiments.map(e => ({ key: e.key, ttl: e.ttl === -1 ? 'persistent' : `${e.ttl}s` })),
    });

    // Step 2: Immediately check TTLs
    const ttlCheck: Array<{ key: string; remainingTtl: number; exists: boolean }> = [];
    for (const exp of ttlExperiments) {
      const ttl = await redis.ttl(exp.key);
      const exists = (await redis.exists(exp.key)) === 1;
      ttlCheck.push({ key: exp.key, remainingTtl: ttl, exists });
    }

    steps.push({
      step: 2,
      label: 'Inspect TTL immediately after set',
      detail: `TTL command returns remaining seconds (-1 = no expiry, -2 = key does not exist).`,
      result: ttlCheck,
    });

    // Step 3: Wait 4 seconds, then check which keys survived
    await new Promise(resolve => setTimeout(resolve, 4000));

    const postWaitCheck: Array<{ key: string; remainingTtl: number; expired: boolean }> = [];
    for (const exp of ttlExperiments) {
      const ttl = await redis.ttl(exp.key);
      const exists = (await redis.exists(exp.key)) === 1;
      postWaitCheck.push({ key: exp.key, remainingTtl: ttl, expired: !exists });
    }

    steps.push({
      step: 3,
      label: 'Re-check after 4-second wait',
      detail: `The 3-second TTL key should now be expired. Redis returns TTL = -2 for expired/nonexistent keys.`,
      result: postWaitCheck,
    });

    // Step 4: Demonstrate PERSIST (remove TTL)
    await redis.persist(`${prefix}medium`);
    const persistedTtl = await redis.ttl(`${prefix}medium`);

    steps.push({
      step: 4,
      label: 'PERSIST command — remove expiry from a key',
      detail: `Called PERSIST on the medium-TTL key. Its TTL is now ${persistedTtl} (-1 means no expiry, key is now permanent until explicitly deleted).`,
      result: { key: `${prefix}medium`, ttlAfterPersist: persistedTtl },
    });

    // Step 5: Memory and eviction policy info
    let memoryInfo: Record<string, string> = {};
    try {
      const info = await redis.info('memory');
      const lines = info.split('\r\n').filter(l => l.includes(':'));
      for (const line of lines) {
        const [k, v] = line.split(':');
        if (['used_memory_human', 'maxmemory_human', 'maxmemory_policy', 'used_memory_peak_human'].includes(k)) {
          memoryInfo[k] = v;
        }
      }
    } catch { /* */ }

    steps.push({
      step: 5,
      label: 'Memory usage and eviction policy',
      detail: `Redis eviction policy controls what happens when maxmemory is reached. Our Docker config uses 'volatile-lru' which evicts the least-recently-used key AMONG keys that have a TTL set. Keys without a TTL are never evicted by this policy.`,
      result: memoryInfo,
    });

    // Cleanup demo keys
    for (const exp of ttlExperiments) {
      await redis.del(exp.key).catch(() => {});
    }

  } else {
    steps.push({
      step: 1,
      label: 'Redis not connected — educational description',
      detail: 'Redis TTL allows setting per-key expiration. Eviction policies (noeviction, allkeys-lru, volatile-lru, allkeys-random, volatile-random, volatile-ttl) control memory management when maxmemory is reached.',
    });
  }

  return {
    title: 'Redis TTL and Eviction Behavior',
    category: isLive ? 'actual' : 'simulated',
    database: 'Redis',
    description:
      'Creates real Redis keys with varying TTLs, observes expiration in real-time, demonstrates PERSIST, and inspects the configured eviction policy.',
    limitations: [
      'Eviction behavior is only observable under memory pressure (unlikely in development)',
      'Active expiration sampling rate is not configurable via the demo',
    ],
    steps,
    educationalNotes: [
      'Redis expires keys via two mechanisms: lazy (checked when accessed) and active (periodic sampling of 20 random keys with TTL, expiring those past deadline).',
      'TTL precision is 1 millisecond (PEXPIRE). The TTL command returns seconds; PTTL returns milliseconds.',
      'Eviction policies: volatile-lru (evict LRU among keys with TTL), allkeys-lru (evict LRU among all keys), volatile-ttl (evict keys closest to expiry), noeviction (reject writes when full).',
      'PERSIST removes a key\'s TTL, making it permanent.',
      'In our platform, recommendation caches use TTL=300s (5 min) to balance freshness vs. compute cost.',
    ],
  };
}

// ============================================================================
// 7. Eventual Consistency Demonstration (Hybrid — Actual + Simulated)
// ============================================================================

export async function demoEventualConsistency(): Promise<DemoResult> {
  const steps: DemoStep[] = [];

  // Step 1: Write to MongoDB (primary source of truth)
  let mongoLive = false;
  let neo4jLive = false;
  let redisLive = false;

  try {
    if (mongoose.connection.readyState !== 1) await dbManager.connectMongo();
    mongoLive = mongoose.connection.readyState === 1;
  } catch { mongoLive = false; }

  try {
    const session = dbManager.getNeo4jSession();
    try {
      const r = await session.run('RETURN 1');
      neo4jLive = r.records.length > 0;
    } finally { await session.close(); }
  } catch { neo4jLive = false; }

  const redis = dbManager.getRedisClient();
  try {
    if (redis.status !== 'ready') {
      await Promise.race([redis.connect().catch(() => {}), new Promise((_, rej) => setTimeout(() => rej(), 1500))]).catch(() => {});
    }
    redisLive = redis.status === 'ready';
  } catch { redisLive = false; }

  steps.push({
    step: 1,
    label: 'Check store connectivity',
    detail: `MongoDB: ${mongoLive ? '✓ connected' : '✗ offline'}. Neo4j: ${neo4jLive ? '✓ connected' : '✗ offline'}. Redis: ${redisLive ? '✓ connected' : '✗ offline'}.`,
    result: { mongoLive, neo4jLive, redisLive },
  });

  // Step 2: Demonstrate stale cache scenario
  if (mongoLive && redisLive) {
    const cacheKey = 'phase12:consistency_demo:student_count';

    // Cache the current count
    const currentCount = await StudentModel.countDocuments();
    await redis.set(cacheKey, String(currentCount), 'EX', 30);

    const t1 = performance.now();
    const cachedValue = await redis.get(cacheKey);
    const cacheReadMs = Number((performance.now() - t1).toFixed(2));

    // Immediately read from MongoDB
    const t2 = performance.now();
    const freshValue = await StudentModel.countDocuments();
    const mongoReadMs = Number((performance.now() - t2).toFixed(2));

    steps.push({
      step: 2,
      label: 'Cache vs. source-of-truth comparison',
      detail: `Cached value: ${cachedValue} (read in ${cacheReadMs}ms from Redis). Fresh value: ${freshValue} (read in ${mongoReadMs}ms from MongoDB). If a write occurs between caching and reading, the cache will serve stale data until its TTL expires or it is explicitly invalidated.`,
      result: {
        cachedValue: Number(cachedValue),
        freshValue: freshValue,
        isStale: cachedValue !== String(freshValue),
        cacheReadMs,
        mongoReadMs,
        speedup: mongoReadMs > 0 ? Number((mongoReadMs / Math.max(cacheReadMs, 0.01)).toFixed(2)) : null,
      },
    });

    await redis.del(cacheKey);
  }

  // Step 3: Demonstrate cross-store propagation delay
  if (mongoLive && neo4jLive) {
    // Read skill count from MongoDB
    const mongoSkillCount = await SkillModel.countDocuments();

    // Read skill count from Neo4j
    let neo4jSkillCount = 0;
    const session = dbManager.getNeo4jSession();
    try {
      const res = await session.run('MATCH (s:Skill) RETURN count(s) AS cnt');
      neo4jSkillCount = res.records[0]?.get('cnt')?.toNumber?.() ?? 0;
    } finally { await session.close(); }

    const drift = Math.abs(mongoSkillCount - neo4jSkillCount);

    steps.push({
      step: 3,
      label: 'Cross-store consistency check (MongoDB ↔ Neo4j)',
      detail: `MongoDB has ${mongoSkillCount} skills. Neo4j has ${neo4jSkillCount} skill nodes. Drift: ${drift}. In a polyglot system, stores may temporarily diverge until the synchronization service reconciles them. This is eventual consistency in practice.`,
      result: { mongoSkillCount, neo4jSkillCount, drift, consistent: drift === 0 },
    });
  }

  // Step 4: Staleness window simulation
  const staleness = {
    scenario: 'Student adds a new skill via the API',
    timeline: [
      { time: 'T+0ms', event: 'Write skill to MongoDB (synchronous)', storeState: { mongo: 'updated', neo4j: 'stale', redis: 'stale' } },
      { time: 'T+5ms', event: 'Invalidate Redis cache key for student profile', storeState: { mongo: 'updated', neo4j: 'stale', redis: 'invalidated' } },
      { time: 'T+50ms', event: 'Async sync: MERGE skill node + STUDENT_HAS_SKILL edge in Neo4j', storeState: { mongo: 'updated', neo4j: 'updating…', redis: 'invalidated' } },
      { time: 'T+200ms', event: 'Neo4j sync complete; log audit event to Cassandra', storeState: { mongo: 'updated', neo4j: 'updated', redis: 'invalidated' } },
      { time: 'T+next read', event: 'Next read re-populates Redis cache from fresh MongoDB data', storeState: { mongo: 'updated', neo4j: 'updated', redis: 'updated' } },
    ],
    maxStalenessWindow: '~200ms (async sync delay) + TTL window for uncacheable reads',
  };

  steps.push({
    step: 4,
    label: 'Eventual consistency timeline for a skill-add operation',
    detail: 'Shows how a single write propagates through all 4 stores with a brief staleness window.',
    result: staleness,
  });

  return {
    title: 'Eventual Consistency Demonstration',
    category: mongoLive && (neo4jLive || redisLive) ? 'hybrid' : 'simulated',
    database: 'Polyglot (all stores)',
    description:
      'Demonstrates that in a polyglot persistence architecture, stores are not always in sync. Shows real cache staleness, cross-store drift detection, and the propagation timeline.',
    whySimulated:
      'The staleness timeline is an educational illustration. Actual propagation delay measurements require concurrent writers and readers, which is not a standard API endpoint scenario.',
    limitations: [
      'Cannot induce real network partitions between co-located Docker containers',
      'Staleness window depends on application-level sync, not database-native replication',
      'True distributed eventual consistency (e.g., Cassandra multi-DC) cannot be demonstrated on a single node',
    ],
    steps,
    educationalNotes: [
      'Eventual consistency means all replicas will converge to the same state given sufficient time without new writes.',
      'In our polyglot system, MongoDB is the source of truth. Other stores are eventually-consistent projections.',
      'The cache-aside pattern (check cache → miss → read DB → populate cache) inherently introduces a staleness window equal to the cache TTL.',
      'Strong consistency requires synchronous writes to all stores (expensive). Our system uses async sync + cache invalidation for a pragmatic balance.',
      'CAP theorem: in the presence of a network partition, we must choose between consistency (block until all stores agree) or availability (serve potentially stale data).',
    ],
  };
}

// ============================================================================
// 8. Failure / Degraded-Service Behavior (Actual)
// ============================================================================

export async function demoDegradedService(): Promise<DemoResult> {
  const steps: DemoStep[] = [];

  // Step 1: Current health status
  const healthReport = await dbManager.getFullHealthReport();
  const dbStatuses = healthReport.databases;

  steps.push({
    step: 1,
    label: 'Current system health',
    detail: `MongoDB: ${dbStatuses.mongodb.status} (${dbStatuses.mongodb.latencyMs}ms). Neo4j: ${dbStatuses.neo4j.status} (${dbStatuses.neo4j.latencyMs}ms). Redis: ${dbStatuses.redis.status} (${dbStatuses.redis.latencyMs}ms). Cassandra: ${dbStatuses.cassandra.status} (${dbStatuses.cassandra.latencyMs}ms). Overall: ${healthReport.overall}.`,
    result: {
      overall: healthReport.overall,
      databases: Object.fromEntries(
        Object.entries(dbStatuses).map(([k, v]) => [k, { status: v.status, latencyMs: v.latencyMs }])
      ),
    },
  });

  // Step 2: Design for graceful degradation
  const degradationMatrix = [
    {
      failedStore: 'Redis',
      impact: 'Cache misses; all requests go directly to MongoDB/Neo4j',
      mitigation: 'CacheRepository.safeExec() wraps all Redis calls in try/catch and returns fallback values. The app continues without caching.',
      userExperience: 'Slightly higher latency but fully functional',
      dataLoss: 'None (Redis is ephemeral cache only)',
    },
    {
      failedStore: 'Neo4j',
      impact: 'Graph traversals, recommendations, and learning paths unavailable',
      mitigation: 'GraphService methods catch connection errors and return empty results with an error flag. MongoDB-only queries still work.',
      userExperience: 'Recommendation and graph features show "temporarily unavailable" messages. CRUD operations continue.',
      dataLoss: 'None (Neo4j is a projection of MongoDB data, rebuilt by sync)',
    },
    {
      failedStore: 'Cassandra',
      impact: 'Activity logging and analytics unavailable',
      mitigation: 'ActivityRepository has in-memory fallback arrays that buffer events until Cassandra recovers.',
      userExperience: 'Activity analytics show stale/empty data. Core features unaffected.',
      dataLoss: 'In-memory buffer lost on backend restart; recoverable by re-generating events',
    },
    {
      failedStore: 'MongoDB',
      impact: 'Critical — source of truth is unavailable. Most CRUD operations fail.',
      mitigation: 'Health endpoint reports "down" status. API returns 503 for entity endpoints. Redis cached data may serve limited reads.',
      userExperience: 'Major degradation. Only cached data and previously-loaded graph data accessible.',
      dataLoss: 'None if using Docker volumes. Data persists across container restarts.',
    },
  ];

  steps.push({
    step: 2,
    label: 'Graceful degradation matrix',
    detail: 'How the system handles each database becoming unavailable. Designed per the principle: "fail gracefully, not catastrophically."',
    result: degradationMatrix,
  });

  // Step 3: Demonstrate actual resilience — try Redis operations with error handling
  const redis = dbManager.getRedisClient();
  let redisTestResult: { success: boolean; value: string | null; error?: string } = { success: false, value: null };

  try {
    if (redis.status !== 'ready') {
      await Promise.race([redis.connect().catch(() => {}), new Promise((_, rej) => setTimeout(() => rej(), 1500))]).catch(() => {});
    }
    await redis.set('phase12:resilience_test', 'alive', 'EX', 10);
    const val = await redis.get('phase12:resilience_test');
    redisTestResult = { success: true, value: val };
    await redis.del('phase12:resilience_test');
  } catch (err: any) {
    redisTestResult = { success: false, value: null, error: err.message };
  }

  steps.push({
    step: 3,
    label: 'Live resilience test — Redis operation with error handling',
    detail: redisTestResult.success
      ? `Redis responded successfully (value: "${redisTestResult.value}"). The safeExec wrapper would have returned a fallback value if this failed.`
      : `Redis operation failed: ${redisTestResult.error}. The application continues because safeExec returns fallback values.`,
    result: redisTestResult,
  });

  // Step 4: Timeout behavior
  steps.push({
    step: 4,
    label: 'Timeout and circuit-breaker patterns',
    detail: 'All database operations use withTimeout() wrappers (2000-2500ms). If a database hangs rather than failing fast, the timeout prevents the request from blocking indefinitely. The DatabaseManager uses lazy connections with limited retry strategies to avoid cascading failures.',
    result: {
      mongoTimeout: '2000ms (connection) + 2500ms (wrapper)',
      neo4jTimeout: '2000ms (connection pool)',
      redisTimeout: '2000ms (connect) + 1500ms (safeExec)',
      cassandraTimeout: '2000ms (socket) + 2500ms (connect wrapper)',
    },
  });

  // Step 5: Recovery behavior
  steps.push({
    step: 5,
    label: 'Recovery and self-healing',
    detail: 'When a database comes back online: (1) Redis: ioredis attempts lazy reconnection on next operation. (2) Neo4j: driver pool creates new sessions automatically. (3) Cassandra: reconnection policy retries every 5 seconds. (4) MongoDB: Mongoose reconnects on next operation if connection was dropped. The /api/v1/sync/full endpoint can be called to re-synchronize all stores after recovery.',
  });

  return {
    title: 'Failure / Degraded-Service Behavior',
    category: 'hybrid',
    database: 'All stores',
    description:
      'Documents and demonstrates how the application handles individual database failures gracefully. Shows the actual timeout configurations, error-handling wrappers, and degradation matrix.',
    whySimulated:
      'We do not intentionally kill database containers during this demo (that would disrupt the running system). Instead, we document the actual error-handling code paths and show live health checks.',
    limitations: [
      'Cannot safely kill a Docker container from inside the application',
      'True network partition simulation would require iptables/tc rules',
      'Circuit breaker pattern is implemented as simple timeouts, not a formal library like Hystrix',
    ],
    steps,
    educationalNotes: [
      'In polyglot persistence, not all stores are equally critical. Design tiers: MongoDB (critical) > Neo4j (important) > Redis (nice-to-have) > Cassandra (deferrable).',
      'The safeExec pattern wraps every Redis call: if Redis is down, return a default value instead of throwing.',
      'Cassandra\'s ActivityRepository maintains in-memory fallback arrays — a lightweight form of local buffering.',
      'Health endpoints (/api/v1/health) provide real-time store status for monitoring and alerting.',
      'Recovery strategy: detect failure → serve degraded → auto-reconnect → re-sync → full service.',
    ],
  };
}

// ============================================================================
// Run All Demonstrations
// ============================================================================

export async function runAllDemos(): Promise<DemoResult[]> {
  const results: DemoResult[] = [];

  const demos = [
    { name: 'MongoDB Sharding', fn: demoMongoSharding },
    { name: 'Cassandra Partitioning', fn: demoCassandraPartitioning },
    { name: 'Cassandra Replication', fn: demoCassandraReplication },
    { name: 'Neo4j Indexing', fn: demoNeo4jIndexing },
    { name: 'MongoDB Indexing', fn: demoMongoIndexing },
    { name: 'Redis TTL & Eviction', fn: demoRedisTtlEviction },
    { name: 'Eventual Consistency', fn: demoEventualConsistency },
    { name: 'Degraded Service', fn: demoDegradedService },
  ];

  for (const demo of demos) {
    try {
      const result = await demo.fn();
      results.push(result);
    } catch (err: any) {
      results.push({
        title: demo.name,
        category: 'simulated',
        database: 'Unknown',
        description: `Demo failed with error: ${err.message}`,
        steps: [{ step: 1, label: 'Error', detail: err.message }],
        educationalNotes: ['This demonstration encountered an unexpected error.'],
      });
    }
  }

  return results;
}

export const nosqlDemoService = {
  demoMongoSharding,
  demoCassandraPartitioning,
  demoCassandraReplication,
  demoNeo4jIndexing,
  demoMongoIndexing,
  demoRedisTtlEviction,
  demoEventualConsistency,
  demoDegradedService,
  runAllDemos,
};
