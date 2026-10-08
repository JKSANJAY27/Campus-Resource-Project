import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { dbManager } from './config/database.js';

const app = createApp();

const server = app.listen(ENV.PORT, async () => {
  console.log(`=======================================================`);
  console.log(` Campus Resource Graph Backend API`);
  console.log(` Environment: ${ENV.NODE_ENV}`);
  console.log(` Listening on: http://localhost:${ENV.PORT}`);
  console.log(` Health Route: http://localhost:${ENV.PORT}/api/v1/health`);
  console.log(`=======================================================`);

  // Run initial non-blocking health check
  console.log('[Startup] Probing database connection statuses...');
  try {
    const report = await dbManager.getFullHealthReport();
    console.log(`[Startup Health Summary] Status: ${report.overall.toUpperCase()}`);
    console.log(`  - MongoDB:   ${report.databases.mongodb.status} (${report.databases.mongodb.latencyMs}ms)`);
    console.log(`  - Neo4j:     ${report.databases.neo4j.status} (${report.databases.neo4j.latencyMs}ms)`);
    console.log(`  - Redis:     ${report.databases.redis.status} (${report.databases.redis.latencyMs}ms)`);
    console.log(`  - Cassandra: ${report.databases.cassandra.status} (${report.databases.cassandra.latencyMs}ms)`);
  } catch (err: any) {
    console.warn('[Startup Warning] Initial health check encountered error:', err.message);
  }
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\n[${signal}] Received. Closing HTTP server and database connections...`);
  server.close(async () => {
    await dbManager.disconnectAll();
    console.log('[Shutdown] Server successfully terminated.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
