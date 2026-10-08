import mongoose from 'mongoose';
import neo4j, { Driver, Session } from 'neo4j-driver';
import Redis from 'ioredis';
import cassandraDriver, { Client as CassandraClient } from 'cassandra-driver';
import { ENV } from './env.js';

export interface DatabaseHealthItem {
  status: 'connected' | 'disconnected' | 'error';
  latencyMs: number;
  details?: Record<string, unknown>;
  error?: string;
}

export interface SystemHealthReport {
  timestamp: string;
  uptimeSeconds: number;
  overall: 'healthy' | 'degraded' | 'down';
  databases: {
    mongodb: DatabaseHealthItem;
    neo4j: DatabaseHealthItem;
    redis: DatabaseHealthItem;
    cassandra: DatabaseHealthItem;
  };
}

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${name} connection timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
};

class DatabaseManager {
  private static instance: DatabaseManager;

  private neo4jDriver: Driver | null = null;
  private redisClient: Redis | null = null;
  private cassandraClient: CassandraClient | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  // --- MongoDB ---
  public async connectMongo(): Promise<typeof mongoose> {
    if (mongoose.connection.readyState === 1) {
      return mongoose;
    }
    await withTimeout(
      mongoose.connect(ENV.MONGO_URI, {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
      }),
      2500,
      'MongoDB'
    );
    console.log('[MongoDB] Connected successfully to', ENV.MONGO_URI);
    return mongoose;
  }

  public async checkMongoHealth(): Promise<DatabaseHealthItem> {
    const start = performance.now();
    try {
      if (mongoose.connection.readyState !== 1) {
        await this.connectMongo();
      }
      if (!mongoose.connection.db) {
        throw new Error('Database instance is not initialized');
      }
      await withTimeout(mongoose.connection.db.admin().ping(), 2000, 'MongoDB Ping');
      const latencyMs = Number((performance.now() - start).toFixed(2));
      return {
        status: 'connected',
        latencyMs,
        details: {
          databaseName: mongoose.connection.db.databaseName,
          readyState: mongoose.connection.readyState,
        },
      };
    } catch (err: any) {
      const latencyMs = Number((performance.now() - start).toFixed(2));
      return {
        status: 'error',
        latencyMs,
        error: err.message || 'MongoDB connection failed',
      };
    }
  }

  // --- Neo4j ---
  public getNeo4jDriver(): Driver {
    if (!this.neo4jDriver) {
      this.neo4jDriver = neo4j.driver(
        ENV.NEO4J_URI,
        neo4j.auth.basic(ENV.NEO4J_USER, ENV.NEO4J_PASSWORD),
        {
          maxConnectionPoolSize: 20,
          connectionTimeout: 2000,
        }
      );
    }
    return this.neo4jDriver;
  }

  public getNeo4jSession(): Session {
    return this.getNeo4jDriver().session();
  }

  public async checkNeo4jHealth(): Promise<DatabaseHealthItem> {
    const start = performance.now();
    let session: Session | null = null;
    try {
      session = this.getNeo4jSession();
      const runPromise = session.run('RETURN 1 AS ping');
      const result = await withTimeout(runPromise, 2500, 'Neo4j Query');
      const pingVal = result.records[0]?.get('ping')?.toNumber?.() ?? 1;
      const latencyMs = Number((performance.now() - start).toFixed(2));
      return {
        status: 'connected',
        latencyMs,
        details: { ping: pingVal, uri: ENV.NEO4J_URI },
      };
    } catch (err: any) {
      const latencyMs = Number((performance.now() - start).toFixed(2));
      return {
        status: 'error',
        latencyMs,
        error: err.message || 'Neo4j connection failed',
      };
    } finally {
      if (session) {
        await session.close().catch(() => {});
      }
    }
  }

  // --- Redis ---
  public getRedisClient(): Redis {
    if (!this.redisClient) {
      this.redisClient = new Redis({
        host: ENV.REDIS_HOST,
        port: ENV.REDIS_PORT,
        password: ENV.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 0,
        connectTimeout: 2000,
        retryStrategy: () => null, // Do not reconnect infinitely if offline
        lazyConnect: true,
      });

      this.redisClient.on('error', () => {
        // Suppress unhandled error log when offline
      });
    }
    return this.redisClient;
  }

  public async checkRedisHealth(): Promise<DatabaseHealthItem> {
    const start = performance.now();
    const redis = this.getRedisClient();
    try {
      if (redis.status !== 'ready') {
        await withTimeout(redis.connect(), 2000, 'Redis Connect').catch(() => {});
      }
      const pong = await withTimeout(redis.ping(), 2000, 'Redis Ping');
      const latencyMs = Number((performance.now() - start).toFixed(2));
      return {
        status: pong === 'PONG' ? 'connected' : 'error',
        latencyMs,
        details: { pingResponse: pong, host: ENV.REDIS_HOST, port: ENV.REDIS_PORT },
      };
    } catch (err: any) {
      const latencyMs = Number((performance.now() - start).toFixed(2));
      return {
        status: 'error',
        latencyMs,
        error: err.message || 'Redis connection failed',
      };
    }
  }

  // --- Cassandra ---
  public getCassandraClient(): CassandraClient {
    if (!this.cassandraClient) {
      const contactPoints = ENV.CASSANDRA_CONTACT_POINTS.split(',').map((s) => s.trim());
      this.cassandraClient = new CassandraClient({
        contactPoints,
        localDataCenter: ENV.CASSANDRA_LOCAL_DC,
        protocolOptions: { port: ENV.CASSANDRA_PORT },
        socketOptions: { connectTimeout: 2000, readTimeout: 2000 },
        policies: {
          reconnection: new cassandraDriver.policies.reconnection.ConstantReconnectionPolicy(5000),
        },
      });
    }
    return this.cassandraClient;
  }

  public async checkCassandraHealth(): Promise<DatabaseHealthItem> {
    const start = performance.now();
    const cassandra = this.getCassandraClient();
    try {
      if (!cassandra.getState()?.getConnectedHosts()?.length) {
        await withTimeout(cassandra.connect(), 2500, 'Cassandra Connect');
      }
      const result = await withTimeout(
        cassandra.execute('SELECT release_version FROM system.local'),
        2000,
        'Cassandra Query'
      );
      const version = result.first()?.get('release_version') || 'unknown';
      const latencyMs = Number((performance.now() - start).toFixed(2));
      return {
        status: 'connected',
        latencyMs,
        details: {
          releaseVersion: version,
          connectedHosts: cassandra.getState().getConnectedHosts().length,
        },
      };
    } catch (err: any) {
      const latencyMs = Number((performance.now() - start).toFixed(2));
      return {
        status: 'error',
        latencyMs,
        error: err.message || 'Cassandra connection failed',
      };
    }
  }

  // --- Aggregate Health ---
  public async getFullHealthReport(): Promise<SystemHealthReport> {
    const [mongo, neo4j, redis, cassandra] = await Promise.all([
      this.checkMongoHealth(),
      this.checkNeo4jHealth(),
      this.checkRedisHealth(),
      this.checkCassandraHealth(),
    ]);

    const results = [mongo, neo4j, redis, cassandra];
    const connectedCount = results.filter((r) => r.status === 'connected').length;

    let overall: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (connectedCount === 0) {
      overall = 'down';
    } else if (connectedCount < 4) {
      overall = 'degraded';
    }

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      overall,
      databases: {
        mongodb: mongo,
        neo4j,
        redis,
        cassandra,
      },
    };
  }

  public async disconnectAll(): Promise<void> {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect().catch(() => {});
      }
      if (this.neo4jDriver) {
        await this.neo4jDriver.close().catch(() => {});
        this.neo4jDriver = null;
      }
      if (this.redisClient) {
        await this.redisClient.quit().catch(() => {});
        this.redisClient = null;
      }
      if (this.cassandraClient) {
        await this.cassandraClient.shutdown().catch(() => {});
        this.cassandraClient = null;
      }
    } catch {
      // Ignored during cleanup
    }
  }
}

export const dbManager = DatabaseManager.getInstance();
