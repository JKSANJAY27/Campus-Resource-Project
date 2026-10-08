import { Request, Response, NextFunction, RequestHandler } from 'express';
import { cacheRepository } from '../repositories/redis/cache.repository.js';

export interface RateLimiterOptions {
  limit?: number; // Maximum allowed requests within window
  windowSeconds?: number; // Time window duration in seconds
  keyPrefix?: string; // Optional namespace prefix
}

/**
 * Redis-Backed Rate Limiting Middleware
 * Uses atomic fixed-window counting with automatic expiration.
 * Fails open if Redis is temporarily unreachable.
 */
export function createRateLimiter(options: RateLimiterOptions = {}): RequestHandler {
  const limit = options.limit || 60;
  const windowSeconds = options.windowSeconds || 60;
  const keyPrefix = options.keyPrefix || 'global';

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Determine client identifier: prefers forwarded IP or remoteAddress
      const rawIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '127.0.0.1';
      // Normalize IPv6 localhost
      const clientIp = rawIp.replace('::ffff:', '').replace('::1', '127.0.0.1');

      const pathIdentifier = req.baseUrl || req.path || 'root';
      const rateLimitKey = `${keyPrefix}:${clientIp}:${pathIdentifier.replace(/\//g, '_')}`;

      const { allowed, remaining, resetSeconds } = await cacheRepository.checkRateLimit(
        rateLimitKey,
        limit,
        windowSeconds
      );

      // Standard Rate-Limit HTTP response headers
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetSeconds.toString());

      if (!allowed) {
        res.setHeader('Retry-After', resetSeconds.toString());
        res.status(429).json({
          success: false,
          error: 'TooManyRequests',
          message: `Rate limit of ${limit} requests per ${windowSeconds}s exceeded. Please retry in ${resetSeconds} seconds.`,
          retryAfterSeconds: resetSeconds,
        });
        return;
      }

      next();
    } catch {
      // Fails open: never block legitimate traffic on rate limiter internal error
      next();
    }
  };
}

/** Pre-configured standard rate limiters */
export const apiRateLimiter = createRateLimiter({ limit: 60, windowSeconds: 60, keyPrefix: 'api' });
export const heavyRateLimiter = createRateLimiter({ limit: 30, windowSeconds: 60, keyPrefix: 'heavy' });
