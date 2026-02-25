import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../lib/cors';
import { verifyRequest } from '../lib/auth';
import { adminDb } from '../lib/firebase-admin';

const DRINK_TYPES = [
  'drink_arak', 'drink_gin', 'drink_edv', 'drink_licorice',
  'drink_brandyVS', 'drink_brandyVSOP', 'drink_brandyMed',
];

/**
 * GET /api/inventory
 * Returns current bottle inventory computed from the factory_bottling collection.
 * Only approved bottling records are counted.
 *
 * Response: {
 *   bottles: { drink_arak: 120, drink_gin: 45, ... },
 *   total: 165,
 *   updatedAt: "2026-02-25T12:00:00.000Z"
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate caller
  const decoded = await verifyRequest(req.headers.authorization);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized — invalid or missing token' });
  }

  try {
    const snap = await adminDb.collection('factory_bottling').get();

    const bottles: Record<string, number> = {};
    DRINK_TYPES.forEach(dt => { bottles[dt] = 0; });

    snap.docs.forEach(doc => {
      const r = doc.data();
      if (r.drinkType && r.decision === 'approved') {
        const count = parseInt(r.bottleCount, 10) || 0;
        bottles[r.drinkType] = (bottles[r.drinkType] || 0) + count;
      }
    });

    const total = Object.values(bottles).reduce((sum, n) => sum + n, 0);

    return res.status(200).json({
      bottles,
      total,
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to compute inventory: ' + e.message });
  }
}
