# Benchmarking Methodology & Experimental Guide

> **Campus Resource Dependency and Personalized Recommendation Graph**  
> *Controlled, Reproducible Performance Benchmarking Across 4 NoSQL Engines*

---

## 1. Benchmarking Philosophy & Academic Principles

The benchmarking suite is engineered according to rigorous experimental standards:

1. **No Fabricated Data**: Real queries execute against live database instances using high-precision monotonic timing (`performance.now()`). Deterministic baselines are supplied only when drivers are intentionally offline.
2. **Warmup Isolation**: Every benchmark experiment isolates initial warmup runs ($N_{\text{warmup}} = 5$) from measured runs ($N_{\text{measured}} = 25$ to $100$). Warmup iterations prime the OS page cache, trigger V8 JIT compilation, and populate connection pools before measurements begin.
3. **Multi-Scale Tiers**: Experiments are calibrated across multiple dataset scales:
   $$\text{1K records} \implies \text{5K records} \implies \text{10K records} \implies \text{50K records} \implies \text{100K records}$$
4. **Fair Architectural Comparison**: Databases are benchmarked **strictly for the workloads they were engineered to serve**. We evaluate Redis for in-memory reads, Cassandra for append-heavy ingestion, Neo4j for multi-hop graph traversals, and MongoDB for document lookups.
5. **Full Distribution Metrics**: Every experiment captures and reports:
   $$\text{Min}, \quad \text{Mean } (\mu), \quad \text{P50 (Median)}, \quad \text{P90}, \quad \text{P95}, \quad \text{P99}, \quad \text{Max}, \quad \text{Throughput } (\text{Ops/Sec}), \quad \text{StdDev } (\sigma)$$

---

## 2. Experimental Measurement Formulae

### High-Resolution Monotonic Timing
For run $i$, latency $\Delta t_i$ is recorded as:
$$\Delta t_i = t_{\text{end}, i} - t_{\text{start}, i} \quad (\text{milliseconds})$$

### Statistical Parameters
Given $N$ measured iterations sorted in non-decreasing order:
$$\mu = \frac{1}{N}\sum_{i=1}^N \Delta t_i$$

$$\sigma = \sqrt{\frac{1}{N-1}\sum_{i=1}^N (\Delta t_i - \mu)^2}$$

$$P_{50} = \Delta t_{\lfloor 0.50 \times N \rfloor}, \quad P_{90} = \Delta t_{\lfloor 0.90 \times N \rfloor}, \quad P_{95} = \Delta t_{\lfloor 0.95 \times N \rfloor}, \quad P_{99} = \Delta t_{\lfloor 0.99 \times N \rfloor}$$

$$\text{Throughput} = \frac{N}{\sum_{i=1}^N \Delta t_i \times 10^{-3}} \quad (\text{Operations / Second})$$

---

## 3. Workloads Evaluated

### Category A: Redis (In-Memory Key-Value)
* **Point Read**: Direct $O(1)$ RAM hash-map lookup by key (`rec:courses:STU_001`).
* **Cache-Aside Warm Hit**: Accelerated recommendation read short-circuiting the database.
* **Cache-Aside Cold Miss**: Full database fetch + JSON serialization + `SETEX` command.

### Category B: Apache Cassandra (Wide-Column Store)
* **Sequential Append-Heavy Ingestion**: CommitLog + Memtable write without read-before-write overhead.
* **Partition Key Clustered Time-Series**: Point partition seek on `token(student_id)` with reversed clustering column scan (`created_at DESC`).

### Category C: Neo4j (Graph Store)
* **1-Hop Neighbor Traversal**: Direct pointer dereferencing (`(:Student)-[:HAS_SKILL]->(:Skill)`).
* **2-Hop Career Path Match**: Multi-hop pattern traversal (`(:Student)-[:INTERESTED_IN]->(:Skill)<-[:REQUIRES]-(:Job)`).
* **3-Hop DAG Prerequisite Chain**: Recursive transitive closure traversal along prerequisite edges.

### Category D: MongoDB (Document Store)
* **Primary Key Read**: Point B-Tree seek on unique clustered index `{ studentId: 1 }`.
* **Secondary Index Filter & Pagination**: Compound B-Tree scan on `{ department: 1, currentSemester: 1 }`.
* **Multi-Collection Aggregation**: Nested aggregation pipeline joining students, courses, and skills.
* **Document Update**: Journaled write with WiredTiger MVCC checkpointing.

### Category E: Polyglot Composite Pipeline
* **End-to-End Recommendation**: Coordinates Redis cache probe $\to$ Neo4j graph traversal $\to$ MongoDB document hydration $\to$ Cassandra audit logging.

---

## 4. How to Run the Benchmarks

### Option 1: Reproducible CLI Benchmark Runner
```bash
cd backend
npm run benchmark:reproducible
```
Runs 25 measured iterations across all workloads, prints statistical percentile distributions, and saves artifacts to:
- `benchmarks/benchmark_results.json`
- `benchmarks/benchmark_results.csv`

### Option 2: Configurable Iterations CLI Runner
```bash
cd backend
npx tsx scripts/benchmark-nosql.ts --iterations=50
```

### Option 3: Interactive Web Dashboard
Navigate to **"13. Reproducible Benchmarks"** in the web application (`http://localhost:3000`).
Features:
- Live run triggers with real-time execution progress bars
- Scale tier selector (1K, 5K, 10K, 50K, 100K)
- Percentile distribution bar charts (Min, Median, P95, Max)
- CSV / JSON export buttons
