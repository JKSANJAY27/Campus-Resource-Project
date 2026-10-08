import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BenchmarkService, benchmarkService } from '../src/services/benchmark.service.js';

describe('Phase 9: Multi-Model NoSQL Benchmarking & Performance Comparison - Unit Tests', () => {
  let service: BenchmarkService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BenchmarkService();
  });

  // ==========================================================================
  // 1. Statistical Calculations Engine
  // ==========================================================================
  describe('Statistical Calculations (Percentiles, Mean, StdDev, Throughput)', () => {
    it('should correctly compute statistical metrics from sample array', () => {
      // 10 sorted samples: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const samples = [10, 1, 9, 2, 8, 3, 7, 4, 6, 5];
      const metric = service.calculateStats('Test Op', 'read', 'MongoDB', samples, 'Sample test');

      expect(metric.iterations).toBe(10);
      expect(metric.minMs).toBe(1);
      expect(metric.maxMs).toBe(10);
      expect(metric.meanMs).toBe(5.5);
      // P50 is index Math.floor(0.50 * 10) = 5 -> value 6
      expect(metric.p50Ms).toBe(6);
      expect(metric.p90Ms).toBe(10);
      expect(metric.p95Ms).toBe(10);
      expect(metric.p99Ms).toBe(10);
      expect(metric.stdDevMs).toBeGreaterThan(2.8);
      expect(metric.opsPerSecond).toBeGreaterThan(0);
      expect(metric.notes).toBe('Sample test');
    });

    it('should gracefully handle empty samples array', () => {
      const metric = service.calculateStats('Empty Op', 'write', 'Cassandra', [], 'Empty case');
      expect(metric.iterations).toBe(0);
      expect(metric.meanMs).toBe(0);
      expect(metric.p50Ms).toBe(0);
      expect(metric.opsPerSecond).toBe(0);
      expect(metric.samples).toEqual([]);
    });
  });

  // ==========================================================================
  // 2. Individual Database Benchmarking Handlers
  // ==========================================================================
  describe('Database Benchmark Runners (Fallback & Calibrated)', () => {
    it('should benchmark MongoDB across point read, index scan, aggregation, and update', async () => {
      const metrics = await service.benchmarkMongoDB(5);
      expect(metrics).toHaveLength(4);

      const names = metrics.map((m) => m.name);
      expect(names.some((n) => n.includes('Primary Key Read'))).toBe(true);
      expect(names.some((n) => n.includes('Secondary Index Filter'))).toBe(true);
      expect(names.some((n) => n.includes('Multi-Collection Emulated Join'))).toBe(true);
      expect(names.some((n) => n.includes('Document Update'))).toBe(true);

      for (const m of metrics) {
        expect(m.database).toBe('MongoDB');
        expect(m.iterations).toBe(5);
        expect(m.p50Ms).toBeGreaterThan(0);
      }
    });

    it('should benchmark Neo4j across 1-hop, 2-hop, 3-hop DAG, and recommendation queries', async () => {
      const metrics = await service.benchmarkNeo4j(5);
      expect(metrics).toHaveLength(4);

      const names = metrics.map((m) => m.name);
      expect(names.some((n) => n.includes('1-Hop Neighbor Traversal'))).toBe(true);
      expect(names.some((n) => n.includes('2-Hop Career Path Match'))).toBe(true);
      expect(names.some((n) => n.includes('3-Hop DAG Prerequisite Chain'))).toBe(true);

      for (const m of metrics) {
        expect(m.database).toBe('Neo4j');
        expect(m.category).toMatch(/traversal|composite/);
        expect(m.p50Ms).toBeGreaterThan(0);
      }
    });

    it('should benchmark Redis across point read, TTL set, warm hit, and cold miss', async () => {
      const metrics = await service.benchmarkRedis(5);
      expect(metrics).toHaveLength(4);

      const warmHit = metrics.find((m) => m.name.includes('Warm Request'));
      const coldMiss = metrics.find((m) => m.name.includes('Cold Request'));

      expect(warmHit).toBeDefined();
      expect(coldMiss).toBeDefined();
      // In-memory warm hit must be substantially faster than cold miss that touches simulated DB
      expect(warmHit!.p50Ms).toBeLessThan(coldMiss!.p50Ms);
    });

    it('should benchmark Cassandra across sequential append, partition scan, and fan-out', async () => {
      const metrics = await service.benchmarkCassandra(5);
      expect(metrics).toHaveLength(3);

      const append = metrics.find((m) => m.name.includes('Sequential Append-Heavy'));
      const scan = metrics.find((m) => m.name.includes('Partition Key Range Query'));

      expect(append).toBeDefined();
      expect(scan).toBeDefined();
      expect(append!.database).toBe('Cassandra');
      expect(append!.category).toBe('write');
    });

    it('should benchmark Polyglot composite pipeline end-to-end', async () => {
      const metrics = await service.benchmarkPolyglotPipeline(3);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].database).toBe('Polyglot');
      expect(metrics[0].category).toBe('composite');
      expect(metrics[0].p50Ms).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 3. Comparative Speedup & Trade-Off Modeling
  // ==========================================================================
  describe('Comparative Speedup & Analytical Evaluation', () => {
    it('should compute speedup comparisons between cache vs db, graph vs join, and LSM vs B-Tree', () => {
      const mockMetrics = [
        service.calculateStats('Redis: Cache-Aside Warm Request', 'caching', 'Redis', [0.8, 0.9, 1.0]),
        service.calculateStats('Redis: Cache-Aside Cold Request', 'caching', 'Redis', [16.0, 17.0, 18.0]),
        service.calculateStats('MongoDB: Primary Key Read', 'read', 'MongoDB', [4.5, 5.0, 5.5]),
        service.calculateStats('MongoDB: Multi-Collection Emulated Join', 'composite', 'MongoDB', [18.0, 19.0, 20.0]),
        service.calculateStats('Neo4j: 3-Hop DAG Prerequisite Chain', 'traversal', 'Neo4j', [9.0, 10.0, 11.0]),
        service.calculateStats('Cassandra: Sequential Append-Heavy Ingestion', 'write', 'Cassandra', [2.5, 2.7, 3.0]),
        service.calculateStats('MongoDB: Document Update', 'write', 'MongoDB', [7.5, 8.0, 8.5]),
      ];

      const comparisons = service.computeComparisons(mockMetrics);
      expect(comparisons.length).toBeGreaterThanOrEqual(3);

      // Verify Cache acceleration comparison
      const cacheComp = comparisons.find((c) => c.scenario.includes('Cache Acceleration'));
      expect(cacheComp).toBeDefined();
      expect(cacheComp!.speedupFactor).toBeGreaterThan(10); // ~17 / 0.9 = ~18x speedup

      // Verify Multi-hop traversal comparison
      const graphComp = comparisons.find((c) => c.scenario.includes('Multi-Hop Dependency Traversal'));
      expect(graphComp).toBeDefined();
      expect(graphComp!.speedupFactor).toBeGreaterThan(1.5); // ~19 / 10 = ~1.9x speedup

      // Verify Telemetry ingestion comparison
      const cassComp = comparisons.find((c) => c.scenario.includes('Telemetry Ingestion'));
      expect(cassComp).toBeDefined();
      expect(cassComp!.speedupFactor).toBeGreaterThan(2.0); // ~8.0 / 2.7 = ~2.9x speedup
    });
  });

  // ==========================================================================
  // 4. Academic Matrix & Export Formats
  // ==========================================================================
  describe('Academic NoSQL Matrix & Data Export', () => {
    it('should return complete academic matrix covering all 4 databases with CAP & ACID/BASE classifications', () => {
      const matrix = service.getAcademicMatrix();
      expect(matrix).toHaveLength(4);

      const dbs = matrix.map((r) => r.database);
      expect(dbs).toContain('MongoDB');
      expect(dbs).toContain('Neo4j');
      expect(dbs).toContain('Redis');
      expect(dbs).toContain('Apache Cassandra');

      const mongoRow = matrix.find((r) => r.database === 'MongoDB');
      expect(mongoRow?.capClassification).toBe('CP');

      const cassRow = matrix.find((r) => r.database === 'Apache Cassandra');
      expect(cassRow?.capClassification).toBe('AP');
      expect(cassRow?.transactionModel).toBe('BASE (Eventual)');
    });

    it('should generate valid CSV report with header and records', () => {
      const csv = service.exportAsCsv();
      expect(csv).toContain('Database,Metric Name,Category,Iterations,Ops/Sec');
      expect(csv).toContain('"MongoDB"');
      expect(csv).toContain('"Neo4j"');
      expect(csv).toContain('"Redis"');
      expect(csv).toContain('"Cassandra"');
      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThan(5);
    });

    it('should generate valid JSON report with parseable structure', () => {
      const jsonStr = service.exportAsJson();
      const parsed = JSON.parse(jsonStr);

      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('metrics');
      expect(parsed).toHaveProperty('comparisons');
      expect(parsed).toHaveProperty('academicMatrix');
      expect(Array.isArray(parsed.metrics)).toBe(true);
      expect(parsed.metrics.length).toBeGreaterThan(0);
    });

    it('should execute fullSuite and store latestResult', async () => {
      const suite = await service.runFullSuite(5);
      expect(suite.metrics.length).toBeGreaterThanOrEqual(10);
      expect(suite.comparisons.length).toBeGreaterThanOrEqual(2);
      expect(service.getLatestResult()).toEqual(suite);
    });
  });
});
