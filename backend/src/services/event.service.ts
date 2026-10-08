import { eventRepository } from '../repositories/mongo/event.repository.js';
import { facilityRepository } from '../repositories/mongo/facility.repository.js';
import { QueryOptions } from '../types/query.js';

export class EventService {
  async createEvent(data: Record<string, any>) {
    // Validate facility exists and has enough capacity
    if (data.venueFacilityId) {
      const facility = await facilityRepository.findById(data.venueFacilityId);
      if (!facility) {
        throw Object.assign(new Error(`Facility '${data.venueFacilityId}' not found`), { status: 404 });
      }
      if (data.capacity && data.capacity > facility.capacity) {
        throw Object.assign(
          new Error(`Event capacity (${data.capacity}) exceeds facility capacity (${facility.capacity})`),
          { status: 400 }
        );
      }
    }
    return eventRepository.create(data);
  }

  async getEvent(eventId: string) {
    const event = await eventRepository.findById(eventId);
    if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });
    return event;
  }

  async listEvents(options: QueryOptions & Record<string, any>) {
    return eventRepository.findEvents(options);
  }

  async updateEvent(eventId: string, data: Record<string, any>) {
    const event = await eventRepository.update(eventId, data);
    if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });
    return event;
  }

  async deleteEvent(eventId: string) {
    const deleted = await eventRepository.delete(eventId);
    if (!deleted) throw Object.assign(new Error('Event not found'), { status: 404 });
    return { deleted: true };
  }

  async getEventParticipation(limit = 20) {
    return eventRepository.getEventParticipation(limit);
  }

  async getTypeDistribution() {
    return eventRepository.getTypeDistribution();
  }

  async getMonthlySchedule() {
    return eventRepository.getMonthlySchedule();
  }
}

export const eventService = new EventService();
