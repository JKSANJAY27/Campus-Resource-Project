import { Router } from 'express';
import {
  getAllDemos,
  getMongoSharding,
  getCassandraPartitioning,
  getCassandraReplication,
  getNeo4jIndexing,
  getMongoIndexing,
  getRedisTtl,
  getEventualConsistency,
  getDegradedService,
} from '../controllers/nosql-demo.controller.js';

export const nosqlDemoRouter = Router();

// Run all 8 demonstrations in sequence
nosqlDemoRouter.get('/', getAllDemos);

// Individual demonstration endpoints
nosqlDemoRouter.get('/mongo-sharding', getMongoSharding);
nosqlDemoRouter.get('/cassandra-partitioning', getCassandraPartitioning);
nosqlDemoRouter.get('/cassandra-replication', getCassandraReplication);
nosqlDemoRouter.get('/neo4j-indexing', getNeo4jIndexing);
nosqlDemoRouter.get('/mongo-indexing', getMongoIndexing);
nosqlDemoRouter.get('/redis-ttl', getRedisTtl);
nosqlDemoRouter.get('/eventual-consistency', getEventualConsistency);
nosqlDemoRouter.get('/degraded-service', getDegradedService);
