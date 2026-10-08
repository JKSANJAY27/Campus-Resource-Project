import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { dbManager } from '../src/config/database.js';

describe('Phase 13: API Hardening & Uniform Error Responses Test Suite', () => {
  const app = createApp();

  afterAll(async () => {
    await dbManager.disconnectAll();
  });

  // ==========================================================================
  // 1. Root & Discovery Endpoints
  // ==========================================================================
  describe('Root Metadata & Discovery', () => {
    it('GET / should return online status, application metadata, and endpoint directory', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('status', 'online');
      expect(res.body).toHaveProperty('endpoints');
      expect(res.body.endpoints).toHaveProperty('health');
      expect(res.body.endpoints).toHaveProperty('students');
      expect(res.body.endpoints).toHaveProperty('recommendations');
    });
  });

  // ==========================================================================
  // 2. Standardized Error Envelope
  // ==========================================================================
  describe('Standardized Error Handling & Uniform JSON Format', () => {
    it('GET /api/v1/nonexistent should return standard 404 envelope without leaking stack traces', async () => {
      const res = await request(app).get('/api/v1/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false,
        error: 'Not Found',
        message: 'Endpoint GET /api/v1/nonexistent does not exist.',
      });
      // Ensure no stack trace leakage
      expect(res.body).not.toHaveProperty('stack');
    });

    it('POST /non-existent-action should return standard 404 envelope with method name', async () => {
      const res = await request(app).post('/api/v1/undefined-endpoint');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Not Found');
      expect(res.body.message).toContain('POST /api/v1/undefined-endpoint');
    });
  });

  // ==========================================================================
  // 3. Health & Connectivity Telemetry
  // ==========================================================================
  describe('Multi-Model Health Diagnostics Telemetry', () => {
    it('GET /api/v1/health should respond with complete 4-store diagnostic breakdown', async () => {
      const res = await request(app).get('/api/v1/health');
      expect([200, 207, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptimeSeconds');
      expect(res.body).toHaveProperty('overall');
      expect(res.body).toHaveProperty('databases');

      // Verify all 4 engines are checked
      const { databases } = res.body;
      expect(databases).toHaveProperty('mongodb');
      expect(databases).toHaveProperty('neo4j');
      expect(databases).toHaveProperty('redis');
      expect(databases).toHaveProperty('cassandra');

      // Verify latency reporting
      expect(typeof databases.mongodb.latencyMs).toBe('number');
      expect(typeof databases.neo4j.latencyMs).toBe('number');
      expect(typeof databases.redis.latencyMs).toBe('number');
      expect(typeof databases.cassandra.latencyMs).toBe('number');
    }, 15000);
  });

  // ==========================================================================
  // 4. Input Validation & Parameter Boundaries on API Endpoints
  // ==========================================================================
  describe('HTTP Parameter Validation', () => {
    it('GET /api/v1/recommendations/skill-gap without targetType or targetId should return 400', async () => {
      const res = await request(app)
        .get('/api/v1/recommendations/skill-gap')
        .query({ studentId: 'stu_001' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('targetType, and targetId are required');
    });

    it('GET /api/v1/recommendations/job-readiness without studentId or jobId should return 400', async () => {
      const res = await request(app).get('/api/v1/recommendations/job-readiness');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/v1/activity/student without studentId query parameter should return 400', async () => {
      const res = await request(app).get('/api/v1/activity/student');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('studentId is required');
    });

    it('GET /api/v1/activity/resource without resourceId query parameter should return 400', async () => {
      const res = await request(app).get('/api/v1/activity/resource');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('resourceId is required');
    });
  });

  // ==========================================================================
  // 5. Phase 12 NoSQL Demo API Endpoints
  // ==========================================================================
  describe('Phase 12 NoSQL Demonstration Endpoints Availability', () => {
    it('GET /api/v1/nosql-demos/mongo-sharding should return valid simulation payload', async () => {
      const res = await request(app).get('/api/v1/nosql-demos/mongo-sharding');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.demonstration).toHaveProperty('title');
      expect(res.body.demonstration).toHaveProperty('steps');
      expect(res.body.demonstration.steps.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/nosql-demos/cassandra-replication should return valid consistency simulation', async () => {
      const res = await request(app).get('/api/v1/nosql-demos/cassandra-replication');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.demonstration).toHaveProperty('steps');
      expect(res.body.demonstration).toHaveProperty('educationalNotes');
    });

    it('GET /api/v1/nosql-demos/degraded-service should return resilience matrix', async () => {
      const res = await request(app).get('/api/v1/nosql-demos/degraded-service');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.demonstration).toHaveProperty('category', 'hybrid');
    });
  });
});
