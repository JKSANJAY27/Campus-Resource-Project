import { projectRepository } from '../repositories/mongo/project.repository.js';
import { QueryOptions } from '../types/query.js';

export class ProjectService {
  async createProject(data: Record<string, any>) {
    return projectRepository.create(data);
  }

  async getProject(projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
    return project;
  }

  async listProjects(options: QueryOptions & Record<string, any>) {
    return projectRepository.findProjects(options);
  }

  async updateProject(projectId: string, data: Record<string, any>) {
    const project = await projectRepository.update(projectId, data);
    if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
    return project;
  }

  async deleteProject(projectId: string) {
    const deleted = await projectRepository.delete(projectId);
    if (!deleted) throw Object.assign(new Error('Project not found'), { status: 404 });
    return { deleted: true };
  }

  async getQualifiedProjects(studentSkillIds: string[], limit = 10) {
    return projectRepository.findQualifiedProjects(studentSkillIds, limit);
  }

  async getProjectStats() {
    return projectRepository.getProjectStats();
  }

  async getTechnologyUsage(limit = 20) {
    return projectRepository.getTechnologyUsage(limit);
  }

  async getStudentParticipation(limit = 10) {
    return projectRepository.getStudentParticipation(limit);
  }
}

export const projectService = new ProjectService();
