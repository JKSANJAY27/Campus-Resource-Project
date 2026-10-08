import Redis from 'ioredis';
import { dbManager } from '../../config/database.js';

export interface KeyInfo {
  key: string;
  type: string;
  ttl: number; // TTL in seconds (-1: no expire, -2: expired/doesn't exist)
  namespace: string;
}

export class CacheRepository {
  private client: Redis | null = null;

  // In-memory fallback metrics in case Redis is offline or recovering
  private fallbackMetrics = {
    hits: 0,
    misses: 0,
    cachedLatencySum: 0,
    cachedLatencyCount: 0,
    uncachedLatencySum: 0,
    uncachedLatencyCount: 0,
  };

  constructor(client?: Redis) {
    if (client) {
      this.client = client;
    }
  }

  protected getClient(): Redis {
    if (!this.client) {
      this.client = dbManager.getRedisClient();
    }
    return this.client;
  }

  /**
   * Safe execution wrapper: traps connection errors and returns null
   * ensuring the application never crashes if Redis is offline.
   */
  private async safeExec<T>(op: (redis: Redis) => Promise<T>, fallback: T): Promise<T> {
    try {
      const redis = this.getClient();
      if (redis.status !== 'ready') {
        await Promise.race([
          redis.connect().catch(() => {}),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
        ]).catch(() => {});
      }
      return await op(redis);
    } catch {
      return fallback;
    }
  }

  // ==========================================================================
  // Basic Cache Operations
  // ==========================================================================

  public async get(key: string): Promise<string | null> {
    return this.safeExec(async (redis) => redis.get(key), null);
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    return this.safeExec(async (redis) => {
      if (ttlSeconds && ttlSeconds > 0) {
        await redis.set(key, value, 'EX', ttlSeconds);
      } else {
        await redis.set(key, value);
      }
      return true;
    }, false);
  }

  public async del(key: string): Promise<number> {
    return this.safeExec(async (redis) => redis.del(key), 0);
  }

  public async ttl(key: string): Promise<number> {
    return this.safeExec(async (redis) => redis.ttl(key), -2);
  }

  public async exists(key: string): Promise<boolean> {
    return this.safeExec(async (redis) => (await redis.exists(key)) === 1, false);
  }

  /**
   * Non-blocking key scanning using SCAN instead of blocking KEYS *
   */
  public async scanKeys(pattern: string = '*'): Promise<string[]> {
    return this.safeExec(async (redis) => {
      let cursor = '0';
      const matchingKeys: string[] = [];
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys && keys.length > 0) {
          matchingKeys.push(...keys);
        }
      } while (cursor !== '0' && matchingKeys.length < 500);
      return matchingKeys;
    }, []);
  }

  /**
   * Invalidate multiple keys matching a pattern via SCAN + DEL
   */
  public async delPattern(pattern: string): Promise<number> {
    return this.safeExec(async (redis) => {
      const keys = await this.scanKeys(pattern);
      if (keys.length === 0) return 0;
      return await redis.del(...keys);
    }, 0);
  }

  /**
   * Flush all application cache keys (preserving system/other databases)
   */
  public async flushAll(): Promise<boolean> {
    return this.safeExec(async (redis) => {
      await redis.flushdb();
      return true;
    }, false);
  }

  /**
   * Get metadata for all active keys (key, namespace, TTL, type)
   */
  public async getAllKeysInfo(): Promise<KeyInfo[]> {
    return this.safeExec(async (redis) => {
      const keys = await this.scanKeys('*');
      if (keys.length === 0) return [];

      const pipeline = redis.pipeline();
      for (const k of keys) {
        pipeline.ttl(k);
        pipeline.type(k);
      }
      const results = await pipeline.exec();

      const keyInfos: KeyInfo[] = [];
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const ttl = (results?.[i * 2]?.[1] as number) ?? -2;
        const type = (results?.[i * 2 + 1]?.[1] as string) ?? 'none';
        const namespace = key.split(':')[0] || 'general';

        keyInfos.push({
          key,
          type,
          ttl,
          namespace,
        });
      }

      // Sort by namespace and key
      keyInfos.sort((a, b) => a.key.localeCompare(b.key));
      return keyInfos;
    }, []);
  }

  // ==========================================================================
  // Metrics Tracking (Redis Atomic Increments + In-Memory Fallback)
  // ==========================================================================

  public async recordHit(latencyMs: number): Promise<void> {
    this.fallbackMetrics.hits++;
    this.fallbackMetrics.cachedLatencySum += latencyMs;
    this.fallbackMetrics.cachedLatencyCount++;

    await this.safeExec(async (redis) => {
      const p = redis.pipeline();
      p.incr('metrics:cache:hits');
      p.incrbyfloat('metrics:latency:cached:sum', latencyMs);
      p.incr('metrics:latency:cached:count');
      await p.exec();
    }, undefined);
  }

  public async recordMiss(latencyMs: number): Promise<void> {
    this.fallbackMetrics.misses++;
    this.fallbackMetrics.uncachedLatencySum += latencyMs;
    this.fallbackMetrics.uncachedLatencyCount++;

    await this.safeExec(async (redis) => {
      const p = redis.pipeline();
      p.incr('metrics:cache:misses');
      p.incrbyfloat('metrics:latency:uncached:sum', latencyMs);
      p.incr('metrics:latency:uncached:count');
      await p.exec();
    }, undefined);
  }

  public async getMetrics(): Promise<{
    hits: number;
    misses: number;
    totalRequests: number;
    hitRate: number;
    avgCachedLatencyMs: number;
    avgUncachedLatencyMs: number;
    speedupFactor: number;
    redisConnected: boolean;
    memoryUsedHuman?: string;
  }> {
    return this.safeExec(
      async (redis) => {
        const [hitsRaw, missesRaw, cSumRaw, cCountRaw, uSumRaw, uCountRaw, infoRaw] = await Promise.all([
          redis.get('metrics:cache:hits'),
          redis.get('metrics:cache:misses'),
          redis.get('metrics:latency:cached:sum'),
          redis.get('metrics:latency:cached:count'),
          redis.get('metrics:latency:uncached:sum'),
          redis.get('metrics:latency:uncached:count'),
          redis.info('memory').catch(() => ''),
        ]);

        const hits = hitsRaw ? parseInt(hitsRaw, 10) : this.fallbackMetrics.hits;
        const misses = missesRaw ? parseInt(missesRaw, 10) : this.fallbackMetrics.misses;
        const cSum = cSumRaw ? parseFloat(cSumRaw) : this.fallbackMetrics.cachedLatencySum;
        const cCount = cCountRaw ? parseInt(cCountRaw, 10) : this.fallbackMetrics.cachedLatencyCount;
        const uSum = uSumRaw ? parseFloat(uSumRaw) : this.fallbackMetrics.uncachedLatencySum;
        const uCount = uCountRaw ? parseInt(uCountRaw, 10) : this.fallbackMetrics.uncachedLatencyCount;

        const totalRequests = hits + misses;
        const hitRate = totalRequests > 0 ? Number(((hits / totalRequests) * 100).toFixed(1)) : 0;
        const avgCachedLatencyMs = cCount > 0 ? Number((cSum / cCount).toFixed(2)) : 0;
        const avgUncachedLatencyMs = uCount > 0 ? Number((uSum / uCount).toFixed(2)) : 0;
        const speedupFactor =
          avgCachedLatencyMs > 0 && avgUncachedLatencyMs > 0
            ? Number((avgUncachedLatencyMs / avgCachedLatencyMs).toFixed(1))
            : 1.0;

        // Parse human memory from INFO
        const matchMem = infoRaw.match(/used_memory_human:([^\r\n]+)/);
        const memoryUsedHuman = matchMem ? matchMem[1].trim() : 'N/A';

        return {
          hits,
          misses,
          totalRequests,
          hitRate,
          avgCachedLatencyMs,
          avgUncachedLatencyMs,
          speedupFactor,
          redisConnected: true,
          memoryUsedHuman,
        };
      },
      {
        hits: this.fallbackMetrics.hits,
        misses: this.fallbackMetrics.misses,
        totalRequests: this.fallbackMetrics.hits + this.fallbackMetrics.misses,
        hitRate:
          this.fallbackMetrics.hits + this.fallbackMetrics.misses > 0
            ? Number(
                ((this.fallbackMetrics.hits / (this.fallbackMetrics.hits + this.fallbackMetrics.misses)) * 100).toFixed(
                  1
                )
              )
            : 0,
        avgCachedLatencyMs:
          this.fallbackMetrics.cachedLatencyCount > 0
            ? Number((this.fallbackMetrics.cachedLatencySum / this.fallbackMetrics.cachedLatencyCount).toFixed(2))
            : 0,
        avgUncachedLatencyMs:
          this.fallbackMetrics.uncachedLatencyCount > 0
            ? Number((this.fallbackMetrics.uncachedLatencySum / this.fallbackMetrics.uncachedLatencyCount).toFixed(2))
            : 0,
        speedupFactor: 1.0,
        redisConnected: false,
        memoryUsedHuman: 'Offline (In-Memory Fallback)',
      }
    );
  }

  // ==========================================================================
  // Rate Limiting (Fixed Window Atomic INCR + EXPIRE)
  // ==========================================================================

  public async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{
    allowed: boolean;
    current: number;
    remaining: number;
    resetSeconds: number;
  }> {
    return this.safeExec(
      async (redis) => {
        const fullKey = `ratelimit:${key}`;
        const p = redis.pipeline();
        p.incr(fullKey);
        p.ttl(fullKey);
        const results = await p.exec();

        const current = (results?.[0]?.[1] as number) || 1;
        let ttl = (results?.[1]?.[1] as number) || -1;

        if (ttl === -1) {
          // Key was just created, set expiration
          await redis.expire(fullKey, windowSeconds);
          ttl = windowSeconds;
        }

        const remaining = Math.max(0, limit - current);
        const allowed = current <= limit;

        return {
          allowed,
          current,
          remaining,
          resetSeconds: ttl > 0 ? ttl : windowSeconds,
        };
      },
      {
        allowed: true, // Fail open if Redis is down
        current: 1,
        remaining: limit - 1,
        resetSeconds: windowSeconds,
      }
    );
  }
}

export const cacheRepository = new CacheRepository();
