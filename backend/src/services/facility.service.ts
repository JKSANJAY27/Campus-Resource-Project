import { facilityRepository } from '../repositories/mongo/facility.repository.js';
import { QueryOptions } from '../types/query.js';

export class FacilityService {
  async createFacility(data: Record<string, any>) {
    return facilityRepository.create(data);
  }

  async getFacility(facilityId: string) {
    const facility = await facilityRepository.findById(facilityId);
    if (!facility) throw Object.assign(new Error('Facility not found'), { status: 404 });
    return facility;
  }

  async listFacilities(options: QueryOptions & Record<string, any>) {
    return facilityRepository.findFacilities(options);
  }

  async updateFacility(facilityId: string, data: Record<string, any>) {
    const facility = await facilityRepository.update(facilityId, data);
    if (!facility) throw Object.assign(new Error('Facility not found'), { status: 404 });
    return facility;
  }

  async deleteFacility(facilityId: string) {
    const deleted = await facilityRepository.delete(facilityId);
    if (!deleted) throw Object.assign(new Error('Facility not found'), { status: 404 });
    return { deleted: true };
  }

  async findAvailableForEvent(requiredCapacity: number) {
    if (requiredCapacity < 1) {
      throw Object.assign(new Error('Required capacity must be at least 1'), { status: 400 });
    }
    return facilityRepository.findAvailableForEvent(requiredCapacity);
  }

  async getFacilityUsage() {
    return facilityRepository.getFacilityUsage();
  }

  async getTypeSummary() {
    return facilityRepository.getTypeSummary();
  }
}

export const facilityService = new FacilityService();
