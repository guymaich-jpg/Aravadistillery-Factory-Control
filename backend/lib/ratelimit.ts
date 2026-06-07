import type { VercelRequest, VercelResponse } from '@vercel/node';

// --- In-memory rate limiting ---
// Note: Resets on cold starts (serverless), but still useful against burst
// attacks within a single instance lifetime. For production-grade limiting,
// Upstash Redis would be needed.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Limits per minute
const READ_LIMIT = 60;   // GET requests
const WRITE_LIMIT = 20;  // POST, PUT, DELETE requests
const WINDOW_MS = 60_000; // 1 minute

// Max request body size: 1 MB
const MAX_BODY_SIZE = 1_048_576;

/**
 * Clean up expired entries from the store.
 * Called on each request to prevent memory leaks.
 */
function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

/**
 * Check rate limit for a given IP and HTTP method.
 */
export function rateLimit(
  ip: string,
  method: string
): { allowed: boolean; remaining: number; retryAfter: number } {
  cleanup();

  const isWrite = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
  const limit = isWrite ? WRITE_LIMIT : READ_LIMIT;
  const key = `${ip}:${isWrite ? 'write' : 'read'}`;
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // Start a new window
    entry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(key, entry);
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  entry.count++;

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: limit - entry.count, retryAfter: 0 };
}

type VercelHandler = (req: VercelRequest, res: VercelResponse) => any;

/**
 * Wrap a Vercel handler with rate limiting and body size validation.
 */
export function withRateLimit(handler: VercelHandler): VercelHandler {
  return (req: VercelRequest, res: VercelResponse) => {
    // Skip rate limiting for OPTIONS (preflight) requests
    if (req.method === 'OPTIONS') {
      return handler(req, res);
    }

    // Body size validation
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return res.status(413).json({ error: 'Request too large' });
    }

    // Extract client IP
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : (req.socket?.remoteAddress || 'unknown');

    const result = rateLimit(ip, req.method || 'GET');

    // Set rate limit headers
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(result.retryAfter));

    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfter));
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: result.retryAfter,
      });
    }

    return handler(req, res);
  };
}
