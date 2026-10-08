# Phase 12: Advanced NoSQL Demonstrations

## 1. Executive Summary & Educational Philosophy

Phase 12 enhances the Campus Resource Intelligence Platform with lightweight, academically grounded demonstrations of advanced distributed systems and NoSQL internal concepts across all four polyglot database engines:

* **MongoDB (Document)**: Horizontal scaling / sharding concepts & B-Tree indexing (`COLLSCAN` vs. `IXSCAN`).
* **Apache Cassandra (Wide-Column)**: Murmur3 token-ring partitioning & multi-node replication / tunable consistency ($R + W > N$).
* **Neo4j (Graph)**: Schema indexes vs. full label scans (`IndexSeek` vs. `NodeByLabelScan`) with Cypher `EXPLAIN`.
* **Redis (Key-Value / In-Memory)**: Time-to-Live (TTL) expiration lifecycle, eviction behavior (`volatile-lru`, `allkeys-lru`), and memory pressure.
* **Polyglot Coordination**: Cross-store eventual consistency drift windows and degraded-service failure handling.

---

### Implementation Principle: Real vs. Simulated

The project objective is to **demonstrate deep understanding of distributed database internals without destabilizing the application or requiring cumbersome multi-cluster infrastructure on a single laptop**.

| Category | Definition | Modules Included |
| :--- | :--- | :--- |
| **Actual** | Executes real database commands and queries against the active container instances, measuring actual wall-clock execution times via `performance.now()`. | Cassandra Partitioning, Neo4j Indexing, MongoDB Indexing, Redis TTL & Eviction |
| **Simulated** | Executes deterministic algorithms in code (such as Murmur3 hashing, token distribution, or network delay injection) using live metadata as input, avoiding complex multi-node orchestration. | MongoDB Sharding, Cassandra Replication |
| **Hybrid** | Combines live multi-database status probes and write operations with controlled delays to measure cross-store synchronization windows and degradation matrices. | Eventual Consistency, Degraded-Service Behavior |

---

## 2. The 8 Advanced NoSQL Demonstration Modules

### 2.1 MongoDB Horizontal Scaling & Sharding Concepts
* **Classification**: **Simulated** (using actual document counts and keys from MongoDB)
* **What is Demonstrated**:
  1. **Hash-Based Sharding**: Employs MD5/Murmur3 hashing on `studentId` to distribute documents uniformly across shards, preventing hotspots during sequential ID generation.
  2. **Range-Based Sharding**: Partitions documents by categorical `department` field (`Computer Science`, `Mathematics`, etc.), isolating departmental workloads but creating write hotspots when one department experiences burst traffic.
  3. **Chunk Splitting & Balancing**: Models chunk splits at the default 64 MB threshold and how the mongos balancer migrates chunks between shards.
* **Why Simulated**: Deploying an actual MongoDB sharded cluster in Docker Compose requires a config replica set (3 nodes), two shard replica sets (6 nodes), and a mongos router (1 node) — totaling at least 10 containers and >8 GB RAM. Simulating the hash and range partition algorithms demonstrates the distributed math cleanly without heavy infrastructure overhead.
* **Limitations**: No live inter-node network latency, chunk migration lock contention, or jumbo chunk edge-case errors.

---

### 2.2 Cassandra Partitioning & Token Ring
* **Classification**: **Actual** (queries Cassandra system tables and keyspace schema)
* **What is Demonstrated**:
  1. Evaluates Cassandra partition key: `(student_id)` as the partition key and `(created_at, activity_id)` as clustering keys in `student_activity_by_id`.
  2. Computes the **Murmur3Partitioner** token range from $-2^{63}$ to $2^{63} - 1$ ($-9,223,372,036,854,775,808$ to $+9,223,372,036,854,775,807$).
  3. Queries live partition rows, demonstrating that reads within a partition execute in $O(1)$ token lookup time plus sequential SSTable scan, whereas queries omitting the partition key require an unindexed scatter-gather full cluster scan (`ALLOW FILTERING`).
* **Why Live**: Single-node Cassandra natively exposes its partitioner name (`Murmur3Partitioner`), keyspace replication strategies, and clustering schemas via `system.local` and CQL system queries.
* **Limitations**: Single-node Docker deployment hosts all tokens on `127.0.0.1`; multi-node vnode ranges (256 tokens per node) are mapped algorithmically.

---

### 2.3 Cassandra Replication & Tunable Consistency
* **Classification**: **Simulated** (mathematical consistency solver + live keyspace inspection)
* **What is Demonstrated**:
  1. Inspects active keyspace replication settings (`SimpleStrategy` with `replication_factor: 1`).
  2. Demonstrates the CAP theorem and tunable consistency theorem:
     $$R + W > N \implies \text{Strong Consistency (Strict Quorum)}$$
     $$R + W \le N \implies \text{Eventual Consistency (Read Staleness Possible)}$$
  3. Simulates read and write latencies under consistency levels `ONE`, `QUORUM`, and `ALL` across a 3-node cluster with simulated inter-node round-trip delays (0.5 ms – 2.5 ms).
  4. Models coordinator node failure scenarios, hinted handoffs, and read repair when one replica is temporarily partitioned.
* **Why Simulated**: Running a 3-node Cassandra cluster locally consumes 6+ GB of RAM and requires extended container startup times (3–5 minutes). The mathematical quorum behavior is simulated with educational clarity.
* **Limitations**: Hinted handoffs and anti-entropy Merkle tree syncing are modeled rather than triggered through socket dropped packets.

---

### 2.4 Neo4j Indexing: Schema Index vs. Label Scan
* **Classification**: **Actual** (executes Cypher `EXPLAIN` against the live Neo4j database)
* **What is Demonstrated**:
  1. Executes Cypher with `EXPLAIN` for indexed lookup:
     ```cypher
     EXPLAIN MATCH (s:Student {studentId: 'STU_001'}) RETURN s
     ```
     Verifies query planner step: `NodeIndexSeek` using the existing constraint/index on `Student(studentId)`.
  2. Executes Cypher with `EXPLAIN` for non-indexed lookup:
     ```cypher
     EXPLAIN MATCH (s:Student) WHERE s.bio CONTAINS 'Python' RETURN s
     ```
     Verifies query planner step: `NodeByLabelScan` followed by `Filter`.
  3. Measures live execution times comparing indexed direct pointer resolution vs. label-wide iteration.
* **Why Live**: Neo4j’s Cypher query planner exposes rich plan trees (`NodeIndexSeek`, `Expand(All)`, `ProduceResults`) directly via the Bolt protocol.
* **Limitations**: With small demo datasets (<1,000 nodes), both indexed and unindexed queries finish within single-digit milliseconds due to in-memory OS buffer caching.

---

### 2.5 MongoDB Indexing: `IXSCAN` vs. `COLLSCAN`
* **Classification**: **Actual** (executes `explain('executionStats')` on live MongoDB collections)
* **What is Demonstrated**:
  1. Indexed query on `studentId`:
     ```javascript
     db.students.find({ studentId: 'STU_001' }).explain('executionStats')
     ```
     Demonstrates winning plan `IXSCAN` on `{ studentId: 1 }` with `totalDocsExamined: 1`, `totalKeysExamined: 1`.
  2. Unindexed regex query on non-indexed field:
     ```javascript
     db.students.find({ department: 'Computer Science' }).explain('executionStats')
     ```
     Demonstrates winning plan `COLLSCAN` with `totalDocsExamined: N` (scans all documents in collection).
  3. Analyzes index selectivity and index memory footprint via `collection.stats()`.
* **Why Live**: MongoDB natively supports `explain('executionStats')` returning detailed stage hierarchies, examined document counts, and microsecond timings.
* **Limitations**: In small collections, query planner overhead can represent a noticeable fraction of overall latency.

---

### 2.6 Redis TTL Expiration & Eviction Policies
* **Classification**: **Actual** (runs live commands on Redis instance)
* **What is Demonstrated**:
  1. Sets a key with explicit TTL (`SETEX demo:ttl:key 10 "temp_data"`).
  2. Queries remaining lifetime via `TTL demo:ttl:key`.
  3. Removes expiration dynamically via `PERSIST demo:ttl:key`.
  4. Inspects server memory stats via `INFO memory` (used memory, memory fragmentation ratio, eviction count).
  5. Explains Redis maxmemory policies:
     * `volatile-lru`: Evicts least recently used keys with an expire set.
     * `allkeys-lru`: Evicts any key based on LRU approximation.
     * `volatile-ttl`: Evicts keys with shortest time-to-live first.
     * `noeviction`: Returns errors when memory limit is exceeded on write commands.
* **Why Live**: Redis commands (`SETEX`, `TTL`, `PERSIST`, `INFO memory`) execute with sub-millisecond latency directly against the active container.
* **Limitations**: Forcing an actual out-of-memory eviction would require allocating hundreds of megabytes of Redis memory, which could impact sibling services.

---

### 2.7 Eventual Consistency & Cross-Store Drift
* **Classification**: **Hybrid** (writes to MongoDB, measures propagation delay to Neo4j and Redis)
* **What is Demonstrated**:
  1. Simulates updating an entity in MongoDB (primary source of truth).
  2. Demonstrates the **asynchronous synchronization window**:
     * MongoDB updated at $t_0$.
     * Redis cache invalidation event emitted at $t_0 + \Delta t_1$ (stale read possible if TTL hasn't expired).
     * Neo4j graph edge synchronization completed at $t_0 + \Delta t_2$ (eventual consistency achieved).
  3. Quantifies the **inconsistency window** ($\approx 15 - 50\text{ ms}$ in local async sync, up to several seconds under network partitions).
  4. Explains mitigation strategies: Cache Invalidation, Read-Your-Own-Writes consistency token, and Change Data Capture (CDC / Debezium).
* **Why Hybrid**: A live multi-store write is executed, and synchronization timings are traced while explaining the distributed consistency boundary.
* **Limitations**: Without an external Kafka broker or replica set change stream, sync is coordinated in-process via our sync service.

---

### 2.8 Failure & Degraded-Service Behavior
* **Classification**: **Hybrid** (probes live health + demonstrates fail-safe fallback code paths)
* **What is Demonstrated**:
  1. Probes all 4 database connections to capture current operational status.
  2. Documents and demonstrates the **Polyglot Degradation Matrix**:
     * **MongoDB Down**: Critical failure — write operations rejected with 503; read operations fall back to cached data if available.
     * **Neo4j Down**: Degraded mode — graph traversals fall back to heuristic rule-based recommendations; point reads continue via MongoDB.
     * **Redis Down**: Graceful degradation — cache bypassed entirely via `safeExec` wrapper; queries read directly from primary databases.
     * **Cassandra Down**: Deferred mode — activity telemetry buffered in in-memory queue; user transactions succeed without interruption.
  3. Tests client-side timeout thresholds ($500\text{ ms}$ for Redis, $3000\text{ ms}$ for Neo4j/MongoDB).
* **Why Hybrid**: We do not intentionally terminate database containers during the interactive demo to avoid disrupting ongoing user sessions. Instead, we verify live health and exercise the actual fallback wrapper routines.
* **Limitations**: True network partition simulation (split-brain) requires Linux kernel network shaping (`iptables` / `tc`), which is unavailable inside standard cross-platform Docker Desktop environments.

---

## 3. Architecture Comparison Matrix

| # | Demonstration | Engine | Actual vs. Simulated | Why Simulated / Why Live | Primary Educational Concept |
| :---: | :--- | :--- | :---: | :--- | :--- |
| **1** | MongoDB Sharding | MongoDB | **Simulated** | 10-node cluster exceeds laptop memory | Hash vs. Range shard keys, chunk balancer |
| **2** | Cassandra Partitioning | Cassandra | **Actual** | CQL system queries available on single node | Murmur3 token hashing, partition seeks vs. scans |
| **3** | Cassandra Replication | Cassandra | **Simulated** | Multi-node cluster startup takes 4+ min | Tunable consistency ($R+W>N$), quorum math |
| **4** | Neo4j Indexing | Neo4j | **Actual** | `EXPLAIN` query plans accessible via Bolt | `NodeIndexSeek` vs. `NodeByLabelScan` |
| **5** | MongoDB Indexing | MongoDB | **Actual** | `explain('executionStats')` native in driver | `IXSCAN` B-Tree seek vs. `COLLSCAN` table scan |
| **6** | Redis TTL & Eviction | Redis | **Actual** | Native commands (`TTL`, `PERSIST`, `INFO`) | Expiration lifecycles & LRU memory policies |
| **7** | Eventual Consistency | Polyglot | **Hybrid** | In-process sync coordinator | Dual-write drift, staleness windows, CDC |
| **8** | Degraded Service | Polyglot | **Hybrid** | Container termination disrupts system | Safe wrappers, fallback tiers, circuit breakers |

---

## 4. REST API Specification

All demonstration endpoints are registered under `/api/v1/nosql-demos`:

| Method | Endpoint | Description | Sample Output Field |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/nosql-demos` | Run all 8 demonstrations sequentially | `summary: { actual: 4, simulated: 2, hybrid: 2 }` |
| `GET` | `/api/v1/nosql-demos/mongo-sharding` | Shard key distribution simulation | `steps[].result.shardDistribution` |
| `GET` | `/api/v1/nosql-demos/cassandra-partitioning` | Partition key seeks & Murmur3 token | `steps[].result.murmur3Token` |
| `GET` | `/api/v1/nosql-demos/cassandra-replication` | Tunable consistency & quorum calculation | `steps[].result.consistencyMatrix` |
| `GET` | `/api/v1/nosql-demos/neo4j-indexing` | Cypher query planner `EXPLAIN` | `steps[].result.indexedPlan` |
| `GET` | `/api/v1/nosql-demos/mongo-indexing` | MongoDB `IXSCAN` vs `COLLSCAN` | `steps[].result.executionStats` |
| `GET` | `/api/v1/nosql-demos/redis-ttl` | Live key expiration & memory inspection | `steps[].result.ttlRemaining` |
| `GET` | `/api/v1/nosql-demos/eventual-consistency` | Cross-store staleness & sync delay | `steps[].result.driftWindowMs` |
| `GET` | `/api/v1/nosql-demos/degraded-service` | Polyglot resilience & fallback verification | `steps[].result.resilienceMatrix` |

### Sample Response (`GET /api/v1/nosql-demos/mongo-indexing`)
```json
{
  "success": true,
  "demonstration": {
    "title": "MongoDB Indexing: IXSCAN vs. COLLSCAN",
    "category": "actual",
    "database": "MongoDB",
    "description": "Demonstrates the performance difference between an indexed B-tree search (IXSCAN) and an unindexed collection scan (COLLSCAN) using live MongoDB explain('executionStats').",
    "steps": [
      {
        "step": 1,
        "label": "Execute indexed query with explain()",
        "detail": "Stage: IXSCAN on index { studentId: 1 }. Docs examined: 1, Keys examined: 1.",
        "latencyMs": 1.85,
        "result": { "stage": "IXSCAN", "docsExamined": 1, "keysExamined": 1 }
      },
      {
        "step": 2,
        "label": "Execute unindexed query with explain()",
        "detail": "Stage: COLLSCAN. Scanned all 100 documents to satisfy filter.",
        "latencyMs": 5.42,
        "result": { "stage": "COLLSCAN", "docsExamined": 100 }
      }
    ],
    "educationalNotes": [
      "IXSCAN navigates a B-tree in O(log N) operations; COLLSCAN performs O(N) linear disk reads.",
      "Indexes improve read latency at the expense of write throughput and RAM consumption."
    ]
  }
}
```

---

## 5. Frontend User Experience

The interactive control center is available at navigation item **"14. Advanced NoSQL Demos"**:

1. **Top Metric Bar**: Run all 8 demonstrations with one click or execute them individually.
2. **Engine Badge Coloring**: Color-coded cards by engine (Emerald for MongoDB, Amber for Cassandra, Blue for Neo4j, Rose for Redis, Purple for Multi-Model).
3. **Execution Timeline**: Step-by-step numbered cards with millisecond latency badges and expandable JSON inspection trees.
4. **Academically Rigorous Disclosures**: Collapsible sections disclosing *Why this was simulated* and *Technical limitations* on every demonstration.
5. **Educational Notes**: Curated theoretical takeaways directly mapping back to NoSQL course syllabi.
