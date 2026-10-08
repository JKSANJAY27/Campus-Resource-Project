import { BaseNeo4jRepository } from './base.neo4j.repository.js';

export interface SyncStats {
  nodesSynced: number;
  relationshipsSynced: number;
}

export class SyncNeo4jRepository extends BaseNeo4jRepository {
  /**
   * Idempotently syncs a Student node using MERGE
   */
  public async syncStudentNode(student: {
    studentId: string;
    rollNumber: string;
    name: string;
    department: string;
    currentSemester: number;
    cgpa: number;
  }): Promise<void> {
    const query = `
      MERGE (s:Student {id: $id})
      SET s.rollNumber = $rollNumber,
          s.name = $name,
          s.department = $department,
          s.semester = $semester,
          s.cgpa = $cgpa;
    `;
    await this.runQuery(query, {
      id: student.studentId,
      rollNumber: student.rollNumber,
      name: student.name,
      department: student.department,
      semester: student.currentSemester,
      cgpa: student.cgpa,
    });
  }

  /**
   * Idempotently syncs a Student's skill relationships
   */
  public async syncStudentSkills(
    studentId: string,
    skills: Array<{ skillId: string; level: string }>
  ): Promise<void> {
    const query = `
      MATCH (s:Student {id: $studentId})
      OPTIONAL MATCH (s)-[r:STUDENT_HAS_SKILL]->()
      DELETE r
      WITH s
      UNWIND $skills AS item
      MATCH (sk:Skill {id: item.skillId})
      MERGE (s)-[:STUDENT_HAS_SKILL {level: item.level}]->(sk);
    `;
    await this.runQuery(query, { studentId, skills });
  }

  /**
   * Idempotently adds a single skill relationship to Student
   */
  public async addStudentSkillRelationship(
    studentId: string,
    skillId: string,
    level: string
  ): Promise<void> {
    const query = `
      MATCH (s:Student {id: $studentId}), (sk:Skill {id: $skillId})
      MERGE (s)-[r:STUDENT_HAS_SKILL]->(sk)
      SET r.level = $level;
    `;
    await this.runQuery(query, { studentId, skillId, level });
  }

  /**
   * Idempotently syncs a Student's completed course relationships
   */
  public async syncStudentCompletedCourses(
    studentId: string,
    completedCourses: Array<{ courseId: string; grade: string }>
  ): Promise<void> {
    const query = `
      MATCH (s:Student {id: $studentId})
      OPTIONAL MATCH (s)-[r:STUDENT_COMPLETED]->()
      DELETE r
      WITH s
      UNWIND $courses AS item
      MATCH (c:Course {id: item.courseId})
      MERGE (s)-[:STUDENT_COMPLETED {grade: item.grade}]->(c);
    `;
    await this.runQuery(query, { studentId, courses: completedCourses });
  }

  /**
   * Idempotently records a single completed course relationship
   */
  public async addStudentCompletedCourseRelationship(
    studentId: string,
    courseId: string,
    grade: string
  ): Promise<void> {
    const query = `
      MATCH (s:Student {id: $studentId}), (c:Course {id: $courseId})
      MERGE (s)-[r:STUDENT_COMPLETED]->(c)
      SET r.grade = $grade;
    `;
    await this.runQuery(query, { studentId, courseId, grade });
  }

  /**
   * Idempotently records a student club membership relationship
   */
  public async addStudentClubRelationship(
    studentId: string,
    clubId: string,
    role: string
  ): Promise<void> {
    const query = `
      MATCH (s:Student {id: $studentId}), (cl:Club {id: $clubId})
      MERGE (s)-[r:STUDENT_MEMBER_OF]->(cl)
      SET r.role = $role;
    `;
    await this.runQuery(query, { studentId, clubId, role });
  }

  /**
   * Idempotently records student event attendance
   */
  public async addStudentEventAttendanceRelationship(
    studentId: string,
    eventId: string
  ): Promise<void> {
    const query = `
      MATCH (s:Student {id: $studentId}), (e:Event {id: $eventId})
      MERGE (s)-[:STUDENT_ATTENDS]->(e);
    `;
    await this.runQuery(query, { studentId, eventId });
  }

  /**
   * Idempotently syncs a Course node and its taught skills / prerequisite courses
   */
  public async syncCourseNode(course: {
    courseId: string;
    code: string;
    title: string;
    department: string;
    credits: number;
    difficulty: string;
    taughtSkillIds?: string[];
    prerequisiteCourseIds?: string[];
  }): Promise<void> {
    const query = `
      MERGE (c:Course {id: $id})
      SET c.code = $code,
          c.title = $title,
          c.department = $department,
          c.credits = $credits,
          c.difficulty = $difficulty;
    `;
    await this.runQuery(query, {
      id: course.courseId,
      code: course.code,
      title: course.title,
      department: course.department,
      credits: course.credits,
      difficulty: course.difficulty,
    });

    if (course.taughtSkillIds && course.taughtSkillIds.length > 0) {
      const qTaught = `
        MATCH (c:Course {id: $courseId})
        UNWIND $skillIds AS skId
        MATCH (sk:Skill {id: skId})
        MERGE (c)-[:COURSE_TEACHES]->(sk);
      `;
      await this.runQuery(qTaught, { courseId: course.courseId, skillIds: course.taughtSkillIds });
    }

    if (course.prerequisiteCourseIds && course.prerequisiteCourseIds.length > 0) {
      const qPrereq = `
        MATCH (c:Course {id: $courseId})
        UNWIND $prereqIds AS reqId
        MATCH (req:Course {id: reqId})
        MERGE (c)-[:COURSE_REQUIRES]->(req);
      `;
      await this.runQuery(qPrereq, { courseId: course.courseId, prereqIds: course.prerequisiteCourseIds });
    }
  }

  /**
   * Idempotently syncs a Skill node and its prerequisite skill relationships
   */
  public async syncSkillNode(skill: {
    skillId: string;
    name: string;
    category: string;
    tier: string;
    prerequisiteSkillIds?: string[];
  }): Promise<void> {
    const query = `
      MERGE (sk:Skill {id: $id})
      SET sk.name = $name,
          sk.category = $category,
          sk.tier = $tier;
    `;
    await this.runQuery(query, {
      id: skill.skillId,
      name: skill.name,
      category: skill.category,
      tier: skill.tier,
    });

    if (skill.prerequisiteSkillIds && skill.prerequisiteSkillIds.length > 0) {
      const qPrereq = `
        MATCH (child:Skill {id: $childId})
        UNWIND $prereqIds AS pId
        MATCH (parent:Skill {id: pId})
        MERGE (parent)-[:SKILL_PREREQUISITE_OF]->(child);
      `;
      await this.runQuery(qPrereq, { childId: skill.skillId, prereqIds: skill.prerequisiteSkillIds });
    }
  }

  /**
   * Idempotently syncs a Project node and required skills
   */
  public async syncProjectNode(project: {
    projectId: string;
    title: string;
    domain: string;
    difficulty: string;
    requiredSkillIds?: string[];
  }): Promise<void> {
    const query = `
      MERGE (p:Project {id: $id})
      SET p.title = $title,
          p.domain = $domain,
          p.difficulty = $difficulty;
    `;
    await this.runQuery(query, {
      id: project.projectId,
      title: project.title,
      domain: project.domain,
      difficulty: project.difficulty,
    });

    if (project.requiredSkillIds && project.requiredSkillIds.length > 0) {
      const qReq = `
        MATCH (p:Project {id: $projectId})
        UNWIND $skillIds AS skId
        MATCH (sk:Skill {id: skId})
        MERGE (p)-[:PROJECT_REQUIRES]->(sk);
      `;
      await this.runQuery(qReq, { projectId: project.projectId, skillIds: project.requiredSkillIds });
    }
  }

  /**
   * Idempotently syncs a Job node and demanded skills
   */
  public async syncJobNode(job: {
    jobId: string;
    title: string;
    company: string;
    jobType: string;
    preferredDomain: string;
    demandedSkillIds?: string[];
  }): Promise<void> {
    const query = `
      MERGE (j:Job {id: $id})
      SET j.title = $title,
          j.company = $company,
          j.type = $type,
          j.preferredDomain = $preferredDomain;
    `;
    await this.runQuery(query, {
      id: job.jobId,
      title: job.title,
      company: job.company,
      type: job.jobType,
      preferredDomain: job.preferredDomain,
    });

    if (job.demandedSkillIds && job.demandedSkillIds.length > 0) {
      const qDem = `
        MATCH (j:Job {id: $jobId})
        UNWIND $skillIds AS skId
        MATCH (sk:Skill {id: skId})
        MERGE (j)-[:JOB_REQUIRES]->(sk);
      `;
      await this.runQuery(qDem, { jobId: job.jobId, skillIds: job.demandedSkillIds });
    }
  }

  /**
   * Deletes an entity node and its connected relationships from Neo4j
   */
  public async deleteEntityNode(label: string, id: string): Promise<void> {
    const query = `
      MATCH (n:${label} {id: $id})
      DETACH DELETE n;
    `;
    await this.runQuery(query, { id });
  }
}

export const syncNeo4jRepository = new SyncNeo4jRepository();
