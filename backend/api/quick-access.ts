import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../lib/cors';
import { verifyRequest, hasManagementAccess } from '../lib/auth';
import { adminDb } from '../lib/firebase-admin';

const COLLECTION = 'factory_quickAccess';

interface QuickAccessItem {
  key: string;
  label: string;
}

interface QuickAccessDoc {
  criterion: string;
  label: string;
  items: QuickAccessItem[];
  createdAt: string;
  updatedAt: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  // All quick-access operations require admin/manager auth
  const decoded = await verifyRequest(req.headers.authorization);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized — invalid or missing token' });
  }
  if (!hasManagementAccess(decoded)) {
    return res.status(403).json({ error: 'Forbidden — admin or manager role required' });
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    case 'PUT':
      return handlePut(req, res);
    case 'DELETE':
      return handleDelete(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// GET /api/quick-access              — list all criteria
// GET /api/quick-access?criterion=x  — get one criterion
async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    const criterion = req.query.criterion as string | undefined;

    if (criterion) {
      const doc = await adminDb.collection(COLLECTION).doc(criterion).get();
      if (!doc.exists) {
        return res.status(404).json({ error: `Criterion "${criterion}" not found` });
      }
      return res.status(200).json(doc.data());
    }

    const snap = await adminDb.collection(COLLECTION).orderBy('label').get();
    const results: QuickAccessDoc[] = [];
    snap.forEach(doc => results.push(doc.data() as QuickAccessDoc));
    return res.status(200).json({ criteria: results, count: results.length });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to read quick-access: ' + e.message });
  }
}

// POST /api/quick-access — create a new criterion with items
// Body: { criterion: string, label: string, items: [{ key, label }] }
async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    const { criterion, label, items } = req.body || {};

    if (!criterion || typeof criterion !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "criterion" string' });
    }
    if (!label || typeof label !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "label" string' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '"items" must be a non-empty array of { key, label }' });
    }

    // Validate item structure
    for (const item of items) {
      if (!item.key || !item.label) {
        return res.status(400).json({ error: 'Each item must have "key" and "label" fields' });
      }
    }

    // Check if criterion already exists
    const existing = await adminDb.collection(COLLECTION).doc(criterion).get();
    if (existing.exists) {
      return res.status(409).json({ error: `Criterion "${criterion}" already exists. Use PUT to modify it.` });
    }

    const now = new Date().toISOString();
    const doc: QuickAccessDoc = {
      criterion,
      label,
      items: items.map((i: QuickAccessItem) => ({ key: i.key, label: i.label })),
      createdAt: now,
      updatedAt: now,
    };

    await adminDb.collection(COLLECTION).doc(criterion).set(doc);
    return res.status(201).json({ success: true, ...doc });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to create criterion: ' + e.message });
  }
}

// PUT /api/quick-access — modify a criterion
// Body: { criterion: string, action: "add_items" | "remove_items" | "update_label", ... }
//   add_items:    { items: [{ key, label }] }
//   remove_items: { keys: [string] }
//   update_label: { label: string }
async function handlePut(req: VercelRequest, res: VercelResponse) {
  try {
    const { criterion, action } = req.body || {};

    if (!criterion || typeof criterion !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "criterion" string' });
    }

    const docRef = adminDb.collection(COLLECTION).doc(criterion);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: `Criterion "${criterion}" not found` });
    }

    const data = docSnap.data() as QuickAccessDoc;
    const now = new Date().toISOString();

    if (action === 'add_items') {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: '"items" must be a non-empty array' });
      }
      for (const item of items) {
        if (!item.key || !item.label) {
          return res.status(400).json({ error: 'Each item must have "key" and "label"' });
        }
      }

      // Deduplicate: skip items whose key already exists
      const existingKeys = new Set(data.items.map(i => i.key));
      const newItems = items.filter((i: QuickAccessItem) => !existingKeys.has(i.key));
      if (newItems.length === 0) {
        return res.status(200).json({ success: true, message: 'All items already exist', ...data });
      }

      data.items.push(...newItems.map((i: QuickAccessItem) => ({ key: i.key, label: i.label })));
      data.updatedAt = now;
      await docRef.set(data);
      return res.status(200).json({ success: true, added: newItems.length, ...data });
    }

    if (action === 'remove_items') {
      const { keys } = req.body;
      if (!Array.isArray(keys) || keys.length === 0) {
        return res.status(400).json({ error: '"keys" must be a non-empty array of strings' });
      }
      const removeSet = new Set(keys);
      const before = data.items.length;
      data.items = data.items.filter(i => !removeSet.has(i.key));
      data.updatedAt = now;
      await docRef.set(data);
      return res.status(200).json({ success: true, removed: before - data.items.length, ...data });
    }

    if (action === 'update_label') {
      const { label } = req.body;
      if (!label || typeof label !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid "label" string' });
      }
      data.label = label;
      data.updatedAt = now;
      await docRef.set(data);
      return res.status(200).json({ success: true, ...data });
    }

    return res.status(400).json({
      error: 'Invalid "action". Must be "add_items", "remove_items", or "update_label"',
    });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to update criterion: ' + e.message });
  }
}

// DELETE /api/quick-access — delete an entire criterion
// Body: { criterion: string }
async function handleDelete(req: VercelRequest, res: VercelResponse) {
  try {
    const { criterion } = req.body || {};

    if (!criterion || typeof criterion !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "criterion" string' });
    }

    const docRef = adminDb.collection(COLLECTION).doc(criterion);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: `Criterion "${criterion}" not found` });
    }

    await docRef.delete();
    return res.status(200).json({ success: true, deleted: criterion });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to delete criterion: ' + e.message });
  }
}
