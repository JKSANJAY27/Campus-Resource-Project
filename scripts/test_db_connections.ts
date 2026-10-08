import { dbManager } from '../backend/src/config/database.js';

async function main() {
  console.log('===============================================================');
  console.log(' Campus Resource Graph - Multi-Model Database Health Probe');
  console.log('===============================================================');

  const report = await dbManager.getFullHealthReport();

  console.log(`Overall Health Status: [ ${report.overall.toUpperCase()} ]\n`);

  for (const [name, info] of Object.entries(report.databases)) {
    const symbol = info.status === 'connected' ? '✓' : '✗';
    console.log(`${symbol} [${name.toUpperCase().padEnd(9)}] Status: ${info.status.toUpperCase()} (${info.latencyMs}ms)`);
    if (info.details) {
      console.log(`    Details: ${JSON.stringify(info.details)}`);
    }
    if (info.error) {
      console.log(`    Error:   ${info.error.replace(/\n.*/g, '')}`);
    }
  }

  console.log('\n===============================================================');
  await dbManager.disconnectAll();
}

main().catch((err) => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
