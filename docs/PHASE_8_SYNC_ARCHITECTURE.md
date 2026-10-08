# Phase 8: Multi-Store NoSQL Synchronization & Eventual Consistency Architecture

## 1. Overview & Academic Rationale

In a multi-model polyglot persistence architecture, different database engines are assigned responsibilities based on their strengths:
- **MongoDB**: Primary Source of Truth for entity metadata and polymorphic documents.
- **Neo4j**: Relationship-oriented graph index for transitive prerequisite and multi-hop path reasoning.
- **Redis**: Ephemeral in-memory key-value cache and API rate limiter.
- **Cassandra**: Append-heavy wide-column time-series activity telemetry and audit log.

A critical architectural hazard in distributed systems is the **Dual-Write Problem**: if a client or frontend directly executes updates across multiple heterogeneous databases, partial network failures inevitably cause **split-brain states, orphaned nodes, and irrecoverable data divergence**.

### Core Architecture Rule:
> **The frontend NEVER directly manipulates multiple databases.**  
> All mutations flow strictly through backend service layers (`SyncService`), ensuring atomic primary commits followed by idempotent, asynchronous cross-store propagation.

---

## 2. Synchronization Pipeline & Data Flow

```
                      [ Client / Frontend Action ]
                                   │
                           HTTP Mutation Request
                                   │
                                   ▼
                 ┌───────────────────────────────────┐
                 │          Backend Service          │
                 │      (StudentService / Sync)      │
                 └─────────────────┬─────────────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             │ [1] Write Entity    │ [2] Propagate Node  │ [3] Invalidate
             ▼                     ▼                     ▼
     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
     │    MongoDB    │     │     Neo4j     │     │     Redis     │
     │  (Primary DB) │     │ (Graph MERGE) │     │(Purge student)│
     └───────────────┘     └───────────────┘     └───────────────┘
                                   │
                                   │ [4] Log Audit Event
                                   ▼
                           ┌───────────────┐
                           │   Cassandra   │
                           │  (Append Log) │
                           └───────────────┘
```

---

## 3. The 5 Synchronization Pillars Implemented

### Pillar 1: Initial / Full Synchronization
- Reads all entity documents from MongoDB collections (`students`, `courses`, `skills`, `projects`, `jobs`, `clubs`, `events`, `resources`, `facilities`).
- Idempotently merges nodes and relationship edges into Neo4j using Cypher `MERGE` (preventing duplicate nodes on re-runs).
- Flushes stale Redis cache namespaces.
- Logs a synchronization audit checkpoint in Cassandra.

### Pillar 2: Entity Update Propagation
- When a student's profile (name, semester, GPA) or a course's difficulty is updated in MongoDB:
  - The service executes `MERGE (n {id: $id}) SET ...` in Neo4j.
  - Proactively purges affected Redis keys (e.g. `dashboard:student:{id}`).
  - Records the mutation in Cassandra's audit stream.

### Pillar 3: Relationship Update Propagation
- When a student acquires a skill or completes a course:
  - Updates the student document's nested sub-documents in MongoDB.
  - Creates or updates the graph edge in Neo4j: `MERGE (s)-[:STUDENT_HAS_SKILL {level: $level}]->(sk)`.
  - Clears `recommendation:student:{id}:*` in Redis so subsequent requests re-compute against the fresh graph topology.

### Pillar 4: Proactive Cache Invalidation
- Rather than waiting for TTL expiration (passive invalidation), the sync service actively calls `delPattern('recommendation:student:{id}:*')`.
- Fallback: A strict 300s TTL boundary ensures that even if an invalidation call fails, stale cache entries expire within 5 minutes.

### Pillar 5: Append-Only Activity Auditing
- Every mutation logs an event to Cassandra's `student_activity_by_day` table, maintaining an immutable time-series audit trail of all student lifecycle actions.

---

## 4. Where Eventual Consistency Occurs and Why It Is Acceptable

According to the **CAP Theorem** and the **BASE Model (Basically Available, Soft State, Eventual Consistency)**, distributed systems cannot simultaneously achieve absolute linearizability, continuous availability, and partition tolerance across heterogeneous storage engines without expensive two-phase commit (2PC) locks.

### 1. Where Discrepancies Can Temporarily Occur:
- **Propagation Delay Window ($\Delta t \approx 10\text{ms} - 50\text{ms}$)**:  
  Between the instant MongoDB acknowledges an entity write and when the background Cypher query finishes merging the edge in Neo4j.
- **Cache Invalidation Gap**:  
  A concurrent HTTP request arriving during the exact millisecond before Redis deletes the stale key may receive a cached recommendation reflecting the previous skill state.
- **Transient Network Partitions**:  
  If the Neo4j or Redis connection experiences a momentary drop, the mutation is committed to MongoDB while the propagation job is placed into the in-memory **Retry Queue**.

### 2. Why Eventual Consistency is Perfectly Acceptable:
- In campus resource intelligence and learning path generation, an eventual consistency window of a few milliseconds is completely harmless. 
- A student who just clicked "Mark Python as Completed" will see updated course recommendations within seconds, without requiring synchronous blocking transactions that would degrade API response times.

---

## 5. Idempotent Synchronization Design

All graph synchronization queries are designed to be **idempotent**: executing the same synchronization pass $N$ times produces the identical graph state as executing it once:
- **Nodes**: `MERGE (s:Student {id: $id}) ON CREATE SET ... ON MATCH SET ...`
- **Edges**: `MATCH (s:Student {id: $id}), (sk:Skill {id: $skId}) MERGE (s)-[r:STUDENT_HAS_SKILL]->(sk) SET r.level = $level`
- **Lists**: `OPTIONAL MATCH (s)-[r:STUDENT_HAS_SKILL]->() DELETE r` followed by `UNWIND $skills AS item MERGE ...`

---

## 6. REST API Endpoints Specification

All synchronization endpoints are mounted under `/api/v1/sync`:

| Method | Endpoint | Payload / Description |
|---|---|---|
| `GET` | `/status` | Returns sync engine status, last sync timestamp, records processed, successes, failures, retry queue, and store breakdown. |
| `POST` | `/initial` | Triggers a full idempotent multi-store synchronization pass across all 4 databases. |
| `POST` | `/entity` | `{ "entityType": "student", "entityId": "stu_001" }` — Propagates single entity mutation across Neo4j, Redis, and Cassandra. |

---

## 7. How to Run & Verify

1. **Run Unit Tests**:
   ```bash
   cd backend
   npm test -- tests/sync.unit.test.ts
   ```
2. **Start Backend & Frontend**:
   ```bash
   npm run dev    # backend
   npm run dev    # frontend
   ```
3. Open `http://localhost:3000` and select the **"Phase 8 Sync Monitor"** tab on the navigation toolbar:
   - Inspect the real-time synchronization engine state and records synchronized counter.
   - Click **"Test Entity Propagation"** to test a simulated student mutation through MongoDB $\to$ Neo4j $\to$ Redis $\to$ Cassandra.
   - Click **"Trigger Full Sync"** to run an idempotent re-sync pass.
   - Review the **Eventual Consistency in Multi-Model Systems** architectural breakdown.
