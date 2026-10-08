import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.routes.js';
import { studentRouter } from './routes/student.routes.js';
import { courseRouter } from './routes/course.routes.js';
import { skillRouter } from './routes/skill.routes.js';
import { projectRouter } from './routes/project.routes.js';
import { jobRouter } from './routes/job.routes.js';
import { resourceRouter } from './routes/resource.routes.js';
import { clubRouter } from './routes/club.routes.js';
import { eventRouter } from './routes/event.routes.js';
import { facilityRouter } from './routes/facility.routes.js';
import { graphRouter } from './routes/graph.routes.js';
import { recommendationRouter } from './routes/recommendation.routes.js';
import { cacheRouter } from './routes/cache.routes.js';
import { activityRouter } from './routes/activity.routes.js';
import { syncRouter } from './routes/sync.routes.js';
import { benchmarkRouter } from './routes/benchmark.routes.js';
import { nosqlDemoRouter } from './routes/nosql-demo.routes.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';

export const createApp = (): Express => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request latency / observability middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();
    res.on('finish', () => {
      const durationMs = (performance.now() - start).toFixed(2);
      if (req.path !== '/api/v1/health') {
        console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`);
      }
    });
    next();
  });

  // Base info route
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'Campus Resource Dependency & Recommendation Graph API',
      version: '1.0.0',
      status: 'online',
      endpoints: {
        health: '/api/v1/health',
        students: '/api/v1/students',
        courses: '/api/v1/courses',
        skills: '/api/v1/skills',
        projects: '/api/v1/projects',
        jobs: '/api/v1/jobs',
        resources: '/api/v1/resources',
        clubs: '/api/v1/clubs',
        events: '/api/v1/events',
        facilities: '/api/v1/facilities',
        graph: '/api/v1/graph',
        recommendations: '/api/v1/recommendations',
        cache: '/api/v1/cache',
        activity: '/api/v1/activity',
        sync: '/api/v1/sync',
        benchmarks: '/api/v1/benchmarks',
        nosqlDemos: '/api/v1/nosql-demos',
      },
    });
  });

  // API Routes
  app.use('/api/v1', healthRouter);
  app.use('/api/v1/students', studentRouter);
  app.use('/api/v1/courses', courseRouter);
  app.use('/api/v1/skills', skillRouter);
  app.use('/api/v1/projects', projectRouter);
  app.use('/api/v1/jobs', jobRouter);
  app.use('/api/v1/resources', resourceRouter);
  app.use('/api/v1/clubs', clubRouter);
  app.use('/api/v1/events', eventRouter);
  app.use('/api/v1/facilities', facilityRouter);
  app.use('/api/v1/graph', graphRouter);
  app.use('/api/v1/recommendations', apiRateLimiter, recommendationRouter);
  app.use('/api/v1/cache', cacheRouter);
  app.use('/api/v1/activity', activityRouter);
  app.use('/api/v1/sync', syncRouter);
  app.use('/api/v1/benchmarks', benchmarkRouter);
  app.use('/api/v1/nosql-demos', nosqlDemoRouter);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `Endpoint ${req.method} ${req.path} does not exist.`,
    });
  });

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Unhandled Exception]:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.name || 'InternalServerError',
      message: err.message || 'An unexpected error occurred.',
    });
  });

  return app;
};
