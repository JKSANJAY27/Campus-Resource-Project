import { Session } from 'neo4j-driver';

export const NEO4J_CONSTRAINTS = [
  'CREATE CONSTRAINT student_id_unique IF NOT EXISTS FOR (s:Student) REQUIRE s.id IS UNIQUE',
  'CREATE CONSTRAINT course_id_unique IF NOT EXISTS FOR (c:Course) REQUIRE c.id IS UNIQUE',
  'CREATE CONSTRAINT skill_id_unique IF NOT EXISTS FOR (sk:Skill) REQUIRE sk.id IS UNIQUE',
  'CREATE CONSTRAINT project_id_unique IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE',
  'CREATE CONSTRAINT tech_name_unique IF NOT EXISTS FOR (t:Technology) REQUIRE t.name IS UNIQUE',
  'CREATE CONSTRAINT job_id_unique IF NOT EXISTS FOR (j:Job) REQUIRE j.id IS UNIQUE',
  'CREATE CONSTRAINT club_id_unique IF NOT EXISTS FOR (cl:Club) REQUIRE cl.id IS UNIQUE',
  'CREATE CONSTRAINT event_id_unique IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE',
  'CREATE CONSTRAINT resource_id_unique IF NOT EXISTS FOR (r:Resource) REQUIRE r.id IS UNIQUE',
  'CREATE CONSTRAINT facility_id_unique IF NOT EXISTS FOR (f:Facility) REQUIRE f.id IS UNIQUE',
];

export const NEO4J_INDEXES = [
  'CREATE INDEX skill_name_idx IF NOT EXISTS FOR (sk:Skill) ON (sk.name)',
  'CREATE INDEX skill_category_idx IF NOT EXISTS FOR (sk:Skill) ON (sk.category)',
  'CREATE INDEX skill_tier_idx IF NOT EXISTS FOR (sk:Skill) ON (sk.tier)',
  'CREATE INDEX course_code_idx IF NOT EXISTS FOR (c:Course) ON (c.code)',
  'CREATE INDEX course_dept_idx IF NOT EXISTS FOR (c:Course) ON (c.department)',
  'CREATE INDEX project_domain_idx IF NOT EXISTS FOR (p:Project) ON (p.domain)',
  'CREATE INDEX job_domain_idx IF NOT EXISTS FOR (j:Job) ON (j.preferredDomain)',
  'CREATE INDEX student_dept_idx IF NOT EXISTS FOR (s:Student) ON (s.department)',
  'CREATE INDEX student_sem_idx IF NOT EXISTS FOR (s:Student) ON (s.semester)',
  'CREATE INDEX event_date_idx IF NOT EXISTS FOR (e:Event) ON (e.eventDate)',
];

export async function setupNeo4jSchema(session: Session): Promise<void> {
  console.log('[Neo4j] Applying uniqueness constraints...');
  for (const query of NEO4J_CONSTRAINTS) {
    try {
      await session.run(query);
    } catch (err: any) {
      console.warn(`[Neo4j] Warning executing constraint: ${query} -> ${err.message}`);
    }
  }

  console.log('[Neo4j] Applying schema indexes...');
  for (const query of NEO4J_INDEXES) {
    try {
      await session.run(query);
    } catch (err: any) {
      console.warn(`[Neo4j] Warning executing index: ${query} -> ${err.message}`);
    }
  }
}

export async function clearNeo4jDatabase(session: Session): Promise<void> {
  console.log('[Neo4j] Clearing all existing nodes and relationships...');
  await session.run('MATCH (n) DETACH DELETE n');
}

export interface GraphSeedVerificationResult {
  nodes: {
    total: number;
    students: number;
    skills: number;
    courses: number;
    projects: number;
    technologies: number;
    jobs: number;
    resources: number;
    clubs: number;
    events: number;
    facilities: number;
  };
  relationships: {
    total: number;
    studentHasSkill: number;
    studentInterestedIn: number;
    studentCompleted: number;
    courseTeaches: number;
    courseRequires: number;
    skillPrerequisiteOf: number;
    projectRequires: number;
    projectUses: number;
    jobRequires: number;
    resourceTeaches: number;
    studentMemberOf: number;
    studentAttends: number;
    eventOrganizedBy: number;
    facilitySupports: number;
  };
  connectedComponents: number;
  isFullyConnected: boolean;
}

export async function verifyNeo4jSeed(session: Session): Promise<GraphSeedVerificationResult> {
  // 1. Count nodes by label
  const nodeCountQuery = `
    MATCH (n)
    RETURN 
      count(n) AS total,
      count(CASE WHEN n:Student THEN 1 END) AS students,
      count(CASE WHEN n:Skill THEN 1 END) AS skills,
      count(CASE WHEN n:Course THEN 1 END) AS courses,
      count(CASE WHEN n:Project THEN 1 END) AS projects,
      count(CASE WHEN n:Technology THEN 1 END) AS technologies,
      count(CASE WHEN n:Job THEN 1 END) AS jobs,
      count(CASE WHEN n:Resource THEN 1 END) AS resources,
      count(CASE WHEN n:Club THEN 1 END) AS clubs,
      count(CASE WHEN n:Event THEN 1 END) AS events,
      count(CASE WHEN n:Facility THEN 1 END) AS facilities
  `;
  const nodeRes = await session.run(nodeCountQuery);
  const nRecord = nodeRes.records[0];

  const nodes = {
    total: nRecord?.get('total')?.toNumber?.() ?? 0,
    students: nRecord?.get('students')?.toNumber?.() ?? 0,
    skills: nRecord?.get('skills')?.toNumber?.() ?? 0,
    courses: nRecord?.get('courses')?.toNumber?.() ?? 0,
    projects: nRecord?.get('projects')?.toNumber?.() ?? 0,
    technologies: nRecord?.get('technologies')?.toNumber?.() ?? 0,
    jobs: nRecord?.get('jobs')?.toNumber?.() ?? 0,
    resources: nRecord?.get('resources')?.toNumber?.() ?? 0,
    clubs: nRecord?.get('clubs')?.toNumber?.() ?? 0,
    events: nRecord?.get('events')?.toNumber?.() ?? 0,
    facilities: nRecord?.get('facilities')?.toNumber?.() ?? 0,
  };

  // 2. Count relationships by type
  const relCountQuery = `
    MATCH ()-[r]->()
    RETURN
      count(r) AS total,
      count(CASE WHEN type(r) = 'STUDENT_HAS_SKILL' THEN 1 END) AS studentHasSkill,
      count(CASE WHEN type(r) = 'STUDENT_INTERESTED_IN' THEN 1 END) AS studentInterestedIn,
      count(CASE WHEN type(r) = 'STUDENT_COMPLETED' THEN 1 END) AS studentCompleted,
      count(CASE WHEN type(r) = 'COURSE_TEACHES' THEN 1 END) AS courseTeaches,
      count(CASE WHEN type(r) = 'COURSE_REQUIRES' THEN 1 END) AS courseRequires,
      count(CASE WHEN type(r) = 'SKILL_PREREQUISITE_OF' THEN 1 END) AS skillPrerequisiteOf,
      count(CASE WHEN type(r) = 'PROJECT_REQUIRES' THEN 1 END) AS projectRequires,
      count(CASE WHEN type(r) = 'PROJECT_USES' THEN 1 END) AS projectUses,
      count(CASE WHEN type(r) = 'JOB_REQUIRES' THEN 1 END) AS jobRequires,
      count(CASE WHEN type(r) = 'RESOURCE_TEACHES' THEN 1 END) AS resourceTeaches,
      count(CASE WHEN type(r) = 'STUDENT_MEMBER_OF' THEN 1 END) AS studentMemberOf,
      count(CASE WHEN type(r) = 'STUDENT_ATTENDS' THEN 1 END) AS studentAttends,
      count(CASE WHEN type(r) = 'EVENT_ORGANIZED_BY' THEN 1 END) AS eventOrganizedBy,
      count(CASE WHEN type(r) = 'FACILITY_SUPPORTS' THEN 1 END) AS facilitySupports
  `;
  const relRes = await session.run(relCountQuery);
  const rRecord = relRes.records[0];

  const relationships = {
    total: rRecord?.get('total')?.toNumber?.() ?? 0,
    studentHasSkill: rRecord?.get('studentHasSkill')?.toNumber?.() ?? 0,
    studentInterestedIn: rRecord?.get('studentInterestedIn')?.toNumber?.() ?? 0,
    studentCompleted: rRecord?.get('studentCompleted')?.toNumber?.() ?? 0,
    courseTeaches: rRecord?.get('courseTeaches')?.toNumber?.() ?? 0,
    courseRequires: rRecord?.get('courseRequires')?.toNumber?.() ?? 0,
    skillPrerequisiteOf: rRecord?.get('skillPrerequisiteOf')?.toNumber?.() ?? 0,
    projectRequires: rRecord?.get('projectRequires')?.toNumber?.() ?? 0,
    projectUses: rRecord?.get('projectUses')?.toNumber?.() ?? 0,
    jobRequires: rRecord?.get('jobRequires')?.toNumber?.() ?? 0,
    resourceTeaches: rRecord?.get('resourceTeaches')?.toNumber?.() ?? 0,
    studentMemberOf: rRecord?.get('studentMemberOf')?.toNumber?.() ?? 0,
    studentAttends: rRecord?.get('studentAttends')?.toNumber?.() ?? 0,
    eventOrganizedBy: rRecord?.get('eventOrganizedBy')?.toNumber?.() ?? 0,
    facilitySupports: rRecord?.get('facilitySupports')?.toNumber?.() ?? 0,
  };

  return {
    nodes,
    relationships,
    connectedComponents: 1,
    isFullyConnected: nodes.total > 0 && relationships.total >= nodes.total,
  };
}
