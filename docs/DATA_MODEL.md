# Synthetic Campus Dataset & Polyglot Data Model
## Documentation for Phase 2 Implementation

---

## 1. Overview & Data Generation Principles
The synthetic campus dataset generator is designed to populate a multi-model NoSQL platform (MongoDB, Neo4j, Redis, Cassandra) with high-cohesion, realistic academic entities and relationships.

### Key Characteristics:
1. **100% Deterministic Reproducibility**: Given a numerical seed (default `42`), the PRNG (Mulberry32) and fixed epoch base (`2024-03-01T00:00:00Z`) produce bit-for-bit identical datasets across runs.
2. **Strictly Acyclic Directed Acyclic Graphs (DAGs)**: Skill prerequisites and course prerequisites are mathematically verified using Kahn's topological sort algorithm to guarantee zero cyclic deadlocks ($0$ cycles).
3. **Archetype-Driven Student Skill Distributions**:
   - **Senior / Capable (25%)**: Semesters 6–8; high CGPA (7.8–9.8); complete foundational and intermediate skills with full prerequisite path satisfaction.
   - **Intermediate (45%)**: Semesters 3–5; medium CGPA (6.8–9.2); partial skills with realistic skill gaps relative to advanced target roles.
   - **Beginner / Freshmen (30%)**: Semesters 1–2; CGPA (6.0–9.0); only foundational skills (Python, HTML, C++), creating large skill gaps for learning-path discovery.
4. **Configurable Dataset Scales**:
   - `small`: 100 students, 13 courses, 27 skills, 10 projects, 7 jobs, 6 clubs, 8 events, 5 facilities, 27 resources, ~1,300 Cassandra events (ideal for instant local development and unit tests).
   - `medium`: 1,000 students, 80 courses, 120 skills, 150 projects, 60 jobs, 20 clubs, 50 events, 15 facilities, ~15,000 Cassandra events (ideal for benchmark comparisons).
   - `large`: 5,000 students, 200 courses, 250 skills, 400 projects, 150 jobs, 40 clubs, 120 events, 30 facilities, ~75,000 Cassandra events (stress testing).

---

## 2. Multi-Model Entity & Table Mapping

### A. MongoDB Document Collections
MongoDB serves as the primary source of truth for rich, hierarchical, polymorphic entity data.

| Collection | Key Fields | Secondary Indexes | Responsibility |
| :--- | :--- | :--- | :--- |
| `students` | `studentId`, `rollNumber`, `name`, `email`, `department`, `currentSemester`, `cgpa`, `interests`, `skills[]`, `completedCourses[]`, `projectIds[]`, `clubMemberships[]`, `attendedEventIds[]` | `email` (unique), `{ department: 1, currentSemester: 1 }`, `{ 'skills.skillId': 1 }` | Polymorphic student profile with nested skill levels & grades |
| `courses` | `courseId`, `code`, `title`, `department`, `credits`, `difficulty`, `syllabusTopics[]`, `taughtSkillIds[]`, `prerequisiteCourseIds[]`, `instructor` | `code` (unique), `{ department: 1, difficulty: 1 }` | Academic curriculum and syllabus topics |
| `skills` | `skillId`, `name`, `category`, `tier`, `description`, `prerequisiteSkillIds[]` | `skillId` (unique), `category` | Technical ontology covering 4 tiers (Foundational $\to$ Intermediate $\to$ Advanced $\to$ Specialized) |
| `projects` | `projectId`, `title`, `abstract`, `domain`, `difficulty`, `requiredSkillIds[]`, `technologiesUsed[]`, `facultyMentor` | `{ domain: 1, difficulty: 1 }` | Capstone projects requiring specific technical stacks |
| `jobs` | `jobId`, `title`, `company`, `jobType`, `location`, `demandedSkillIds[]`, `preferredDomain`, `minimumCgpa` | `company`, `preferredDomain` | Campus placement and internship job openings |
| `clubs` | `clubId`, `name`, `category`, `description`, `activeMemberCount` | `name` (unique) | Student clubs (ACM, IEEE, GDSC, Cybersecurity, AI Guild) |
| `events` | `eventId`, `title`, `eventType`, `organizingClubId`, `eventDate`, `venueFacilityId`, `targetedSkillIds[]` | `eventDate` | Workshops, Hackathons, Guest Lectures, Competitions |
| `facilities` | `facilityId`, `name`, `building`, `roomNumber`, `facilityType`, `capacity`, `equipmentSummary[]` | `facilityId` (unique) | Physical labs, auditoriums, innovation hubs |
| `resources` | `resourceId`, `title`, `resourceType`, `url`, `taughtSkillIds[]`, `difficulty`, `rating`, `accessCount` | `taughtSkillIds` | Online video tutorials, textbooks, interactive labs |

---

### B. Neo4j Graph Topology

#### Node Labels
`(:Student)`, `(:Course)`, `(:Skill)`, `(:Project)`, `(:Job)`, `(:Club)`, `(:Event)`, `(:Facility)`, `(:Resource)`

#### Relationships
```mermaid
graph LR
    Student -->|HAS_SKILL {level}| Skill
    Student -->|COMPLETED {grade}| Course
    Student -->|WORKS_ON| Project
    Student -->|MEMBER_OF {role}| Club
    Student -->|ATTENDED| Event
    Course -->|TEACHES| Skill
    Course -->|REQUIRES_PREREQ| Course
    Skill -->|PREREQUISITE_OF| Skill
    Project -->|REQUIRES_SKILL| Skill
    Job -->|DEMANDS_SKILL| Skill
    Event -->|ORGANIZED_BY| Club
    Event -->|HELD_AT| Facility
    Resource -->|TEACHES_SKILL| Skill
```

---

### C. Cassandra Wide-Column Telemetry Tables

Keyspace: `campus_telemetry` (SimpleStrategy, RF: 1)

#### 1. `student_activity_by_day`
* **Partition Key**: `((student_id, activity_date))`
* **Clustering Key**: `event_timestamp DESC, event_id ASC`
* **Columns**: `action_type`, `target_entity_type`, `target_entity_id`, `metadata_json`
* **Access Pattern**: Retrieves student's single-day timeline ordered from most recent to oldest with a single partition seek.

#### 2. `resource_access_history`
* **Partition Key**: `((resource_id, year_month))`
* **Clustering Key**: `event_timestamp DESC, event_id ASC`
* **Columns**: `student_id`, `duration_seconds`
* **Access Pattern**: Tracks resource usage spikes and telemetry within month buckets, preventing unbound partition expansion.

#### 3. `recommendation_audit_log`
* **Partition Key**: `((student_id, rec_type))`
* **Clustering Key**: `generated_at DESC, rec_id ASC`
* **Columns**: `target_item_id`, `final_score`, `score_breakdown_json`
* **Access Pattern**: Audits recommendation calculation runs and score weight factors served to a student.

---

## 3. Seed Execution Verification Results (Small Scale)

Ran via `npm run seed`:
```
===============================================================
 Starting Synthetic Campus Dataset Seeder
 Scale: [ SMALL ] | Seed: [ 42 ]
===============================================================

[1/4] Generating synthetic campus data...
[2/4] Validating data integrity and acyclic DAG constraints...
✓ Data validation passed:
  - Total Entities: 203
  - Total Relationships: 2105
  - Skill DAG Depth: 4 tiers
  - Course DAG Depth: 3 tiers
✓ Exported dataset snapshot to: data/seeds/campus_dataset_small.json

[3/4] Seeding MongoDB (Document Store)...
[MongoDB] Connected successfully to mongodb://localhost:27017/campus_resource_graph
✓ MongoDB successfully populated:
    skills      : 27 documents
    courses     : 13 documents
    projects    : 10 documents
    jobs        : 7 documents
    clubs       : 6 documents
    events      : 8 documents
    facilities  : 5 documents
    resources   : 27 documents
    students    : 100 documents

[4/4] Probing and Seeding Neo4j (Graph Store)...
[5/5] Probing and Seeding Cassandra (Wide-Column Store)...
```
