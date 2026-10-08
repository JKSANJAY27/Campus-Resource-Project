import { Request, Response } from 'express';
import { nosqlDemoService } from '../services/nosql-demo.service.js';

/**
 * Phase 12 — Advanced NoSQL Demonstrations Controller
 *
 * Each endpoint runs one or all demonstration modules and returns
 * structured results with steps, metrics, and educational notes.
 */

// GET /api/v1/nosql-demos — Run all 8 demonstrations
export async function getAllDemos(_req: Request, res: Response): Promise<void> {
  try {
    const startTime = performance.now();
    const results = await nosqlDemoService.runAllDemos();
    const totalMs = Number((performance.now() - startTime).toFixed(2));

    res.json({
      success: true,
      phase: 12,
      title: 'Advanced NoSQL Demonstrations',
      totalDurationMs: totalMs,
      demoCount: results.length,
      summary: {
        actual: results.filter(r => r.category === 'actual').length,
        simulated: results.filter(r => r.category === 'simulated').length,
        hybrid: results.filter(r => r.category === 'hybrid').length,
      },
      demonstrations: results,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/v1/nosql-demos/mongo-sharding
export async function getMongoSharding(_req: Request, res: Response): Promise<void> {
  try {
    const result = await nosqlDemoService.demoMongoSharding();
    res.json({ success: true, demonstration: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/v1/nosql-demos/cassandra-partitioning
export async function getCassandraPartitioning(_req: Request, res: Response): Promise<void> {
  try {
    const result = await nosqlDemoService.demoCassandraPartitioning();
    res.json({ success: true, demonstration: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/v1/nosql-demos/cassandra-replication
export async function getCassandraReplication(_req: Request, res: Response): Promise<void> {
  try {
    const result = await nosqlDemoService.demoCassandraReplication();
    res.json({ success: true, demonstration: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/v1/nosql-demos/neo4j-indexing
export async function getNeo4jIndexing(_req: Request, res: Response): Promise<void> {
  try {
    const result = await nosqlDemoService.demoNeo4jIndexing();
    res.json({ success: true, demonstration: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/v1/nosql-demos/mongo-indexing
export async function getMongoIndexing(_req: Request, res: Response): Promise<void> {
  try {
    const result = await nosqlDemoService.demoMongoIndexing();
    res.json({ success: true, demonstration: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/v1/nosql-demos/redis-ttl
export async function getRedisTtl(_req: Request, res: Response): Promise<void> {
  try {
    const result = await nosqlDemoService.demoRedisTtlEviction();
    res.json({ success: true, demonstration: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/v1/nosql-demos/eventual-consistency
export async function getEventualConsistency(_req: Request, res: Response): Promise<void> {
  try {
    const result = await nosqlDemoService.demoEventualConsistency();
    res.json({ success: true, demonstration: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/v1/nosql-demos/degraded-service
export async function getDegradedService(_req: Request, res: Response): Promise<void> {
  try {
    const result = await nosqlDemoService.demoDegradedService();
    res.json({ success: true, demonstration: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
