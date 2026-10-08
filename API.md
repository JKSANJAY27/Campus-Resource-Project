# REST API Specification

> **Campus Resource Dependency and Personalized Recommendation Graph**  
> *Base URL: `http://localhost:5000/api/v1`*

---

## 1. Response & Error Protocol

All API endpoints return uniform JSON envelopes.

### 1.1 Success Response Envelope (`HTTP 200 / 201`)
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation message"
}
```

### 1.2 Paginated Response Envelope (`HTTP 200`)
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 120,
    "page": 1,
    "limit": 20,
    "totalPages": 6,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### 1.3 Error Response Envelope (`HTTP 400 / 404 / 429 / 500 / 503`)
```json
{
  "success": false,
  "error": "ErrorType (e.g. NotFound, BadRequest, InternalServerError)",
  "message": "Descriptive error message explaining the failure condition."
}
```

---

## 2. API Endpoint Directory

### 2.1 Health & Diagnostics
| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :---: |
| `GET` | `/` | API version, service status, and sitemap | 200 |
| `GET` | `/api/v1/health` | Multi-model health check (probes Mongo, Neo4j, Redis, Cassandra) | 200 / 207 / 503 |

#### Sample `/api/v1/health` Response
```json
{
  "timestamp": "2026-10-08T14:35:12.180Z",
  "uptimeSeconds": 240,
  "overall": "healthy",
  "databases": {
    "mongodb": { "status": "connected", "latencyMs": 2.4 },
    "neo4j": { "status": "connected", "latencyMs": 3.1 },
    "redis": { "status": "connected", "latencyMs": 0.8 },
    "cassandra": { "status": "connected", "latencyMs": 2.9 }
  }
}
```

---

### 2.2 Recommendation & Academic Intelligence
*All recommendation endpoints are protected by sliding-window rate limiting.*

| Method | Endpoint | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/recommendations/skill-gap` | `studentId`, `targetType`, `targetId` | Analyzes missing vs. matched skills, match percentage, and readiness tier |
| `GET` | `/api/v1/recommendations/learning-path` | `studentId`, `targetRole` | Generates topologically ordered learning path steps with prerequisite chains |
| `GET` | `/api/v1/recommendations/courses` | `studentId`, `limit` | Ranked course recommendations based on student gap and prerequisite status |
| `GET` | `/api/v1/recommendations/projects` | `studentId`, `limit` | Ranked portfolio project recommendations |
| `GET` | `/api/v1/recommendations/job-readiness` | `studentId`, `jobId` | Placement readiness percentage and qualification checklist |

#### Sample Response: `GET /api/v1/recommendations/skill-gap?studentId=STU_001&targetType=job&targetId=job_ml`
```json
{
  "success": true,
  "data": {
    "studentId": "STU_001",
    "target": { "type": "job", "id": "job_ml", "name": "Machine Learning Engineer" },
    "readinessPercentage": 66.7,
    "readinessLevel": "Moderate",
    "matchedSkills": [
      { "id": "sk_python", "name": "Python", "category": "Programming" },
      { "id": "sk_math_stats", "name": "Linear Algebra & Statistics", "category": "Data Science & AI" }
    ],
    "missingSkills": [
      {
        "id": "sk_deep_learning",
        "name": "Deep Learning",
        "category": "Data Science & AI",
        "prerequisites": [{ "id": "sk_ml", "name": "Classical Machine Learning" }]
      }
    ],
    "summary": "Student matches 2 of 3 required skills (66.7% readiness). Recommend taking Machine Learning before Deep Learning."
  }
}
```

---

### 2.3 Student Catalog & Portfolio (`/api/v1/students`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/students` | List students with pagination, department, and CGPA filters |
| `GET` | `/api/v1/students/:studentId` | Get complete student profile by ID |
| `POST` | `/api/v1/students` | Create new student profile (triggers multi-store sync) |
| `PUT` | `/api/v1/students/:studentId` | Update student profile |
| `POST` | `/api/v1/students/:studentId/skills` | Add verified skill (updates Mongo, syncs Neo4j edge, invalidates Redis) |
| `POST` | `/api/v1/students/:studentId/courses` | Record completed course |

---

### 2.4 Courses, Skills, Projects, Jobs & Resources
| Base Path | Supported Operations | Parameters / Filters |
| :--- | :--- | :--- |
| `/api/v1/courses` | `GET /`, `GET /:id`, `POST /`, `PUT /:id` | `department`, `difficulty`, `page`, `limit` |
| `/api/v1/skills` | `GET /`, `GET /:id`, `POST /` | `category`, `tier` |
| `/api/v1/projects` | `GET /`, `GET /:id`, `POST /` | `domain`, `difficulty` |
| `/api/v1/jobs` | `GET /`, `GET /:id`, `POST /` | `company`, `minCgpa` |
| `/api/v1/resources` | `GET /`, `GET /:id`, `POST /`, `POST /:id/rate` | `resourceType`, `minRating` |

---

### 2.5 Graph Explorer (`/api/v1/graph`)
| Method | Endpoint | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/graph/overview` | `limit` | Returns React Flow node/edge graph visualization topology |
| `GET` | `/api/v1/graph/prerequisites/:skillId` | `depth` | Cypher recursive traversal of prerequisite dependency chains |
| `GET` | `/api/v1/graph/shortest-path` | `startSkillId`, `endSkillId` | BFS shortest prerequisite path between two skills |
| `GET` | `/api/v1/graph/subgraph/:studentId` | `radius` | Student-centric neighborhood graph |

---

### 2.6 Activity Telemetry (`/api/v1/activity`)
| Method | Endpoint | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/activity` | Body: event record | Appends student interaction event to Cassandra |
| `GET` | `/api/v1/activity/student` | `studentId`, `date` | Retrieves chronological events from partition `(student_id, date)` |
| `GET` | `/api/v1/activity/resource` | `resourceId`, `date` | Fetches usage telemetry for a campus lab or facility |
| `GET` | `/api/v1/activity/summary` | `date` | Daily aggregated event summaries |

---

### 2.7 Cache Admin (`/api/v1/cache`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/cache/metrics` | Returns Redis cache hit count, miss count, hit ratio, and memory stats |
| `GET` | `/api/v1/cache/keys` | Inspects active Redis keys and their remaining TTLs |
| `DELETE` | `/api/v1/cache/flush` | Flushes all cached keys |
| `DELETE` | `/api/v1/cache/student/:studentId` | Invalidates cached portfolios for a specific student |

---

### 2.8 Synchronization Management (`/api/v1/sync`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/sync/full` | Triggers complete cross-store synchronization (Mongo $\to$ Neo4j) |
| `GET` | `/api/v1/sync/status` | Reports entity count parity and sync drift metrics |
| `POST` | `/api/v1/sync/repair` | Reconciles orphaned nodes or missing relationships |

---

### 2.9 Advanced NoSQL Demonstrations (`/api/v1/nosql-demos`)
| Method | Endpoint | Description | Output Details |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/nosql-demos` | Executes all 8 NoSQL demonstration modules sequentially | Full report with timing |
| `GET` | `/api/v1/nosql-demos/mongo-sharding` | Hash vs. range shard key simulation | Document distributions |
| `GET` | `/api/v1/nosql-demos/cassandra-partitioning` | CQL Murmur3 token seek vs. scan | Partition seek latency |
| `GET` | `/api/v1/nosql-demos/cassandra-replication` | Quorum ($R+W>N$) simulation | Consistency matrix |
| `GET` | `/api/v1/nosql-demos/neo4j-indexing` | Cypher query planner `EXPLAIN` | `NodeIndexSeek` plan |
| `GET` | `/api/v1/nosql-demos/mongo-indexing` | MongoDB `explain('executionStats')` | `IXSCAN` vs `COLLSCAN` |
| `GET` | `/api/v1/nosql-demos/redis-ttl` | Live `SETEX`, `TTL`, `PERSIST`, `INFO` | Memory & eviction metrics |
| `GET` | `/api/v1/nosql-demos/eventual-consistency` | Cross-store dual-write sync delay | Propagation drift window |
| `GET` | `/api/v1/nosql-demos/degraded-service` | Polyglot resilience & circuit breaker | Degradation matrix |
