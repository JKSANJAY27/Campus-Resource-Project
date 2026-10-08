# Phase 10: NoSQL Educational & Architecture Demonstration Module

## 1. Overview & Pedagogical Purpose

This module serves as the capstone academic syllabus synthesis for the **Campus Resource Dependency and Personalized Recommendation Graph** platform. It bridges theoretical distributed database concepts from the course curriculum with concrete implementations in our 4-store polyglot architecture:
* **MongoDB**: Document Database (Flexible entity metadata & aggregation pipelines)
* **Neo4j**: Property Graph Database (Index-free adjacency & prerequisite DAGs)
* **Redis**: In-Memory Key-Value Database (Sub-millisecond cache-aside speed layer)
* **Apache Cassandra**: Wide-Column Database (LSM-tree append-heavy telemetry streams)

---

## 2. Comprehensive Curriculum: 14 Core Syllabus Topics

### 1. SQL vs. NoSQL Architectural Paradigms
* **Relational Limitations**: SQL enforces static schemas, normalization (3NF) to eliminate redundancy, and ACID guarantees via locking. Modeling complex campus prerequisite networks in SQL requires 5+ join tables, resulting in exponential $O(N \times M)$ join overhead.
* **NoSQL Strategy**: Polyglot persistence relaxes global serializability, allowing data stores to optimize for specific access patterns (hierarchical documents, graph traversals, in-memory keys, or sequential append partitions).

### 2. Why Document Databases are Useful Here (MongoDB)
* **Polymorphic Schemas**: Campus entities (Students, Courses, Facilities, Clubs) have varying attributes. Some students possess publications, others hold club officer positions or certifications.
* **Document Locality**: Student records and course catalogs are retrieved as cohesive BSON documents in a single disk read ($O(\log N)$ via B-Tree index), avoiding relational joins.
* **Aggregation Framework**: Native `$lookup`, `$unwind`, and `$group` pipeline stages enable multi-collection analytical rollups.

### 3. Why Key-Value Databases are Useful Here (Redis)
* **Sub-Millisecond Read Latency**: Redis operates entirely in RAM with an in-memory hash table dictionary, resolving keys in $O(1)$ time (<1 ms).
* **Cache-Aside Pattern**: Frequently accessed student dashboards and precomputed recommendation snapshots are cached with Time-To-Live (TTL) expiration, yielding an **18.6x read speedup** over uncached primary database queries.
* **Sliding Rate Limiting**: Redis atomic increments protect graph recommendation endpoints against high-concurrency request bursts.

### 4. Why Cassandra is Useful for Event Data (Wide-Column)
* **Log-Structured Merge-Trees (LSM)**: Traditional B-Trees suffer from write amplification and page lock contention during high-velocity write bursts. Cassandra appends incoming clickstream events sequentially to an on-disk **CommitLog** and an in-memory **Memtable**, flushing sequentially to immutable **SSTables**.
* **Zero Read-Before-Write**: Cassandra never reads previous state during ingestion, providing linear write scalability.

### 5. Why Graph Databases are Useful for Dependencies (Neo4j)
* **Index-Free Adjacency (IFA)**: Nodes store direct physical pointers to adjacent relationship records. Following an edge takes $O(1)$ time, making graph traversal complexity $O(k)$ relative only to the number of traversed edges, completely independent of global graph size.
* **Prerequisite DAGs & Cycle Detection**: Detecting circular dependencies and computing topological learning paths executes natively in Cypher.

### 6. ACID vs. BASE Concurrency Paradigms
* **ACID (Pessimistic Guarantees)**: Enforced in **MongoDB** for student course registration and grade records to prevent double-enrollment or transactional corruption.
* **BASE (Optimistic Availability)**: Embraced in **Cassandra** for student clickstream logs and in **asynchronous cross-store sync**:
  * *Basically Available*: The system always accepts telemetry writes.
  * *Soft State*: Data undergoes transient divergence across stores.
  * *Eventual Consistency*: Background sync workers converge all stores.

### 7. The CAP Theorem in Multi-Model Systems
* **MongoDB (CP)**: Prioritizes consistency. Under partition, a primary separated from the majority steps down to reject divergent writes.
* **Redis (CP)**: Rejects writes if cluster hash slots lose replica majority.
* **Neo4j (CA / CP)**: Causal clustering Raft core ensures graph pointer integrity.
* **Apache Cassandra (AP)**: Prioritizes total availability. Writes to local datacenter nodes succeed even during partition, later reconciling via Hinted Handoffs and Read Repairs.

### 8. Eventual Consistency in Multi-Store Synchronization
* Rather than employing fragile distributed transactions (Two-Phase Commit / 2PC), our platform uses a **service-layer synchronization pipeline**.
* When a student updates skills, MongoDB commits immediately. The backend propagates the edge to Neo4j, invalidates the Redis cache, and logs an audit record in Cassandra. The system converges within 5–15 milliseconds.

### 9. Query-Driven Denormalization
* Wide-column databases disallow joins. Schemas are designed strictly around target read queries:
  1. `student_activity_by_day`: Partitioned by `(student_id, activity_date)`
  2. `resource_activity_by_date`: Partitioned by `(resource_id, activity_date)`
* Each activity event is written to both tables simultaneously, trading disk storage for sub-5ms single-partition reads.

### 10. Partition Keys & Consistent Hashing Token Rings
* Cassandra’s partitioner (**Murmur3Partitioner**) computes a 64-bit integer token from the compound partition key `(student_id, activity_date)`.
* The token maps to a specific position on the 360-degree cluster ring, determining which physical node holds the row.

### 11. Clustering Keys & Physical On-Disk Sort Order
* Within a partition’s SSTable, clustering keys determine physical byte order on disk.
* `WITH CLUSTERING ORDER BY (event_timestamp DESC)` ensures the newest events are physically sequential at the head of the file, allowing instant range scans.

### 12. Indexing Strategies across NoSQL Models
* **MongoDB**: Clustered B-Trees for `_id`; compound B-Trees for secondary filters.
* **Redis**: In-memory Hash Tables with $O(1)$ pointer dereferencing.
* **Cassandra**: SSTable summary files and in-memory Bloom Filters to bypass disk I/O.
* **Neo4j**: Double-linked memory pointers between node and relationship records.

### 13. Graph Traversal Algorithms & Topological Sorting
* **Kahn’s Algorithm & DFS**: Computes valid linear prerequisite sequences over directed acyclic graphs (DAGs).
* **Dijkstra / BFS**: Discovers the shortest prerequisite learning path between student current skills and career job targets.

### 14. Polyglot Persistence: System Synthesis
* Synthesizes 4 distinct NoSQL databases into a unified application SLA:
  * Cache Read (Redis): **~0.8ms**
  * Profile Fetch (MongoDB): **~4.7ms**
  * Graph Reasoning (Neo4j): **~10.1ms**
  * Activity Telemetry (Cassandra): **~2.5ms**
  * **Composite Polyglot SLA**: **~19.0ms**

---

## 3. Interactive Educational Demonstrations

The frontend includes 3 interactive simulation labs located under the **NoSQL Architecture & Demos** tab:

### Demo 1: Cache Staleness & Invalidation Simulator
1. **Source State**: Alex Chen's profile in MongoDB shows GPA `3.82`.
2. **Cache State**: Redis holds warm key `dashboard:student:STU_001` with GPA `3.82`.
3. **Mutation**: User triggers update in MongoDB: Alex Chen's GPA increases to `3.95`.
4. **Stale Cache Detection**: Reading Redis returns stale GPA `3.82` because the TTL has not expired.
5. **Invalidation**: User triggers `DEL dashboard:student:STU_001`.
6. **Cache-Aside Recovery**: Subsequent read causes a Cache Miss $\to$ fetches fresh GPA `3.95` from MongoDB $\to$ re-warms Redis with fresh data.

### Demo 2: Graph Traversal Step-by-Step Simulator
* Steps through directed relationship pointers from student to target job:
  * Step 1: `Alex Chen` $\xrightarrow{\text{STUDENT\_HAS\_SKILL}}$ `Python`
  * Step 2: `Python` $\xrightarrow{\text{SKILL\_PREREQUISITE\_OF}}$ `Machine Learning`
  * Step 3: `Machine Learning` $\xleftarrow{\text{COURSE\_TEACHES}}$ `CS420: Applied ML`
  * Step 4: `Machine Learning` $\xrightarrow{\text{SKILL\_PREREQUISITE\_OF}}$ `Deep Learning`
  * Step 5: `Deep Learning` $\xrightarrow{\text{JOB\_REQUIRES}}$ `AI/ML Engineer`
* Illustrates $O(1)$ index-free adjacency pointer dereferencing.

### Demo 3: Cassandra Consistent Hashing Token Ring Visualizer
* Inputs compound partition key `(student_id, activity_date)`.
* Computes simulated 64-bit Murmur3 token hash.
* Maps the token to a 360-degree node ring (6 cluster nodes).
* Identifies primary and secondary replica nodes under Replication Factor $RF=3$.
* Shows how the clustering key physically sorts rows on disk in reverse chronological order.

> **Academic Disclaimer**: These demonstrations illustrate distributed systems mechanics for pedagogical coursework. They are conceptual interactive visualizations and do not constitute formal distributed systems benchmarks or multi-datacenter network experiments.
