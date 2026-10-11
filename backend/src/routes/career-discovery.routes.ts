import { Router } from 'express';
import { careerDiscoveryController } from '../controllers/career-discovery.controller.js';

export const careerDiscoveryRouter = Router();

// ─── Role Catalogue ──────────────────────────────────────────────────────────

// GET /api/v1/career-discovery/roles
careerDiscoveryRouter.get('/roles', (req, res) => careerDiscoveryController.getRoles(req, res));

// GET /api/v1/career-discovery/roles/:roleId
careerDiscoveryRouter.get('/roles/:roleId', (req, res) => careerDiscoveryController.getRoleById(req, res));

// GET /api/v1/career-discovery/roles/:roleId/jobs
careerDiscoveryRouter.get('/roles/:roleId/jobs', (req, res) => careerDiscoveryController.getJobsForRole(req, res));

// ─── A. Learning-to-Career (system recommends roles from student profile) ────

// GET /api/v1/career-discovery/recommendations/:studentId
careerDiscoveryRouter.get('/recommendations/:studentId', (req, res) =>
  careerDiscoveryController.getRecommendationsForStudent(req, res)
);

// POST /api/v1/career-discovery/recommendations  (raw profile payload)
careerDiscoveryRouter.post('/recommendations', (req, res) =>
  careerDiscoveryController.evaluateProfileRecommendations(req, res)
);

// ─── B. Career-to-Learning (student picks target role) ───────────────────────

// GET /api/v1/career-discovery/roles/:roleId/path/:studentId
careerDiscoveryRouter.get('/roles/:roleId/path/:studentId', (req, res) =>
  careerDiscoveryController.getCareerToLearningPath(req, res)
);

// POST /api/v1/career-discovery/career-to-learning  (raw profile + roleId)
careerDiscoveryRouter.post('/career-to-learning', (req, res) =>
  careerDiscoveryController.evaluateCareerToLearning(req, res)
);

// ─── Side-by-side Pathway Comparison ─────────────────────────────────────────

// POST /api/v1/career-discovery/compare
// Body: { studentId? | profile?, roleIds: string[] }
careerDiscoveryRouter.post('/compare', (req, res) => careerDiscoveryController.comparePathways(req, res));

// ─── Saved Pathways (student bookmarks) ──────────────────────────────────────

// GET  /api/v1/career-discovery/saved/:studentId
careerDiscoveryRouter.get('/saved/:studentId', (req, res) => careerDiscoveryController.getSavedPathways(req, res));

// POST /api/v1/career-discovery/saved/:studentId
// Body: { roleId, roleTitle, notes? }
careerDiscoveryRouter.post('/saved/:studentId', (req, res) => careerDiscoveryController.savePathway(req, res));

// DELETE /api/v1/career-discovery/saved/:studentId/:roleId
careerDiscoveryRouter.delete('/saved/:studentId/:roleId', (req, res) =>
  careerDiscoveryController.removeSavedPathway(req, res)
);
