import { Router } from 'express';
import {
  createClub, getClub, listClubs, updateClub, deleteClub,
  getClubActivity, getCategoryBreakdown,
} from '../controllers/club.controller.js';

export const clubRouter = Router();

clubRouter.get('/analytics/activity', getClubActivity);
clubRouter.get('/analytics/categories', getCategoryBreakdown);

clubRouter.post('/', createClub);
clubRouter.get('/', listClubs);
clubRouter.get('/:clubId', getClub);
clubRouter.put('/:clubId', updateClub);
clubRouter.delete('/:clubId', deleteClub);
