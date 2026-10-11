import { Router } from 'express';
import { getJobsForRoleHandler } from '../controllers/external-job.controller.js';
import { CURATED_CAREER_ROLES } from '../constants/career-roles.data.js';

export const roleRouter = Router();

/**
 * GET /api/roles/:roleId/jobs & /api/v1/roles/:roleId/jobs
 * Tailored external job listings for a specific career role.
 */
roleRouter.get('/:roleId/jobs', getJobsForRoleHandler);

/**
 * GET /api/roles/:roleId & /api/v1/roles/:roleId
 */
roleRouter.get('/:roleId', (req, res) => {
  const { roleId } = req.params;
  const match = CURATED_CAREER_ROLES.find(
    (r) => r.roleId.toLowerCase() === roleId.toLowerCase() || r.slug.toLowerCase() === roleId.toLowerCase()
  );
  if (!match) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `Role "${roleId}" not found in catalogue.`,
    });
  }
  res.status(200).json({ success: true, role: match });
});

/**
 * GET /api/roles & /api/v1/roles
 */
roleRouter.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    count: CURATED_CAREER_ROLES.length,
    roles: CURATED_CAREER_ROLES,
  });
});
