import cassandraDriver, { Client, types } from 'cassandra-driver';
import { dbManager } from '../../config/database.js';
import { ENV } from '../../config/env.js';

export interface StudentActivityRecord {
  studentId: string;
  activityDate: string; // YYYY-MM-DD
  eventTimestamp: Date;
  eventId: string; // UUID
  actionType:
    | 'view_resource'
    | 'view_project'
    | 'view_course'
    | 'click_recommendation'
    | 'attend_event'
    | 'complete_quiz'
    | 'search_skills';
  targetEntityType: 'resource' | 'project' | 'course' | 'job' | 'event' | 'skill';
  targetEntityId: string;
  durationSeconds?: number;
  metadataJson?: string;
}

export interface ResourceActivityRecord {
  resourceId: string;
  activityDate: string;
  eventTimestamp: Date;
  eventId: string;
  studentId: string;
  actionType: string;
  durationSeconds: number;
  metadataJson?: string;
}

export interface RecommendationAuditRecord {
  studentId: string;
  recType: 'course' | 'project' | 'job' | 'learning_path' | 'skill_gap';
  generatedAt: Date;
  recId: string; // UUID
  targetItemId: string;
  finalScore: number;
  scoreBreakdownJson?: string;
}

export interface DailyActivitySummaryRecord {
  activityDate: string;
  actionType: string;
  eventCount: number;
  uniqueStudents: number;
  avgDurationSeconds: number;
  lastUpdated: Date;
}

export class ActivityRepository {
  private client: Client | null = null;

  // In-memory fallback repository when Cassandra is unavailable or running locally without Docker
  private fallbackActivities: StudentActivityRecord[] = [];
  private fallbackResourceActivities: ResourceActivityRecord[] = [];
  private fallbackRecAudits: RecommendationAuditRecord[] = [];
  private fallbackSummaries: Map<string, DailyActivitySummaryRecord> = new Map();

  constructor(client?: Client) {
    if (client) {
      this.client = client;
    }
  }

  protected getClient(): Client {
    if (!this.client) {
      this.client = dbManager.getCassandraClient();
    }
    return this.client;
  }

  private isConnected(): boolean {
    try {
      const c = this.getClient();
      return !!c.getState()?.getConnectedHosts()?.length;
    } catch {
      return false;
    }
  }

  private async safeExec<T>(op: (client: Client) => Promise<T>, fallbackFn: () => T): Promise<T> {
    try {
      const client = this.getClient();
      if (!this.isConnected()) {
        await Promise.race([
          client.connect().catch(() => {}),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
        ]).catch(() => {});
      }
      return await op(client);
    } catch {
      return fallbackFn();
    }
  }

  // ==========================================================================
  // 1. Write Activity (Denormalized Multi-Table Append)
  // ==========================================================================

  /**
   * Writes a student activity record.
   * Demonstrates Query-Driven Denormalization:
   * 1. Appends to `student_activity_by_day` (partitioned by student + date)
   * 2. If target is a resource, also appends to `resource_activity_by_date` (partitioned by resource + date)
   * 3. Updates `daily_activity_summary` (partitioned by date)
   */
  public async recordActivity(event: StudentActivityRecord): Promise<void> {
    const eventId = event.eventId || types.Uuid.random().toString();
    const eventDate = event.activityDate || new Date().toISOString().split('T')[0];
    const timestamp = event.eventTimestamp || new Date();
    const duration = event.durationSeconds || 0;
    const metadata = event.metadataJson || '{}';

    const normalizedEvent: StudentActivityRecord = {
      ...event,
      eventId,
      activityDate: eventDate,
      eventTimestamp: timestamp,
      durationSeconds: duration,
      metadataJson: metadata,
    };

    // Keep in-memory copy
    this.fallbackActivities.unshift(normalizedEvent);
    if (event.targetEntityType === 'resource') {
      this.fallbackResourceActivities.unshift({
        resourceId: event.targetEntityId,
        activityDate: eventDate,
        eventTimestamp: timestamp,
        eventId,
        studentId: event.studentId,
        actionType: event.actionType,
        durationSeconds: duration,
        metadataJson: metadata,
      });
    }

    // Update in-memory daily summary rollup
    const summaryKey = `${eventDate}:${event.actionType}`;
    const existing = this.fallbackSummaries.get(summaryKey) || {
      activityDate: eventDate,
      actionType: event.actionType,
      eventCount: 0,
      uniqueStudents: 0,
      avgDurationSeconds: 0,
      lastUpdated: timestamp,
    };
    existing.eventCount++;
    existing.lastUpdated = timestamp;
    this.fallbackSummaries.set(summaryKey, existing);

    await this.safeExec(
      async (client) => {
        // Query 1: student_activity_by_day
        const q1 = `
          INSERT INTO ${ENV.CASSANDRA_KEYSPACE}.student_activity_by_day (
            student_id, activity_date, event_timestamp, event_id,
            action_type, target_entity_type, target_entity_id, metadata_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `;
        const params1 = [
          event.studentId,
          types.LocalDate.fromString(eventDate),
          timestamp,
          types.Uuid.fromString(eventId),
          event.actionType,
          event.targetEntityType,
          event.targetEntityId,
          metadata,
        ];

        const queries = [{ query: q1, params: params1 }];

        // Query 2: Denormalized write to resource_activity_by_date if applicable
        if (event.targetEntityType === 'resource') {
          const q2 = `
            INSERT INTO ${ENV.CASSANDRA_KEYSPACE}.resource_activity_by_date (
              resource_id, activity_date, event_timestamp, event_id,
              student_id, action_type, duration_seconds, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
          `;
          const params2 = [
            event.targetEntityId,
            types.LocalDate.fromString(eventDate),
            timestamp,
            types.Uuid.fromString(eventId),
            event.studentId,
            event.actionType,
            duration,
            metadata,
          ];
          queries.push({ query: q2, params: params2 });
        }

        // Query 3: Update daily summary
        const q3 = `
          INSERT INTO ${ENV.CASSANDRA_KEYSPACE}.daily_activity_summary (
            activity_date, action_type, event_count, unique_students, avg_duration_seconds, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?);
        `;
        const params3 = [
          types.LocalDate.fromString(eventDate),
          event.actionType,
          existing.eventCount,
          1,
          duration,
          timestamp,
        ];
        queries.push({ query: q3, params: params3 });

        // Execute batch / parallel operations
        await Promise.all(queries.map((q) => client.execute(q.query, q.params, { prepare: true })));
      },
      () => undefined
    );
  }

  /**
   * Bulk batch insert of synthetic activity records for high-throughput testing
   */
  public async batchInsertActivities(events: StudentActivityRecord[]): Promise<number> {
    if (!events.length) return 0;

    let successful = 0;
    // Process in batches of 50
    const chunkSize = 50;
    for (let i = 0; i < events.length; i += chunkSize) {
      const chunk = events.slice(i, i + chunkSize);
      await Promise.all(chunk.map((e) => this.recordActivity(e)));
      successful += chunk.length;
    }
    return successful;
  }

  // ==========================================================================
  // 2. Recommendation Audit Logging
  // ==========================================================================

  public async recordRecommendationAudit(record: RecommendationAuditRecord): Promise<void> {
    const recId = record.recId || types.Uuid.random().toString();
    const generatedAt = record.generatedAt || new Date();
    const scoreBreakdown = record.scoreBreakdownJson || '{}';

    const normalized: RecommendationAuditRecord = {
      ...record,
      recId,
      generatedAt,
      scoreBreakdownJson: scoreBreakdown,
    };

    this.fallbackRecAudits.unshift(normalized);

    await this.safeExec(
      async (client) => {
        const query = `
          INSERT INTO ${ENV.CASSANDRA_KEYSPACE}.recommendation_audit_log (
            student_id, rec_type, generated_at, rec_id,
            target_item_id, final_score, score_breakdown_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?);
        `;
        const params = [
          record.studentId,
          record.recType,
          generatedAt,
          types.Uuid.fromString(recId),
          record.targetItemId,
          record.finalScore,
          scoreBreakdown,
        ];
        await client.execute(query, params, { prepare: true });
      },
      () => undefined
    );
  }

  // ==========================================================================
  // 3. Query Pattern 1: Student Activity by Date
  // ==========================================================================

  public async getStudentActivityByDate(
    studentId: string,
    activityDate: string,
    limit: number = 50
  ): Promise<StudentActivityRecord[]> {
    return this.safeExec(
      async (client) => {
        const query = `
          SELECT student_id, activity_date, event_timestamp, event_id,
                 action_type, target_entity_type, target_entity_id, metadata_json
          FROM ${ENV.CASSANDRA_KEYSPACE}.student_activity_by_day
          WHERE student_id = ? AND activity_date = ?
          LIMIT ?;
        `;
        const result = await client.execute(
          query,
          [studentId, types.LocalDate.fromString(activityDate), limit],
          { prepare: true }
        );

        return result.rows.map((row) => ({
          studentId: row.get('student_id'),
          activityDate: row.get('activity_date')?.toString() || activityDate,
          eventTimestamp: row.get('event_timestamp'),
          eventId: row.get('event_id')?.toString(),
          actionType: row.get('action_type'),
          targetEntityType: row.get('target_entity_type'),
          targetEntityId: row.get('target_entity_id'),
          metadataJson: row.get('metadata_json'),
        }));
      },
      () => {
        return this.fallbackActivities
          .filter((a) => a.studentId === studentId && a.activityDate === activityDate)
          .slice(0, limit);
      }
    );
  }

  // ==========================================================================
  // 4. Query Pattern 2: Resource Activity by Date
  // ==========================================================================

  public async getResourceActivityByDate(
    resourceId: string,
    activityDate: string,
    limit: number = 50
  ): Promise<ResourceActivityRecord[]> {
    return this.safeExec(
      async (client) => {
        const query = `
          SELECT resource_id, activity_date, event_timestamp, event_id,
                 student_id, action_type, duration_seconds, metadata_json
          FROM ${ENV.CASSANDRA_KEYSPACE}.resource_activity_by_date
          WHERE resource_id = ? AND activity_date = ?
          LIMIT ?;
        `;
        const result = await client.execute(
          query,
          [resourceId, types.LocalDate.fromString(activityDate), limit],
          { prepare: true }
        );

        return result.rows.map((row) => ({
          resourceId: row.get('resource_id'),
          activityDate: row.get('activity_date')?.toString() || activityDate,
          eventTimestamp: row.get('event_timestamp'),
          eventId: row.get('event_id')?.toString(),
          studentId: row.get('student_id'),
          actionType: row.get('action_type'),
          durationSeconds: row.get('duration_seconds') || 0,
          metadataJson: row.get('metadata_json'),
        }));
      },
      () => {
        return this.fallbackResourceActivities
          .filter((r) => r.resourceId === resourceId && r.activityDate === activityDate)
          .slice(0, limit);
      }
    );
  }

  // ==========================================================================
  // 5. Query Pattern 3: Recommendation History by Student
  // ==========================================================================

  public async getRecommendationHistory(
    studentId: string,
    recType?: string,
    limit: number = 50
  ): Promise<RecommendationAuditRecord[]> {
    return this.safeExec(
      async (client) => {
        let query = `
          SELECT student_id, rec_type, generated_at, rec_id,
                 target_item_id, final_score, score_breakdown_json
          FROM ${ENV.CASSANDRA_KEYSPACE}.recommendation_audit_log
          WHERE student_id = ?
        `;
        const params: any[] = [studentId];
        if (recType) {
          query += ` AND rec_type = ?`;
          params.push(recType);
        }
        query += ` LIMIT ?;`;
        params.push(limit);

        const result = await client.execute(query, params, { prepare: true });

        return result.rows.map((row) => ({
          studentId: row.get('student_id'),
          recType: row.get('rec_type'),
          generatedAt: row.get('generated_at'),
          recId: row.get('rec_id')?.toString(),
          targetItemId: row.get('target_item_id'),
          finalScore: row.get('final_score'),
          scoreBreakdownJson: row.get('score_breakdown_json'),
        }));
      },
      () => {
        return this.fallbackRecAudits
          .filter((r) => r.studentId === studentId && (!recType || r.recType === recType))
          .slice(0, limit);
      }
    );
  }

  // ==========================================================================
  // 6. Query Pattern 4: Daily Activity Rollups & Summary
  // ==========================================================================

  public async getDailyActivitySummary(activityDate: string): Promise<DailyActivitySummaryRecord[]> {
    return this.safeExec(
      async (client) => {
        const query = `
          SELECT activity_date, action_type, event_count, unique_students, avg_duration_seconds, last_updated
          FROM ${ENV.CASSANDRA_KEYSPACE}.daily_activity_summary
          WHERE activity_date = ?;
        `;
        const result = await client.execute(query, [types.LocalDate.fromString(activityDate)], {
          prepare: true,
        });

        return result.rows.map((row) => ({
          activityDate: row.get('activity_date')?.toString() || activityDate,
          actionType: row.get('action_type'),
          eventCount: row.get('event_count') || 0,
          uniqueStudents: row.get('unique_students') || 0,
          avgDurationSeconds: row.get('avg_duration_seconds') || 0,
          lastUpdated: row.get('last_updated'),
        }));
      },
      () => {
        return Array.from(this.fallbackSummaries.values()).filter(
          (s) => s.activityDate === activityDate
        );
      }
    );
  }

  public async getAllRecentSummaries(): Promise<DailyActivitySummaryRecord[]> {
    return this.safeExec(
      async (client) => {
        const query = `
          SELECT activity_date, action_type, event_count, unique_students, avg_duration_seconds, last_updated
          FROM ${ENV.CASSANDRA_KEYSPACE}.daily_activity_summary
          LIMIT 200;
        `;
        const result = await client.execute(query);
        return result.rows.map((row) => ({
          activityDate: row.get('activity_date')?.toString() || '',
          actionType: row.get('action_type'),
          eventCount: row.get('event_count') || 0,
          uniqueStudents: row.get('unique_students') || 0,
          avgDurationSeconds: row.get('avg_duration_seconds') || 0,
          lastUpdated: row.get('last_updated'),
        }));
      },
      () => Array.from(this.fallbackSummaries.values())
    );
  }
}

export const activityRepository = new ActivityRepository();
