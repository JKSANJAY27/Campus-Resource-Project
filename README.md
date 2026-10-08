# Campus Resource Dependency & Personalized Recommendation Graph

> **A Hybrid Multi-Model NoSQL Platform for Campus Resources, Skills, Courses, Projects, and Career Paths**  
> Built for academic demonstration of NoSQL architectures, polyglot persistence, and graph-based recommendation reasoning.

---

## 🏛️ Multi-Model NoSQL Architecture

| Database Model | Database Engine | Primary Responsibility & Workload |
| :--- | :--- | :--- |
| **Document** | **MongoDB 7.0** | Source of truth for entity metadata (Students, Courses, Projects, Jobs, Clubs) with nested schemas & aggregations. |
| **Graph** | **Neo4j 5.x** | Prerequisite dependency chains, multi-hop traversals, shortest-path roadmaps, and neighborhood overlap scoring. |
| **Key-Value / In-Memory** | **Redis 7.x** | Sub-millisecond cache-aside layer for recommendations, high-traffic entities, and sliding-window rate limiting. |
| **Wide-Column** | **Apache Cassandra 4.1** | High-throughput append-only immutable time-series logging for student activity and recommendation audit logs. |

---

## 🚀 Quick Start (Docker Compose)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v20+ with Docker Compose v2+)
- Node.js v20+ (optional for local non-containerized development)

### 1. Launch All Services
```bash
docker compose up -d
```
This spins up:
- **MongoDB** (`localhost:27017`)
- **Neo4j** (`localhost:7474` HTTP UI / `localhost:7687` Bolt) — Auth: `neo4j` / `campusgraphpassword`
- **Redis** (`localhost:6379`)
- **Cassandra** (`localhost:9042`)
- **Backend API** (`localhost:5000`)
- **Frontend Next.js** (`localhost:3000`)

### 2. Verify Database Health
Probe all 4 NoSQL engines via HTTP:
```bash
curl http://localhost:5000/api/v1/health
```

Or run the CLI probe:
```bash
cd backend
npm run check-db
```

### 3. Open the Web Application
Navigate to [http://localhost:3000](http://localhost:3000) in your web browser.

The interactive Next.js application features 12 specialized academic control centers and educational modules:
1. **Home / Dashboard**: System-wide multi-model statistics, active student summary, and quick navigation modules.
2. **Student Profile**: Academic standing, verified skillset, transcript, and interactive skill addition with dual-store sync.
3. **Skill Gap Analysis**: Role comparison, readiness percentage gauge, matched vs. missing prerequisites.
4. **Personalized Learning Path**: Vertical directed flowchart (*Current Skills* $\to$ *Missing Prerequisites* $\to$ *Required Skills* $\to$ *Courses* $\to$ *Projects* $\to$ *Target Job*).
5. **Course Recommendations**: Ranked course catalog with relevance match scores, prerequisite status, and explicit explanations of *why* recommended.
6. **Project Recommendations**: Hands-on portfolio project recommendations with difficulty tags, tech stack, and *why* recommended.
7. **Job Readiness Assessment**: Placement qualification index, technical interview checklists, and graph overlap analysis.
8. **Resource Browser**: Searchable, filterable catalog of campus GPU clusters, libraries, and textbooks with Cassandra activity logging.
9. **Graph Explorer**: Full interactive **React Flow** canvas featuring zoom, pan, node selection, edge labels, metadata drawer, shortest-path highlighting, and dependency expansion.
10. **Activity Analytics**: Cassandra-backed time-series telemetry with partition key inspector and synthetic event generators.
11. **Database & Cache Metrics**: Redis in-memory hit rates, TTL inspectors, and multi-model latency benchmarks.
12. **Admin & Sync Monitor**: Polyglot synchronization coordinator (Mongo $\to$ Neo4j $\to$ Redis $\to$ Cassandra) with retry queues and cache invalidation.
13. **Phase 10 NoSQL Educational Lab**: Comprehensive curriculum covering 14 syllabus topics with 3 interactive simulations (Cache Stale-Data, Graph Traversal, Cassandra Token Ring).
14. **Phase 11 Reproducible Benchmarks**: Statistical measurement suite ($N=25$) isolating JIT warmup, measuring Min/Max/Mean/P50/P95 latencies and throughput across 1K–100K datasets.
15. **Phase 12 Advanced NoSQL Demonstrations**: 8 live & simulated architectural modules (MongoDB sharding, Cassandra token partitioning, tunable replication, Neo4j & Mongo indexing, Redis TTL & LRU eviction, eventual consistency, and degraded-service resilience).

---

## 📊 Benchmarking & Performance Evaluation (Phase 9)

### 1. Run Standalone CLI Benchmark Suite
```bash
cd backend
npm run benchmark -- --iterations=50
```
Outputs statistical distributions (Min, Mean, P50, P90, P95, P99, Ops/Sec) and writes results to:
- `benchmarks/benchmark_results.json`
- `benchmarks/benchmark_results.csv`

### 2. Generate Publication-Quality Charts
```bash
python scripts/generate_benchmark_charts.py
```
Produces:
- `docs/charts/latency_comparison.svg`
- `docs/charts/speedup_comparison.svg`
- `docs/charts/nosql_latency_distribution.png`

---

## 🧪 Testing & System Hardening (Phase 13)

### 1. Standalone Phase 13 Hardening Suite (Zero-Dependency)
```bash
node scripts/verify-phase13-hardening.cjs
```
Runs 25 automated tests across 12 test suites verifying unit logic, integration flows, uniform API error envelopes, health diagnostics, recommendation formulas, cache mechanics, Cassandra queries, synchronization, edge cases (no skills, 100% skills, broken prerequisites, circular dependency handling, deleted resources, stale cache, missing partition, missing nodes), and security/dependency audits.

### 2. Backend Vitest Test Suite
```bash
cd backend
npm test
```
Runs comprehensive Vitest suites covering:
- Graph recommendation algorithms & topological sorting (`recommendation.unit.test.ts`)
- System hardening & edge cases (`hardening.edge-cases.test.ts`)
- API error responses & health diagnostics (`api.hardening.test.ts`)
- Redis cache-aside, TTLs, and rate limiting (`redis.unit.test.ts`)
- Cassandra partition clustering & LSM append simulation (`cassandra.unit.test.ts`)
- Polyglot synchronization & idempotent replication (`sync.unit.test.ts`)
- Multi-Model benchmarking & statistical percentile calculations (`benchmark.unit.test.ts`)

## 📚 Project Documentation Suite (Phase 14)

The platform includes comprehensive academic, architectural, and operational documentation:

| Document | Description |
| :--- | :--- |
| **[PROJECT_REPORT.md](PROJECT_REPORT.md)** | **Full Conference-Style Paper**: Abstract, architecture, multi-model schemas, recommendation method, empirical results, and discussion. |
| **[SETUP.md](SETUP.md)** | **Setup & Deployment Guide**: Quick start with Docker Compose, local dev, port configuration, and troubleshooting. |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | **System Architecture**: Tiered architecture diagram, data flow sequence, and fail-safe degradation matrix. |
| **[DATABASE_DESIGN.md](DATABASE_DESIGN.md)** | **Physical & Logical Schemas**: Mermaid diagrams and field tables for MongoDB, Neo4j, Cassandra, and Redis. |
| **[API.md](API.md)** | **REST API Reference**: Request/response schemas, query parameters, status codes, and error envelopes. |
| **[BENCHMARKING.md](BENCHMARKING.md)** | **Benchmarking Methodology**: Monotonic timing formulas, warmup isolation, and reproducibility protocols. |
| **[EXPERIMENTS.md](EXPERIMENTS.md)** | **Empirical Evaluation**: Actual benchmark measurements, percentiles ($P_{50}, P_{95}$), and speedup calculations. |
| **[TESTING.md](TESTING.md)** | **Testing Guide**: Zero-dependency test runner, Vitest suites, and verification of all 9 edge cases. |
| **[LIMITATIONS.md](LIMITATIONS.md)** | **Limitations & Disclosures**: Distinctions between implemented vs. simulated modules, and engineering tradeoffs. |

---

## 🔬 Phase-by-Phase Technical Whitepapers

Detailed phase implementation specifications are archived in `docs/`:
- [Phase 0: Architecture Blueprint](docs/PHASE_0_BLUEPRINT.md)
- [Phase 5: Recommendation Engine](docs/PHASE_5_RECOMMENDATION_ENGINE.md)
- [Phase 6: Redis In-Memory Layer](docs/PHASE_6_REDIS_CACHE.md)
- [Phase 7: Cassandra Append-Heavy Storage](docs/PHASE_7_CASSANDRA_STORAGE.md)
- [Phase 8: Multi-Store Synchronization](docs/PHASE_8_SYNC_ARCHITECTURE.md)
- [Phase 9: Benchmarks & Theoretical Evaluation](docs/PHASE_9_BENCHMARKS.md)
- [Phase 10: NoSQL Architecture & Educational Demonstrations](docs/PHASE_10_NOSQL_ARCHITECTURE.md)
- [Phase 11: Reproducible Performance Benchmarking](docs/PHASE_11_REPRODUCIBLE_BENCHMARKS.md)
- [Phase 12: Advanced NoSQL Demonstrations](docs/PHASE_12_ADVANCED_NOSQL_DEMOS.md)
- [Phase 13: Final System Hardening & Quality Assurance](docs/PHASE_13_FINAL_HARDENING.md)

