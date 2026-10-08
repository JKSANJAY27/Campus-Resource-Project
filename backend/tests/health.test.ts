import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { dbManager } from '../src/config/database.js';

describe('API Smoke and Health Check', () => {
  const app = createApp();

  afterAll(async () => {
    await dbManager.disconnectAll();
  });

  it('GET / should return online status and API metadata', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
    expect(res.body.name).toContain('Campus Resource');
  });

  it('GET /api/v1/health should return a valid health report structure', async () => {
    const res = await request(app).get('/api/v1/health');
    // Expect 200 (healthy), 207 (degraded), or 503 (down)
    expect([200, 207, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('overall');
    expect(res.body).toHaveProperty('databases');
    expect(res.body.databases).toHaveProperty('mongodb');
    expect(res.body.databases).toHaveProperty('neo4j');
    expect(res.body.databases).toHaveProperty('redis');
    expect(res.body.databases).toHaveProperty('cassandra');
  }, 10000);

  it('GET /non-existent-route should return 404', async () => {
    const res = await request(app).get('/non-existent-route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
  });
});
