import { Client } from 'cassandra-driver';
import { ENV } from '../../config/env.js';

export const CASSANDRA_CQL_SCHEMA = [
  // 1. Keyspace Definition (SimpleStrategy for single-datacenter local development)
  `CREATE KEYSPACE IF NOT EXISTS ${ENV.CASSANDRA_KEYSPACE} 
   WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};`,

  // 2. Query Pattern 1: Student Activity by Day
  // Partition Key: (student_id, activity_date) -> All events for a student on a given day reside on the same partition
  // Clustering Key: event_timestamp DESC, event_id ASC -> Ordered chronologically latest first on disk
  `CREATE TABLE IF NOT EXISTS ${ENV.CASSANDRA_KEYSPACE}.student_activity_by_day (
     student_id text,
     activity_date date,
     event_timestamp timestamp,
     event_id uuid,
     action_type text,
     target_entity_type text,
     target_entity_id text,
     metadata_json text,
     PRIMARY KEY ((student_id, activity_date), event_timestamp, event_id)
   ) WITH CLUSTERING ORDER BY (event_timestamp DESC, event_id ASC);`,

  // 3. Query Pattern 2: Resource Activity by Date (Denormalized duplicate of resource access events)
  // Partition Key: (resource_id, activity_date) -> Fast lookups for resource heatmaps on any given date
  // Clustering Key: event_timestamp DESC, event_id ASC
  `CREATE TABLE IF NOT EXISTS ${ENV.CASSANDRA_KEYSPACE}.resource_activity_by_date (
     resource_id text,
     activity_date date,
     event_timestamp timestamp,
     event_id uuid,
     student_id text,
     action_type text,
     duration_seconds int,
     metadata_json text,
     PRIMARY KEY ((resource_id, activity_date), event_timestamp, event_id)
   ) WITH CLUSTERING ORDER BY (event_timestamp DESC, event_id ASC);`,

  // 4. Query Pattern 3: Recommendation Audit Log by Student and Recommendation Type
  // Partition Key: (student_id, rec_type) -> Audit log of recommendations provided to a student
  // Clustering Key: generated_at DESC, rec_id ASC
  `CREATE TABLE IF NOT EXISTS ${ENV.CASSANDRA_KEYSPACE}.recommendation_audit_log (
     student_id text,
     rec_type text,
     generated_at timestamp,
     rec_id uuid,
     target_item_id text,
     final_score double,
     score_breakdown_json text,
     PRIMARY KEY ((student_id, rec_type), generated_at, rec_id)
   ) WITH CLUSTERING ORDER BY (generated_at DESC, rec_id ASC);`,

  // 5. Query Pattern 4: Daily Activity Rollup & Summary
  // Partition Key: activity_date -> Grouped by day
  // Clustering Key: action_type ASC -> Aggregated count and unique participants per action type
  `CREATE TABLE IF NOT EXISTS ${ENV.CASSANDRA_KEYSPACE}.daily_activity_summary (
     activity_date date,
     action_type text,
     event_count int,
     unique_students int,
     avg_duration_seconds double,
     last_updated timestamp,
     PRIMARY KEY (activity_date, action_type)
   );`,
];

export async function setupCassandraSchema(client: Client): Promise<void> {
  console.log('[Cassandra] Setting up Keyspace and Column Families...');
  for (const cql of CASSANDRA_CQL_SCHEMA) {
    try {
      await client.execute(cql);
    } catch (err: any) {
      console.warn(`[Cassandra] Warning creating schema table: ${err.message}`);
    }
  }
  console.log('[Cassandra] Schema tables successfully created.');
}

export async function clearCassandraTables(client: Client): Promise<void> {
  console.log('[Cassandra] Truncating telemetry tables...');
  const tables = [
    'student_activity_by_day',
    'resource_activity_by_date',
    'recommendation_audit_log',
    'daily_activity_summary',
  ];
  for (const tbl of tables) {
    try {
      await client.execute(`TRUNCATE ${ENV.CASSANDRA_KEYSPACE}.${tbl}`);
    } catch {
      // Table might not exist yet
    }
  }
}
