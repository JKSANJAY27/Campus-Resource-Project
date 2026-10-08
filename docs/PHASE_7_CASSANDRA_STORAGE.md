# Phase 7: Apache Cassandra Wide-Column Activity & Event Telemetry

## 1. Overview & Academic Rationale

In the Campus Resource Polyglot Persistence Platform, **Apache Cassandra** is deployed specifically and exclusively for **high-throughput, append-heavy telemetry workloads**:
- Student resource views and video interactions
- Exploratory project and course navigations
- Recommendation algorithm audit trails and clicks
- Event and hackathon attendances
- Campus-wide daily utilization rollups

Cassandra is intentionally **not** used as a general-purpose secondary document store. Instead, it demonstrates the core architectural paradigm of **Column-Family / Wide-Column NoSQL databases**: **Query-Driven Data Modeling**.

---

## 2. Storage Engine Physics: Why Cassandra Beats MongoDB for Append-Heavy Workloads

A central conceptual topic in NoSQL database theory is comparing **LSM-Tree (Log-Structured Merge-tree)** storage engines against **B-Tree** storage engines.

| Metric / Dimension | MongoDB (WiredTiger B-Tree) | Apache Cassandra (LSM-Tree Column Family) |
|---|---|---|
| **Write Mechanism** | Modifies B-Tree nodes in-place on disk/cache; requires random I/O updates to multiple index B-trees. | Writes sequentially to an append-only CommitLog and in-memory Memtable. **Zero random disk seeks on write**. |
| **Write Throughput** | Degradation occurs as index depth and document size grow; I/O write amplification. | Sustained ultra-high write throughput ($\ge 50,000+$ ops/sec per node). |
| **Array Growth Penalty** | Appending activity logs into an array within a `Student` document risks breaching the **16MB BSON limit** and causes expensive on-disk relocations. | Partition rows grow unboundedly across SSTables; records are never relocated. |
| **Horizontal Scaling** | Master-replica sets with centralized Config Server router (mongos) sharding. | Masterless peer-to-peer ring (Dynamo-based) with consistent hashing; linearly scalable. |
| **Data Immutability** | Mutable in-place document updates. | Immutable SSTables flushed to disk; deletions handled via tombstones during compaction. |

---

## 3. Query-Driven Data Modeling & Table Anatomy

In relational databases, schemas are normalized around entities (3NF). In Cassandra, **tables are designed strictly around individual query access patterns**, employing intentional denormalization:

### Query Pattern 1: Activity by Student and Date
- **CQL Table**: `student_activity_by_day`
- **Target Query**: `"Show all activity for student X on date Y in reverse chronological order."`
- **Partition Key**: `((student_id, activity_date))`
  - Guarantees that all events for a student on a specific day reside entirely on a single node partition in the Cassandra ring.
- **Clustering Key**: `event_timestamp DESC, event_id ASC`
  - Orders rows chronologically on disk inside SSTables, eliminating in-memory sorting.

```sql
CREATE TABLE campus_analytics.student_activity_by_day (
   student_id text,
   activity_date date,
   event_timestamp timestamp,
   event_id uuid,
   action_type text,
   target_entity_type text,
   target_entity_id text,
   metadata_json text,
   PRIMARY KEY ((student_id, activity_date), event_timestamp, event_id)
) WITH CLUSTERING ORDER BY (event_timestamp DESC, event_id ASC);
```

### Query Pattern 2: Resource Access History (Denormalized)
- **CQL Table**: `resource_activity_by_date`
- **Target Query**: `"Show all student accesses for resource R on date D."`
- **Partition Key**: `((resource_id, activity_date))`
- **Demonstration of Denormalization**: When a student views a resource, the service writes the event to **both** `student_activity_by_day` and `resource_activity_by_date`. This avoids expensive cross-partition distributed scans or distributed joins.

```sql
CREATE TABLE campus_analytics.resource_activity_by_date (
   resource_id text,
   activity_date date,
   event_timestamp timestamp,
   event_id uuid,
   student_id text,
   action_type text,
   duration_seconds int,
   metadata_json text,
   PRIMARY KEY ((resource_id, activity_date), event_timestamp, event_id)
) WITH CLUSTERING ORDER BY (event_timestamp DESC, event_id ASC);
```

### Query Pattern 3: Recommendation Audit Log
- **CQL Table**: `recommendation_audit_log`
- **Target Query**: `"Show algorithm recommendation scoring history for student S and type T."`
- **Partition Key**: `((student_id, rec_type))`
- **Clustering Key**: `generated_at DESC, rec_id ASC`

```sql
CREATE TABLE campus_analytics.recommendation_audit_log (
   student_id text,
   rec_type text,
   generated_at timestamp,
   rec_id uuid,
   target_item_id text,
   final_score double,
   score_breakdown_json text,
   PRIMARY KEY ((student_id, rec_type), generated_at, rec_id)
) WITH CLUSTERING ORDER BY (generated_at DESC, rec_id ASC);
```

### Query Pattern 4: Daily Campus Activity Rollup
- **CQL Table**: `daily_activity_summary`
- **Target Query**: `"Show aggregated campus action totals for date D."`
- **Partition Key**: `activity_date`
- **Clustering Key**: `action_type ASC`

```sql
CREATE TABLE campus_analytics.daily_activity_summary (
   activity_date date,
   action_type text,
   event_count int,
   unique_students int,
   avg_duration_seconds double,
   last_updated timestamp,
   PRIMARY KEY (activity_date, action_type)
);
```

---

## 4. Synthetic High-Velocity Event Simulator

To evaluate write throughput, the platform provides a synthetic telemetry generator capable of inserting batches of up to $50,000$ events:
- Simulates realistic student behaviors: `view_resource`, `view_project`, `view_course`, `click_recommendation`, `attend_event`.
- Distributes events over time windows to demonstrate time-series rollups.
- Measures and reports real-time insertion throughput ($\text{events/sec}$) and total elapsed time.

---

## 5. REST API Endpoints Specification

All activity routes are mounted under `/api/v1/activity`:

| Method | Endpoint | Query / Body Params | Description |
|---|---|---|---|
| `POST` | `/events` | `{ studentId, actionType, targetEntityType, targetEntityId }` | Appends single activity event across query tables |
| `GET` | `/students/:studentId` | `date` (YYYY-MM-DD), `limit` | Query Pattern 1: Student activity by day partition |
| `GET` | `/resources/:resourceId` | `date` (YYYY-MM-DD), `limit` | Query Pattern 2: Resource accesses by date partition |
| `GET` | `/students/:studentId/recommendations` | `recType`, `limit` | Query Pattern 3: Algorithm audit trail |
| `GET` | `/daily-summary` | `date` (YYYY-MM-DD) | Query Pattern 4: Daily action breakdown |
| `GET` | `/trends` | `days` (default: 7) | Campus-wide time-series aggregation for charts |
| `POST` | `/simulate` | `{ count: 1000, daysBack: 7 }` | Generates high-volume synthetic append stream |

---

## 6. How to Run & Verify

1. **Run Unit Tests**:
   ```bash
   cd backend
   npm test -- tests/cassandra.unit.test.ts
   ```
2. **Start Backend & Frontend**:
   ```bash
   npm run dev    # in backend
   npm run dev    # in frontend
   ```
3. Open `http://localhost:3000` and click the **"Phase 7 Cassandra Analytics"** navigation tab:
   - View live campus activity time-series trends.
   - Use the **"Append Bulk Events"** dropdown to simulate $1,000+$ synthetic telemetry events and observe insertion throughput ($\text{events/sec}$).
   - Inspect individual partition streams under the **Student Activity by Day**, **Resource Access History**, and **Recommendation Audit Log** tabs.
   - Review the **Cassandra vs MongoDB Rationale** panel.
