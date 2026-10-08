import { Request, Response } from 'express';
import { eventService } from '../services/event.service.js';
import { asyncHandler, ok, paginated, parseQueryOptions } from './helpers.js';

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await eventService.createEvent(req.body), 'Event created', 201);
});

export const getEvent = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await eventService.getEvent(req.params.eventId));
});

export const listEvents = asyncHandler(async (req: Request, res: Response) => {
  const opts = {
    ...parseQueryOptions(req),
    eventType: req.query.eventType as string | undefined,
    clubId: req.query.clubId as string | undefined,
    facilityId: req.query.facilityId as string | undefined,
    skillId: req.query.skillId as string | undefined,
    upcoming: req.query.upcoming === 'true',
    fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
    toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
  };
  paginated(res, await eventService.listEvents(opts));
});

export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await eventService.updateEvent(req.params.eventId, req.body), 'Event updated');
});

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await eventService.deleteEvent(req.params.eventId), 'Event deleted');
});

export const getEventParticipation = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await eventService.getEventParticipation(req.query.limit ? Number(req.query.limit) : 20));
});

export const getTypeDistribution = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await eventService.getTypeDistribution());
});

export const getMonthlySchedule = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await eventService.getMonthlySchedule());
});
