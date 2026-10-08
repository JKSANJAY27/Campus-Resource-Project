import { resourceRepository } from '../repositories/mongo/resource.repository.js';
import { QueryOptions } from '../types/query.js';

export class ResourceService {
  async createResource(data: Record<string, any>) {
    return resourceRepository.create(data);
  }

  async getResource(resourceId: string) {
    const resource = await resourceRepository.findById(resourceId);
    if (!resource) throw Object.assign(new Error('Resource not found'), { status: 404 });
    return resource;
  }

  async listResources(options: QueryOptions & Record<string, any>) {
    return resourceRepository.findResources(options);
  }

  async updateResource(resourceId: string, data: Record<string, any>) {
    const resource = await resourceRepository.update(resourceId, data);
    if (!resource) throw Object.assign(new Error('Resource not found'), { status: 404 });
    return resource;
  }

  async deleteResource(resourceId: string) {
    const deleted = await resourceRepository.delete(resourceId);
    if (!deleted) throw Object.assign(new Error('Resource not found'), { status: 404 });
    return { deleted: true };
  }

  /** Track access: increment counter and return the resource */
  async trackAccess(resourceId: string) {
    const resource = await resourceRepository.findById(resourceId);
    if (!resource) throw Object.assign(new Error('Resource not found'), { status: 404 });
    await resourceRepository.incrementAccessCount(resourceId);
    return resource;
  }

  async rateResource(resourceId: string, rating: number) {
    if (rating < 1 || rating > 5) {
      throw Object.assign(new Error('Rating must be between 1 and 5'), { status: 400 });
    }
    const resource = await resourceRepository.updateRating(resourceId, rating);
    if (!resource) throw Object.assign(new Error('Resource not found'), { status: 404 });
    return resource;
  }

  async getPopularResources(limit = 10) {
    return resourceRepository.getPopularResources(limit);
  }

  async getTypeDistribution() {
    return resourceRepository.getTypeDistribution();
  }

  async getSkillCoverage(limit = 20) {
    return resourceRepository.getSkillCoverage(limit);
  }
}

export const resourceService = new ResourceService();
