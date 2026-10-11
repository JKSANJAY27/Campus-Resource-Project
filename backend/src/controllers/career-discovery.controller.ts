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
   * Recommends multiple career roles for a persisted student profile.
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
   * Recommends multiple career roles for a raw student profile input.
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
