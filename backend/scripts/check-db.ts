import { dbManager } from '../src/config/database.js';

async function runCheck() {
  console.log('--- Probing Database Connections ---');
  const report = await dbManager.getFullHealthReport();
  console.log(JSON.stringify(report, null, 2));
  await dbManager.disconnectAll();
  process.exit(report.overall === 'healthy' ? 0 : 1);
}

runCheck().catch((err) => {
  console.error('Diagnostic probe crashed:', err);
  process.exit(1);
});
