import { Request, Response } from 'express';
import { careerDiscoveryService } from '../services/career-discovery.service.js';
import { careerRoleRepository } from '../repositories/mongo/career-role.repository.js';
import { careerRoleNeo4jRepository } from '../repositories/neo4j/career-role.neo4j.repository.js';
import { CURATED_CAREER_ROLES } from '../constants/career-roles.data.js';

export class CareerDiscoveryController {
  /**
   * GET /api/v1/career-discovery/roles
   * Returns full catalogue of technical career roles.
   */
  public async getRoles(req: Request, res: Response): Promise<void> {
    try {
      const roles = await careerDiscoveryService.loadAllRoles();
      res.json({
        success: true,
        count: roles.length,
        roles,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve career roles catalogue',
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/career-discovery/roles/:roleId
   * Returns details of a specific role.
   */
  public async getRoleById(req: Request, res: Response): Promise<void> {
    try {
      const { roleId } = req.params;
      const allRoles = await careerDiscoveryService.loadAllRoles();
      const role = allRoles.find((r) => r.roleId === roleId || r.slug === roleId);

      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Career role not found',
          message: `No role matching identifier '${roleId}'`,
        });
        return;
      }

      res.json({
        success: true,
        role,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve career role',
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/career-discovery/recommendations/:studentId
   * Learning-to-Career: Recommends multiple career roles for a persisted student profile.
   */
  public async getRecommendationsForStudent(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const result = await careerDiscoveryService.discoverRolesForStudent(studentId);
      res.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        success: false,
        error: 'Failed to evaluate career recommendations',
        message: err.message,
      });
    }
  }

  /**
   * POST /api/v1/career-discovery/recommendations
   * Learning-to-Career: Recommends multiple career roles for a raw student profile input.
   */
  public async evaluateProfileRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const profile = req.body;
      if (!profile || typeof profile !== 'object') {
        res.status(400).json({
          success: false,
          error: 'Invalid Request',
          message: 'Student profile payload is required.',
        });
        return;
      }

      const result = await careerDiscoveryService.discoverRolesForStudent(profile);
      res.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        success: false,
        error: 'Failed to evaluate career recommendations',
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/career-discovery/roles/:roleId/path/:studentId
   * Career-to-Learning: Returns a personalised learning path for a specific target role and student.
   */
  public async getCareerToLearningPath(req: Request, res: Response): Promise<void> {
    try {
      const { roleId, studentId } = req.params;
      const result = await careerDiscoveryService.getCareerToLearningPath(studentId, roleId);
      res.json({
        success: true,
        mode: 'career-to-learning',
        ...result,
      });
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        success: false,
        error: 'Failed to generate career-to-learning path',
        message: err.message,
      });
    }
  }

  /**
   * POST /api/v1/career-discovery/career-to-learning
   * Career-to-Learning with raw profile payload.
   * Body: { profile: StudentProfileInput, roleId: string }
   */
  public async evaluateCareerToLearning(req: Request, res: Response): Promise<void> {
    try {
      const { profile, roleId } = req.body ?? {};
      if (!profile || !roleId) {
        res.status(400).json({
          success: false,
          error: 'Invalid Request',
          message: 'Both profile (StudentProfileInput) and roleId are required.',
        });
        return;
      }

      const result = await careerDiscoveryService.getCareerToLearningPath(profile, roleId);
      res.json({
        success: true,
        mode: 'career-to-learning',
        ...result,
      });
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        success: false,
        error: 'Failed to evaluate career-to-learning path',
        message: err.message,
      });
    }
  }

  /**
   * POST /api/v1/career-discovery/compare
   * Compares 2-5 target roles side by side for a given student.
   * Body: { studentId?: string, profile?: StudentProfileInput, roleIds: string[] }
   */
  public async comparePathways(req: Request, res: Response): Promise<void> {
    try {
      const { studentId, profile, roleIds } = req.body ?? {};

      if (!Array.isArray(roleIds) || roleIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid Request',
          message: 'roleIds array is required and must contain at least 1 entry.',
        });
        return;
      }

      const input = studentId ?? profile;
      if (!input) {
        res.status(400).json({
          success: false,
          error: 'Invalid Request',
          message: 'Either studentId or a profile payload is required.',
        });
        return;
      }

      const result = await careerDiscoveryService.comparePathways(input, roleIds);
      res.json({
        success: true,
        mode: 'comparison',
        ...result,
      });
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        success: false,
        error: 'Failed to compare career pathways',
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/career-discovery/saved/:studentId
   * Returns all pathways saved by a student.
   */
  public async getSavedPathways(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const pathways = await careerDiscoveryService.getSavedPathways(studentId);
      res.json({
        success: true,
        studentId,
        count: pathways.length,
        pathways,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve saved pathways',
        message: err.message,
      });
    }
  }

  /**
   * POST /api/v1/career-discovery/saved/:studentId
   * Saves a career pathway to a student's profile.
   * Body: { roleId: string, roleTitle: string, notes?: string }
   */
  public async savePathway(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const { roleId, roleTitle, notes } = req.body ?? {};

      if (!roleId || !roleTitle) {
        res.status(400).json({
          success: false,
          error: 'Invalid Request',
          message: 'roleId and roleTitle are required.',
        });
        return;
      }

      const result = await careerDiscoveryService.savePathway(studentId, roleId, roleTitle, notes);
      res.json({
        success: true,
        studentId,
        ...result,
      });
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        success: false,
        error: 'Failed to save career pathway',
        message: err.message,
      });
    }
  }

  /**
   * DELETE /api/v1/career-discovery/saved/:studentId/:roleId
   * Removes a previously saved pathway from a student's profile.
   */
  public async removeSavedPathway(req: Request, res: Response): Promise<void> {
    try {
      const { studentId, roleId } = req.params;
      const result = await careerDiscoveryService.removeSavedPathway(studentId, roleId);
      res.json({
        success: true,
        studentId,
        ...result,
      });
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        success: false,
        error: 'Failed to remove saved pathway',
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/career-discovery/roles/:roleId/jobs
   * Returns active jobs aligned with the career role.
   */
  public async getJobsForRole(req: Request, res: Response): Promise<void> {
    try {
      const { roleId } = req.params;
      const allRoles = await careerDiscoveryService.loadAllRoles();
      const role = allRoles.find((r) => r.roleId === roleId || r.slug === roleId);

      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Role not found',
        });
        return;
      }

      const graphJobs = await careerRoleNeo4jRepository.findJobsForRole(role.roleId);
      res.json({
        success: true,
        roleId: role.roleId,
        roleTitle: role.title,
        jobs: graphJobs,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch jobs for role',
        message: err.message,
      });
    }
  }
}

export const careerDiscoveryController = new CareerDiscoveryController();
