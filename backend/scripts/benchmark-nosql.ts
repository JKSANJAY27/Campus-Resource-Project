import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { benchmarkService } from '../src/services/benchmark.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('========================================================================');
  console.log(' CAMPUS RESOURCE GRAPH: MULTI-MODEL NoSQL BENCHMARK SUITE');
  console.log(' Polyglot Persistence: MongoDB • Neo4j • Redis • Apache Cassandra');
  console.log('========================================================================\n');

  const iterationsArg = process.argv.find((a) => a.startsWith('--iterations='));
  const iterations = iterationsArg ? parseInt(iterationsArg.split('=')[1], 10) : 30;

  console.log(`[Benchmark Engine] Executing workload suites (${iterations} iterations each)...`);
  const startTime = performance.now();

  const results = await benchmarkService.runFullSuite(iterations);
  const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);

  console.log(`[Benchmark Engine] Execution finished in ${totalDuration}s.\n`);

  console.log('---------------------------------------------------------------------------------------------------------------------');
  console.log(
    'DATABASE'.padEnd(12) +
    'METRIC / ACCESS PATTERN'.padEnd(52) +
    'P50 (ms)'.padEnd(12) +
    'P95 (ms)'.padEnd(12) +
    'P99 (ms)'.padEnd(12) +
    'OPS/SEC'
  );
  console.log('---------------------------------------------------------------------------------------------------------------------');

  for (const m of results.metrics) {
    const dbName = m.database.padEnd(12);
    const metricName = (m.name.length > 50 ? m.name.substring(0, 47) + '...' : m.name).padEnd(52);
    const p50 = `${m.p50Ms.toFixed(2)}ms`.padEnd(12);
    const p95 = `${m.p95Ms.toFixed(2)}ms`.padEnd(12);
    const p99 = `${m.p99Ms.toFixed(2)}ms`.padEnd(12);
    const ops = `${m.opsPerSecond.toFixed(1)}`;
    console.log(`${dbName}${metricName}${p50}${p95}${p99}${ops}`);
  }
  console.log('---------------------------------------------------------------------------------------------------------------------\n');

  console.log('========================================================================');
  console.log(' EMPIRICAL ARCHITECTURAL COMPARISONS & SPEEDUP FACTORS');
  console.log('========================================================================');
  for (const comp of results.comparisons) {
    console.log(`\n• Scenario: ${comp.scenario}`);
    console.log(`  - Baseline [${comp.baselineDb}]: P50 = ${comp.baselineP50Ms.toFixed(2)}ms`);
    console.log(`  - Optimized [${comp.optimizedDb}]: P50 = ${comp.optimizedP50Ms.toFixed(2)}ms`);
    console.log(`  - Empirical Speedup: >>> ${comp.speedupFactor}x FASTER <<<`);
    console.log(`  - Theory: ${comp.explanation}`);
  }

  // Ensure output directory exists
  const outputDir = path.resolve(__dirname, '../../benchmarks');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonPath = path.join(outputDir, 'benchmark_results.json');
  const csvPath = path.join(outputDir, 'benchmark_results.csv');

  fs.writeFileSync(jsonPath, benchmarkService.exportAsJson(), 'utf-8');
  fs.writeFileSync(csvPath, benchmarkService.exportAsCsv(), 'utf-8');

  console.log(`\n[Export] Results saved to:`);
  console.log(`  - JSON: ${jsonPath}`);
  console.log(`  - CSV:  ${csvPath}`);
  console.log('\n[Finished] Benchmark run complete.\n');
}

main().catch((err) => {
  console.error('[Benchmark Error]:', err);
  process.exit(1);
});
