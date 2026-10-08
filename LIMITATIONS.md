# System Limitations & Engineering Tradeoffs

> **Campus Resource Dependency and Personalized Recommendation Graph**  
> *Clear Disclosures on Implemented Functionality, Educational Simulations, and Architectural Tradeoffs*

---

## 1. Classification of Project Components

To maintain complete academic and engineering integrity, the platform clearly distinguishes between what was fully implemented against live database engines, what was simulated for educational demonstration, and what constitutes future work.

| Component / Feature | Classification | Technical Justification |
| :--- | :---: | :--- |
| **MongoDB Document Store** | **Fully Implemented** | Full CRUD, BSON schemas, compound indexes, and aggregation pipelines running on live MongoDB 7.0 container. |
| **Neo4j Graph Traversals & DAG Roads** | **Fully Implemented** | Live Cypher queries via Bolt protocol, schema indexes, BFS shortest path, and index-free adjacency on Neo4j 5.18. |
| **Redis Cache-Aside & Rate Limiting** | **Fully Implemented** | Live commands (`GET`, `SETEX`, `TTL`, `PERSIST`, `INFO`) and sliding-window rate limiters on Redis 7.2. |
| **Cassandra Wide-Column Telemetry** | **Fully Implemented** | Live CQL queries, composite partition keys, and reverse chronological clustering keys on Apache Cassandra 4.1. |
| **Recommendation Engine & Explainability** | **Fully Implemented** | Deterministic skill-gap scoring, topological prerequisite sorting, and course/project ranking pipelines. |
| **Multi-Model Performance Benchmarking** | **Fully Implemented** | High-resolution monotonic timing (`performance.now()`) with warmup isolation across all 4 database engines. |
| **MongoDB Horizontal Sharding Demo** | **Simulated** | Full MongoDB sharded cluster requires 10 containers (3 config + 6 shards + mongos router) consuming >8 GB RAM. Partitioning math and chunk balancer modeled cleanly in code. |
| **Cassandra Multi-Node Replication Demo** | **Simulated** | 3-node Cassandra cluster bootstrap requires 4+ minutes and 6+ GB RAM. Quorum formula ($R+W>N$) modeled mathematically using live keyspace schema. |
| **Cross-Store Eventual Consistency Demo** | **Hybrid** | Live dual-store updates executed against MongoDB and Neo4j, while network propagation delays are modeled to trace the staleness window. |
| **Partial Failure / Degraded Service Demo** | **Hybrid** | Live database health inspected; actual fallback wrappers (`safeExec`) exercised without terminating live containers mid-session. |
| **Distributed Change Data Capture (CDC)** | **Future Work** | In-process synchronization used instead of Debezium / Apache Kafka. |
| **Distributed Multi-Raft Consensus** | **Future Work** | Beyond the scope of an academic polyglot capstone on a single host. |

---

## 2. Technical Limitations & Tradeoffs

### 2.1 Single-Host Docker Deployment Constraints
* **Resource Contention**: Running four heterogeneous database engines (MongoDB, Neo4j, Redis, Cassandra) concurrently on a developer laptop creates memory and CPU competition. Cassandra consumes up to $512\text{ MB}$ of JVM heap, Neo4j up to $1\text{ GB}$, and MongoDB WiredTiger allocates $50\%$ of available RAM by default.
* **Network Latency Isolation**: All containers communicate over Docker bridge virtual networks (`localhost` or container DNS). Measured latencies reflect inter-process container networking rather than real-world wide-area network (WAN) or cross-datacenter transit times.

### 2.2 Polyglot Synchronization Boundary (BASE vs. ACID)
* **Dual-Write Consistency Drift**: In the absence of distributed two-phase commit (2PC) transactions across different database vendors, updating an entity in MongoDB and syncing it to Neo4j introduces an asynchronous inconsistency window ($\approx 15 - 50\text{ ms}$). During this interval, a graph query might observe slightly stale skill relationships until sync completes.
* **In-Process Coordination vs. Enterprise CDC**: Synchronization is currently coordinated in-process within the Express application layer. In a production enterprise deployment, this would be decoupled using Change Data Capture (e.g., Debezium reading MongoDB oplogs and streaming events into Apache Kafka).

### 2.3 Neo4j Community Edition Constraints
* **Single-Node Graph Topology**: Neo4j Community Edition does not support multi-leader Causal Clustering or graph sharding (Fabric). The graph dataset must fit within the memory and disk capacity of a single Neo4j instance.
* **Dataset Scale Ceiling**: Traversal times remain sub-10ms for datasets up to 100K nodes; however, super-node traversal (nodes with $>10,000$ relationships, such as universal skills like "Python") requires degree-filtering to prevent memory spikes.

### 2.4 Cassandra Tombstone Overhead
* **Deletion Anti-Pattern**: Cassandra handles deletions by appending tombstone markers. Deleting high volumes of activity records in test environments can cause read query degradation until garbage collection compactions execute. The system mitigates this by treating Cassandra as strictly append-only.

---

## 3. Scope of Claims

* **Architecture vs. Algorithm Contribution**: The primary contribution of this project is the **practical hybrid multi-model NoSQL architecture, polyglot integration, and empirical benchmarking across document, graph, key-value, and wide-column models**.
* **Recommendation Algorithm**: The recommendation engine uses deterministic heuristic scoring, graph overlap counting, and topological prerequisite sorting. It does **not** claim a novel machine learning or deep learning recommendation algorithm. Its value lies in demonstrating how graph traversals and document lookups coordinate to solve real-world dependency problems cleanly.
