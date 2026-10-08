/**
 * Shared controller utility: wraps async handlers and sends
 * uniform JSON responses. Errors with a `.status` property are
 * forwarded as the HTTP status code; everything else becomes 500.
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/** Parse common query params into typed QueryOptions fields */
export function parseQueryOptions(req: Request) {
  return {
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    sortBy: req.query.sortBy as string | undefined,
    sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
    search: req.query.search as string | undefined,
  };
}

/** Async handler wrapper — catches thrown errors and passes to Express error middleware */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

/** Send a successful response */
export function ok<T>(res: Response, data: T, message?: string, statusCode = 200): void {
  const body: ApiResponse<T> = { success: true, data };
  if (message) body.message = message;
  res.status(statusCode).json(body);
}

/** Send a successful paginated response */
export function paginated<T>(
  res: Response,
  result: { data: T[]; pagination: ApiResponse['pagination'] }
): void {
  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
}
