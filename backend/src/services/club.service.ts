import { clubRepository } from '../repositories/mongo/club.repository.js';
import { QueryOptions } from '../types/query.js';

export class ClubService {
  async createClub(data: Record<string, any>) {
    const existing = await clubRepository.findByName(data.name);
    if (existing) throw Object.assign(new Error(`Club '${data.name}' already exists`), { status: 409 });
    return clubRepository.create(data);
  }

  async getClub(clubId: string) {
    const club = await clubRepository.findById(clubId);
    if (!club) throw Object.assign(new Error('Club not found'), { status: 404 });
    return club;
  }

  async listClubs(options: QueryOptions & Record<string, any>) {
    return clubRepository.findClubs(options);
  }

  async updateClub(clubId: string, data: Record<string, any>) {
    const club = await clubRepository.update(clubId, data);
    if (!club) throw Object.assign(new Error('Club not found'), { status: 404 });
    return club;
  }

  async deleteClub(clubId: string) {
    const deleted = await clubRepository.delete(clubId);
    if (!deleted) throw Object.assign(new Error('Club not found'), { status: 404 });
    return { deleted: true };
  }

  async getClubActivity() {
    return clubRepository.getClubActivity();
  }

  async getCategoryBreakdown() {
    return clubRepository.getCategoryBreakdown();
  }
}

export const clubService = new ClubService();
