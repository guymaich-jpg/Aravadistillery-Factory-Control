// sheets-sync.ts — proxy Google Sheets sync requests through the backend.
// The actual Apps Script URL is stored server-side in SHEETS_SYNC_URL env var,
// never exposed to the client. Requires authentication.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../lib/cors';
import { verifyRequest } from '../lib/auth';
import { withRateLimit } from '../lib/ratelimit';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const sheetsUrl = process.env.SHEETS_SYNC_URL;
  if (!sheetsUrl) {
    // If not configured, silently succeed — Sheets sync is optional
    return res.status(200).json({ ok: true, skipped: true, reason: 'SHEETS_SYNC_URL not configured' });
  }

  // Require authentication for POST (data writes)
  if (req.method === 'POST') {
    const decoded = await verifyRequest(req.headers.authorization);
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized — invalid or missing token' });
    }

    try {
      const upstream = await fetch(sheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      // GAS always returns 200 (no-cors mode on client); mirror that here
      return res.status(200).json({ ok: true, status: upstream.status });
    } catch (err) {
      return res.status(502).json({ error: 'Sheets sync upstream failed' });
    }
  }

  // GET: proxy sync-status check
  if (req.method === 'GET') {
    const decoded = await verifyRequest(req.headers.authorization);
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const sheet = req.query.sheet as string;
    try {
      const upstream = await fetch(
        `${sheetsUrl}?action=syncStatus&sheet=${encodeURIComponent(sheet || '')}`,
      );
      const data = await upstream.json();
      return res.status(200).json(data);
    } catch {
      return res.status(502).json({ error: 'Sheets status upstream failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withRateLimit(handler);
