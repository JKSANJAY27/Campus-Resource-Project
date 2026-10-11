import { Router } from 'express';
import { careerDiscoveryController } from '../controllers/career-discovery.controller.js';

export const careerDiscoveryRouter = Router();

// GET /api/v1/career-discovery/roles
careerDiscoveryRouter.get('/roles', (req, res) => careerDiscoveryController.getRoles(req, res));

// GET /api/v1/career-discovery/roles/:roleId
careerDiscoveryRouter.get('/roles/:roleId', (req, res) => careerDiscoveryController.getRoleById(req, res));

// GET /api/v1/career-discovery/roles/:roleId/jobs
careerDiscoveryRouter.get('/roles/:roleId/jobs', (req, res) => careerDiscoveryController.getJobsForRole(req, res));

// GET /api/v1/career-discovery/recommendations/:studentId
careerDiscoveryRouter.get('/recommendations/:studentId', (req, res) => careerDiscoveryController.getRecommendationsForStudent(req, res));

// POST /api/v1/career-discovery/recommendations
careerDiscoveryRouter.post('/recommendations', (req, res) => careerDiscoveryController.evaluateProfileRecommendations(req, res));
