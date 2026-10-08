import { BaseNeo4jRepository } from './base.neo4j.repository.js';
import { dbManager } from '../../config/database.js';

export interface StudentInterestResult {
  skillId: string;
  name: string;
  category: string;
}

export interface StudentCompletedCourseResult {
  courseId: string;
  code: string;
  title: string;
  grade: string;
}

export interface JobWithSkillsResult {
  jobId: string;
  title: string;
  company: string;
  type: string;
  preferredDomain: string;
  requiredSkills: Array<{
    id: string;
    name: string;
    category: string;
    tier: string;
  }>;
}

export interface ProjectWithSkillsResult {
  projectId: string;
  title: string;
  domain: string;
  difficulty: string;
  requiredSkills: Array<{
    id: string;
    name: string;
    category: string;
    tier: string;
  }>;
}

export interface CourseWithDetailsResult {
  courseId: string;
  code: string;
  title: string;
  department: string;
  credits: number;
  difficulty: string;
  taughtSkills: Array<{
    id: string;
    name: string;
    category: string;
    tier: string;
  }>;
  prerequisiteCourseIds: string[];
}

export interface ResourceWithSkillsResult {
  resourceId: string;
  title: string;
  type: string;
  difficulty: string;
  rating?: number;
  taughtSkills: Array<{
    id: string;
    name: string;
    category: string;
  }>;
}

export interface SkillPopularityResult {
  skillId: string;
  studentCount: number;
}

export class RecommendationRepository extends BaseNeo4jRepository {
  /**
   * 1. Get skills student is interested in via STUDENT_INTERESTED_IN relationship
   */
  public async findStudentInterests(studentId: string): Promise<StudentInterestResult[]> {
    const query = `
      MATCH (s:Student {id: $studentId})-[:STUDENT_INTERESTED_IN]->(sk:Skill)
      RETURN DISTINCT sk.id AS skillId, sk.name AS name, sk.category AS category
      ORDER BY sk.name ASC
    `;
    const records = await this.runQuery(query, { studentId });
    return records.map((record) => ({
      skillId: record.get('skillId'),
      name: record.get('name'),
      category: record.get('category'),
    }));
  }

  /**
   * 2. Get list of course IDs completed by student
   */
  public async findStudentCompletedCourses(studentId: string): Promise<StudentCompletedCourseResult[]> {
    const query = `
      MATCH (s:Student {id: $studentId})-[r:STUDENT_COMPLETED]->(c:Course)
      RETURN c.id AS courseId, c.code AS code, c.title AS title, r.grade AS grade
      ORDER BY c.code ASC
    `;
    const records = await this.runQuery(query, { studentId });
    return records.map((record) => ({
      courseId: record.get('courseId'),
      code: record.get('code'),
      title: record.get('title'),
      grade: record.get('grade') || 'Pass',
    }));
  }

  /**
   * 3. Get all jobs with their required skills
   */
  public async findAllJobsWithSkills(): Promise<JobWithSkillsResult[]> {
    const query = `
      MATCH (j:Job)
      OPTIONAL MATCH (j)-[:JOB_REQUIRES]->(sk:Skill)
      WITH j, collect(DISTINCT CASE WHEN sk IS NOT NULL THEN {
        id: sk.id,
        name: sk.name,
        category: sk.category,
        tier: sk.tier
      } END) AS rawSkills
      RETURN j.id AS jobId,
             j.title AS title,
             j.company AS company,
             j.type AS type,
             j.preferredDomain AS preferredDomain,
             [s IN rawSkills WHERE s IS NOT NULL] AS requiredSkills
      ORDER BY j.title ASC
    `;
    const records = await this.runQuery(query);
    return records.map((record) => ({
      jobId: record.get('jobId'),
      title: record.get('title'),
      company: record.get('company'),
      type: record.get('type'),
      preferredDomain: record.get('preferredDomain'),
      requiredSkills: this.toNativeValue(record.get('requiredSkills')) || [],
    }));
  }

  /**
   * 4. Get all projects with their required skills
   */
  public async findAllProjectsWithSkills(): Promise<ProjectWithSkillsResult[]> {
    const query = `
      MATCH (p:Project)
      OPTIONAL MATCH (p)-[:PROJECT_REQUIRES]->(sk:Skill)
      WITH p, collect(DISTINCT CASE WHEN sk IS NOT NULL THEN {
        id: sk.id,
        name: sk.name,
        category: sk.category,
        tier: sk.tier
      } END) AS rawSkills
      RETURN p.id AS projectId,
             p.title AS title,
             p.domain AS domain,
             p.difficulty AS difficulty,
             [s IN rawSkills WHERE s IS NOT NULL] AS requiredSkills
      ORDER BY p.title ASC
    `;
    const records = await this.runQuery(query);
    return records.map((record) => ({
      projectId: record.get('projectId'),
      title: record.get('title'),
      domain: record.get('domain'),
      difficulty: record.get('difficulty'),
      requiredSkills: this.toNativeValue(record.get('requiredSkills')) || [],
    }));
  }

  /**
   * 5. Get all courses with taught skills and prerequisite course IDs
   */
  public async findAllCoursesWithSkills(): Promise<CourseWithDetailsResult[]> {
    const query = `
      MATCH (c:Course)
      OPTIONAL MATCH (c)-[:COURSE_TEACHES]->(sk:Skill)
      OPTIONAL MATCH (c)-[:COURSE_REQUIRES]->(req:Course)
      WITH c,
           collect(DISTINCT CASE WHEN sk IS NOT NULL THEN {
             id: sk.id,
             name: sk.name,
             category: sk.category,
             tier: sk.tier
           } END) AS rawSkills,
           collect(DISTINCT CASE WHEN req IS NOT NULL THEN req.id END) AS rawPrereqs
      RETURN c.id AS courseId,
             c.code AS code,
             c.title AS title,
             c.department AS department,
             c.credits AS credits,
             c.difficulty AS difficulty,
             [s IN rawSkills WHERE s IS NOT NULL] AS taughtSkills,
             [p IN rawPrereqs WHERE p IS NOT NULL] AS prerequisiteCourseIds
      ORDER BY c.code ASC
    `;
    const records = await this.runQuery(query);
    return records.map((record) => ({
      courseId: record.get('courseId'),
      code: record.get('code'),
      title: record.get('title'),
      department: record.get('department'),
      credits: this.toNativeValue(record.get('credits')),
      difficulty: record.get('difficulty'),
      taughtSkills: this.toNativeValue(record.get('taughtSkills')) || [],
      prerequisiteCourseIds: this.toNativeValue(record.get('prerequisiteCourseIds')) || [],
    }));
  }

  /**
   * 6. Find learning resources that teach any of the given skills
   */
  public async findResourcesForSkills(skillIds: string[]): Promise<ResourceWithSkillsResult[]> {
    if (!skillIds || skillIds.length === 0) return [];
    const query = `
      MATCH (r:Resource)-[:RESOURCE_TEACHES]->(sk:Skill)
      WHERE sk.id IN $skillIds
      WITH r, collect(DISTINCT { id: sk.id, name: sk.name, category: sk.category }) AS taughtSkills
      RETURN r.id AS resourceId,
             r.title AS title,
             r.type AS type,
             r.difficulty AS difficulty,
             taughtSkills
      ORDER BY r.title ASC
    `;
    const records = await this.runQuery(query, { skillIds });
    return records.map((record) => ({
      resourceId: record.get('resourceId'),
      title: record.get('title'),
      type: record.get('type'),
      difficulty: record.get('difficulty'),
      taughtSkills: this.toNativeValue(record.get('taughtSkills')) || [],
    }));
  }

  /**
   * 7. Find skill popularity (number of students with each skill)
   */
  public async findSkillPopularity(): Promise<Map<string, number>> {
    const query = `
      MATCH (sk:Skill)
      OPTIONAL MATCH (s:Student)-[:STUDENT_HAS_SKILL]->(sk)
      RETURN sk.id AS skillId, count(s) AS studentCount
    `;
    const records = await this.runQuery(query);
    const map = new Map<string, number>();
    for (const record of records) {
      const skillId = record.get('skillId');
      const count = this.toNativeValue(record.get('studentCount')) || 0;
      map.set(skillId, count);
    }
    return map;
  }

  /**
   * 8. Find shortest prerequisite sequence from any known skill to target skill
   */
  public async findShortestPrerequisitePath(
    knownSkillIds: string[],
    targetSkillId: string
  ): Promise<string[]> {
    if (!knownSkillIds.length || !targetSkillId) return [];
    const query = `
      MATCH (known:Skill), (target:Skill {id: $targetSkillId})
      WHERE known.id IN $knownSkillIds
      MATCH path = shortestPath((known)-[:SKILL_PREREQUISITE_OF*]->(target))
      WITH path, length(path) AS dist
      ORDER BY dist ASC
      LIMIT 1
      RETURN [n IN nodes(path) | n.id] AS skillIds
    `;
    const records = await this.runQuery(query, { knownSkillIds, targetSkillId });
    if (records.length === 0) return [];
    return this.toNativeValue(records[0].get('skillIds')) || [];
  }
}

export const recommendationRepository = new RecommendationRepository();
