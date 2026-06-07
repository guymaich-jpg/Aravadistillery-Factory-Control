import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../lib/cors';
import { withRateLimit } from '../lib/ratelimit';

function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'aravadistillery-backend',
  });
}

export default withRateLimit(handler);
