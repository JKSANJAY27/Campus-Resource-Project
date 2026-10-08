import { skillRepository } from '../repositories/mongo/skill.repository.js';
import { QueryOptions } from '../types/query.js';

export class SkillService {
  async createSkill(data: Record<string, any>) {
    const existing = await skillRepository.findByName(data.name);
    if (existing) throw Object.assign(new Error(`Skill '${data.name}' already exists`), { status: 409 });
    return skillRepository.create(data);
  }

  async getSkill(skillId: string) {
    const skill = await skillRepository.findById(skillId);
    if (!skill) throw Object.assign(new Error('Skill not found'), { status: 404 });
    return skill;
  }

  async listSkills(options: QueryOptions & Record<string, any>) {
    return skillRepository.findSkills(options);
  }

  async updateSkill(skillId: string, data: Record<string, any>) {
    const skill = await skillRepository.update(skillId, data);
    if (!skill) throw Object.assign(new Error('Skill not found'), { status: 404 });
    return skill;
  }

  async deleteSkill(skillId: string) {
    const deleted = await skillRepository.delete(skillId);
    if (!deleted) throw Object.assign(new Error('Skill not found'), { status: 404 });
    return { deleted: true };
  }

  async getPrerequisiteTree(skillId: string) {
    await this.getSkill(skillId); // throws 404 if not found
    return skillRepository.getPrerequisiteTree(skillId);
  }

  async getDependents(skillId: string) {
    await this.getSkill(skillId);
    return skillRepository.findDependents(skillId);
  }

  async getSkillDemand(limit = 20) {
    return skillRepository.getSkillDemand(limit);
  }

  async getCategoryTierMatrix() {
    return skillRepository.getCategoryTierMatrix();
  }
}

export const skillService = new SkillService();
