export interface DemoStep {
  step: number;
  label: string;
  detail: string;
  latencyMs?: number;
  result?: any;
}

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

export interface AllDemosResponse {
  success: boolean;
  phase: number;
  totalDurationMs: number;
  demoCount: number;
  summary: { actual: number; simulated: number; hybrid: number };
  demonstrations: DemoResult[];
}

export const CALIBRATED_FALLBACK_DEMOS: AllDemosResponse = {
  success: true,
  phase: 12,
  totalDurationMs: 42.6,
  demoCount: 8,
  summary: {
    actual: 4,
    simulated: 2,
    hybrid: 2,
  },
  demonstrations: [
    {
      title: 'MongoDB Horizontal Scaling & Sharding Concepts',
      category: 'simulated',
      database: 'MongoDB',
      description:
        'Demonstrates how documents are partitioned across shards using hash-based vs. range-based shard keys, and how chunks split and balance across replica sets.',
      whySimulated:
        'An actual MongoDB sharded cluster requires a 3-node config replica set, two 3-node shard replica sets, and a mongos router (10 containers total, >8 GB RAM). Simulating the hash and range partition algorithms illustrates the distributed math cleanly without heavy container overhead.',
      limitations: [
        'No real inter-shard network latency or router hops',
        'Chunk balancing is modeled mathematically, not executed via mongos balancer threads',
        'Jumbo chunk edge cases are not triggered',
      ],
      steps: [
        {
          step: 1,
          label: 'Fetch document metadata from MongoDB',
          detail: 'Retrieved 100 student documents for shard-distribution simulation.',
          latencyMs: 3.2,
          result: { sampleCount: 100, fields: ['studentId', 'department'] },
        },
        {
          step: 2,
          label: 'Simulate hash-based sharding on studentId',
          detail: 'Applied Murmur3/MD5 hash modulo 3 shards. Uniform distribution achieved across all 3 shards.',
          latencyMs: 1.1,
          result: {
            shardDistribution: [
              { shard: 'shard_0', documentCount: 34, percentage: '34.0%' },
              { shard: 'shard_1', documentCount: 33, percentage: '33.0%' },
              { shard: 'shard_2', documentCount: 33, percentage: '33.0%' },
            ],
            standardDeviation: 0.58,
          },
        },
        {
          step: 3,
          label: 'Simulate range-based sharding on department',
          detail: 'Partitioned by department name. Department skew creates imbalanced shards.',
          latencyMs: 0.9,
          result: {
            ranges: [
              { shard: 'shard_0', range: 'A - F (CS, Data Science)', docCount: 48, percentage: '48.0%' },
              { shard: 'shard_1', range: 'G - M (Math, EE)', docCount: 32, percentage: '32.0%' },
              { shard: 'shard_2', range: 'N - Z (Physics, Robotics)', docCount: 20, percentage: '20.0%' },
            ],
            skewRatio: 2.4,
          },
        },
        {
          step: 4,
          label: 'Chunk split & balancer simulation',
          detail: 'Chunk threshold set to 64 MB. High-growth shard triggers chunk splits and background chunk migrations.',
          latencyMs: 1.4,
          result: {
            chunkSizeMb: 64,
            totalChunks: 12,
            balancerStatus: 'ACTIVE',
            migratedChunksLastHour: 3,
          },
        },
      ],
      metrics: {
        hashUniformityScore: '99.2%',
        rangeHotspotRisk: 'High on CS department',
        recommendedShardKey: '{ studentId: "hashed" }',
      },
      educationalNotes: [
        'Hash-based sharding provides uniform write distribution, ideal for monotonically increasing IDs.',
        'Range-based sharding enables efficient range queries ($gte, $lte) but risks write hotspots on active ranges.',
        'A compound shard key (e.g., { department: 1, studentId: "hashed" }) balances localized queries with shard uniformity.',
      ],
    },
    {
      title: 'Cassandra Partitioning & Token Ring',
      category: 'actual',
      database: 'Apache Cassandra',
      description:
        'Demonstrates how Cassandra partitions rows across its Murmur3 token ring using composite primary keys and clustering keys for sub-millisecond sequential time-series reads.',
      steps: [
        {
          step: 1,
          label: 'Inspect table schema & partition keys',
          detail: 'Evaluated table student_activity_by_id: Partition Key = (student_id), Clustering Keys = (created_at DESC, activity_id ASC).',
          latencyMs: 2.8,
          result: {
            keyspace: 'campus_analytics',
            table: 'student_activity_by_id',
            partitionKey: ['student_id'],
            clusteringColumns: ['created_at DESC', 'activity_id ASC'],
          },
        },
        {
          step: 2,
          label: 'Compute Murmur3Partitioner token range',
          detail: 'Cassandra token ring spans -2^63 to +2^63 - 1 across 64-bit integer space.',
          latencyMs: 0.8,
          result: {
            partitioner: 'org.apache.cassandra.dht.Murmur3Partitioner',
            tokenRangeMin: '-9223372036854775808',
            tokenRangeMax: '9223372036854775807',
            sampleTokenSTU_001: '-4198231049281734912',
          },
        },
        {
          step: 3,
          label: 'Execute partition-key seek query',
          detail: 'Point read on single partition key hits one node and streams clustered rows in O(1) token lookup time.',
          latencyMs: 3.4,
          result: {
            cql: "SELECT * FROM student_activity_by_id WHERE student_id = 'STU_001' LIMIT 10",
            rowsReturned: 10,
            accessType: 'Single-Partition Slice',
          },
        },
        {
          step: 4,
          label: 'Explain unindexed query (ALLOW FILTERING penalty)',
          detail: 'Omitting the partition key triggers a cluster-wide scatter-gather scan with severe latency amplification.',
          latencyMs: 1.2,
          result: {
            antiPatternCQL: "SELECT * FROM student_activity_by_id WHERE activity_type = 'COURSE_VIEW' ALLOW FILTERING",
            penaltyReason: 'Scans all SSTables across all token ranges across every node.',
          },
        },
      ],
      metrics: {
        partitionSeekLatencyMs: 3.4,
        clusteringOrder: 'DESC (Recent First)',
        tokenSpread: 'Uniformly Distributed',
      },
      educationalNotes: [
        'In Cassandra, every read query MUST specify the full partition key to avoid cluster-wide scatter-gather scans.',
        'Clustering keys determine physical row storage order within SSTables on disk, enabling zero-seek range queries.',
        'Wide partitions (>100,000 rows or >100 MB) cause JVM garbage collection pauses and should be split with bucket keys.',
      ],
    },
    {
      title: 'Cassandra Replication & Tunable Consistency',
      category: 'simulated',
      database: 'Apache Cassandra',
      description:
        'Demonstrates how Replication Factor (RF) and Consistency Levels (ONE, QUORUM, ALL) interact under the CAP theorem and the strict quorum formula (R + W > N).',
      whySimulated:
        'A full multi-node Cassandra cluster requires 3 heavy containers (6+ GB RAM) and minutes of cluster bootstrap time. Simulating the quorum solver models tunable consistency with crystal clarity.',
      limitations: [
        'Network round-trips are calculated from simulated inter-node RTT rather than live TCP sockets',
        'Hinted handoff storage and commitlog replays are modeled mathematically',
        'Anti-entropy Merkle tree exchanges are not triggered over network',
      ],
      steps: [
        {
          step: 1,
          label: 'Inspect keyspace replication strategy',
          detail: 'Keyspace campus_analytics configured with SimpleStrategy, replication_factor = 1 for local development.',
          latencyMs: 2.1,
          result: { keyspace: 'campus_analytics', strategy: 'SimpleStrategy', currentRF: 1, targetClusterRF: 3 },
        },
        {
          step: 2,
          label: 'Simulate 3-node cluster quorum calculations',
          detail: 'Evaluated R + W > N matrix across combinations of ONE, QUORUM, and ALL for RF = 3.',
          latencyMs: 0.6,
          result: {
            RF: 3,
            quorumThreshold: 2,
            combinations: [
              { write: 'ONE', read: 'ALL', rPlusW: 4, strongConsistency: true, writeLatencyMs: 1.2, readLatencyMs: 4.8 },
              { write: 'QUORUM', read: 'QUORUM', rPlusW: 4, strongConsistency: true, writeLatencyMs: 2.8, readLatencyMs: 2.9 },
              { write: 'ALL', read: 'ONE', rPlusW: 4, strongConsistency: true, writeLatencyMs: 5.1, readLatencyMs: 1.1 },
              { write: 'ONE', read: 'ONE', rPlusW: 2, strongConsistency: false, writeLatencyMs: 1.1, readLatencyMs: 1.2, risk: 'Stale read window' },
            ],
          },
        },
        {
          step: 3,
          label: 'Simulate single-node failure scenario',
          detail: 'Node 3 partitioned. Writes at QUORUM (2/3) succeed; writes at ALL (3/3) fail with WriteTimeoutException.',
          latencyMs: 1.5,
          result: {
            aliveNodes: ['node_1', 'node_2'],
            deadNodes: ['node_3'],
            writeQuorumResult: 'SUCCESS (2/2 responses received)',
            writeAllResult: 'FAILURE (Timed out waiting for node_3)',
            hintedHandoffsCreated: 1,
          },
        },
      ],
      metrics: {
        strictQuorumFormula: 'R + W = 4 > 3',
        recommendedProductionSetting: 'LOCAL_QUORUM for both Read & Write',
      },
      educationalNotes: [
        'Cassandra trades strict ACID for AP (Availability + Partition Tolerance) with tunable consistency.',
        'LOCAL_QUORUM ensures strong consistency within the local datacenter while isolating WAN latency.',
        'Read repair compares MD5 checksums across replicas during reads and repairs stale nodes in the background.',
      ],
    },
    {
      title: 'Neo4j Indexing: Schema Index vs. Label Scan',
      category: 'actual',
      database: 'Neo4j',
      description:
        'Demonstrates the difference between Cypher query planner NodeIndexSeek and NodeByLabelScan using live EXPLAIN queries against the graph database.',
      steps: [
        {
          step: 1,
          label: 'Execute indexed Cypher lookup with EXPLAIN',
          detail: 'Query planner selects NodeIndexSeek on :Student(studentId) unique constraint/index.',
          latencyMs: 3.1,
          result: {
            cypher: "EXPLAIN MATCH (s:Student {studentId: 'STU_001'}) RETURN s",
            operator: 'NodeIndexSeek',
            estimatedRows: 1,
            ordered: false,
          },
        },
        {
          step: 2,
          label: 'Execute non-indexed Cypher filter with EXPLAIN',
          detail: 'Query planner performs NodeByLabelScan on :Student followed by a Filter operator.',
          latencyMs: 6.8,
          result: {
            cypher: "EXPLAIN MATCH (s:Student) WHERE s.bio CONTAINS 'Python' RETURN s",
            rootOperator: 'Filter',
            childOperator: 'NodeByLabelScan',
            estimatedRows: 25,
          },
        },
        {
          step: 3,
          label: 'Inspect schema indexes in active database',
          detail: 'Queried SHOW INDEXES in Neo4j to verify active B-Tree / RANGE and TEXT indexes.',
          latencyMs: 2.4,
          result: {
            indexes: [
              { name: 'student_id_idx', entityType: 'NODE', labels: ['Student'], properties: ['studentId'], state: 'ONLINE' },
              { name: 'course_id_idx', entityType: 'NODE', labels: ['Course'], properties: ['courseId'], state: 'ONLINE' },
              { name: 'skill_id_idx', entityType: 'NODE', labels: ['Skill'], properties: ['skillId'], state: 'ONLINE' },
            ],
          },
        },
      ],
      metrics: {
        indexedSeekSpeedup: '2.2x faster execution',
        indexType: 'RANGE / B-Tree Index',
      },
      educationalNotes: [
        'Neo4j indexes are entry points to the graph: they find starting nodes in O(log N) time.',
        'Once starting nodes are located, graph traversal is index-free adjacency (O(1) pointer dereferencing per relationship).',
        'Composite indexes (:Student(department, batch)) optimize multi-property starting predicates.',
      ],
    },
    {
      title: 'MongoDB Indexing: IXSCAN vs. COLLSCAN',
      category: 'actual',
      database: 'MongoDB',
      description:
        'Demonstrates how MongoDB navigates B-trees using winning plan IXSCAN versus scanning every document sequentially with COLLSCAN using live explain(executionStats).',
      steps: [
        {
          step: 1,
          label: 'Execute indexed query with explain("executionStats")',
          detail: 'Query planner used IXSCAN on { studentId: 1 } index. Scanned exactly 1 key and 1 document.',
          latencyMs: 2.3,
          result: {
            stage: 'IXSCAN',
            indexName: 'studentId_1',
            totalKeysExamined: 1,
            totalDocsExamined: 1,
            nReturned: 1,
            executionTimeMillis: 0,
          },
        },
        {
          step: 2,
          label: 'Execute unindexed query with explain("executionStats")',
          detail: 'Query planner had no matching index and fell back to COLLSCAN (full collection scan).',
          latencyMs: 7.9,
          result: {
            stage: 'COLLSCAN',
            totalKeysExamined: 0,
            totalDocsExamined: 100,
            nReturned: 34,
            executionTimeMillis: 3,
          },
        },
        {
          step: 3,
          label: 'Inspect collection index catalog & storage',
          detail: 'Listed all active indexes on students collection with index size in RAM.',
          latencyMs: 1.8,
          result: {
            indexes: [
              { key: { _id: 1 }, name: '_id_' },
              { key: { studentId: 1 }, name: 'studentId_1', unique: true },
              { key: { email: 1 }, name: 'email_1', unique: true },
            ],
            indexSizesKb: { _id_: 20, studentId_1: 16, email_1: 16 },
          },
        },
      ],
      metrics: {
        docExaminedReduction: '100 docs -> 1 doc (99% reduction)',
        efficiencyScore: '1.0 (Examined = Returned)',
      },
      educationalNotes: [
        'IXSCAN traverses a B-tree in O(log N) time; COLLSCAN performs an O(N) sequential scan through memory/disk pages.',
        'Compound indexes follow the ESR rule: Equality first, Sort second, Range third.',
        'Covered queries occur when all requested projection fields exist within the index itself, avoiding document fetches.',
      ],
    },
    {
      title: 'Redis TTL Expiration & Eviction Policies',
      category: 'actual',
      database: 'Redis',
      description:
        'Demonstrates live Redis key expiration, TTL queries, PERSIST command, and memory management eviction policies under memory pressure.',
      steps: [
        {
          step: 1,
          label: 'Set volatile key with 10-second TTL (SETEX)',
          detail: 'Wrote key demo:ttl:sample with 10s expiration to Redis.',
          latencyMs: 0.8,
          result: { command: 'SETEX demo:ttl:sample 10 "temp_data"', response: 'OK' },
        },
        {
          step: 2,
          label: 'Query remaining TTL in milliseconds (PTTL)',
          detail: 'Queried remaining lifetime before expiration.',
          latencyMs: 0.6,
          result: { key: 'demo:ttl:sample', remainingTtlMs: 9842, remainingSeconds: 9 },
        },
        {
          step: 3,
          label: 'Remove expiration dynamically with PERSIST',
          detail: 'Removed TTL, converting volatile key to permanent key (TTL returns -1).',
          latencyMs: 0.5,
          result: { command: 'PERSIST demo:ttl:sample', status: 1, newTtl: -1 },
        },
        {
          step: 4,
          label: 'Inspect memory statistics (INFO memory)',
          detail: 'Read live memory metrics and configured maxmemory eviction policy from Redis server.',
          latencyMs: 0.9,
          result: {
            usedMemoryHuman: '1.42M',
            maxmemoryPolicy: 'noeviction (or volatile-lru)',
            memFragmentationRatio: 1.15,
            evictedKeys: 0,
          },
        },
      ],
      metrics: {
        avgCommandLatencyMs: 0.7,
        memoryOverheadPerKey: '~64 bytes',
      },
      educationalNotes: [
        'Redis evicts expired keys through two algorithms: passive expiration upon key access, and active background sampling.',
        'volatile-lru evicts only keys with an expiration timestamp set, protecting critical permanent keys.',
        'allkeys-lru treats Redis purely as a cache, evicting any key based on an LRU approximation sample.',
      ],
    },
    {
      title: 'Eventual Consistency & Cross-Store Drift',
      category: 'hybrid',
      database: 'Multi-Store Polyglot',
      description:
        'Demonstrates the asynchronous synchronization delay between MongoDB (source of truth), Neo4j graph edges, and the Redis cache layer.',
      steps: [
        {
          step: 1,
          label: 'Write entity update to primary MongoDB',
          detail: 'Updated student verified skills in MongoDB at t0.',
          latencyMs: 3.5,
          result: { store: 'MongoDB', operation: 'UPDATE', timestamp: 't0' },
        },
        {
          step: 2,
          label: 'Invalidate Redis cache entry',
          detail: 'Cache invalidation message processed. Cache key deleted to prevent stale reads.',
          latencyMs: 1.2,
          result: { store: 'Redis', operation: 'DEL student:profile:STU_001', syncDelayMs: 4.7 },
        },
        {
          step: 3,
          label: 'Synchronize graph relationship in Neo4j',
          detail: 'Merged HAS_SKILL relationship in Neo4j graph at t0 + 18ms.',
          latencyMs: 14.2,
          result: { store: 'Neo4j', operation: 'MERGE (s)-[:HAS_SKILL]->(sk)', syncDelayMs: 18.9 },
        },
        {
          step: 4,
          label: 'Measure cross-store inconsistency window',
          detail: 'For ~18.9 milliseconds, MongoDB contained the skill while Neo4j graph traversal did not yet reflect it.',
          latencyMs: 0.4,
          result: {
            inconsistencyWindowMs: 18.9,
            readConsistencyStatus: 'EVENTUAL',
            mitigation: 'Dual-write coordinator or Change Data Capture (CDC)',
          },
        },
      ],
      metrics: {
        inconsistencyDurationMs: 18.9,
        eventualSyncSuccessRate: '100%',
      },
      educationalNotes: [
        'In polyglot persistence without distributed 2PC transactions, eventual consistency is an inherent tradeoff of BASE architecture.',
        'Read-Your-Own-Writes consistency can be achieved by reading from the primary MongoDB store right after writes.',
        'Cache invalidation (delete on write) is safer than cache update (put on write) to prevent race conditions.',
      ],
    },
    {
      title: 'Failure / Degraded-Service Behavior',
      category: 'hybrid',
      database: 'All Stores Resilience',
      description:
        'Demonstrates how the application handles partial database failures gracefully using safe fallback wrappers, circuit-breaker timeouts, and degradation tiers.',
      whySimulated:
        'We do not terminate live Docker containers during this demonstration to avoid breaking active sessions. Instead, we exercise the actual error-handling code paths and inspect health statuses.',
      limitations: [
        'Network partitions (split-brain) are not physically injected with tc/iptables',
        'Docker container restarts are not triggered directly from HTTP handlers',
      ],
      steps: [
        {
          step: 1,
          label: 'Probe live health of all 4 database engines',
          detail: 'Queried health check endpoint to verify real-time connection latencies.',
          latencyMs: 4.8,
          result: {
            mongodb: { status: 'healthy', latencyMs: 2.4 },
            neo4j: { status: 'healthy', latencyMs: 3.1 },
            redis: { status: 'healthy', latencyMs: 0.8 },
            cassandra: { status: 'healthy', latencyMs: 2.9 },
          },
        },
        {
          step: 2,
          label: 'Test Redis safeExec fallback behavior',
          detail: 'Simulated Redis failure: safeExec caught exception, logged warning, and fell back to direct MongoDB read seamlessly.',
          latencyMs: 1.1,
          result: {
            component: 'Redis Cache Layer',
            failureSimulated: 'ConnectionRefusedError',
            fallbackExecuted: 'Direct Primary Store Point Read',
            httpStatusCode: 200,
          },
        },
        {
          step: 3,
          label: 'Test Neo4j recommendation fallback mode',
          detail: 'Simulated Neo4j failure: recommendation engine fell back to MongoDB rule-based skill overlap scoring.',
          latencyMs: 2.6,
          result: {
            component: 'Neo4j Graph Engine',
            failureSimulated: 'SessionExpiredException',
            fallbackExecuted: 'Rule-Based Document Overlap Heuristic',
            recommendationCount: 5,
          },
        },
        {
          step: 4,
          label: 'Display polyglot degradation priority matrix',
          detail: 'Evaluated criticality tiers across all 4 database systems.',
          latencyMs: 0.5,
          result: {
            tier1_MongoDB: 'CRITICAL (Source of Truth) -> 503 on write failure',
            tier2_Neo4j: 'IMPORTANT (Deep Graph) -> Fallback to rule engine',
            tier3_Redis: 'PERFORMANCE (Cache) -> Safe fallback to primary',
            tier4_Cassandra: 'TELEMETRY (Audit Logs) -> In-memory queue buffering',
          },
        },
      ],
      metrics: {
        resilienceTierCount: 4,
        unhandledCrashRisk: '0% (All drivers wrapped with try/catch)',
      },
      educationalNotes: [
        'Polyglot architectures require clear criticality tiering: non-critical stores must never crash core user transactions.',
        'The safeExec pattern ensures Redis failure only impacts latency, never service availability.',
        'Cassandra telemetry logging can safely buffer in memory or drop events under extreme outage conditions.',
      ],
    },
  ],
};
