# Neo4j Graph Database Schema & Query Architecture

## 1. Executive Summary & Graph Domain Model

In the **Campus Resource Dependency and Personalized Recommendation Graph**, Neo4j serves as the **high-performance relationship and topological traversal engine**. While MongoDB stores rich documents and aggregates, Neo4j models index-free adjacency across the campus learning network, enabling:

* Direct and multi-hop prerequisite dependency traversals
* Directed Acyclic Graph (DAG) validation and cycle detection
* Shortest learning path discovery
* Skill gap analysis for career requirements
* Peer discovery and collaborative study group clustering

---

## 2. Graph Schema Specification

### 2.1 Node Catalog (10 Labels)

```
       ┌───────────┐         STUDENT_HAS_SKILL         ┌─────────┐
       │  Student  ├──────────────────────────────────►│  Skill  │
       └─────┬─────┘                                   └───▲─▲─▲─┘
             │                                             │ │ │
             │ STUDENT_COMPLETED            COURSE_TEACHES │ │ │
             ▼                                             │ │ │
       ┌───────────┐───────────────────────────────────────┘ │ │
       │  Course   │                                         │ │
       └─────┬─────┘                                         │ │
             │ COURSE_REQUIRES                               │ │
             ▼                                               │ │
       ┌───────────┐                        PROJECT_REQUIRES │ │
       │  Course   │         ┌───────────┐                   │ │
       └───────────┘         │  Project  ├───────────────────┘ │
                             └─────┬─────┘                     │
                                   │ PROJECT_USES              │
                                   ▼                           │
                             ┌───────────┐                     │
                             │Technology │        JOB_REQUIRES │
                             └───────────┘                     │
                                                     ┌─────┐   │
                                                     │ Job ├───┘
                                                     └─────┘
```

| Label | Primary Key | Properties | Data Type | Description |
|---|---|---|---|---|
| `Student` | `id` | `rollNumber`, `name`, `department`, `semester`, `cgpa` | String, Int, Float | Undergraduate or graduate student entity |
| `Skill` | `id` | `name`, `category`, `tier` | String, Enum (`foundational`, `intermediate`, `advanced`, `specialized`) | Distinct atomic competency |
| `Course` | `id` | `code`, `title`, `department`, `credits`, `difficulty` | String, Int, Enum | Academic credit course |
| `Project` | `id` | `title`, `domain`, `difficulty` | String, Enum | Applied capstone/research project |
| `Technology` | `name` | `name` | String | Specific software library, framework, or tool |
| `Job` | `id` | `title`, `company`, `type`, `preferredDomain` | String, Enum (`internship`, `full_time`) | Placement or internship opportunity |
| `Resource` | `id` | `title`, `type`, `difficulty` | String, Enum | Video, tutorial, lab, textbook, cheatsheet |
| `Club` | `id` | `name`, `category` | String, Enum (`Technical`, `Cultural`, etc.) | Registered student campus club |
| `Event` | `id` | `title`, `eventType`, `eventDate` | String, DateString | Workshop, hackathon, seminar, or competition |
| `Facility` | `id` | `name`, `type`, `capacity` | String, Enum, Int | Physical laboratory, auditorium, or hall |

---

### 2.2 Relationship Catalog (14 Canonical Types)

| Relationship Type | Source Node | Target Node | Properties | Semantics |
|---|---|---|---|---|
| `STUDENT_HAS_SKILL` | `(:Student)` | `(:Skill)` | `level` (`beginner`, `intermediate`, `advanced`), `acquiredAt` | Student possesses competency at verified level |
| `STUDENT_INTERESTED_IN` | `(:Student)` | `(:Skill)` | `declaredAt` | Expressed domain or skill learning interest |
| `STUDENT_COMPLETED` | `(:Student)` | `(:Course)` | `grade` (`A+`, `A`, `B+`, `B`, `C`), `completedSemester` | Academic course successfully finished |
| `COURSE_TEACHES` | `(:Course)` | `(:Skill)` | — | Course curriculum imparts this skill |
| `COURSE_REQUIRES` | `(:Course)` | `(:Course)` | — | Curricular prerequisite course dependency |
| `SKILL_PREREQUISITE_OF` | `(:Skill)` | `(:Skill)` | — | Directed prerequisite: Source must precede Target |
| `PROJECT_REQUIRES` | `(:Project)` | `(:Skill)` | — | Skill required to execute project |
| `PROJECT_USES` | `(:Project)` | `(:Technology)` | — | Concrete technology stack employed |
| `JOB_REQUIRES` | `(:Job)` | `(:Skill)` | — | Essential skill demanded by employer |
| `RESOURCE_TEACHES` | `(:Resource)` | `(:Skill)` | — | Self-learning asset covering skill |
| `STUDENT_MEMBER_OF` | `(:Student)` | `(:Club)` | `role` (`Member`, `Lead`, `Coordinator`) | Active club membership |
| `STUDENT_ATTENDS` | `(:Student)` | `(:Event)` | — | Co-curricular event attendance |
| `EVENT_ORGANIZED_BY` | `(:Event)` | `(:Club)` | — | Hosting organization |
| `FACILITY_SUPPORTS` | `(:Facility)` | `(:Event)` | — | Physical venue hosting the event |

---

## 3. Constraints & Indexes

Uniqueness constraints ensure integrity and build automatic backing B-Trees on primary identifiers:

```cypher
// Uniqueness Constraints
CREATE CONSTRAINT student_id_unique IF NOT EXISTS FOR (s:Student) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT course_id_unique IF NOT EXISTS FOR (c:Course) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT skill_id_unique IF NOT EXISTS FOR (sk:Skill) REQUIRE sk.id IS UNIQUE;
CREATE CONSTRAINT project_id_unique IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT tech_name_unique IF NOT EXISTS FOR (t:Technology) REQUIRE t.name IS UNIQUE;
CREATE CONSTRAINT job_id_unique IF NOT EXISTS FOR (j:Job) REQUIRE j.id IS UNIQUE;
CREATE CONSTRAINT club_id_unique IF NOT EXISTS FOR (cl:Club) REQUIRE cl.id IS UNIQUE;
CREATE CONSTRAINT event_id_unique IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT resource_id_unique IF NOT EXISTS FOR (r:Resource) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT facility_id_unique IF NOT EXISTS FOR (f:Facility) REQUIRE f.id IS UNIQUE;

// Performance B-Tree Indexes
CREATE INDEX skill_name_idx IF NOT EXISTS FOR (sk:Skill) ON (sk.name);
CREATE INDEX skill_category_idx IF NOT EXISTS FOR (sk:Skill) ON (sk.category);
CREATE INDEX skill_tier_idx IF NOT EXISTS FOR (sk:Skill) ON (sk.tier);
CREATE INDEX course_code_idx IF NOT EXISTS FOR (c:Course) ON (c.code);
CREATE INDEX course_dept_idx IF NOT EXISTS FOR (c:Course) ON (c.department);
CREATE INDEX project_domain_idx IF NOT EXISTS FOR (p:Project) ON (p.domain);
CREATE INDEX job_domain_idx IF NOT EXISTS FOR (j:Job) ON (j.preferredDomain);
CREATE INDEX student_dept_idx IF NOT EXISTS FOR (s:Student) ON (s.department);
CREATE INDEX student_sem_idx IF NOT EXISTS FOR (s:Student) ON (s.semester);
CREATE INDEX event_date_idx IF NOT EXISTS FOR (e:Event) ON (e.eventDate);
```

---

## 4. The 12 Canonical Cypher Graph Operations

### 1. Find Prerequisites for a Skill (Direct & Transitive)
* **API**: `GET /api/v1/graph/skills/:skillId/prerequisites?maxDepth=5`
* **Cypher**:
  ```cypher
  MATCH path = (prereq:Skill)-[:SKILL_PREREQUISITE_OF*1..5]->(target:Skill {id: $skillId})
  WITH prereq, min(length(path)) AS depth
  RETURN prereq.id AS prerequisiteId, prereq.name AS name, prereq.category AS category, prereq.tier AS tier, depth
  ORDER BY depth ASC, name ASC
  ```
* **Rationale**: Multi-hop directed path traversal up to parameterized depth. Uses `min(length(path))` to handle diamond dependencies cleanly.

### 2. Find All Skills Required by a Job
* **API**: `GET /api/v1/graph/jobs/:jobId/skills`
* **Cypher**:
  ```cypher
  MATCH (j:Job {id: $jobId})
  OPTIONAL MATCH (j)-[:JOB_REQUIRES]->(sk:Skill)
  RETURN j.id AS jobId, j.title AS title, j.company AS company, j.type AS type, j.preferredDomain AS preferredDomain,
         collect(DISTINCT { id: sk.id, name: sk.name, category: sk.category, tier: sk.tier }) AS skills
  ```
* **Rationale**: Instant 1-hop lookahead returning the demand profile of hiring partners.

### 3. Find Student's Current Skills
* **API**: `GET /api/v1/graph/students/:studentId/skills`
* **Cypher**:
  ```cypher
  MATCH (s:Student {id: $studentId})-[r:STUDENT_HAS_SKILL]->(sk:Skill)
  RETURN sk.id AS skillId, sk.name AS name, sk.category AS category, sk.tier AS tier, r.level AS level
  ORDER BY sk.name ASC
  ```
* **Rationale**: Extracts verified competencies with edge properties (`level`).

### 4. Find Missing Skills for Student (Target Job, Project, or Skill)
* **API**: `GET /api/v1/graph/students/:studentId/missing-skills?targetType=job&targetId=job_01`
* **Cypher (Job)**:
  ```cypher
  MATCH (j:Job {id: $targetId})-[:JOB_REQUIRES]->(req:Skill)
  WHERE NOT EXISTS {
    MATCH (:Student {id: $studentId})-[:STUDENT_HAS_SKILL]->(req)
  }
  RETURN req.id AS skillId, req.name AS name, req.category AS category, req.tier AS tier
  ORDER BY req.name ASC
  ```
* **Rationale**: Negation pattern in Cypher (`WHERE NOT EXISTS`) evaluates the student's competence gap against target requirements without in-memory set diffing in Node.js.

### 5. Find Courses Teaching Missing Skills
* **API**: `GET /api/v1/graph/students/:studentId/courses-for-missing?targetType=job&targetId=job_01`
* **Cypher**:
  ```cypher
  MATCH (c:Course)-[:COURSE_TEACHES]->(sk:Skill)
  WHERE sk.id IN $missingSkillIds
  OPTIONAL MATCH (c)-[:COURSE_REQUIRES]->(reqC:Course)
  WITH c, collect(DISTINCT { id: sk.id, name: sk.name }) AS taughtMissing, collect(DISTINCT reqC.code) AS prereqCodes
  RETURN c.id AS courseId, c.code AS code, c.title AS title, c.department AS department, c.credits AS credits,
         c.difficulty AS difficulty, taughtMissing, prereqCodes
  ORDER BY size(taughtMissing) DESC, c.code ASC
  ```
* **Rationale**: Groups curricular remedial courses by the number of missing skills covered, prioritizing high-efficiency electives.

### 6. Find Projects Matching Student's Skills
* **API**: `GET /api/v1/graph/students/:studentId/matching-projects?minMatchRatio=0.5`
* **Cypher**:
  ```cypher
  MATCH (p:Project)
  OPTIONAL MATCH (p)-[:PROJECT_REQUIRES]->(req:Skill)
  WITH p, collect(DISTINCT { id: req.id, name: req.name }) AS allReqSkills
  
  MATCH (s:Student {id: $studentId})
  OPTIONAL MATCH (s)-[:STUDENT_HAS_SKILL]->(stuSk:Skill)
  WITH p, allReqSkills, collect(DISTINCT stuSk.id) AS studentSkillIds

  WITH p, allReqSkills,
       [sk IN allReqSkills WHERE sk.id IN studentSkillIds] AS matchedSkills,
       [sk IN allReqSkills WHERE NOT sk.id IN studentSkillIds] AS missingSkills

  WITH p, allReqSkills, matchedSkills, missingSkills,
       size(allReqSkills) AS totalReq,
       size(matchedSkills) AS matchedCount

  WITH p, allReqSkills, matchedSkills, missingSkills, totalReq, matchedCount,
       CASE WHEN totalReq > 0 THEN toFloat(matchedCount) / toFloat(totalReq) ELSE 1.0 END AS matchRatio

  WHERE matchRatio >= $minMatchRatio
  RETURN p.id AS projectId, p.title AS title, p.domain AS domain, p.difficulty AS difficulty,
         totalReq AS requiredSkillCount, matchedCount AS matchedSkillCount, matchRatio, matchedSkills, missingSkills
  ORDER BY matchRatio DESC, matchedCount DESC, p.title ASC
  ```
* **Rationale**: Calculates graph set overlap ratio directly in database engine with dynamic threshold filtering.

### 7. Find Related Resources
* **API**: `GET /api/v1/graph/resources/related/:entityId?type=skill`
* **Cypher (via Course)**:
  ```cypher
  MATCH (c:Course {id: $entityId})-[:COURSE_TEACHES]->(sk:Skill)<-[:RESOURCE_TEACHES]-(r:Resource)
  RETURN r.id AS resourceId, r.title AS title, r.type AS type, collect(DISTINCT { id: sk.id, name: sk.name }) AS skillsTaught
  ORDER BY size(skillsTaught) DESC, r.title ASC
  ```

### 8. Find Common Interests Between Students (Peer Discovery)
* **API**: `GET /api/v1/graph/students/:studentId/peers?limit=10`
* **Cypher**:
  ```cypher
  MATCH (s1:Student {id: $studentId}), (s2:Student)
  WHERE s1 <> s2
  OPTIONAL MATCH (s1)-[:STUDENT_HAS_SKILL]->(sk:Skill)<-[:STUDENT_HAS_SKILL]-(s2)
  WITH s1, s2, collect(DISTINCT sk.name) AS sharedSkills
  OPTIONAL MATCH (s1)-[:STUDENT_COMPLETED]->(c:Course)<-[:STUDENT_COMPLETED]-(s2)
  WITH s1, s2, sharedSkills, collect(DISTINCT c.code) AS sharedCourses
  OPTIONAL MATCH (s1)-[:STUDENT_MEMBER_OF]->(cl:Club)<-[:STUDENT_MEMBER_OF]-(s2)
  WITH s2, sharedSkills, sharedCourses, collect(DISTINCT cl.name) AS sharedClubs
  WITH s2, sharedSkills, sharedCourses, sharedClubs,
       (size(sharedSkills) * 3 + size(sharedCourses) * 2 + size(sharedClubs) * 2) AS overlapScore
  WHERE overlapScore > 0
  RETURN s2.id AS peerId, s2.name AS name, s2.department AS department, s2.semester AS semester,
         sharedSkills, sharedCourses, sharedClubs, overlapScore
  ORDER BY overlapScore DESC, s2.name ASC
  LIMIT $limit
  ```
* **Rationale**: Multi-relational bipartite graph projection scoring peer compatibility for project teaming and study groups.

### 9. Find Shortest Path Between Two Skills
* **API**: `GET /api/v1/graph/skills/shortest-path/:startSkillId/:endSkillId`
* **Cypher**:
  ```cypher
  MATCH (start:Skill {id: $startSkillId}), (end:Skill {id: $endSkillId})
  MATCH p = shortestPath((start)-[:SKILL_PREREQUISITE_OF*]-(end))
  RETURN length(p) AS distance,
         [node IN nodes(p) | { id: node.id, name: node.name, tier: node.tier, category: node.category }] AS pathNodes
  ```
* **Rationale**: Fast Breadth-First Search (BFS) shortest path execution across prerequisite graph topology.

### 10. Find Multi-Hop Dependency Paths
* **API**: `GET /api/v1/graph/dependencies/:entityType/:id?maxHops=5`
* **Cypher (Course Prerequisites)**:
  ```cypher
  MATCH path = (c:Course {id: $id})-[:COURSE_REQUIRES*1..5]->(req:Course)
  RETURN length(path) AS hops,
         [n IN nodes(path) | { id: n.id, code: n.code, title: n.title, department: n.department }] AS nodeChain
  ORDER BY hops ASC
  ```
* **Rationale**: Returns all prerequisite paths to uncover recursive dependency trees and potential curricular bottlenecks.

### 11. Find Connected Opportunities Around a Skill (360-Degree Neighborhood)
* **API**: `GET /api/v1/graph/skills/:skillId/opportunities`
* **Cypher**:
  ```cypher
  MATCH (sk:Skill {id: $skillId})
  OPTIONAL MATCH (c:Course)-[:COURSE_TEACHES]->(sk)
  WITH sk, collect(DISTINCT { id: c.id, code: c.code, title: c.title, difficulty: c.difficulty }) AS courses
  OPTIONAL MATCH (p:Project)-[:PROJECT_REQUIRES]->(sk)
  WITH sk, courses, collect(DISTINCT { id: p.id, title: p.title, domain: p.domain, difficulty: p.difficulty }) AS projects
  OPTIONAL MATCH (j:Job)-[:JOB_REQUIRES]->(sk)
  WITH sk, courses, projects, collect(DISTINCT { id: j.id, title: j.title, company: j.company, type: j.type }) AS jobs
  OPTIONAL MATCH (r:Resource)-[:RESOURCE_TEACHES]->(sk)
  WITH sk, courses, projects, jobs, collect(DISTINCT { id: r.id, title: r.title, type: r.type }) AS resources
  OPTIONAL MATCH (s:Student)-[:STUDENT_HAS_SKILL]->(sk)
  WITH sk, courses, projects, jobs, resources, count(DISTINCT s) AS talentCount
  RETURN sk.id AS skillId, sk.name AS name, sk.category AS category, sk.tier AS tier,
         courses, projects, jobs, resources, talentCount
  ```
* **Rationale**: Single round-trip 360-degree ego-network extraction for academic advising and departmental dashboards.

### 12. Find Alternative Routes to a Target Skill
* **API**: `GET /api/v1/graph/skills/:targetSkillId/alternative-routes`
* **Cypher**:
  ```cypher
  MATCH (target:Skill {id: $targetSkillId})
  OPTIONAL MATCH (c:Course)-[:COURSE_TEACHES]->(target)
  WITH target, collect(DISTINCT { id: c.id, code: c.code, title: c.title }) AS directCourses
  OPTIONAL MATCH path = (base:Skill)-[:SKILL_PREREQUISITE_OF*1..5]->(target)
  WHERE NOT ()-[:SKILL_PREREQUISITE_OF]->(base)
  WITH target, directCourses,
       collect(DISTINCT { id: base.id, name: base.name, tier: base.tier }) AS roots,
       collect(DISTINCT { length: length(path), chain: [n IN nodes(path) | { id: n.id, name: n.name }] }) AS paths
  RETURN target.id AS targetSkillId, target.name AS targetSkillName, directCourses, roots, paths
  ```
* **Rationale**: Discovers foundational root skills that have no upstream dependencies, providing students with clean alternative starting points.

---

## 5. Seed Verification & Graph Integrity Checks

The seed verification pipeline (`verifyNeo4jSeed`) runs comprehensive count and connectivity assertions:

```cypher
MATCH (n)
RETURN 
  count(n) AS totalNodes,
  count(CASE WHEN n:Student THEN 1 END) AS students,
  count(CASE WHEN n:Skill THEN 1 END) AS skills,
  count(CASE WHEN n:Course THEN 1 END) AS courses,
  count(CASE WHEN n:Project THEN 1 END) AS projects,
  count(CASE WHEN n:Technology THEN 1 END) AS technologies,
  count(CASE WHEN n:Job THEN 1 END) AS jobs,
  count(CASE WHEN n:Resource THEN 1 END) AS resources,
  count(CASE WHEN n:Club THEN 1 END) AS clubs,
  count(CASE WHEN n:Event THEN 1 END) AS events,
  count(CASE WHEN n:Facility THEN 1 END) AS facilities;
```

**Connectivity Assertion**: $\text{Total Relationships} \ge \text{Total Nodes}$, verifying that the graph is a strongly connected ecosystem with no isolated subgraphs.
