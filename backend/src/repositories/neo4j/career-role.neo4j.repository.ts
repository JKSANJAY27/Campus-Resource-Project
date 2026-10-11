import { BaseNeo4jRepository } from './base.neo4j.repository.js';
import { CareerRoleData, CURATED_CAREER_ROLES } from '../../constants/career-roles.data.js';

export interface RoleSkillGraphResult {
  roleId: string;
  title: string;
  category: string;
  requiredSkills: Array<{
    id: string;
    name: string;
    category: string;
    tier: string;
    prerequisites: string[];
  }>;
  preferredSkills: Array<{
    id: string;
    name: string;
    category: string;
    tier: string;
    prerequisites: string[];
  }>;
}

export interface PrerequisiteChainResult {
  skillId: string;
  prerequisiteId: string;
  prerequisiteName: string;
  prerequisiteTier: string;
  depth: number;
}

export class CareerRoleNeo4jRepository extends BaseNeo4jRepository {
  /**
   * Syncs career roles, required/preferred skill edges, and job alignments into Neo4j.
   */
  public async syncCareerRoles(roles: CareerRoleData[] = CURATED_CAREER_ROLES): Promise<void> {
    try {
      await this.withSession(async (session) => {
        // 1. Create or merge Role nodes
        await session.run(
          `UNWIND $roles AS r
           MERGE (node:Role { id: r.roleId })
           SET node.title = r.title,
               node.slug = r.slug,
               node.category = r.category,
               node.demandLevel = r.demandLevel`,
          { roles }
        );

        // 2. Connect required skills
        for (const role of roles) {
          if (role.requiredSkillIds && role.requiredSkillIds.length > 0) {
            await session.run(
              `MATCH (r:Role { id: $roleId })
               UNWIND $skillIds AS skId
               MATCH (sk:Skill { id: skId })
               MERGE (r)-[rel:ROLE_REQUIRES_SKILL]->(sk)
               SET rel.isCore = true, rel.weight = 1.0`,
              { roleId: role.roleId, skillIds: role.requiredSkillIds }
            );
          }

          // 3. Connect preferred skills
          if (role.preferredSkillIds && role.preferredSkillIds.length > 0) {
            await session.run(
              `MATCH (r:Role { id: $roleId })
               UNWIND $skillIds AS skId
               MATCH (sk:Skill { id: skId })
               MERGE (r)-[rel:ROLE_PREFERS_SKILL]->(sk)
               SET rel.isCore = false, rel.weight = 0.5`,
              { roleId: role.roleId, skillIds: role.preferredSkillIds }
            );
          }
        }

        // 4. Align jobs with roles based on title keywords or domain
        await session.run(
          `MATCH (j:Job), (r:Role)
           WHERE toLower(j.title) CONTAINS toLower(r.title)
              OR (j.preferredDomain = r.category)
           MERGE (j)-[:ALIGNED_WITH_ROLE]->(r)`
        );
      });
    } catch (err: any) {
      console.warn(`[CareerRoleNeo4jRepository] Warning during syncCareerRoles: ${err.message}`);
    }
  }

  /**
   * Fetches required and preferred skills with their graph metadata for a specific role.
   */
  public async getRoleSkillGraph(roleId: string): Promise<RoleSkillGraphResult | null> {
    const query = `
      MATCH (r:Role { id: $roleId })
      OPTIONAL MATCH (r)-[:ROLE_REQUIRES_SKILL]->(req:Skill)
      OPTIONAL MATCH (prereqReq:Skill)-[:SKILL_PREREQUISITE_OF]->(req)
      WITH r, req, collect(DISTINCT prereqReq.id) AS reqPrereqs
      WITH r, collect(DISTINCT CASE WHEN req IS NOT NULL THEN {
        id: req.id,
        name: req.name,
        category: req.category,
        tier: req.tier,
        prerequisites: reqPrereqs
      } END) AS requiredSkills
      OPTIONAL MATCH (r)-[:ROLE_PREFERS_SKILL]->(pref:Skill)
      OPTIONAL MATCH (prereqPref:Skill)-[:SKILL_PREREQUISITE_OF]->(pref)
      WITH r, requiredSkills, pref, collect(DISTINCT prereqPref.id) AS prefPrereqs
      WITH r, requiredSkills, collect(DISTINCT CASE WHEN pref IS NOT NULL THEN {
        id: pref.id,
        name: pref.name,
        category: pref.category,
        tier: pref.tier,
        prerequisites: prefPrereqs
      } END) AS preferredSkills
      RETURN r.id AS roleId, r.title AS title, r.category AS category,
             requiredSkills, preferredSkills
    `;

    try {
      const records = await this.runQuery(query, { roleId });
      if (records.length === 0) return null;

      const rec = records[0];
      const reqSkills = (this.toNativeValue(rec.get('requiredSkills')) || []).filter(Boolean);
      const prefSkills = (this.toNativeValue(rec.get('preferredSkills')) || []).filter(Boolean);

      return {
        roleId: rec.get('roleId'),
        title: rec.get('title'),
        category: rec.get('category'),
        requiredSkills: reqSkills,
        preferredSkills: prefSkills,
      };
    } catch {
      return null;
    }
  }

  /**
   * Traversing the skill DAG: identifies prerequisites of missing skills that have NOT yet been acquired.
   */
  public async findMissingPrerequisites(
    missingSkillIds: string[],
    acquiredSkillIds: string[]
  ): Promise<PrerequisiteChainResult[]> {
    if (missingSkillIds.length === 0) return [];

    const query = `
      UNWIND $missingSkillIds AS targetSkillId
      MATCH path = (prereq:Skill)-[:SKILL_PREREQUISITE_OF*1..3]->(target:Skill { id: targetSkillId })
      WHERE NOT prereq.id IN $acquiredSkillIds
      RETURN DISTINCT target.id AS skillId,
                      prereq.id AS prerequisiteId,
                      prereq.name AS prerequisiteName,
                      prereq.tier AS prerequisiteTier,
                      length(path) AS depth
      ORDER BY depth DESC, prereq.name ASC
    `;

    try {
      const records = await this.runQuery(query, { missingSkillIds, acquiredSkillIds });
      return records.map((rec) => ({
        skillId: rec.get('skillId'),
        prerequisiteId: rec.get('prerequisiteId'),
        prerequisiteName: rec.get('prerequisiteName'),
        prerequisiteTier: rec.get('prerequisiteTier') || 'foundational',
        depth: this.toNativeValue(rec.get('depth')),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Finds courses teaching any of the specified skills.
   */
  public async findCoursesTeachingSkills(skillIds: string[]): Promise<any[]> {
    if (skillIds.length === 0) return [];

    const query = `
      UNWIND $skillIds AS skId
      MATCH (c:Course)-[:COURSE_TEACHES]->(sk:Skill { id: skId })
      RETURN DISTINCT c.id AS courseId,
                      c.code AS code,
                      c.title AS title,
                      c.department AS department,
                      c.credits AS credits,
                      c.difficulty AS difficulty,
                      collect(DISTINCT sk.id) AS taughtSkillIds
      ORDER BY c.credits ASC, c.title ASC
    `;

    try {
      const records = await this.runQuery(query, { skillIds });
      return records.map((rec) => ({
        courseId: rec.get('courseId'),
        code: rec.get('code'),
        title: rec.get('title'),
        department: rec.get('department'),
        credits: this.toNativeValue(rec.get('credits')),
        difficulty: rec.get('difficulty'),
        taughtSkillIds: this.toNativeValue(rec.get('taughtSkillIds')),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Finds campus projects requiring any of the specified skills.
   */
  public async findProjectsRequiringSkills(skillIds: string[]): Promise<any[]> {
    if (skillIds.length === 0) return [];

    const query = `
      UNWIND $skillIds AS skId
      MATCH (p:Project)-[:PROJECT_REQUIRES]->(sk:Skill { id: skId })
      RETURN DISTINCT p.id AS projectId,
                      p.title AS title,
                      p.domain AS domain,
                      p.difficulty AS difficulty,
                      collect(DISTINCT sk.id) AS requiredSkillIds
      ORDER BY p.title ASC
      LIMIT 10
    `;

    try {
      const records = await this.runQuery(query, { skillIds });
      return records.map((rec) => ({
        projectId: rec.get('projectId'),
        title: rec.get('title'),
        domain: rec.get('domain'),
        difficulty: rec.get('difficulty'),
        requiredSkillIds: this.toNativeValue(rec.get('requiredSkillIds')),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Finds jobs aligned with a role.
   */
  public async findJobsForRole(roleId: string, limit = 6): Promise<any[]> {
    const query = `
      MATCH (j:Job)-[:ALIGNED_WITH_ROLE]->(r:Role { id: $roleId })
      OPTIONAL MATCH (j)-[:JOB_REQUIRES]->(sk:Skill)
      RETURN j.id AS jobId,
             j.title AS title,
             j.company AS company,
             j.type AS type,
             j.preferredDomain AS domain,
             collect(DISTINCT sk.name) AS skills
      ORDER BY j.title ASC
      LIMIT $limit
    `;

    try {
      const records = await this.runQuery(query, { roleId, limit: this.toNativeValue(limit) });
      return records.map((rec) => ({
        jobId: rec.get('jobId'),
        title: rec.get('title'),
        company: rec.get('company'),
        type: rec.get('type') || 'full_time',
        domain: rec.get('domain'),
        skills: this.toNativeValue(rec.get('skills')),
      }));
    } catch {
      return [];
    }
  }
}

export const careerRoleNeo4jRepository = new CareerRoleNeo4jRepository();
