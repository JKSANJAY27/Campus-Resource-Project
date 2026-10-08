# Database Architecture & Design Decisions: MongoDB Document Layer

## 1. Executive Summary & Multi-Model Positioning

The **Campus Resource Dependency and Personalized Recommendation Graph** utilizes a hybrid multi-model NoSQL architecture. Each database engine is selected for its specialized access patterns:

| Database Engine | Primary Role | Read/Write Pattern | Data Shape |
|---|---|---|---|
| **MongoDB** | Primary Document & Entity Store | Rich queries, sub-document mutations, secondary indexing, analytical aggregations | JSON/BSON Hierarchical Documents |
| **Neo4j** | Graph & Relationship Engine | Path traversal, cycle detection, multi-hop recommendations, transitive prerequisites | Nodes, Labeled Edges, Properties |
| **Cassandra** | High-Throughput Activity Logs | High-write append-only time-series stream, partitioned by student/time | Wide-column Tabular Records |
| **Redis** | In-Memory Performance Layer | Session caching, recommendation result caches, real-time counters, rate limiting | Key-Value, Sorted Sets, Hashes |

MongoDB serves as the **source of truth for entity documents and aggregates**. Rather than functioning merely as flat relational tables, MongoDB is leveraged for its native capabilities: nested documents, array operations, text search, and powerful multi-stage aggregation pipelines.

---

## 2. Schema Modeling: Embedding vs. Referencing Architecture

A classic anti-pattern when adopting MongoDB is **relational over-normalization**—creating separate collections for every minor entity (e.g., `StudentSkills`, `StudentCourses`, `ClubMemberships`) and stitching them together with foreign keys. Conversely, blind denormalization leads to massive, unbounded documents that exceed the 16MB document boundary.

Our design employs a **bounded embedding strategy** balanced with **explicit external referencing**.

### 2.1 The Decision Matrix

```
                        ┌───────────────────────────────┐
                        │      Data Relationship        │
                        └───────────────┬───────────────┘
                                        │
                 Is it 1-to-few or 1-to-many?
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
        [1-to-Few (Bounded)]                         [1-to-Many / Unbounded]
                 │                                             │
      Frequently read together?                     Independent lifecycle?
      ┌──────────┴──────────┐                       ┌──────────┴──────────┐
     YES                   NO                      YES                   NO
      │                     │                       │                     │
      ▼                     ▼                       ▼                     ▼
   [EMBED]         [HYBRID / REFERENCE]        [REFERENCE]         [HYBRID BUCKET]
(Student Skills,     (Project tech tags,     (Student events,     (Audit logs in
 Course instructor)    Resource skills)       Enrollments)         Cassandra)
```

### 2.2 Deep Dive by Entity

#### 1. Student Aggregate (`StudentModel`)
* **Embedded Sub-documents**:
  * `skills: [{ skillId, level, acquiredAt }]`: A student typically acquires between 5 and 40 skills throughout a 4-year degree. Embedding this array eliminates a join on every profile fetch, enabling atomic updates (e.g., `$addToSet`, `$set`) and indexed array queries (`'skills.skillId': 1`).
  * `completedCourses: [{ courseId, grade, completedSemester, completedAt }]`: Bounded strictly by the degree curriculum (30–50 courses total). Embedding allows instant GPA calculation and prerequisite validation within a single round-trip.
  * `clubMemberships: [{ clubId, role, joinedAt }]`: Small bounded set (typically 1–4 clubs).
* **Referenced Identifiers**:
  * `projectIds: string[]` & `attendedEventIds: string[]`: Projects and events have their own complex metadata, lifecycle, and multiple participants. We store string references (`PRJ...`, `EVT...`) rather than nesting the full project or event objects. Detailed join-like reporting is accomplished via `$lookup` in aggregation pipelines.

#### 2. Course Entity (`CourseModel`)
* **Embedded Value Object**:
  * `instructor: { name, email, office }`: Tightly coupled to course section metadata with a 1:1 relationship.
  * `syllabusTopics: string[]`: Static syllabus metadata, always displayed alongside course descriptions.
* **Referenced Identifiers**:
  * `taughtSkillIds: string[]`: Skills exist independently in the global skill taxonomy.
  * `prerequisiteCourseIds: string[]`: Facilitates fast direct lookups while delegating multi-hop transitive validation to Neo4j.

#### 3. Event & Facility Entities (`EventModel`, `FacilityModel`)
* Events reference `organizingClubId` and `venueFacilityId`.
* **Concurrency Control**: `EventModel` maintains `capacity` and `registeredCount`. Registrations utilize MongoDB atomic condition operators (`$inc: { registeredCount: 1 }` with `{ registeredCount: { $lt: capacity } }`) to prevent overbooking without requiring distributed locks.

---

## 3. Comprehensive Indexing Strategy

Indexes are tailored directly to the read patterns of the application to prevent full-collection scans (`COLLSCAN`) and guarantee $O(\log N)$ or index-covered execution (`IXSCAN`).

### Index Catalog

| Collection | Index Fields | Index Type | Target Query Pattern |
|---|---|---|---|
| **Students** | `studentId: 1` | Unique B-Tree | Primary entity key lookups |
| | `email: 1`, `rollNumber: 1` | Unique B-Tree | Duplicate prevention on registration |
| | `department: 1, currentSemester: 1` | Compound B-Tree | Department cohort filtering and batch queries |
| | `'skills.skillId': 1` | Multikey B-Tree | Students holding a specific skill (e.g., job matching) |
| | `cgpa: -1, currentSemester: 1` | Compound B-Tree | Merit lists, honors sorting, placement eligibility |
| | `name: 'text', rollNumber: 'text'` | Full-Text | Instant student search bar in administrative portal |
| **Courses** | `courseId: 1`, `code: 1` | Unique B-Tree | Primary identifier and catalog code queries |
| | `department: 1, difficulty: 1` | Compound B-Tree | Catalog filtering by student department and year |
| | `title: 'text', description: 'text'` | Full-Text | Keyword course discovery |
| **Skills** | `skillId: 1`, `name: 1` | Unique B-Tree | Skill resolution and autocomplete |
| | `category: 1` | B-Tree | Taxonomy filtering by domain |
| | `name: 'text', description: 'text'` | Full-Text | Skill search |
| **Projects** | `projectId: 1` | Unique B-Tree | Project lookups |
| | `domain: 1, difficulty: 1` | Compound B-Tree | Project browsing by domain and difficulty level |
| | `title: 'text', technologiesUsed: 'text'` | Full-Text | Technology-based project searches |
| **Jobs** | `jobId: 1` | Unique B-Tree | Job detail lookups |
| | `preferredDomain: 1, jobType: 1` | Compound B-Tree | Placement portal filters (e.g., AI/ML + Internship) |
| | `title: 'text', company: 'text'` | Full-Text | Career search queries |
| **Resources** | `resourceId: 1` | Unique B-Tree | Resource lookups |
| | `taughtSkillIds: 1, difficulty: 1` | Multikey Compound | Skill-specific learning resource recommendation |
| | `accessCount: -1, rating: -1` | Compound Sort | Trending and popular resource leaderboards |
| **Clubs** | `clubId: 1`, `name: 1` | Unique B-Tree | Club lookups |
| | `category: 1` | B-Tree | Categorical exploration |
| **Events** | `eventId: 1` | Unique B-Tree | Event lookups |
| | `eventDate: -1, eventType: 1` | Compound B-Tree | Chronological upcoming/past event timelines |
| **Facilities** | `facilityId: 1` | Unique B-Tree | Facility lookups |
| | `facilityType: 1, capacity: -1` | Compound B-Tree | Venue scheduling and capacity matching |

---

## 4. Analytical MongoDB Aggregation Pipelines

MongoDB's Aggregation Framework is utilized to execute analytical reports natively within the database engine, avoiding the overhead of pulling raw collections into application memory.

### 4.1 Popular Resources Pipeline
* **Endpoint**: `GET /api/v1/resources/analytics/popular`
* **Objective**: Compute a composite popularity score combining user engagement (`accessCount`) and quality (`rating`).
* **Pipeline Stages**:
  1. `$project`: Calculates `popularityScore: { $add: ["$accessCount", { $multiply: ["$rating", 20] }] }` along with entity metadata.
  2. `$sort`: Sorts descending by `popularityScore: -1`.
  3. `$limit`: Bounds the top results (e.g., top 10).

### 4.2 Most Active Students Pipeline
* **Endpoint**: `GET /api/v1/students/analytics/most-active`
* **Objective**: Rank students across holistic campus participation (skills acquired, courses completed, projects undertaken, clubs joined, events attended).
* **Pipeline Stages**:
  1. `$project`: Employs `$size` on arrays:
     * `skillCount: { $size: { $ifNull: ["$skills", []] } }`
     * `courseCount: { $size: { $ifNull: ["$completedCourses", []] } }`
     * `projectCount: { $size: { $ifNull: ["$projectIds", []] } }`
     * `clubCount: { $size: { $ifNull: ["$clubMemberships", []] } }`
     * `eventCount: { $size: { $ifNull: ["$attendedEventIds", []] } }`
  2. `$addFields`: Calculates weighted activity score:
     $$\text{Score} = (\text{Skills} \times 3) + (\text{Courses} \times 4) + (\text{Projects} \times 5) + (\text{Clubs} \times 2) + (\text{Events} \times 1)$$
  3. `$sort`: Orders by `activityScore: -1`.
  4. `$limit`: Returns top active campus leaders.

### 4.3 Course Popularity Pipeline
* **Endpoint**: `GET /api/v1/courses/analytics/popularity`
* **Objective**: Aggregate enrollment numbers and average grade performance across all course completions.
* **Pipeline Stages**:
  1. `$unwind`: Unwinds `$completedCourses` from the Student collection.
  2. `$group`: Groups by `courseId`, computing:
     * `completedCount: { $sum: 1 }`
     * `grades: { $push: "$completedCourses.grade" }`
  3. `$lookup`: Joins `courses` collection using `localField: "_id"`, `foreignField: "courseId"`.
  4. `$unwind`: Deconstructs matched course metadata.
  5. `$sort`: Orders descending by `completedCount: -1`.

### 4.4 Skill Distribution Pipeline
* **Endpoint**: `GET /api/v1/students/analytics/skill-distribution`
* **Objective**: Analyze campus-wide competency breakdown across skill proficiency tiers (`beginner`, `intermediate`, `advanced`).
* **Pipeline Stages**:
  1. `$unwind`: Unwinds `$skills` sub-document array.
  2. `$group`: Groups by `skills.skillId` with conditional counts:
     * `beginnerCount: { $sum: { $cond: [{ $eq: ["$skills.level", "beginner"] }, 1, 0] } }`
     * `intermediateCount: { $sum: { $cond: [{ $eq: ["$skills.level", "intermediate"] }, 1, 0] } }`
     * `advancedCount: { $sum: { $cond: [{ $eq: ["$skills.level", "advanced"] }, 1, 0] } }`
     * `totalStudents: { $sum: 1 }`
  3. `$lookup`: Resolves human-readable skill name and category from `skills` collection.
  4. `$project`: Normalizes final response format.

### 4.5 Event Participation Pipeline
* **Endpoint**: `GET /api/v1/events/analytics/participation`
* **Objective**: Measure attendance efficiency, fill rates, and overbooking prevention metrics.
* **Pipeline Stages**:
  1. `$project`: Computes:
     * `occupancyRate: { $round: [{ $multiply: [{ $divide: ["$registeredCount", { $max: ["$capacity", 1] }] }, 100] }, 1] }`
     * `availableSeats: { $max: [0, { $subtract: ["$capacity", "$registeredCount"] }] }`
  2. `$lookup`: Joins `clubs` collection to identify the host club name.
  3. `$sort`: Sorts by `eventDate: -1`.

### 4.6 Project Statistics Pipeline
* **Endpoint**: `GET /api/v1/projects/analytics/stats`
* **Objective**: Group active projects by engineering domain and track average difficulty and team limits.
* **Pipeline Stages**:
  1. `$group`: Groups by `$domain`:
     * `projectCount: { $sum: 1 }`
     * `avgTeamSize: { $avg: "$maxTeamSize" }`
     * `technologies: { $addToSet: "$technologiesUsed" }`
  2. `$project`: Flattens unique technology sets and calculates domain engagement metrics.

---

## 5. Schema Validation & Integrity Protection

Data integrity is maintained using a multi-layer defense:

1. **Mongoose Schema-Level Validation**:
   * Enforced `enum` values for constrained fields (e.g., student semester `min: 1, max: 8`, CGPA `min: 0.0, max: 10.0`, skill tiers, event types).
   * Schema `unique: true` indexes on critical business keys (`rollNumber`, `email`, `courseId`, `skillId`, etc.).
2. **Service-Layer Zod Validation**:
   * Inbound JSON payloads are validated with Zod schemas before database queries are formed.
   * Cross-entity business rules (e.g., checking that prerequisite courses exist before linking) are enforced at the service boundary.
3. **Optimistic Updates & Atomicity**:
   * Event registration uses atomic conditional increments:
     ```typescript
     await EventModel.findOneAndUpdate(
       { eventId, registeredCount: { $lt: capacity } },
       { $inc: { registeredCount: 1 } }
     );
     ```

---

## 6. When to Defer to Neo4j, Cassandra, and Redis

To prevent architectural degradation, clear boundaries dictate which queries remain in MongoDB vs. other NoSQL stores:

```
┌───────────────────────────────────────┬────────────────────────────────────────┐
│               USE MONGODB             │              DEFER TO NEO4J            │
├───────────────────────────────────────┼────────────────────────────────────────┤
│ • Entity profile retrieval (CRUD)     │ • Multi-hop prerequisite dependency    │
│ • Keyword & full-text filtering       │   chains (e.g., Skill A -> B -> C -> D)│
│ • Paginated student/course rosters    │ • Shortest learning path discovery     │
│ • Aggregated summaries and counts     │ • Career-path cycle and anomaly checks │
│ • Direct sub-document array updates   │ • Personalized collaborative filtering │
└───────────────────────────────────────┴────────────────────────────────────────┘

┌───────────────────────────────────────┬────────────────────────────────────────┐
│               USE MONGODB             │            DEFER TO CASSANDRA          │
├───────────────────────────────────────┼────────────────────────────────────────┤
│ • Current state of student entities   │ • Continuous telemetry / activity logs │
│ • Entity descriptions and catalogs    │ • High-volume learning events/clicks   │
│ • Complex analytical joins ($lookup)  │ • Partitioned time-series history      │
└───────────────────────────────────────┴────────────────────────────────────────┘

┌───────────────────────────────────────┬────────────────────────────────────────┐
│               USE MONGODB             │              DEFER TO REDIS            │
├───────────────────────────────────────┼────────────────────────────────────────┤
│ • Persistent canonical entity store   │ • Ephemeral session tokens             │
│ • Long-term indexed query execution   │ • Hot graph recommendation cache       │
│ • Complex multi-condition queries     │ • Real-time rate limiting & counters   │
└───────────────────────────────────────┴────────────────────────────────────────┘
```
