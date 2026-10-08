import fs from 'fs';
import path from 'path';
import { DatasetGenerator } from './dataset-generator.js';
import { validateDataset } from './validator.js';
import { dbManager } from '../config/database.js';
import {
  SkillModel,
  CourseModel,
  ProjectModel,
  JobModel,
  ClubModel,
  EventModel,
  FacilityModel,
  ResourceModel,
  StudentModel,
} from '../models/mongo/index.js';
import { setupNeo4jSchema, clearNeo4jDatabase } from '../repositories/neo4j/schema.js';
import { setupCassandraSchema, clearCassandraTables } from '../repositories/cassandra/schema.js';

export interface SeedOptions {
  scale?: 'small' | 'medium' | 'large';
  seed?: number;
  exportJson?: boolean;
}

export async function runSeeder(options: SeedOptions = {}): Promise<{
  success: boolean;
  scale: string;
  seed: number;
  mongoCounts: Record<string, number>;
  neo4jCounts: { nodes: number; relationships: number };
  cassandraCounts: { activity: number; resourceAccess: number; recAudit: number };
}> {
  const scale = options.scale || 'small';
  const seed = options.seed ?? 42;
  const exportJson = options.exportJson ?? true;

  console.log(`\n===============================================================`);
  console.log(` Starting Synthetic Campus Dataset Seeder`);
  console.log(` Scale: [ ${scale.toUpperCase()} ] | Seed: [ ${seed} ]`);
  console.log(`===============================================================\n`);

  // 1. Generate Dataset
  console.log('[1/4] Generating synthetic campus data...');
  const generator = new DatasetGenerator({ scale, seed });
  const data = generator.generate();

  // 2. Validate Dataset
  console.log('[2/4] Validating data integrity and acyclic DAG constraints...');
  const validation = validateDataset(data);
  if (!validation.valid) {
    console.error('Data validation failed with errors:', validation.errors);
    throw new Error(`Data validation failed: ${validation.errors.join('; ')}`);
  }
  console.log(`✓ Data validation passed:`);
  console.log(`  - Total Entities: ${validation.metrics.totalEntities}`);
  console.log(`  - Total Relationships: ${validation.metrics.totalRelationships}`);
  console.log(`  - Skill DAG Depth: ${validation.metrics.skillDagDepth} tiers`);
  console.log(`  - Course DAG Depth: ${validation.metrics.courseDagDepth} tiers`);

  // Export JSON if requested
  if (exportJson) {
    const outputDir = path.resolve(process.cwd(), '../data/seeds');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, `campus_dataset_${scale}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✓ Exported dataset snapshot to: ${outputPath}`);
  }

  // 3. Seed MongoDB
  console.log('\n[3/4] Seeding MongoDB (Document Store)...');
  const mongoCounts: Record<string, number> = {};
  try {
    await dbManager.connectMongo();

    // Clean existing
    await Promise.all([
      SkillModel.deleteMany({}),
      CourseModel.deleteMany({}),
      ProjectModel.deleteMany({}),
      JobModel.deleteMany({}),
      ClubModel.deleteMany({}),
      EventModel.deleteMany({}),
      FacilityModel.deleteMany({}),
      ResourceModel.deleteMany({}),
      StudentModel.deleteMany({}),
    ]);

    // Insert entities
    await SkillModel.insertMany(data.skills);
    await CourseModel.insertMany(data.courses);
    await ProjectModel.insertMany(data.projects);
    await JobModel.insertMany(data.jobs);
    await ClubModel.insertMany(data.clubs);
    await EventModel.insertMany(data.events);
    await FacilityModel.insertMany(data.facilities);
    await ResourceModel.insertMany(data.resources);
    await StudentModel.insertMany(data.students);

    mongoCounts.skills = await SkillModel.countDocuments();
    mongoCounts.courses = await CourseModel.countDocuments();
    mongoCounts.projects = await ProjectModel.countDocuments();
    mongoCounts.jobs = await JobModel.countDocuments();
    mongoCounts.clubs = await ClubModel.countDocuments();
    mongoCounts.events = await EventModel.countDocuments();
    mongoCounts.facilities = await FacilityModel.countDocuments();
    mongoCounts.resources = await ResourceModel.countDocuments();
    mongoCounts.students = await StudentModel.countDocuments();

    console.log('✓ MongoDB successfully populated:');
    for (const [col, count] of Object.entries(mongoCounts)) {
      console.log(`    ${col.padEnd(12)}: ${count} documents`);
    }
  } catch (err: any) {
    console.error('✗ MongoDB seeding error:', err.message);
  }

  // 4. Seed Neo4j (if accessible)
  console.log('\n[4/4] Probing and Seeding Neo4j (Graph Store)...');
  const neo4jHealth = await dbManager.checkNeo4jHealth();
  let neo4jCounts = { nodes: 0, relationships: 0 };

  if (neo4jHealth.status === 'connected') {
    const session = dbManager.getNeo4jSession();
    try {
      await setupNeo4jSchema(session);
      await clearNeo4jDatabase(session);

      console.log('  -> Inserting Graph Nodes...');
      // 1. Batch insert skills
      await session.run(
        `UNWIND $batch AS sk
         CREATE (n:Skill {
           id: sk.skillId,
           name: sk.name,
           category: sk.category,
           tier: sk.tier
         })`,
        { batch: data.skills }
      );

      // 2. Batch insert courses
      await session.run(
        `UNWIND $batch AS c
         CREATE (n:Course {
           id: c.courseId,
           code: c.code,
           title: c.title,
           department: c.department,
           credits: c.credits,
           difficulty: c.difficulty
         })`,
        { batch: data.courses }
      );

      // 3. Batch insert projects
      await session.run(
        `UNWIND $batch AS p
         CREATE (n:Project {
           id: p.projectId,
           title: p.title,
           domain: p.domain,
           difficulty: p.difficulty
         })`,
        { batch: data.projects }
      );

      // 4. Extract and batch insert Technologies
      const allTechNames = Array.from(new Set(data.projects.flatMap((p: any) => p.technologiesUsed || [])));
      const techBatch = allTechNames.map((name) => ({ name }));
      await session.run(
        `UNWIND $batch AS t
         CREATE (n:Technology { name: t.name })`,
        { batch: techBatch }
      );

      // 5. Batch insert jobs
      await session.run(
        `UNWIND $batch AS j
         CREATE (n:Job {
           id: j.jobId,
           title: j.title,
           company: j.company,
           type: j.jobType,
           preferredDomain: j.preferredDomain
         })`,
        { batch: data.jobs }
      );

      // 6. Batch insert students
      await session.run(
        `UNWIND $batch AS s
         CREATE (n:Student {
           id: s.studentId,
           rollNumber: s.rollNumber,
           name: s.name,
           department: s.department,
           semester: s.currentSemester,
           cgpa: s.cgpa
         })`,
        { batch: data.students }
      );

      // 7. Batch insert clubs, events, facilities, resources
      await session.run(
        `UNWIND $batch AS cl
         CREATE (n:Club { id: cl.clubId, name: cl.name, category: cl.category })`,
        { batch: data.clubs }
      );

      await session.run(
        `UNWIND $batch AS e
         CREATE (n:Event { id: e.eventId, title: e.title, eventType: e.eventType, eventDate: toString(e.eventDate) })`,
        { batch: data.events }
      );

      await session.run(
        `UNWIND $batch AS f
         CREATE (n:Facility { id: f.facilityId, name: f.name, type: f.facilityType, capacity: f.capacity })`,
        { batch: data.facilities }
      );

      await session.run(
        `UNWIND $batch AS r
         CREATE (n:Resource { id: r.resourceId, title: r.title, type: r.resourceType, difficulty: r.difficulty })`,
        { batch: data.resources }
      );

      console.log('  -> Inserting Graph Relationships...');
      // 1. Skill -> SKILL_PREREQUISITE_OF -> Skill
      for (const sk of data.skills) {
        for (const prereqId of sk.prerequisiteSkillIds) {
          await session.run(
            `MATCH (parent:Skill {id: $prereqId}), (child:Skill {id: $childId})
             CREATE (parent)-[:SKILL_PREREQUISITE_OF]->(child)`,
            { prereqId, childId: sk.skillId }
          );
        }
      }

      // 2. Course -> COURSE_TEACHES -> Skill
      for (const c of data.courses) {
        for (const skId of c.taughtSkillIds) {
          await session.run(
            `MATCH (c:Course {id: $courseId}), (sk:Skill {id: $skId})
             CREATE (c)-[:COURSE_TEACHES]->(sk)`,
            { courseId: c.courseId, skId }
          );
        }
      }

      // 3. Course -> COURSE_REQUIRES -> Course
      for (const c of data.courses) {
        for (const reqCourseId of c.prerequisiteCourseIds) {
          await session.run(
            `MATCH (c:Course {id: $courseId}), (req:Course {id: $reqCourseId})
             CREATE (c)-[:COURSE_REQUIRES]->(req)`,
            { courseId: c.courseId, reqCourseId }
          );
        }
      }

      // 4. Project -> PROJECT_REQUIRES -> Skill & PROJECT_USES -> Technology
      for (const p of data.projects) {
        for (const skId of p.requiredSkillIds) {
          await session.run(
            `MATCH (p:Project {id: $projectId}), (sk:Skill {id: $skId})
             CREATE (p)-[:PROJECT_REQUIRES]->(sk)`,
            { projectId: p.projectId, skId }
          );
        }
        for (const techName of p.technologiesUsed || []) {
          await session.run(
            `MATCH (p:Project {id: $projectId}), (t:Technology {name: $techName})
             CREATE (p)-[:PROJECT_USES]->(t)`,
            { projectId: p.projectId, techName }
          );
        }
      }

      // 5. Job -> JOB_REQUIRES -> Skill
      for (const j of data.jobs) {
        for (const skId of j.demandedSkillIds) {
          await session.run(
            `MATCH (j:Job {id: $jobId}), (sk:Skill {id: $skId})
             CREATE (j)-[:JOB_REQUIRES]->(sk)`,
            { jobId: j.jobId, skId }
          );
        }
      }

      // 6. Resource -> RESOURCE_TEACHES -> Skill
      for (const r of data.resources) {
        for (const skId of r.taughtSkillIds || []) {
          await session.run(
            `MATCH (r:Resource {id: $resourceId}), (sk:Skill {id: $skId})
             CREATE (r)-[:RESOURCE_TEACHES]->(sk)`,
            { resourceId: r.resourceId, skId }
          );
        }
      }

      // 7. Event -> EVENT_ORGANIZED_BY -> Club & Facility -> FACILITY_SUPPORTS -> Event
      for (const ev of data.events) {
        if (ev.organizingClubId) {
          await session.run(
            `MATCH (e:Event {id: $eventId}), (cl:Club {id: $clubId})
             CREATE (e)-[:EVENT_ORGANIZED_BY]->(cl)`,
            { eventId: ev.eventId, clubId: ev.organizingClubId }
          );
        }
        if (ev.venueFacilityId) {
          await session.run(
            `MATCH (f:Facility {id: $facilityId}), (e:Event {id: $eventId})
             CREATE (f)-[:FACILITY_SUPPORTS]->(e)`,
            { facilityId: ev.venueFacilityId, eventId: ev.eventId }
          );
        }
      }

      // 8. Student Relationships (STUDENT_HAS_SKILL, STUDENT_INTERESTED_IN, STUDENT_COMPLETED, STUDENT_MEMBER_OF, STUDENT_ATTENDS)
      for (const s of data.students) {
        for (const sk of s.skills) {
          await session.run(
            `MATCH (stu:Student {id: $studentId}), (sk:Skill {id: $skId})
             CREATE (stu)-[:STUDENT_HAS_SKILL {level: $level}]->(sk)`,
            { studentId: s.studentId, skId: sk.skillId, level: sk.level }
          );
        }

        // Student Interested In (connect students to skills matching their interest domains)
        for (const interest of s.interests || []) {
          await session.run(
            `MATCH (stu:Student {id: $studentId}), (sk:Skill)
             WHERE sk.category CONTAINS $interest OR $interest CONTAINS sk.category
             CREATE (stu)-[:STUDENT_INTERESTED_IN]->(sk)`,
            { studentId: s.studentId, interest }
          );
        }

        for (const c of s.completedCourses) {
          await session.run(
            `MATCH (stu:Student {id: $studentId}), (crs:Course {id: $courseId})
             CREATE (stu)-[:STUDENT_COMPLETED {grade: $grade}]->(crs)`,
            { studentId: s.studentId, courseId: c.courseId, grade: c.grade }
          );
        }

        for (const cl of s.clubMemberships) {
          await session.run(
            `MATCH (stu:Student {id: $studentId}), (club:Club {id: $clubId})
             CREATE (stu)-[:STUDENT_MEMBER_OF {role: $role}]->(club)`,
            { studentId: s.studentId, clubId: cl.clubId, role: cl.role }
          );
        }

        for (const evId of s.attendedEventIds) {
          await session.run(
            `MATCH (stu:Student {id: $studentId}), (ev:Event {id: $eventId})
             CREATE (stu)-[:STUDENT_ATTENDS]->(ev)`,
            { studentId: s.studentId, eventId: evId }
          );
        }
      }

      const nodeCountRes = await session.run('MATCH (n) RETURN count(n) AS c');
      const relCountRes = await session.run('MATCH ()-[r]->() RETURN count(r) AS c');
      neo4jCounts.nodes = nodeCountRes.records[0].get('c').toNumber();
      neo4jCounts.relationships = relCountRes.records[0].get('c').toNumber();

      console.log(`✓ Neo4j graph successfully populated:`);
      console.log(`    Total Nodes:         ${neo4jCounts.nodes}`);
      console.log(`    Total Relationships: ${neo4jCounts.relationships}`);
    } catch (err: any) {
      console.error('✗ Neo4j seeding error:', err.message);
    } finally {
      await session.close();
    }
  } else {
    console.log('ℹ Neo4j is currently offline. Skipping live graph insert (JSON seed snapshot saved).');
  }

  // 5. Seed Cassandra (if accessible)
  console.log('\n[5/5] Probing and Seeding Cassandra (Wide-Column Store)...');
  const cassandraHealth = await dbManager.checkCassandraHealth();
  let cassandraCounts = { activity: 0, resourceAccess: 0, recAudit: 0 };

  if (cassandraHealth.status === 'connected') {
    const cassClient = dbManager.getCassandraClient();
    try {
      await setupCassandraSchema(cassClient);
      await clearCassandraTables(cassClient);

      console.log('  -> Inserting Student Activity Events...');
      const insertActivityQuery = `
        INSERT INTO ${process.env.CASSANDRA_KEYSPACE || 'campus_telemetry'}.student_activity_by_day
        (student_id, activity_date, event_timestamp, event_id, action_type, target_entity_type, target_entity_id, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const ev of data.cassandraEvents.studentActivity) {
        await cassClient.execute(
          insertActivityQuery,
          [
            ev.student_id,
            ev.activity_date,
            ev.event_timestamp,
            ev.event_id,
            ev.action_type,
            ev.target_entity_type,
            ev.target_entity_id,
            ev.metadata_json,
          ],
          { prepare: true }
        );
      }

      console.log('  -> Inserting Resource Access Events...');
      const insertResourceQuery = `
        INSERT INTO ${process.env.CASSANDRA_KEYSPACE || 'campus_telemetry'}.resource_access_history
        (resource_id, year_month, event_timestamp, event_id, student_id, duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      for (const ra of data.cassandraEvents.resourceAccess) {
        await cassClient.execute(
          insertResourceQuery,
          [
            ra.resource_id,
            ra.year_month,
            ra.event_timestamp,
            ra.event_id,
            ra.student_id,
            ra.duration_seconds,
          ],
          { prepare: true }
        );
      }

      console.log('  -> Inserting Recommendation Audit Logs...');
      const insertRecQuery = `
        INSERT INTO ${process.env.CASSANDRA_KEYSPACE || 'campus_telemetry'}.recommendation_audit_log
        (student_id, rec_type, generated_at, rec_id, target_item_id, final_score, score_breakdown_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      for (const rLog of data.cassandraEvents.recommendationAudit) {
        await cassClient.execute(
          insertRecQuery,
          [
            rLog.student_id,
            rLog.rec_type,
            rLog.generated_at,
            rLog.rec_id,
            rLog.target_item_id,
            rLog.final_score,
            rLog.score_breakdown_json,
          ],
          { prepare: true }
        );
      }

      cassandraCounts.activity = data.cassandraEvents.studentActivity.length;
      cassandraCounts.resourceAccess = data.cassandraEvents.resourceAccess.length;
      cassandraCounts.recAudit = data.cassandraEvents.recommendationAudit.length;

      console.log(`✓ Cassandra telemetry successfully populated:`);
      console.log(`    student_activity_by_day:  ${cassandraCounts.activity} rows`);
      console.log(`    resource_access_history: ${cassandraCounts.resourceAccess} rows`);
      console.log(`    recommendation_audit_log: ${cassandraCounts.recAudit} rows`);
    } catch (err: any) {
      console.error('✗ Cassandra seeding error:', err.message);
    }
  } else {
    console.log('ℹ Cassandra is currently offline. Skipping live CQL insert (JSON seed snapshot saved).');
  }

  console.log('\n===============================================================');
  console.log(' Seeding Process Finished Successfully');
  console.log('===============================================================\n');

  return {
    success: true,
    scale,
    seed,
    mongoCounts,
    neo4jCounts,
    cassandraCounts,
  };
}
