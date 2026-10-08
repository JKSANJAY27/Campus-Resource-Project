import { graphRepository } from '../repositories/neo4j/graph.repository.js';
import {
  SkillPrerequisiteResult,
  JobRequiredSkillsResult,
  StudentSkillResult,
  MissingSkillResult,
  CourseTeachingMissingSkillsResult,
  ProjectMatchResult,
  RelatedResourceResult,
  StudentPeerOverlapResult,
  ShortestSkillPathResult,
  DependencyPathResult,
  ConnectedOpportunitiesResult,
  AlternativeRoutesResult,
} from '../repositories/neo4j/graph.repository.js';

export class GraphService {
  public async getSkillPrerequisites(skillId: string, maxDepth: number = 5): Promise<SkillPrerequisiteResult[]> {
    if (!skillId) {
      throw Object.assign(new Error('Skill ID is required'), { status: 400 });
    }
    return graphRepository.findSkillPrerequisites(skillId, Math.min(10, Math.max(1, maxDepth)));
  }

  public async getJobRequiredSkills(jobId: string): Promise<JobRequiredSkillsResult> {
    if (!jobId) {
      throw Object.assign(new Error('Job ID is required'), { status: 400 });
    }
    const result = await graphRepository.findJobRequiredSkills(jobId);
    if (!result) {
      throw Object.assign(new Error(`Job not found with ID: ${jobId}`), { status: 404 });
    }
    return result;
  }

  public async getStudentCurrentSkills(studentId: string): Promise<StudentSkillResult[]> {
    if (!studentId) {
      throw Object.assign(new Error('Student ID is required'), { status: 400 });
    }
    return graphRepository.findStudentCurrentSkills(studentId);
  }

  public async getMissingSkills(
    studentId: string,
    targetType: 'job' | 'project' | 'skill',
    targetId: string
  ): Promise<MissingSkillResult[]> {
    if (!studentId || !targetType || !targetId) {
      throw Object.assign(new Error('studentId, targetType, and targetId are required'), { status: 400 });
    }
    if (!['job', 'project', 'skill'].includes(targetType)) {
      throw Object.assign(new Error('targetType must be one of: job, project, skill'), { status: 400 });
    }
    return graphRepository.findMissingSkills(studentId, targetType, targetId);
  }

  public async getCoursesTeachingMissingSkills(
    studentId: string,
    targetType: 'job' | 'project' | 'skill',
    targetId: string
  ): Promise<CourseTeachingMissingSkillsResult[]> {
    const missingSkills = await this.getMissingSkills(studentId, targetType, targetId);
    const missingSkillIds = missingSkills.map((s) => s.skillId);
    return graphRepository.findCoursesTeachingMissingSkills(missingSkillIds);
  }

  public async getProjectsMatchingStudentSkills(
    studentId: string,
    minMatchRatio: number = 0.0
  ): Promise<ProjectMatchResult[]> {
    if (!studentId) {
      throw Object.assign(new Error('Student ID is required'), { status: 400 });
    }
    return graphRepository.findProjectsMatchingStudentSkills(
      studentId,
      Math.min(1.0, Math.max(0.0, minMatchRatio))
    );
  }

  public async getRelatedResources(
    entityId: string,
    type: 'skill' | 'course' = 'skill'
  ): Promise<RelatedResourceResult[]> {
    if (!entityId) {
      throw Object.assign(new Error('entityId is required'), { status: 400 });
    }
    return graphRepository.findRelatedResources(entityId, type);
  }

  public async getCommonInterestsBetweenStudents(
    studentId: string,
    limit: number = 10
  ): Promise<StudentPeerOverlapResult[]> {
    if (!studentId) {
      throw Object.assign(new Error('Student ID is required'), { status: 400 });
    }
    return graphRepository.findCommonInterestsBetweenStudents(studentId, Math.min(50, Math.max(1, limit)));
  }

  public async getShortestPathBetweenSkills(
    startSkillId: string,
    endSkillId: string
  ): Promise<ShortestSkillPathResult> {
    if (!startSkillId || !endSkillId) {
      throw Object.assign(new Error('startSkillId and endSkillId are required'), { status: 400 });
    }
    const result = await graphRepository.findShortestPathBetweenSkills(startSkillId, endSkillId);
    if (!result) {
      throw Object.assign(new Error(`No path found between ${startSkillId} and ${endSkillId}`), { status: 404 });
    }
    return result;
  }

  public async getMultiHopDependencyPaths(
    entityType: 'skill' | 'course',
    id: string,
    maxHops: number = 5
  ): Promise<DependencyPathResult[]> {
    if (!entityType || !id) {
      throw Object.assign(new Error('entityType and id are required'), { status: 400 });
    }
    if (!['skill', 'course'].includes(entityType)) {
      throw Object.assign(new Error('entityType must be either skill or course'), { status: 400 });
    }
    return graphRepository.findMultiHopDependencyPaths(entityType, id, Math.min(10, Math.max(1, maxHops)));
  }

  public async getConnectedOpportunitiesAroundSkill(skillId: string): Promise<ConnectedOpportunitiesResult> {
    if (!skillId) {
      throw Object.assign(new Error('Skill ID is required'), { status: 400 });
    }
    const result = await graphRepository.findConnectedOpportunitiesAroundSkill(skillId);
    if (!result) {
      throw Object.assign(new Error(`Skill not found with ID: ${skillId}`), { status: 404 });
    }
    return result;
  }

  public async getAlternativeRoutesToTargetSkill(targetSkillId: string): Promise<AlternativeRoutesResult> {
    if (!targetSkillId) {
      throw Object.assign(new Error('Target Skill ID is required'), { status: 400 });
    }
    const result = await graphRepository.findAlternativeRoutesToTargetSkill(targetSkillId);
    if (!result) {
      throw Object.assign(new Error(`Skill not found with ID: ${targetSkillId}`), { status: 404 });
    }
    return result;
  }
}

export const graphService = new GraphService();
