import { Driver } from 'neo4j-driver';
import { BaseNeo4jRepository } from './base.neo4j.repository.js';

export interface SkillPrerequisiteResult {
  prerequisiteId: string;
  name: string;
  category: string;
  tier: string;
  depth: number;
}

export interface JobRequiredSkillsResult {
  job: {
    id: string;
    title: string;
    company: string;
    type: string;
    preferredDomain: string;
  };
  requiredSkills: Array<{
    id: string;
    name: string;
    category: string;
    tier: string;
  }>;
}

export interface StudentSkillResult {
  skillId: string;
  name: string;
  category: string;
  tier: string;
  level: string;
}

export interface MissingSkillResult {
  skillId: string;
  name: string;
  category: string;
  tier: string;
}

export interface CourseTeachingMissingSkillsResult {
  courseId: string;
  code: string;
  title: string;
  department: string;
  credits: number;
  difficulty: string;
  taughtMissingSkills: Array<{ id: string; name: string }>;
  prerequisiteCourseCodes: string[];
}

export interface ProjectMatchResult {
  projectId: string;
  title: string;
  domain: string;
  difficulty: string;
  requiredSkillCount: number;
  matchedSkillCount: number;
  matchRatio: number;
  matchedSkills: Array<{ id: string; name: string }>;
  missingSkills: Array<{ id: string; name: string }>;
}

export interface RelatedResourceResult {
  resourceId: string;
  title: string;
  type: string;
  skillsTaught: Array<{ id: string; name: string }>;
}

export interface StudentPeerOverlapResult {
  peerId: string;
  name: string;
  department: string;
  semester: number;
  sharedSkills: string[];
  sharedCourses: string[];
  sharedClubs: string[];
  totalOverlapScore: number;
}

export interface ShortestSkillPathResult {
  startSkillId: string;
  endSkillId: string;
  distance: number;
  path: Array<{ id: string; name: string; tier: string; category: string }>;
}

export interface DependencyPathResult {
  hops: number;
  nodeChain: Array<{ id: string; name: string; [key: string]: any }>;
}

export interface ConnectedOpportunitiesResult {
  skill: {
    id: string;
    name: string;
    category: string;
    tier: string;
  };
  courses: Array<{ id: string; code: string; title: string; difficulty: string }>;
  projects: Array<{ id: string; title: string; domain: string; difficulty: string }>;
  jobs: Array<{ id: string; title: string; company: string; type: string }>;
  resources: Array<{ id: string; title: string; type: string }>;
  studentTalentCount: number;
}

export interface AlternativeRoutesResult {
  targetSkillId: string;
  targetSkillName: string;
  directCourses: Array<{ id: string; code: string; title: string }>;
  rootPrerequisites: Array<{ id: string; name: string; tier: string }>;
  routes: Array<{ length: number; chain: Array<{ id: string; name: string }> }>;
}

export class GraphRepository extends BaseNeo4jRepository {
  constructor(driver?: Driver) {
    super(driver);
  }

  // =========================================================================
  // 1. Find prerequisites for a skill (direct & transitive)
  // =========================================================================
  public async findSkillPrerequisites(skillId: string, maxDepth: number = 5): Promise<SkillPrerequisiteResult[]> {
    const query = `
      MATCH path = (prereq:Skill)-[:SKILL_PREREQUISITE_OF*1..${maxDepth}]->(target:Skill {id: $skillId})
      WITH prereq, min(length(path)) AS depth
      RETURN 
        prereq.id AS prerequisiteId,
        prereq.name AS name,
        prereq.category AS category,
        prereq.tier AS tier,
        depth
      ORDER BY depth ASC, name ASC
    `;

    const records = await this.runQuery(query, { skillId });
    return records.map((rec) => ({
      prerequisiteId: rec.get('prerequisiteId'),
      name: rec.get('name'),
      category: rec.get('category'),
      tier: rec.get('tier'),
      depth: this.toNativeValue(rec.get('depth')),
    }));
  }

  // =========================================================================
  // 2. Find all skills required by a job
  // =========================================================================
  public async findJobRequiredSkills(jobId: string): Promise<JobRequiredSkillsResult | null> {
    const query = `
      MATCH (j:Job {id: $jobId})
      OPTIONAL MATCH (j)-[:JOB_REQUIRES]->(sk:Skill)
      RETURN 
        j.id AS jobId,
        j.title AS title,
        j.company AS company,
        j.type AS type,
        j.preferredDomain AS preferredDomain,
        collect(DISTINCT {
          id: sk.id,
          name: sk.name,
          category: sk.category,
          tier: sk.tier
        }) AS skills
    `;

    const records = await this.runQuery(query, { jobId });
    if (records.length === 0 || !records[0].get('jobId')) return null;

    const rec = records[0];
    const skillsRaw = this.toNativeValue(rec.get('skills')) || [];
    const filteredSkills = skillsRaw.filter((s: any) => s && s.id);

    return {
      job: {
        id: rec.get('jobId'),
        title: rec.get('title'),
        company: rec.get('company'),
        type: rec.get('type') || 'full_time',
        preferredDomain: rec.get('preferredDomain') || '',
      },
      requiredSkills: filteredSkills,
    };
  }

  // =========================================================================
  // 3. Find student's current skills
  // =========================================================================
  public async findStudentCurrentSkills(studentId: string): Promise<StudentSkillResult[]> {
    const query = `
      MATCH (s:Student {id: $studentId})-[r:STUDENT_HAS_SKILL]->(sk:Skill)
      RETURN 
        sk.id AS skillId,
        sk.name AS name,
        sk.category AS category,
        sk.tier AS tier,
        r.level AS level
      ORDER BY sk.name ASC
    `;

    const records = await this.runQuery(query, { studentId });
    return records.map((rec) => ({
      skillId: rec.get('skillId'),
      name: rec.get('name'),
      category: rec.get('category'),
      tier: rec.get('tier'),
      level: rec.get('level') || 'intermediate',
    }));
  }

  // =========================================================================
  // 4. Find missing skills for a student relative to a Job, Project, or Skill
  // =========================================================================
  public async findMissingSkills(
    studentId: string,
    targetType: 'job' | 'project' | 'skill',
    targetId: string
  ): Promise<MissingSkillResult[]> {
    let query = '';

    if (targetType === 'job') {
      query = `
        MATCH (j:Job {id: $targetId})-[:JOB_REQUIRES]->(req:Skill)
        WHERE NOT EXISTS {
          MATCH (:Student {id: $studentId})-[:STUDENT_HAS_SKILL]->(req)
        }
        RETURN req.id AS skillId, req.name AS name, req.category AS category, req.tier AS tier
        ORDER BY req.name ASC
      `;
    } else if (targetType === 'project') {
      query = `
        MATCH (p:Project {id: $targetId})-[:PROJECT_REQUIRES]->(req:Skill)
        WHERE NOT EXISTS {
          MATCH (:Student {id: $studentId})-[:STUDENT_HAS_SKILL]->(req)
        }
        RETURN req.id AS skillId, req.name AS name, req.category AS category, req.tier AS tier
        ORDER BY req.name ASC
      `;
    } else {
      // Skill prerequisites that the student hasn't mastered
      query = `
        MATCH (prereq:Skill)-[:SKILL_PREREQUISITE_OF*1..5]->(target:Skill {id: $targetId})
        WHERE NOT EXISTS {
          MATCH (:Student {id: $studentId})-[:STUDENT_HAS_SKILL]->(prereq)
        }
        RETURN DISTINCT prereq.id AS skillId, prereq.name AS name, prereq.category AS category, prereq.tier AS tier
        ORDER BY prereq.name ASC
      `;
    }

    const records = await this.runQuery(query, { studentId, targetId });
    return records.map((rec) => ({
      skillId: rec.get('skillId'),
      name: rec.get('name'),
      category: rec.get('category'),
      tier: rec.get('tier'),
    }));
  }

  // =========================================================================
  // 5. Find courses teaching missing skills
  // =========================================================================
  public async findCoursesTeachingMissingSkills(missingSkillIds: string[]): Promise<CourseTeachingMissingSkillsResult[]> {
    if (missingSkillIds.length === 0) return [];

    const query = `
      MATCH (c:Course)-[:COURSE_TEACHES]->(sk:Skill)
      WHERE sk.id IN $missingSkillIds
      OPTIONAL MATCH (c)-[:COURSE_REQUIRES]->(reqC:Course)
      WITH c, 
           collect(DISTINCT { id: sk.id, name: sk.name }) AS taughtMissing,
           collect(DISTINCT reqC.code) AS prereqCodes
      RETURN 
        c.id AS courseId,
        c.code AS code,
        c.title AS title,
        c.department AS department,
        c.credits AS credits,
        c.difficulty AS difficulty,
        taughtMissing,
        prereqCodes
      ORDER BY size(taughtMissing) DESC, c.code ASC
    `;

    const records = await this.runQuery(query, { missingSkillIds });
    return records.map((rec) => ({
      courseId: rec.get('courseId'),
      code: rec.get('code'),
      title: rec.get('title'),
      department: rec.get('department'),
      credits: this.toNativeValue(rec.get('credits')) || 3,
      difficulty: rec.get('difficulty'),
      taughtMissingSkills: this.toNativeValue(rec.get('taughtMissing')) || [],
      prerequisiteCourseCodes: (this.toNativeValue(rec.get('prereqCodes')) || []).filter(Boolean),
    }));
  }

  // =========================================================================
  // 6. Find projects matching student's skills
  // =========================================================================
  public async findProjectsMatchingStudentSkills(
    studentId: string,
    minMatchRatio: number = 0.0
  ): Promise<ProjectMatchResult[]> {
    const query = `
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
      RETURN 
        p.id AS projectId,
        p.title AS title,
        p.domain AS domain,
        p.difficulty AS difficulty,
        totalReq AS requiredSkillCount,
        matchedCount AS matchedSkillCount,
        matchRatio,
        matchedSkills,
        missingSkills
      ORDER BY matchRatio DESC, matchedCount DESC, p.title ASC
    `;

    const records = await this.runQuery(query, { studentId, minMatchRatio });
    return records.map((rec) => ({
      projectId: rec.get('projectId'),
      title: rec.get('title'),
      domain: rec.get('domain'),
      difficulty: rec.get('difficulty'),
      requiredSkillCount: this.toNativeValue(rec.get('requiredSkillCount')),
      matchedSkillCount: this.toNativeValue(rec.get('matchedSkillCount')),
      matchRatio: Number((this.toNativeValue(rec.get('matchRatio')) || 0).toFixed(2)),
      matchedSkills: this.toNativeValue(rec.get('matchedSkills')) || [],
      missingSkills: this.toNativeValue(rec.get('missingSkills')) || [],
    }));
  }

  // =========================================================================
  // 7. Find related resources for a skill or course
  // =========================================================================
  public async findRelatedResources(entityId: string, type: 'skill' | 'course' = 'skill'): Promise<RelatedResourceResult[]> {
    let query = '';

    if (type === 'skill') {
      query = `
        MATCH (r:Resource)-[:RESOURCE_TEACHES]->(sk:Skill {id: $entityId})
        RETURN 
          r.id AS resourceId,
          r.title AS title,
          r.type AS type,
          collect(DISTINCT { id: sk.id, name: sk.name }) AS skillsTaught
        ORDER BY r.title ASC
      `;
    } else {
      query = `
        MATCH (c:Course {id: $entityId})-[:COURSE_TEACHES]->(sk:Skill)<-[:RESOURCE_TEACHES]-(r:Resource)
        RETURN 
          r.id AS resourceId,
          r.title AS title,
          r.type AS type,
          collect(DISTINCT { id: sk.id, name: sk.name }) AS skillsTaught
        ORDER BY size(skillsTaught) DESC, r.title ASC
      `;
    }

    const records = await this.runQuery(query, { entityId });
    return records.map((rec) => ({
      resourceId: rec.get('resourceId'),
      title: rec.get('title'),
      type: rec.get('type') || 'Resource',
      skillsTaught: this.toNativeValue(rec.get('skillsTaught')) || [],
    }));
  }

  // =========================================================================
  // 8. Find common interests and peer study group matching between students
  // =========================================================================
  public async findCommonInterestsBetweenStudents(studentId: string, limit: number = 10): Promise<StudentPeerOverlapResult[]> {
    const query = `
      MATCH (s1:Student {id: $studentId})
      MATCH (s2:Student)
      WHERE s1 <> s2

      // Common skills
      OPTIONAL MATCH (s1)-[:STUDENT_HAS_SKILL]->(sk:Skill)<-[:STUDENT_HAS_SKILL]-(s2)
      WITH s1, s2, collect(DISTINCT sk.name) AS sharedSkills

      // Common completed courses
      OPTIONAL MATCH (s1)-[:STUDENT_COMPLETED]->(c:Course)<-[:STUDENT_COMPLETED]-(s2)
      WITH s1, s2, sharedSkills, collect(DISTINCT c.code) AS sharedCourses

      // Common clubs
      OPTIONAL MATCH (s1)-[:STUDENT_MEMBER_OF]->(cl:Club)<-[:STUDENT_MEMBER_OF]-(s2)
      WITH s2, sharedSkills, sharedCourses, collect(DISTINCT cl.name) AS sharedClubs

      WITH s2, sharedSkills, sharedCourses, sharedClubs,
           (size(sharedSkills) * 3 + size(sharedCourses) * 2 + size(sharedClubs) * 2) AS overlapScore
      WHERE overlapScore > 0

      RETURN 
        s2.id AS peerId,
        s2.name AS name,
        s2.department AS department,
        s2.semester AS semester,
        sharedSkills,
        sharedCourses,
        sharedClubs,
        overlapScore
      ORDER BY overlapScore DESC, s2.name ASC
      LIMIT $limit
    `;

    const records = await this.runQuery(query, { studentId, limit: this.toNativeValue(limit) });
    return records.map((rec) => ({
      peerId: rec.get('peerId'),
      name: rec.get('name'),
      department: rec.get('department'),
      semester: this.toNativeValue(rec.get('semester')) || 1,
      sharedSkills: this.toNativeValue(rec.get('sharedSkills')) || [],
      sharedCourses: this.toNativeValue(rec.get('sharedCourses')) || [],
      sharedClubs: this.toNativeValue(rec.get('sharedClubs')) || [],
      totalOverlapScore: this.toNativeValue(rec.get('overlapScore')) || 0,
    }));
  }

  // =========================================================================
  // 9. Find shortest path between two skills
  // =========================================================================
  public async findShortestPathBetweenSkills(startSkillId: string, endSkillId: string): Promise<ShortestSkillPathResult | null> {
    const query = `
      MATCH (start:Skill {id: $startSkillId}), (end:Skill {id: $endSkillId})
      MATCH p = shortestPath((start)-[:SKILL_PREREQUISITE_OF*]-(end))
      RETURN 
        length(p) AS distance,
        [node IN nodes(p) | {
          id: node.id,
          name: node.name,
          tier: node.tier,
          category: node.category
        }] AS pathNodes
    `;

    const records = await this.runQuery(query, { startSkillId, endSkillId });
    if (records.length === 0) return null;

    const rec = records[0];
    return {
      startSkillId,
      endSkillId,
      distance: this.toNativeValue(rec.get('distance')),
      path: this.toNativeValue(rec.get('pathNodes')) || [],
    };
  }

  // =========================================================================
  // 10. Find multi-hop dependency paths (all dependency chains)
  // =========================================================================
  public async findMultiHopDependencyPaths(
    entityType: 'skill' | 'course',
    id: string,
    maxHops: number = 5
  ): Promise<DependencyPathResult[]> {
    let query = '';

    if (entityType === 'skill') {
      query = `
        MATCH path = (prereq:Skill)-[:SKILL_PREREQUISITE_OF*1..${maxHops}]->(target:Skill {id: $id})
        RETURN 
          length(path) AS hops,
          [n IN nodes(path) | { id: n.id, name: n.name, tier: n.tier, category: n.category }] AS nodeChain
        ORDER BY hops ASC
      `;
    } else {
      query = `
        MATCH path = (c:Course {id: $id})-[:COURSE_REQUIRES*1..${maxHops}]->(req:Course)
        RETURN 
          length(path) AS hops,
          [n IN nodes(path) | { id: n.id, code: n.code, title: n.title, department: n.department }] AS nodeChain
        ORDER BY hops ASC
      `;
    }

    const records = await this.runQuery(query, { id });
    return records.map((rec) => ({
      hops: this.toNativeValue(rec.get('hops')),
      nodeChain: this.toNativeValue(rec.get('nodeChain')) || [],
    }));
  }

  // =========================================================================
  // 11. Find connected opportunities around a skill (360-degree neighborhood)
  // =========================================================================
  public async findConnectedOpportunitiesAroundSkill(skillId: string): Promise<ConnectedOpportunitiesResult | null> {
    const query = `
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

      RETURN 
        sk.id AS skillId,
        sk.name AS name,
        sk.category AS category,
        sk.tier AS tier,
        courses,
        projects,
        jobs,
        resources,
        talentCount
    `;

    const records = await this.runQuery(query, { skillId });
    if (records.length === 0 || !records[0].get('skillId')) return null;

    const rec = records[0];
    const cleanList = (arr: any[]) => arr.filter((x) => x && (x.id || x.title));

    return {
      skill: {
        id: rec.get('skillId'),
        name: rec.get('name'),
        category: rec.get('category'),
        tier: rec.get('tier'),
      },
      courses: cleanList(this.toNativeValue(rec.get('courses')) || []),
      projects: cleanList(this.toNativeValue(rec.get('projects')) || []),
      jobs: cleanList(this.toNativeValue(rec.get('jobs')) || []),
      resources: cleanList(this.toNativeValue(rec.get('resources')) || []),
      studentTalentCount: this.toNativeValue(rec.get('talentCount')) || 0,
    };
  }

  // =========================================================================
  // 12. Find alternative routes to a target skill
  // =========================================================================
  public async findAlternativeRoutesToTargetSkill(targetSkillId: string): Promise<AlternativeRoutesResult | null> {
    const query = `
      MATCH (target:Skill {id: $targetSkillId})

      // Direct courses teaching target
      OPTIONAL MATCH (c:Course)-[:COURSE_TEACHES]->(target)
      WITH target, collect(DISTINCT { id: c.id, code: c.code, title: c.title }) AS directCourses

      // Prerequisite chains from root skills to target
      OPTIONAL MATCH path = (base:Skill)-[:SKILL_PREREQUISITE_OF*1..5]->(target)
      WHERE NOT ()-[:SKILL_PREREQUISITE_OF]->(base)
      WITH target, directCourses,
           collect(DISTINCT { id: base.id, name: base.name, tier: base.tier }) AS roots,
           collect(DISTINCT {
             length: length(path),
             chain: [n IN nodes(path) | { id: n.id, name: n.name }]
           }) AS paths

      RETURN 
        target.id AS targetSkillId,
        target.name AS targetSkillName,
        directCourses,
        roots,
        paths
    `;

    const records = await this.runQuery(query, { targetSkillId });
    if (records.length === 0 || !records[0].get('targetSkillId')) return null;

    const rec = records[0];
    const cleanList = (arr: any[]) => arr.filter((x) => x && (x.id || x.name));

    return {
      targetSkillId: rec.get('targetSkillId'),
      targetSkillName: rec.get('targetSkillName'),
      directCourses: cleanList(this.toNativeValue(rec.get('directCourses')) || []),
      rootPrerequisites: cleanList(this.toNativeValue(rec.get('roots')) || []),
      routes: (this.toNativeValue(rec.get('paths')) || []).sort((a: any, b: any) => a.length - b.length),
    };
  }
}

export const graphRepository = new GraphRepository();
