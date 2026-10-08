import { Router } from 'express';
import {
  createEvent, getEvent, listEvents, updateEvent, deleteEvent,
  getEventParticipation, getTypeDistribution, getMonthlySchedule,
} from '../controllers/event.controller.js';

export const eventRouter = Router();

eventRouter.get('/analytics/participation', getEventParticipation);
eventRouter.get('/analytics/type-distribution', getTypeDistribution);
eventRouter.get('/analytics/monthly-schedule', getMonthlySchedule);

eventRouter.post('/', createEvent);
eventRouter.get('/', listEvents);
eventRouter.get('/:eventId', getEvent);
eventRouter.put('/:eventId', updateEvent);
eventRouter.delete('/:eventId', deleteEvent);
