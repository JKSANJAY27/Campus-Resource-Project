# Campus Resource Dependency & Personalized Recommendation Graph
## Phase 0: System Architecture & Implementation Blueprint

---

### Executive Summary & Academic Alignment
This project is an academic multi-model NoSQL platform built to demonstrate **polyglot persistence**, **database-specific access pattern optimization**, and **NoSQL trade-offs (CAP Theorem, PACELC, BASE vs ACID)**. 

Rather than forcing one database to handle workloads outside its optimal design envelope, the platform assigns responsibilities across four distinct NoSQL archetypes:
1. **Document (MongoDB)**: Primary source of truth for rich, hierarchical, and schema-evolving entity metadata (students, courses, projects, jobs, clubs).
2. **Graph (Neo4j)**: Expressive relationship topology, multi-hop dependency traversals, prerequisite chaining, and graph-based recommendation scoring.
3. **Key-Value / In-Memory (Redis)**: Sub-millisecond read caching for high-frequency dashboard queries, recommendation snapshots, and rate-limiting.
4. **Column-Family / Wide-Column (Apache Cassandra)**: High-write throughput, append-only immutable time-series logging for campus resource access, recommendation audit logs, and student activity partitioned by entity and time window.

---

## 1. Final System Architecture

```mermaid
graph TD
    subgraph Client Tier
        UI["Next.js 14+ / React Frontend<br/>(Tailwind CSS, React Flow / Cytoscape, Lucide)"]
    end

    subgraph API & Application Tier
        API["Node.js / Express + TypeScript REST API"]
        SYNC["Polyglot Synchronization Layer<br/>(Mongo Event Projector)"]
        REC["Deterministic Graph Recommendation Engine"]
        BENCH["Automated Benchmark & Experiment Harness"]
    end

    subgraph Storage Tier - Polyglot Persistence
        MONGO[("MongoDB 7.0<br/>[Document Store]<br/>Entity Metadata & Aggregations")]
        NEO4J[("Neo4j 5.x Community<br/>[Graph Store]<br/>Topologies, Paths & Cypher Traversals")]
        REDIS[("Redis 7.x<br/>[Key-Value Store]<br/>Cache-Aside, Rate Limits, Hot Sets")]
        CASS[("Apache Cassandra 4.x / 5.x<br/>[Wide-Column Store]<br/>Append-Only Event Stream & Time-Series")]
    end

    UI <-->|HTTP / REST (JSON)| API
    API -->|Read Entity Metadata & Aggregations| MONGO
    API -->|Cypher Queries & Traversals| NEO4J
    API -->|Cache-Aside (GET/SET with TTL)| REDIS
    API -->|Append-Only CQL Ingestion & Time-Window Queries| CASS

    API --> SYNC
    SYNC -->|Sync Entities & Rel Projections| NEO4J
    SYNC -->|Invalidate Stale Keys| REDIS

    REC -->|Graph Traversals & Neighbor Overlap| NEO4J
    REC -->|Enrich Node Details| MONGO

    BENCH -->|Measure P50/P95/Throughput| MONGO
    BENCH -->|Measure Latency vs Depth| NEO4J
    BENCH -->|Measure Cache Hit vs Miss| REDIS
    BENCH -->|Measure High-Write & Time-Slices| CASS
```

---

## 2. Service & Module Breakdown

The backend follows a **Controller-Service-Repository (Layered Hexagonal-Lite)** architectural pattern:

```
src/
├── config/             # DB connections, environment validation (Zod/dotenv)
├── controllers/        # Request handling, input validation, HTTP status mappings
├── services/           # Domain business logic:
│   ├── student.service.ts
│   ├── recommendation.service.ts   # Graph-first scoring & prerequisite reasoning
│   ├── graph.service.ts            # Cypher traversal queries, paths, subgraphs
│   ├── analytics.service.ts        # Cassandra time-series event aggregations
│   ├── sync.service.ts             # Orchestrates projection of Mongo data to Neo4j
│   └── benchmark.service.ts        # Executes controlled NoSQL experiments
├── repositories/       # Isolated DB access layers:
│   ├── mongo/          # Mongoose / Mongo Native client models & aggregations
│   ├── neo4j/          # Neo4j driver session management & Cypher scripts
│   ├── redis/          # ioredis client wrapper for caching, sets, and rate limits
│   └── cassandra/      # cassandra-driver client for parameterized CQL statements
├── middleware/         # Error handler, request timer (observability), Redis rate limiter
├── types/              # Domain models, DTOs, API response interfaces
└── utils/              # Synthetic generator, seeders, math/scoring utilities
```

---

## 3. Database Responsibilities & Theoretical Justifications

### A. MongoDB (Document Store)
* **Genuine Reason to Exist**: Academic entities (courses with syllabi and evaluation criteria, students with profile metadata and settings, project descriptions) have heterogeneous, polymorphic, and nested structures. A relational DB requires heavy multi-table normalization (6+ joins just to fetch a student profile). MongoDB enables single-document reads (`find_by_id`) with embedded structures (e.g., student contact info, course learning outcomes).
* **Access Patterns**:
  * Primary CRUD operations on entities.
  * Complex multi-stage aggregation pipelines (e.g., group courses by department, calculate skill frequency across active projects).
  * Filtered searches by facets (tags, level, department, duration).
* **NoSQL Concepts Demonstrated**: BSON data structures, schema validation rules, secondary compound indexes, aggregation pipelines (`$match`, `$lookup`, `$group`, `$unwind`), normalization vs denormalization trade-offs.

### B. Neo4j (Graph Store)
* **Genuine Reason to Exist**: Relational and document databases suffer from severe exponential join penalties when querying variable-depth paths (e.g., "Find all transitive prerequisites for Deep Learning" or "Find 3-hop student-club-event-resource connections"). In Neo4j, relationships are first-class citizens stored with index-free adjacency ($O(1)$ pointer-hopping per hop).
* **Access Patterns**:
  * Skill prerequisite tree traversals (finding missing prerequisites in topological order).
  * Shortest path calculations between a student's current skill set and job requirements.
  * Common neighbor / Jaccard similarity between students and projects.
  * Interactive subgraph exploration for the visual graph explorer.
* **NoSQL Concepts Demonstrated**: Property Graph model, index-free adjacency, declarative Cypher querying, graph traversal algorithms (BFS, Dijkstra/Shortest Path), graph-based recommendation reasoning.

### C. Redis (Key-Value Store)
* **Genuine Reason to Exist**: Neo4j graph traversals and MongoDB heavy aggregations are computationally demanding. Recalculating a learning path or dashboard on every page refresh wastes CPU and increases latency from ~2ms to 60-150ms. Redis provides ultra-low sub-millisecond in-memory lookups.
* **Access Patterns**:
  * **Cache-Aside Pattern**: `GET cache:rec:student:{id}`. On miss, query Neo4j+Mongo, populate Redis with TTL.
  * **Rate Limiting**: Sliding window counter via atomic increment + TTL.
  * **Leaderboards / Hot Metrics**: Redis Sorted Sets (`ZADD`, `ZREVRANGE`) for top-accessed campus resources.
* **NoSQL Concepts Demonstrated**: In-memory key-value architecture, TTL and eviction strategies (volatile-lru), cache-aside pattern, stale-while-revalidate concepts, cache hit-rate benchmarking.

### D. Apache Cassandra (Wide-Column Store)
* **Genuine Reason to Exist**: Logging high-frequency campus activities (clicks, resource views, learning path generations, badge completions) creates massive append-only write volume. Doing writes to MongoDB or Neo4j creates write contention and index thrashing. Cassandra uses an LSM-tree (CommitLog + Memtable + SSTables) designed specifically for infinite linear write scale without read-before-write penalties.
* **Access Patterns**:
  * Append-only logging: `INSERT INTO student_activity_by_day ...`
  * Slice queries over time windows: Retrieve activity for student $S$ during date $D$ sorted chronologically.
  * Resource telemetry: Count access spikes for facility or tutorial $R$ across time.
* **NoSQL Concepts Demonstrated**: Wide-column storage architecture, Partition Key (node routing via Murmur3Partitioner) vs Clustering Key (on-disk sort order in SSTable), Tunable Consistency (`LOCAL_ONE`, `LOCAL_QUORUM`), query-driven denormalization.

---

## 4. Database Schemas & Data Models

### A. MongoDB Schema Design

```typescript
// Students Collection
interface IStudentDocument {
  _id: string; // e.g., "stu_01HX..."
  studentId: string; // University Roll / ID
  name: string;
  email: string;
  department: string; // e.g., "Computer Science"
  currentSemester: number;
  interests: string[]; // ["Machine Learning", "Distributed Systems"]
  completedCourseIds: string[]; // ["crs_cs301", "crs_cs302"]
  skillProficiencies: {
    skillId: string;
    level: "beginner" | "intermediate" | "advanced";
    verifiedAt?: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

// Courses Collection
interface ICourseDocument {
  _id: string; // "crs_cs301"
  courseCode: string; // "CS301"
  title: string;
  description: string;
  department: string;
  credits: number;
  difficulty: "introductory" | "intermediate" | "advanced";
  learningOutcomes: string[];
  instructor: {
    name: string;
    email: string;
    office: string;
  };
  syllabusTopics: string[];
  createdAt: Date;
}

// Projects Collection
interface IProjectDocument {
  _id: string; // "proj_01"
  title: string;
  abstract: string;
  domain: string;
  difficulty: "beginner" | "intermediate" | "hard";
  facultyMentor?: string;
  repositoryUrl?: string;
  createdAt: Date;
}

// Jobs Collection
interface IJobDocument {
  _id: string;
  title: string; // "Junior Data Engineer"
  company: string;
  jobType: "internship" | "full_time";
  description: string;
  location: string;
  minimumExperienceMonths: number;
}
```
**MongoDB Secondary Indexes**:
* `students`: `{ department: 1, currentSemester: 1 }`, `{ email: 1 }` (unique)
* `courses`: `{ courseCode: 1 }` (unique), `{ department: 1, difficulty: 1 }`
* `projects`: `{ domain: 1, difficulty: 1 }`

---

### B. Neo4j Graph Model

#### Nodes
| Label | Key Properties | Description |
| :--- | :--- | :--- |
| `(:Student)` | `id`, `name`, `department`, `semester` | Student entity representation |
| `(:Course)` | `id`, `code`, `title`, `credits`, `difficulty` | Academic curriculum course |
| `(:Skill)` | `id`, `name`, `category` (e.g., Language, ML, DevOps) | Technical or domain skill |
| `(:Project)` | `id`, `title`, `domain`, `difficulty` | Practical project work |
| `(:Job)` | `id`, `title`, `company`, `type` | Campus placement or internship role |
| `(:Resource)` | `id`, `title`, `type` (Book, Video, Lab) | Learning material |
| `(:Club)` | `id`, `name`, `category` | Student organization |
| `(:Event)` | `id`, `name`, `date` | Workshop, hackathon, seminar |

#### Relationships & Edge Properties
| Relationship | Source $\to$ Target | Properties | Semantic Meaning |
| :--- | :--- | :--- | :--- |
| `:HAS_SKILL` | `(Student) -> (Skill)` | `level`, `acquiredDate` | Student possesses skill |
| `:INTERESTED_IN` | `(Student) -> (Skill \| Domain)` | `weight` (1-5) | Student's stated interest |
| `:COMPLETED` | `(Student) -> (Course)` | `grade`, `completedAt` | Course completion record |
| `:TEACHES` | `(Course) -> (Skill)` | `depth` (intro/core/advanced) | Course covers this skill |
| `:REQUIRES_PREREQ`| `(Course) -> (Course)` | `isMandatory: boolean` | Formal curricular prerequisite |
| `:PREREQUISITE_OF`| `(Skill) -> (Skill)` | `weight` | Skill hierarchy (Python $\to$ ML) |
| `:REQUIRES_SKILL` | `(Project) -> (Skill)` | `importance` (required/bonus) | Project technical stack |
| `:USES_TECH` | `(Project) -> (Skill)` | - | Tools & frameworks used |
| `:DEMANDS_SKILL` | `(Job) -> (Skill)` | `minimumLevel` | Required job qualification |
| `:TEACHES_SKILL` | `(Resource) -> (Skill)` | `qualityRating` | Resource learning target |
| `:MEMBER_OF` | `(Student) -> (Club)` | `role` | Club membership |
| `:ATTENDED` | `(Student) -> (Event)` | `registeredDate` | Event participation |

---

### C. Apache Cassandra Data Model

Cassandra is query-driven. Tables are designed strictly around the specific queries required by the application.

#### Table 1: `student_activity_by_day`
* **Query Supported**: *"Get all activity log items for student X on date Y, sorted in reverse chronological order."*
```sql
CREATE KEYSPACE IF NOT EXISTS campus_telemetry
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

CREATE TABLE campus_telemetry.student_activity_by_day (
    student_id text,
    activity_date date,
    event_timestamp timestamp,
    event_id uuid,
    action_type text,      -- 'VIEW_COURSE', 'RECOMMEND_RUN', 'SKILL_CLICK'
    target_entity_type text,-- 'COURSE', 'PROJECT', 'JOB'
    target_entity_id text,
    metadata_json text,
    PRIMARY KEY ((student_id, activity_date), event_timestamp, event_id)
) WITH CLUSTERING ORDER BY (event_timestamp DESC, event_id ASC);
```
* **Partition Key**: `(student_id, activity_date)` — ensures that one day of activity for a student resides on a single Cassandra node, bounded in size (< 1-2 MB).
* **Clustering Key**: `event_timestamp DESC, event_id ASC` — guarantees fast, disk-sequential retrieval of recent events.

#### Table 2: `resource_access_history`
* **Query Supported**: *"Get recent access logs for a specific resource to analyze popularity/load trends."*
```sql
CREATE TABLE campus_telemetry.resource_access_history (
    resource_id text,
    year_month text,       -- e.g., '2026-10' (buckets partition to prevent hot partitions)
    event_timestamp timestamp,
    event_id uuid,
    student_id text,
    PRIMARY KEY ((resource_id, year_month), event_timestamp, event_id)
) WITH CLUSTERING ORDER BY (event_timestamp DESC, event_id ASC);
```

#### Table 3: `recommendation_audit_log`
* **Query Supported**: *"Audit what recommendations were served to student X at timestamp T and with what score breakdown."*
```sql
CREATE TABLE campus_telemetry.recommendation_audit_log (
    student_id text,
    rec_type text,         -- 'PROJECT', 'LEARNING_PATH', 'JOB'
    generated_at timestamp,
    rec_id uuid,
    target_item_id text,
    final_score double,
    score_breakdown_json text, -- '{"skill_match": 0.8, "prereq": 1.0, ...}'
    PRIMARY KEY ((student_id, rec_type), generated_at, rec_id)
) WITH CLUSTERING ORDER BY (generated_at DESC, rec_id ASC);
```

---

### D. Redis Key Strategy & Expiration Policy

| Key Pattern | Data Structure | TTL | Purpose |
| :--- | :--- | :--- | :--- |
| `cache:rec:projects:{studentId}` | String (JSON) | 600s (10 min) | Cached project recommendations |
| `cache:rec:learningpath:{studentId}:{targetSkill}` | String (JSON) | 900s (15 min) | Cached topological learning path |
| `cache:rec:jobreadiness:{studentId}:{jobId}` | String (JSON) | 900s (15 min) | Cached skill gap & readiness score |
| `cache:entity:{type}:{id}` | String (JSON) | 1800s (30 min) | High-traffic entity detail metadata |
| `ratelimit:ip:{clientIp}` | Integer (Counter) | 60s | Window rate-limiting (e.g., max 120 req/min) |
| `stats:hot_resources:zset` | Sorted Set (ZSET) | None / Persistent | Resource access frequency counter (`ZINCRBY`) |
| `cache:metrics:nosql_health` | String (JSON) | 30s | Live DB connection status & ping metrics |

**Invalidation Strategy**:
* **Explicit on Mutation**: When a student updates their skills (`POST /api/students/:id/skills`), the backend issues `DEL cache:rec:projects:{studentId}`, `DEL cache:rec:learningpath:{studentId}:*`.
* **Natural TTL**: Ephemeral items naturally expire, handling eventual consistency smoothly.

---

## 5. Polyglot Data Synchronization Strategy

A common failure point in polyglot designs is attempting distributed 2-Phase Commit (2PC) or distributed transactions across heterogeneous databases. We avoid this by implementing a **Primary Source-of-Truth + Eventual Projection Pattern**:

1. **MongoDB is the Authority**: Entity creations and core edits are committed to MongoDB first.
2. **Synchronous Projection Dispatcher**:
   * The `SyncService` receives the created/updated entity.
   * It transforms the entity into graph nodes/edges and executes Cypher statements in Neo4j (`MERGE (n:Entity {id: $id}) ...`).
   * It invalidates affected Redis cache keys.
3. **Audit Emission to Cassandra**:
   * Asynchronous fire-and-forget logging writes the audit event to Cassandra. If Cassandra write latency fluctuates, it does not block the user's primary mutation.
4. **Idempotence**:
   * All Neo4j synchronization uses Cypher `MERGE` statements rather than `CREATE`, preventing duplicate nodes/edges upon retry.
5. **Periodic Reconciliation Task**:
   * A lightweight script checks entity count parity between MongoDB and Neo4j and reports any drift via the Admin dashboard.

---

## 6. Recommendation Algorithms & Explainability

All recommendations are **deterministic, graph-driven, and mathematically transparent**.

### A. Project Recommendation Formula
For a given student $S$ and candidate project $P$:

$$\text{Score}(S, P) = 0.35 \cdot M_{\text{skill}} + 0.25 \cdot M_{\text{prereq}} + 0.20 \cdot M_{\text{interest}} + 0.10 \cdot P_{\text{pop}} + 0.10 \cdot D_{\text{fit}}$$

* **Skill Match ($M_{\text{skill}}$)**:
  $$M_{\text{skill}} = \frac{|\text{Skills}(S) \cap \text{RequiredSkills}(P)|}{|\text{RequiredSkills}(P)|}$$
* **Prerequisite Match ($M_{\text{prereq}}$)**:
  Does the student have prerequisites for the missing skills? Calculated via Cypher traversal:
  $$M_{\text{prereq}} = \frac{|\text{Prerequisites satisfied for missing skills}|}{|\text{Total prerequisites of missing skills}|}$$
* **Interest Alignment ($M_{\text{interest}}$)**:
  Jaccard overlap between project domains/tags and student stated interests.
* **Popularity ($P_{\text{pop}}$)**: Normalized access count from Redis ZSET.
* **Difficulty Fit ($D_{\text{fit}}$)**: 1.0 if semester/year matches project difficulty, 0.6 if 1 level away.

### B. Prerequisite Topological Sort & Learning Path
To reach a target career role or skill (e.g., "Generative AI"):
1. Cypher query traverses `(:Skill)-[:PREREQUISITE_OF*]->(Target)`.
2. Subtracts the set of skills already possessed by the student ($\text{Skill}(S)$).
3. Evaluates in-degree dependencies on remaining missing skills to build a **Directed Acyclic Graph (DAG)**.
4. Produces a topological sequence:
   $$\text{Step 1: Linear Algebra} \to \text{Step 2: Python} \to \text{Step 3: Machine Learning} \to \text{Step 4: PyTorch} \to \text{Step 5: GenAI}$$
5. Enriches each step with corresponding courses (from MongoDB) and practice projects.

### C. Human-Readable Explanation Generator
The backend generates explicit reason strings attached to each recommendation payload:
```json
{
  "projectId": "proj_104",
  "title": "Autonomous Drone Navigation",
  "score": 0.84,
  "explanation": {
    "strengths": [
      "You already master 2 of 3 required skills: Python, Computer Vision",
      "Matches your stated interest in Robotics"
    ],
    "learningOpportunity": "Introduces 1 new skill: ROS (Robot Operating System)",
    "prerequisiteStatus": "All prerequisites for ROS (C++, Linux Basics) are satisfied"
  }
}
```

---

## 7. Backend API Structure

Base URL: `/api/v1`

### Student & Entity Endpoints (MongoDB Primary)
* `GET /api/v1/students` — Paginated list with department/semester filters.
* `GET /api/v1/students/:id` — Full student profile with completed courses & skills.
* `POST /api/v1/students` — Create new student (syncs to Mongo + Neo4j).
* `PUT /api/v1/students/:id/skills` — Update student skill set (triggers cache eviction).
* `GET /api/v1/courses` — Search & list courses.
* `GET /api/v1/projects` — Filter projects by domain & difficulty.
* `GET /api/v1/jobs` — Campus placement & internship roles.

### Graph & Traversal Endpoints (Neo4j Primary)
* `GET /api/v1/graph/subgraph` — Query nodes & edges for visual graph explorer (with limit & depth parameters).
* `GET /api/v1/graph/skills/:id/dependencies` — Upstream prerequisites & downstream dependents.
* `GET /api/v1/graph/shortest-path` — Find shortest connection path between any two nodes (`sourceId`, `targetId`).

### Recommendation Endpoints (Neo4j + Redis Cache + Cassandra Audit)
* `GET /api/v1/recommendations/projects/:studentId` — Personalized projects with explanation payload.
* `GET /api/v1/recommendations/learning-path` — Topological learning path for `studentId` $\to$ `targetSkillId`.
* `GET /api/v1/recommendations/job-readiness/:studentId/:jobId` — Skill gap matrix and completion percentage.

### Analytics & Telemetry Endpoints (Cassandra Primary)
* `POST /api/v1/analytics/events` — Ingest telemetry event (asynchronous append to Cassandra).
* `GET /api/v1/analytics/students/:studentId/activity` — Retrieve student activity timeline by date.
* `GET /api/v1/analytics/resources/:resourceId/traffic` — Resource access frequency over time.

### Benchmark & NoSQL Diagnostics Endpoints
* `GET /api/v1/system/health` — Live connection status & latency ping for Mongo, Neo4j, Redis, Cassandra.
* `POST /api/v1/benchmarks/run` — Trigger controlled experiment suite with parameters (`scale`, `queries`, `depth`).
* `GET /api/v1/benchmarks/results` — Historical benchmark runs (JSON/CSV export).

---

## 8. Frontend Page Structure (Next.js 14 App Router)

1. **`/` (Dashboard)**:
   * Overview metrics (total resources, skills, students, database connection statuses).
   * Quick student switcher (switch personas to test personalized paths).
   * Recent activity feed from Cassandra.
2. **`/profile` (Student Profile)**:
   * Current skills with proficiency badges.
   * Completed courses and interests.
   * Interactive modal to acquire new skills and observe real-time recommendation updates.
3. **`/skill-graph` (Curriculum & Skill Topology)**:
   * Interactive React Flow visualization of prerequisite trees (e.g., Programming $\to$ Data Structures $\to$ Algorithms $\to$ AI).
4. **`/learning-path` (Target-Driven Career Navigator)**:
   * Select a target role (e.g., "Full-Stack Developer", "ML Engineer").
   * Visual roadmap showing completed vs missing skills in topological dependency order.
5. **`/job-readiness` (Placement & Internship Matcher)**:
   * Detailed gap analysis card for campus placement roles.
   * Missing skill breakdown and matched courses.
6. **`/projects` (Project Recommendations)**:
   * Recommended projects ranked by multi-criteria score.
   * "Why recommended?" collapsible explanation panels.
7. **`/graph-explorer` (Full Interactive Graph Sandbox)**:
   * Force-directed multi-entity visual graph (Students, Courses, Skills, Clubs, Projects).
   * Filter by node labels, search by name, inspect neighbor connections, highlight shortest path.
8. **`/analytics` (Campus Telemetry & Time-Series)**:
   * Recharts visual graphs displaying Cassandra time-series events, peak usage hours, and hot resources from Redis.
9. **`/benchmarks` (NoSQL Performance & Experimental Lab)**:
   * Interactive benchmark runner: Test MongoDB indexed vs unindexed, Neo4j traversal depth 1-4, Redis cached vs uncached, Cassandra high-throughput write latency.
   * Real-time latency comparison charts (Avg, Median, P95).
10. **`/nosql-concepts` (Educational Syllabus Demonstration)**:
    * Interactive explanations of CAP theorem, PACELC, BASE vs ACID, and empirical demonstrations of cache staleness and eventual consistency.
11. **`/admin` (Data Seeder & Sync Management)**:
    * Synthetic dataset generator control (Small: 1k, Medium: 5k, Large: 10k entities).
    * Entity count parity checker and manual resynchronization trigger.

---

## 9. Benchmark & Experimental Suite Strategy

To satisfy the academic requirement for **genuine, unfabricated performance measurements**, the benchmark engine runs controlled workloads using real database drivers:

| Experiment # | Database | Benchmark Comparison | What is Measured |
| :--- | :--- | :--- | :--- |
| **Exp 1** | MongoDB | Single Field Query with Index vs Full Collection Scan | Mean latency, P95 latency across 1,000 queries |
| **Exp 2** | MongoDB | Single document lookup vs Multi-stage Aggregation Pipeline (`$lookup`) | CPU time, execution stages |
| **Exp 3** | Neo4j | Variable Path Traversal Depth: 1-hop vs 2-hop vs 3-hop vs 4-hop | Traversal latency (ms) vs exponential graph branching factor |
| **Exp 4** | Neo4j vs Mongo | Relationship traversal: Neo4j Cypher vs MongoDB nested `$lookup` joins | Latency on 3-tier deep prerequisite discovery |
| **Exp 5** | Redis | Cache Hit vs Cache Miss for Student Project Recommendations | Latency reduction (e.g. ~1ms vs ~50ms) |
| **Exp 6** | Cassandra | High-throughput sequential ingestion vs Single-point updates | Writes per second and disk commit stability |
| **Exp 7** | Cassandra | Time-slice query within Partition Key vs Wide Range Scan across partitions | Query latency difference |
| **Exp 8** | Polyglot Sync | End-to-end mutation latency: Mongo Write + Neo4j Projection + Redis Invalidation | End-to-end sync overhead |

**Data Collection & Export**:
* Each benchmark runs $N$ iterations (default 50-200) with warm-up cycles.
* Collects: Minimum, Maximum, Average, Median (P50), 95th Percentile (P95), Standard Deviation.
* Results exported to `/data/benchmarks/results_{timestamp}.json` and downloadable as `.csv`.

---

## 10. Synthetic Dataset Generator Design

The dataset generator (`scripts/seed.ts` & `src/utils/generator.ts`) uses deterministic seeds (Faker.js with fixed seed) to produce realistic, interconnected campus data:

* **Scales**:
  * **Small (Default for rapid dev)**: 1,000 Students, 80 Courses, 120 Skills, 150 Projects, 50 Jobs, 25 Clubs, 10,000 Cassandra events.
  * **Medium (Benchmark default)**: 5,000 Students, 200 Courses, 300 Skills, 500 Projects, 150 Jobs, 50 Clubs, 50,000 Cassandra events.
  * **Large (Stress test)**: 10,000+ Students, 400 Courses, 600 Skills, 1,200 Projects, 300 Jobs, 100 Clubs, 150,000 Cassandra events.
* **Realistic Dependency Structures**:
  * Curated skill ontology: Foundational (Python, Math, C++) $\to$ Intermediate (Algorithms, Data Analysis, Linux) $\to$ Advanced (Deep Learning, Kubernetes, Distributed Systems).
  * Prerequisite chains are guaranteed to be **Directed Acyclic Graphs (no circular dependencies)**.

---

## 11. Docker Compose & Infrastructure Architecture

The entire stack runs via Docker Compose on a single laptop without internet dependencies after image pull:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: crg_mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=campus_resource_graph
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  neo4j:
    image: neo4j:5.18-community
    container_name: crg_neo4j
    ports:
      - "7474:7474" # HTTP Browser
      - "7687:7687" # Bolt protocol
    volumes:
      - neo4j_data:/data
    environment:
      - NEO4J_AUTH=neo4j/campusgraphpassword
      - NEO4J_PLUGINS=["apoc"]
      - NEO4J_dbms_memory_heap_initial__size=512m
      - NEO4J_dbms_memory_heap_max__size=1024m
    healthcheck:
      test: ["CMD-SHELL", "cypher-shell -u neo4j -p campusgraphpassword 'RETURN 1' || exit 1"]
      interval: 15s
      timeout: 10s
      retries: 5

  redis:
    image: redis:7.2-alpine
    container_name: crg_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy volatile-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  cassandra:
    image: cassandra:4.1
    container_name: crg_cassandra
    ports:
      - "9042:9042" # CQL native transport
    volumes:
      - cassandra_data:/var/lib/cassandra
    environment:
      - CASSANDRA_CLUSTER_NAME=CampusTelemetryCluster
      - CASSANDRA_DC=datacenter1
      - CASSANDRA_ENDPOINT_SNITCH=GossipingPropertyFileSnitch
      - HEAP_NEWSIZE=128M
      - MAX_HEAP_SIZE=512M
    healthcheck:
      test: ["CMD-SHELL", "cqlsh -e 'DESCRIBE KEYSPACES' || exit 1"]
      interval: 30s
      timeout: 15s
      retries: 8

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: crg_backend
    ports:
      - "5000:5000"
    depends_on:
      mongodb:
        condition: service_healthy
      neo4j:
        condition: service_healthy
      redis:
        condition: service_healthy
      cassandra:
        condition: service_healthy
    environment:
      - PORT=5000
      - MONGO_URI=mongodb://mongodb:27017/campus_resource_graph
      - NEO4J_URI=bolt://neo4j:7687
      - NEO4J_USER=neo4j
      - NEO4J_PASSWORD=campusgraphpassword
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - CASSANDRA_CONTACT_POINTS=cassandra
      - CASSANDRA_KEYSPACE=campus_telemetry

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: crg_frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1

volumes:
  mongo_data:
  neo4j_data:
  redis_data:
  cassandra_data:
```

*Resource Footprint Note*: Total container heap sizes are bounded (Cassandra Max 512MB, Neo4j Max 1024MB, Redis Max 256MB) to safely run within an 8GB–16GB student laptop without swap thrashing.

---

## 12. Directory Structure

```
campus_resource_graph/
├── docker-compose.yml
├── .gitignore
├── README.md
├── docs/
│   ├── PHASE_0_BLUEPRINT.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_DESIGN.md
│   ├── BENCHMARKING.md
│   └── API.md
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── src/
│   │   ├── app.ts              # Express initialization & middleware
│   │   ├── server.ts           # Server bootstrap & DB connection pool
│   │   ├── config/
│   │   │   ├── database.ts     # Health checks & connection providers
│   │   │   └── env.ts          # Validated config
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   │   ├── mongo/
│   │   │   ├── neo4j/
│   │   │   ├── redis/
│   │   │   └── cassandra/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── utils/
│   └── tests/
│       ├── unit/
│       └── integration/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── .env.example
│   └── src/
│       ├── app/                # Next.js App Router pages
│       ├── components/         # UI components & Graph visualizer
│       ├── lib/                # API fetchers & utilities
│       └── types/
└── scripts/
    ├── seed.ts                 # Synthetic campus dataset generator
    ├── run_benchmarks.ts       # CLI benchmark runner
    └── test_db_connections.ts  # Verification probe
```

---

## 13. Critical Review: Genuine Reasons for Every Database

| Database | Traditional Anti-Pattern | Our Genuine Responsibility | Justification Checklist |
| :--- | :--- | :--- | :--- |
| **MongoDB** | Treating it as a dump for everything including graphs | Source of truth for complex, evolving academic entity documents and multi-facet aggregations. | Validated: Schemas have polymorphic fields and nested objects. |
| **Neo4j** | Using Neo4j just to store a 2-column foreign key link | Traversing 3+ hop dependency chains, prerequisite topological ordering, shortest-path skill journeys. | Validated: Cypher outperforms relational recursive CTEs and Mongo `$graphLookup` at depth $\ge 2$. |
| **Redis** | Dumping random string data with no TTL | Low-latency caching of computed graph recommendations, rate-limiting, and top resource sorted sets. | Validated: Avoids repeating expensive Neo4j traversals on repeated view requests. |
| **Cassandra** | Using Cassandra as a secondary general document store | High-throughput append-only event stream (activity log, audit records) with time-series partition/clustering keys. | Validated: Query patterns are strictly driven by Partition Key `(student_id, date)` and Clustering Key `timestamp DESC`. |

---

## 14. Avoiding Unnecessary Complexity (Pitfall Mitigation)

1. **No Distributed Transactions (2PC)**: Avoid coordinating atomic commits across Mongo and Neo4j. Instead, use an idempotent synchronization layer with `MERGE` queries.
2. **No Heavy Distributed Message Brokers (Kafka/RabbitMQ)**: For a single-node student application, running Kafka requires ZooKeeper or KRaft and consumes >1.5GB RAM. We use an in-process event emitter or direct service dispatch with optional Redis Pub/Sub if backgrounding is needed.
3. **No Heavy Machine Learning Frameworks (PyTorch/TensorFlow)**: Recommendations rely on transparent, deterministic graph algorithms (BFS, Jaccard overlap, scoring formulas) which are 100% explainable, instant, and require no GPU or gigabytes of Python packages.
4. **No Complex Identity Frameworks**: Simple JWT/Mock role-based headers (`X-Student-Id`, `X-Role: admin`) are sufficient for academic role switching without auth bloat.
5. **No Proprietary Cloud Dependencies**: 100% Dockerized and runnable locally with zero external network access.

---

## 15. Incremental Development Phases

* **Phase 0 (Current)**: Architecture Blueprint, NoSQL responsibility validation, Schema & API design. *(Completed with this document)*
* **Phase 1: Infrastructure & DB Connectivity**: Docker Compose setup, connection clients for all 4 databases, health check ping script, basic repository scaffolding.
* **Phase 2: Data Models & Synthetic Generator**: MongoDB Mongoose schemas, Neo4j constraints & schema, Cassandra keyspace & CQL tables, synthetic campus dataset generator (small/medium/large).
* **Phase 3: Core API & Polyglot Synchronization**: CRUD endpoints, projection logic from Mongo $\to$ Neo4j, Redis cache-aside implementation, Cassandra event logging.
* **Phase 4: Recommendation Engine & Graph Reasoning**: Graph traversal algorithms, prerequisite path calculator, multi-criteria recommendation scoring with explainability payloads.
* **Phase 5: Experimental Benchmarking Suite**: Automated test harness for the 8 NoSQL experiments, metric collection (P50, P95, Avg), CSV/JSON exporter.
* **Phase 6: Modern Web UI**: Next.js 14 frontend with interactive graph visualization (React Flow / Cytoscape), student dashboard, learning path viewer, benchmark charts, and NoSQL educational page.
* **Phase 7: End-to-End Verification & Academic Documentation**: Integration tests, full verification, complete academic documentation (`README.md`, `ARCHITECTURE.md`, `DATABASE_DESIGN.md`, `BENCHMARKING.md`, `EXPERIMENTS.md`).

---

## 16. Definition of Done for Phase 0

Phase 0 is complete when:
- [x] Clear theoretical and practical responsibilities are mapped to each database model (Document, Graph, Key-Value, Wide-Column).
- [x] Every database has a justified access pattern and anti-patterns are eliminated.
- [x] Schema designs, CQL tables with partition/clustering keys, Cypher graph models, and Redis keys are formally documented.
- [x] Deterministic recommendation algorithm and mathematical scoring formula are finalized.
- [x] Controlled benchmarking experiments are defined with exact metrics to measure.
- [x] Docker Compose multi-container architecture is detailed with memory caps.
- [x] Roadmap of incremental development phases is established.
- [x] Git repository is initialized, connected to remote origin, and ready for Phase 1.
