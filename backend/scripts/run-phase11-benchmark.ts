import { reproducibleRunner } from '../src/benchmark/runner.js';
import { DatasetScale } from '../src/benchmark/types.js';

async function main() {
  console.log('========================================================================================');
  console.log(' PHASE 11: REPRODUCIBLE MULTI-MODEL NoSQL PERFORMANCE BENCHMARK SUITE');
  console.log(' Rigorous Experiments Across: MongoDB • Neo4j • Redis • Apache Cassandra • App Engine');
  console.log('========================================================================================\n');

  const scaleArg = process.argv.find((a) => a.startsWith('--scale='));
  const scale = (scaleArg ? scaleArg.split('=')[1] : '10K') as DatasetScale;

  const runsArg = process.argv.find((a) => a.startsWith('--runs='));
  const runs = runsArg ? parseInt(runsArg.split('=')[1], 10) : 25;

  const warmupArg = process.argv.find((a) => a.startsWith('--warmup='));
  const warmup = warmupArg ? parseInt(warmupArg.split('=')[1], 10) : 5;

  console.log(`[Experimental Configuration]`);
  console.log(`  - Dataset Scale Tier:    ${scale}`);
  console.log(`  - Warmup Iterations:     ${warmup} (executed & discarded prior to measurement)`);
  console.log(`  - Measured Iterations:   ${runs}`);
  console.log(`  - Timing Precision:      Monotonic performance.now() (High-Resolution Sub-Millisecond)\n`);

  console.log('[Runner] Executing setup, warmup, and measured workloads across all 18 scenarios...\n');
  const startTime = performance.now();
  const report = await reproducibleRunner.runFullSuite(scale, runs, warmup);
  const totalElapsedSec = ((performance.now() - startTime) / 1000).toFixed(2);

  console.log(`[Runner] Experiment finished in ${totalElapsedSec}s.\n`);

  // Group and display by database
  const dbs = ['MongoDB', 'Neo4j', 'Redis', 'Cassandra', 'Application'] as const;

  for (const db of dbs) {
    const dbResults = report.results.filter((r) => r.database === db);
    if (dbResults.length === 0) continue;

    console.log(`----------------------------------------------------------------------------------------------------------------------`);
    console.log(`  DATABASE: ${db.toUpperCase()}`);
    console.log(`----------------------------------------------------------------------------------------------------------------------`);
    console.log(
      'OPERATION'.padEnd(42) +
      'AVG (ms)'.padEnd(12) +
      'MEDIAN'.padEnd(12) +
      'P95 (ms)'.padEnd(12) +
      'MIN (ms)'.padEnd(12) +
      'MAX (ms)'.padEnd(12) +
      'OPS/SEC'
    );
    console.log('----------------------------------------------------------------------------------------------------------------------');

    for (const r of dbResults) {
      const op = r.operation.padEnd(42);
      const avg = `${r.avgMs.toFixed(2)}ms`.padEnd(12);
      const med = `${r.medianMs.toFixed(2)}ms`.padEnd(12);
      const p95 = `${r.p95Ms.toFixed(2)}ms`.padEnd(12);
      const min = `${r.minMs.toFixed(2)}ms`.padEnd(12);
      const max = `${r.maxMs.toFixed(2)}ms`.padEnd(12);
      const ops = `${r.throughputOpsSec.toFixed(1)}`;
      console.log(`${op}${avg}${med}${p95}${min}${max}${ops}`);
    }
    console.log('');
  }

  console.log('========================================================================================');
  console.log(' FAIR ARCHITECTURAL COMPARISON MATRIX (COMPARE ONLY FOR TARGET ACCESS PATTERNS)');
  console.log('========================================================================================');
  for (const item of report.fairComparisonMatrix) {
    console.log(`\n• Target Access Pattern: ${item.accessPattern}`);
    console.log(`  - Best-Fit Engine:     ${item.bestFitDatabase}`);
    console.log(`    Why Suitable:        ${item.whyBestFit}`);
    console.log(`  - Unsuitable Engine:   ${item.unsuitableDatabase}`);
    console.log(`    Why Unsuitable:      ${item.whyUnsuitable}`);
  }

  console.log('\n========================================================================================');
  console.log(' ENVIRONMENTAL FACTORS & LIMITATIONS');
  console.log('========================================================================================');
  console.log(`- Hardware Notes:      ${report.environmentalFactors.hardwareNotes}`);
  console.log(`- Academic Caveat:     ${report.environmentalFactors.environmentalLimitations}`);
  console.log('\n[Finished] Benchmark reports exported to benchmarks/reports/reproducible_report_latest.json and .csv\n');
}

main().catch((err) => {
  console.error('[Benchmark Error]:', err);
  process.exit(1);
});
