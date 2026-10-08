import { Router, Request, Response } from 'express';
import { dbManager } from '../config/database.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    const report = await dbManager.getFullHealthReport();
    const statusCode = report.overall === 'healthy' ? 200 : report.overall === 'degraded' ? 207 : 503;
    res.status(statusCode).json(report);
  } catch (err: any) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      overall: 'down',
      error: err.message || 'Health check failed',
    });
  }
});

healthRouter.get('/health/mongodb', async (_req: Request, res: Response) => {
  const result = await dbManager.checkMongoHealth();
  res.status(result.status === 'connected' ? 200 : 503).json(result);
});

healthRouter.get('/health/neo4j', async (_req: Request, res: Response) => {
  const result = await dbManager.checkNeo4jHealth();
  res.status(result.status === 'connected' ? 200 : 503).json(result);
});

healthRouter.get('/health/redis', async (_req: Request, res: Response) => {
  const result = await dbManager.checkRedisHealth();
  res.status(result.status === 'connected' ? 200 : 503).json(result);
});

healthRouter.get('/health/cassandra', async (_req: Request, res: Response) => {
  const result = await dbManager.checkCassandraHealth();
  res.status(result.status === 'connected' ? 200 : 503).json(result);
});
