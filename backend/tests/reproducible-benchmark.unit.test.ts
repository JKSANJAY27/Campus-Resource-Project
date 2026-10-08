import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReproducibleBenchmarkRunner } from '../src/benchmark/runner.js';
import {
  runMongoIndexedLookup,
  runMongoNonIndexedLookup,
  runMongoAggregationQuery,
} from '../src/benchmark/workloads/mongo.workload.js';
import {
  runNeo4j1HopTraversal,
  runNeo4j2HopTraversal,
  runNeo4j3HopTraversal,
  runNeo4jShortestPath,
  runNeo4jRecommendationQuery,
} from '../src/benchmark/workloads/neo4j.workload.js';
import {
  runRedisCachedRequest,
  runRedisUncachedRequest,
  runRedisCacheHit,
  runRedisCacheMiss,
} from '../src/benchmark/workloads/redis.workload.js';
import {
  runCassandraPointPartitionQuery,
  runCassandraTimeRangeQuery,
  runCassandraLargerResultRetrieval,
} from '../src/benchmark/workloads/cassandra.workload.js';
import {
  runAppRecommendationLatency,
  runAppSkillGapLatency,
  runAppLearningPathLatency,
} from '../src/benchmark/workloads/application.workload.js';

describe('Phase 11: Reproducible Multi-Model NoSQL Performance Benchmarks - Unit Tests', () => {
  let runner: ReproducibleBenchmarkRunner;

  beforeEach(() => {
    vi.clearAllMocks();
    runner = new ReproducibleBenchmarkRunner();
  });

  // =========================================================================
  // 1. Warmup Isolation & Statistical Consistency
  // =========================================================================
  describe('Warmup Isolation & Statistical Calculations', () => {
    it('should separate warmup runs from measured runs and return exact measured count', async () => {
      const result = await runMongoIndexedLookup('10K', 15, 5);

      expect(result.runs).toBe(15);
      expect(result.warmupRuns).toBe(5);
      expect(result.minMs).toBeGreaterThan(0);
      expect(result.maxMs).toBeGreaterThanOrEqual(result.minMs);
      expect(result.avgMs).toBeGreaterThan(0);
      expect(result.medianMs).toBeGreaterThan(0);
      expect(result.p95Ms).toBeGreaterThanOrEqual(result.medianMs);
      expect(result.throughputOpsSec).toBeGreaterThan(0);
    });

    it('should handle scale tiers (1K, 5K, 10K, 50K, 100K) appropriately', async () => {
      const scale1K = await runMongoNonIndexedLookup('1K', 5, 2);
      const scale100K = await runMongoNonIndexedLookup('100K', 5, 2);

      expect(scale1K.datasetScale).toBe('1K');
      expect(scale100K.datasetScale).toBe('100K');
      // Collection scan O(N) at 100K should take significantly longer than 1K
      expect(scale100K.medianMs).toBeGreaterThan(scale1K.medianMs * 5);
    });
  });

  // =========================================================================
  // 2. A. MongoDB Workloads
  // =========================================================================
  describe('A. MongoDB Workload Scenarios', () => {
    it('should benchmark indexed point seek vs non-indexed collection scan', async () => {
      const indexed = await runMongoIndexedLookup('10K', 10, 3);
      const scan = await runMongoNonIndexedLookup('10K', 10, 3);
      const agg = await runMongoAggregationQuery('10K', 10, 3);

      expect(indexed.database).toBe('MongoDB');
      expect(scan.database).toBe('MongoDB');
      expect(agg.database).toBe('MongoDB');

      // Indexed B-tree point query must be significantly faster than full collection scan
      expect(indexed.medianMs).toBeLessThan(scan.medianMs);
    });
  });

  // =========================================================================
  // 3. B. Neo4j Traversal Scaling
  // =========================================================================
  describe('B. Neo4j Graph Traversal Scenarios', () => {
    it('should benchmark 1-hop, 2-hop, 3-hop, shortest-path, and recommendation queries', async () => {
      const hop1 = await runNeo4j1HopTraversal('10K', 5, 2);
      const hop2 = await runNeo4j2HopTraversal('10K', 5, 2);
      const hop3 = await runNeo4j3HopTraversal('10K', 5, 2);
      const sp = await runNeo4jShortestPath('10K', 5, 2);
      const rec = await runNeo4jRecommendationQuery('10K', 5, 2);

      expect(hop1.operation).toContain('1-Hop');
      expect(hop2.operation).toContain('2-Hop');
      expect(hop3.operation).toContain('3-Hop');
      expect(sp.operation).toContain('Shortest Path');
      expect(rec.operation).toContain('Recommendation Query');

      // Traversal latency increases with hop depth: 1-hop < 2-hop < 3-hop
      expect(hop1.medianMs).toBeLessThanOrEqual(hop2.medianMs);
      expect(hop2.medianMs).toBeLessThanOrEqual(hop3.medianMs);
    });
  });

  // =========================================================================
  // 4. C. Redis Caching Workloads
  // =========================================================================
  describe('C. Redis Caching Scenarios', () => {
    it('should benchmark cached vs uncached requests and warm hits vs cold misses', async () => {
      const cached = await runRedisCachedRequest('10K', 5, 2);
      const uncached = await runRedisUncachedRequest('10K', 5, 2);
      const hit = await runRedisCacheHit('10K', 5, 2);
      const miss = await runRedisCacheMiss('10K', 5, 2);

      expect(cached.medianMs).toBeLessThan(1.5);
      expect(hit.medianMs).toBeLessThan(2.0);
      // In-memory hit must be dramatically faster than uncached DB query or cold miss
      expect(cached.medianMs).toBeLessThan(uncached.medianMs);
      expect(hit.medianMs).toBeLessThan(miss.medianMs);
    });
  });

  // =========================================================================
  // 5. D. Cassandra Partition Workloads
  // =========================================================================
  describe('D. Cassandra Wide-Column Partition Scenarios', () => {
    it('should benchmark point partition queries, time-range queries, and larger retrievals', async () => {
      const point = await runCassandraPointPartitionQuery('10K', 5, 2);
      const range = await runCassandraTimeRangeQuery('10K', 5, 2);
      const large = await runCassandraLargerResultRetrieval('10K', 5, 2);

      expect(point.operation).toContain('Point Partition');
      expect(range.operation).toContain('Time-Range');
      expect(large.operation).toContain('Large Partition');

      // Point query takes less time than large 500-row scan
      expect(point.medianMs).toBeLessThanOrEqual(large.medianMs);
    });
  });

  // =========================================================================
  // 6. E. Application Engine Recommendation Workloads
  // =========================================================================
  describe('E. Application Recommendation Scenarios', () => {
    it('should measure recommendation, skill-gap, and learning-path pipeline latency', async () => {
      const rec = await runAppRecommendationLatency('10K', 5, 2);
      const gap = await runAppSkillGapLatency('10K', 5, 2);
      const path = await runAppLearningPathLatency('10K', 5, 2);

      expect(rec.database).toBe('Application');
      expect(gap.database).toBe('Application');
      expect(path.database).toBe('Application');
      expect(rec.medianMs).toBeGreaterThan(0);
      expect(gap.medianMs).toBeGreaterThan(0);
      expect(path.medianMs).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 7. Full Suite Runner, Exports, & Fair Comparison Matrix
  // =========================================================================
  describe('Full Suite Runner & Fair Comparisons', () => {
    it('should run all 18 scenarios and export structured JSON and CSV', async () => {
      const report = await runner.runFullSuite('5K', 5, 2);

      expect(report.results.length).toBe(18);
      expect(report.datasetScale).toBe('5K');
      expect(report.environmentalFactors).toBeDefined();
      expect(report.fairComparisonMatrix.length).toBeGreaterThanOrEqual(4);

      const jsonStr = runner.exportReportAsJson(report);
      const parsed = JSON.parse(jsonStr);
      expect(parsed.reportId).toBe(report.reportId);

      const csvStr = runner.exportReportAsCsv(report);
      expect(csvStr).toContain('Database,Operation,Description,Dataset Scale');
      expect(csvStr).toContain('"MongoDB"');
      expect(csvStr).toContain('"Neo4j"');
      expect(csvStr).toContain('"Redis"');
      expect(csvStr).toContain('"Cassandra"');
      expect(csvStr).toContain('"Application"');
    });

    it('should enforce fair architectural comparisons without misleading universal claims', () => {
      const matrix = runner.getFairComparisonMatrix();
      for (const item of matrix) {
        expect(item.accessPattern).toBeDefined();
        expect(item.bestFitDatabase).toBeDefined();
        expect(item.whyBestFit).toBeDefined();
        expect(item.unsuitableDatabase).toBeDefined();
        expect(item.whyUnsuitable).toBeDefined();
      }
    });
  });
});
