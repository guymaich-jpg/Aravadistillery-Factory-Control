// ============================================================
// Quick Access API Unit Tests — Node.js (no browser needed)
// Tests: CRUD operations, validation, auth, deduplication, edge cases
// Run: node tests/quick-access.test.js
// ============================================================
const assert = require('assert');

// ---- In-memory Firestore mock ----
const _firestoreData = {};

function makeDocRef(collection, docId) {
  return {
    get: async () => {
      const data = _firestoreData[collection]?.[docId];
      return {
        exists: !!data,
        data: () => data ? JSON.parse(JSON.stringify(data)) : undefined,
      };
    },
    set: async (doc) => {
      if (!_firestoreData[collection]) _firestoreData[collection] = {};
      _firestoreData[collection][docId] = JSON.parse(JSON.stringify(doc));
    },
    delete: async () => {
      if (_firestoreData[collection]) delete _firestoreData[collection][docId];
    },
  };
}

function makeCollectionRef(collection) {
  return {
    doc: (docId) => makeDocRef(collection, docId),
    orderBy: () => ({
      get: async () => {
        const docs = _firestoreData[collection] || {};
        const entries = Object.values(docs).sort((a, b) =>
          (a.label || '').localeCompare(b.label || '')
        );
        return {
          forEach: (cb) => entries.forEach(d => cb({
            data: () => JSON.parse(JSON.stringify(d)),
          })),
        };
      },
    }),
  };
}

const mockAdminDb = { collection: (name) => makeCollectionRef(name) };

// ---- Mock req/res helpers ----
function makeReq({ method = 'GET', query = {}, body = {}, auth = true, role = 'admin' } = {}) {
  return {
    method,
    query,
    body,
    headers: {
      authorization: auth ? 'Bearer mock-token' : undefined,
      origin: 'http://localhost:8080',
    },
    _role: role,
    _auth: auth,
  };
}

function makeRes() {
  const res = {
    _status: null,
    _json: null,
    _headers: {},
    _ended: false,
    status(code) { res._status = code; return res; },
    json(data) { res._json = data; return res; },
    setHeader(k, v) { res._headers[k] = v; return res; },
    end() { res._ended = true; return res; },
  };
  return res;
}

// ---- Mock modules by rewriting the handler logic inline ----
// Since the API is TypeScript/ESM and we can't import it directly,
// we replicate the handler logic using our mocks (same approach as inventory.test.js)

const COLLECTION = 'factory_quickAccess';

async function verifyRequest(authHeader, role) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return { uid: 'test-uid', email: 'test@test.com', role: role || 'admin' };
}

function hasManagementAccess(decoded) {
  return decoded.role === 'admin' || decoded.role === 'manager';
}

function handleCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}

// Full handler reimplemented with our mocks
async function handler(req, res) {
  if (handleCors(req, res)) return;

  const decoded = await verifyRequest(req.headers.authorization, req._role);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized — invalid or missing token' });
  }
  if (!hasManagementAccess(decoded)) {
    return res.status(403).json({ error: 'Forbidden — admin or manager role required' });
  }

  switch (req.method) {
    case 'GET': return handleGet(req, res);
    case 'POST': return handlePost(req, res);
    case 'PUT': return handlePut(req, res);
    case 'DELETE': return handleDelete(req, res);
    default: return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req, res) {
  try {
    const criterion = req.query.criterion;
    if (criterion) {
      const doc = await mockAdminDb.collection(COLLECTION).doc(criterion).get();
      if (!doc.exists) return res.status(404).json({ error: `Criterion "${criterion}" not found` });
      return res.status(200).json(doc.data());
    }
    const snap = await mockAdminDb.collection(COLLECTION).orderBy('label').get();
    const results = [];
    snap.forEach(doc => results.push(doc.data()));
    return res.status(200).json({ criteria: results, count: results.length });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to read quick-access: ' + e.message });
  }
}

async function handlePost(req, res) {
  try {
    const { criterion, label, items } = req.body || {};
    if (!criterion || typeof criterion !== 'string')
      return res.status(400).json({ error: 'Missing or invalid "criterion" string' });
    if (!label || typeof label !== 'string')
      return res.status(400).json({ error: 'Missing or invalid "label" string' });
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: '"items" must be a non-empty array of { key, label }' });
    for (const item of items) {
      if (!item.key || !item.label)
        return res.status(400).json({ error: 'Each item must have "key" and "label" fields' });
    }
    const existing = await mockAdminDb.collection(COLLECTION).doc(criterion).get();
    if (existing.exists)
      return res.status(409).json({ error: `Criterion "${criterion}" already exists. Use PUT to modify it.` });

    const now = new Date().toISOString();
    const doc = { criterion, label, items: items.map(i => ({ key: i.key, label: i.label })), createdAt: now, updatedAt: now };
    await mockAdminDb.collection(COLLECTION).doc(criterion).set(doc);
    return res.status(201).json({ success: true, ...doc });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to create criterion: ' + e.message });
  }
}

async function handlePut(req, res) {
  try {
    const { criterion, action } = req.body || {};
    if (!criterion || typeof criterion !== 'string')
      return res.status(400).json({ error: 'Missing or invalid "criterion" string' });

    const docRef = mockAdminDb.collection(COLLECTION).doc(criterion);
    const docSnap = await docRef.get();
    if (!docSnap.exists)
      return res.status(404).json({ error: `Criterion "${criterion}" not found` });

    const data = docSnap.data();
    const now = new Date().toISOString();

    if (action === 'add_items') {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0)
        return res.status(400).json({ error: '"items" must be a non-empty array' });
      for (const item of items) {
        if (!item.key || !item.label)
          return res.status(400).json({ error: 'Each item must have "key" and "label"' });
      }
      const existingKeys = new Set(data.items.map(i => i.key));
      const newItems = items.filter(i => !existingKeys.has(i.key));
      if (newItems.length === 0)
        return res.status(200).json({ success: true, message: 'All items already exist', ...data });
      data.items.push(...newItems.map(i => ({ key: i.key, label: i.label })));
      data.updatedAt = now;
      await docRef.set(data);
      return res.status(200).json({ success: true, added: newItems.length, ...data });
    }

    if (action === 'remove_items') {
      const { keys } = req.body;
      if (!Array.isArray(keys) || keys.length === 0)
        return res.status(400).json({ error: '"keys" must be a non-empty array of strings' });
      const removeSet = new Set(keys);
      const before = data.items.length;
      data.items = data.items.filter(i => !removeSet.has(i.key));
      data.updatedAt = now;
      await docRef.set(data);
      return res.status(200).json({ success: true, removed: before - data.items.length, ...data });
    }

    if (action === 'update_label') {
      const { label } = req.body;
      if (!label || typeof label !== 'string')
        return res.status(400).json({ error: 'Missing or invalid "label" string' });
      data.label = label;
      data.updatedAt = now;
      await docRef.set(data);
      return res.status(200).json({ success: true, ...data });
    }

    return res.status(400).json({ error: 'Invalid "action". Must be "add_items", "remove_items", or "update_label"' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to update criterion: ' + e.message });
  }
}

async function handleDelete(req, res) {
  try {
    const { criterion } = req.body || {};
    if (!criterion || typeof criterion !== 'string')
      return res.status(400).json({ error: 'Missing or invalid "criterion" string' });
    const docRef = mockAdminDb.collection(COLLECTION).doc(criterion);
    const docSnap = await docRef.get();
    if (!docSnap.exists)
      return res.status(404).json({ error: `Criterion "${criterion}" not found` });
    await docRef.delete();
    return res.status(200).json({ success: true, deleted: criterion });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to delete criterion: ' + e.message });
  }
}

// ---- Clear DB between tests ----
function clearDb() {
  Object.keys(_firestoreData).forEach(k => delete _firestoreData[k]);
}

// ============================================================
// Test runner
// ============================================================
let passed = 0;
let failed = 0;

async function test(name, fn) {
  clearDb();
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
  }
}

// Helper: seed a criterion directly
async function seedCriterion(criterion, label, items) {
  const now = new Date().toISOString();
  await mockAdminDb.collection(COLLECTION).doc(criterion).set({
    criterion, label, items, createdAt: now, updatedAt: now,
  });
}

(async () => {
  console.log('\n=== Quick Access API Tests ===\n');

  // ---- AUTH ----
  console.log('Auth & CORS:');

  await test('OPTIONS returns 204 (CORS preflight)', async () => {
    const req = makeReq({ method: 'OPTIONS' });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 204);
    assert.ok(res._ended);
  });

  await test('returns 401 when no auth token', async () => {
    const req = makeReq({ auth: false });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 401);
  });

  await test('returns 403 when role is worker', async () => {
    const req = makeReq({ role: 'worker' });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 403);
  });

  await test('allows admin role', async () => {
    const req = makeReq({ method: 'GET', role: 'admin' });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
  });

  await test('allows manager role', async () => {
    const req = makeReq({ method: 'GET', role: 'manager' });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
  });

  await test('returns 405 for unsupported method', async () => {
    const req = makeReq({ method: 'PATCH' });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 405);
  });

  // ---- GET ----
  console.log('\nGET /api/quick-access:');

  await test('returns empty list when no criteria exist', async () => {
    const req = makeReq({ method: 'GET' });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
    assert.strictEqual(res._json.count, 0);
    assert.deepStrictEqual(res._json.criteria, []);
  });

  await test('returns all criteria sorted by label', async () => {
    await seedCriterion('zzz', 'Zebra', [{ key: 'z1', label: 'Z1' }]);
    await seedCriterion('aaa', 'Alpha', [{ key: 'a1', label: 'A1' }]);
    const req = makeReq({ method: 'GET' });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
    assert.strictEqual(res._json.count, 2);
    assert.strictEqual(res._json.criteria[0].criterion, 'aaa');
    assert.strictEqual(res._json.criteria[1].criterion, 'zzz');
  });

  await test('returns single criterion by query param', async () => {
    await seedCriterion('drink_types', 'Drink Types', [
      { key: 'drink_arak', label: 'Arak' },
      { key: 'drink_gin', label: 'Gin' },
    ]);
    const req = makeReq({ method: 'GET', query: { criterion: 'drink_types' } });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
    assert.strictEqual(res._json.criterion, 'drink_types');
    assert.strictEqual(res._json.items.length, 2);
  });

  await test('returns 404 for nonexistent criterion', async () => {
    const req = makeReq({ method: 'GET', query: { criterion: 'nonexistent' } });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 404);
  });

  // ---- POST ----
  console.log('\nPOST /api/quick-access:');

  await test('creates a new criterion', async () => {
    const req = makeReq({
      method: 'POST',
      body: {
        criterion: 'test_crit',
        label: 'Test Criterion',
        items: [{ key: 'item1', label: 'Item 1' }, { key: 'item2', label: 'Item 2' }],
      },
    });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 201);
    assert.ok(res._json.success);
    assert.strictEqual(res._json.criterion, 'test_crit');
    assert.strictEqual(res._json.items.length, 2);
    assert.ok(res._json.createdAt);
    assert.ok(res._json.updatedAt);
  });

  await test('rejects duplicate criterion (409)', async () => {
    await seedCriterion('existing', 'Existing', [{ key: 'a', label: 'A' }]);
    const req = makeReq({
      method: 'POST',
      body: { criterion: 'existing', label: 'Dup', items: [{ key: 'b', label: 'B' }] },
    });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 409);
  });

  await test('rejects missing criterion field', async () => {
    const req = makeReq({ method: 'POST', body: { label: 'X', items: [{ key: 'a', label: 'A' }] } });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 400);
    assert.ok(res._json.error.includes('criterion'));
  });

  await test('rejects missing label field', async () => {
    const req = makeReq({ method: 'POST', body: { criterion: 'x', items: [{ key: 'a', label: 'A' }] } });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 400);
    assert.ok(res._json.error.includes('label'));
  });

  await test('rejects empty items array', async () => {
    const req = makeReq({ method: 'POST', body: { criterion: 'x', label: 'X', items: [] } });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 400);
  });

  await test('rejects items without key field', async () => {
    const req = makeReq({ method: 'POST', body: { criterion: 'x', label: 'X', items: [{ label: 'A' }] } });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 400);
    assert.ok(res._json.error.includes('key'));
  });

  await test('rejects items without label field', async () => {
    const req = makeReq({ method: 'POST', body: { criterion: 'x', label: 'X', items: [{ key: 'a' }] } });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 400);
    assert.ok(res._json.error.includes('label'));
  });

  await test('strips extra fields from items', async () => {
    const req = makeReq({
      method: 'POST',
      body: { criterion: 'clean', label: 'Clean', items: [{ key: 'a', label: 'A', extra: 'HACK' }] },
    });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 201);
    assert.strictEqual(res._json.items[0].extra, undefined);
  });

  // ---- PUT: add_items ----
  console.log('\nPUT /api/quick-access (add_items):');

  await test('adds new items to existing criterion', async () => {
    await seedCriterion('drinks', 'Drinks', [{ key: 'arak', label: 'Arak' }]);
    const req = makeReq({
      method: 'PUT',
      body: { criterion: 'drinks', action: 'add_items', items: [{ key: 'gin', label: 'Gin' }] },
    });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
    assert.strictEqual(res._json.added, 1);
    assert.strictEqual(res._json.items.length, 2);
    assert.strictEqual(res._json.items[1].key, 'gin');
  });

  await test('deduplicates items that already exist', async () => {
    await seedCriterion('drinks', 'Drinks', [{ key: 'arak', label: 'Arak' }]);
    const req = makeReq({
      method: 'PUT',
      body: { criterion: 'drinks', action: 'add_items', items: [{ key: 'arak', label: 'Arak Again' }] },
    });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
    assert.ok(res._json.message); // "All items already exist"
    assert.strictEqual(res._json.items.length, 1);
  });

  await test('adds only new items when mix of existing and new', async () => {
    await seedCriterion('drinks', 'Drinks', [{ key: 'arak', label: 'Arak' }]);
    const req = makeReq({
      method: 'PUT',
      body: {
        criterion: 'drinks', action: 'add_items',
        items: [{ key: 'arak', label: 'Arak' }, { key: 'gin', label: 'Gin' }, { key: 'edv', label: 'EDV' }],
      },
    });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
    assert.strictEqual(res._json.added, 2);
    assert.strictEqual(res._json.items.length, 3);
  });

  await test('returns 404 when adding items to nonexistent criterion', async () => {
    const req = makeReq({
      method: 'PUT',
      body: { criterion: 'nope', action: 'add_items', items: [{ key: 'a', label: 'A' }] },
    });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 404);
  });

  await test('rejects add_items with empty items array', async () => {
    await seedCriterion('drinks', 'Drinks', [{ key: 'arak', label: 'Arak' }]);
    const req = makeReq({
      method: 'PUT',
      body: { criterion: 'drinks', action: 'add_items', items: [] },
    });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 400);
  });

  // ---- PUT: remove_items ----
  console.log('\nPUT /api/quick-access (remove_items):');

  await test('removes items by key', async () => {
    await seedCriterion('drinks', 'Drinks', [
      { key: 'arak', label: 'Arak' },
      { key: 'gin', label: 'Gin' },
      { key: 'edv', label: 'EDV' },
    ]);
    const req = makeReq({
      method: 'PUT',
      body: { criterion: 'drinks', action: 'remove_items', keys: ['gin'] },
    });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
    assert.strictEqual(res._json.removed, 1);
    assert.strictEqual(res._json.items.length, 2);
    assert.ok(res._json.items.every(i => i.key !== 'gin'));
  });

  await test('removes multiple items at once', async () => {
    await seedCriterion('drinks', 'Drinks', [
      { key: 'arak', label: 'Arak' },
      { key: 'gin', label: 'Gin' },
      { key: 'edv', label: 'EDV' },
    ]);
    const req = makeReq({
      method: 'PUT',
      body: { criterion: 'drinks', action: 'remove_items', keys: ['arak', 'edv'] },
    });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
    assert.strictEqual(res._json.removed, 2);
    assert.strictEqual(res._json.items.length, 1);
    assert.strictEqual(res._json.items[0].key, 'gin');
  });

  await test('removing nonexistent keys reports 0 removed', async () => {
    await seedCriterion('drinks', 'Drinks', [{ key: 'arak', label: 'Arak' }]);
    const req = makeReq({
      method: 'PUT',
      body: { criterion: 'drinks', action: 'remove_items', keys: ['nonexistent'] },
    });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
    assert.strictEqual(res._json.removed, 0);
    assert.strictEqual(res._json.items.length, 1);
  });

  await test('rejects remove_items with empty keys array', async () => {
    await seedCriterion('drinks', 'Drinks', [{ key: 'arak', label: 'Arak' }]);
    const req = makeReq({
      method: 'PUT',
      body: { criterion: 'drinks', action: 'remove_items', keys: [] },
    });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 400);
  });

  // ---- PUT: update_label ----
  console.log('\nPUT /api/quick-access (update_label):');

  await test('updates criterion label', async () => {
    await seedCriterion('drinks', 'Drinks', [{ key: 'arak', label: 'Arak' }]);
    const req = makeReq({
      method: 'PUT',
      body: { criterion: 'drinks', action: 'update_label', label: 'Beverages' },
    });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
    assert.strictEqual(res._json.label, 'Beverages');
    assert.strictEqual(res._json.items.length, 1); // items untouched
  });

  await test('rejects update_label with missing label', async () => {
    await seedCriterion('drinks', 'Drinks', [{ key: 'arak', label: 'Arak' }]);
    const req = makeReq({
      method: 'PUT',
      body: { criterion: 'drinks', action: 'update_label' },
    });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 400);
  });

  // ---- PUT: invalid action ----
  await test('rejects invalid action', async () => {
    await seedCriterion('drinks', 'Drinks', [{ key: 'arak', label: 'Arak' }]);
    const req = makeReq({
      method: 'PUT',
      body: { criterion: 'drinks', action: 'drop_table' },
    });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 400);
    assert.ok(res._json.error.includes('Invalid'));
  });

  await test('rejects PUT with missing criterion', async () => {
    const req = makeReq({ method: 'PUT', body: { action: 'add_items', items: [{ key: 'a', label: 'A' }] } });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 400);
  });

  // ---- DELETE ----
  console.log('\nDELETE /api/quick-access:');

  await test('deletes an existing criterion', async () => {
    await seedCriterion('temp', 'Temporary', [{ key: 't1', label: 'T1' }]);
    const req = makeReq({ method: 'DELETE', body: { criterion: 'temp' } });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
    assert.ok(res._json.success);
    assert.strictEqual(res._json.deleted, 'temp');

    // Verify it's gone
    const getReq = makeReq({ method: 'GET', query: { criterion: 'temp' } });
    const getRes = makeRes();
    await handler(getReq, getRes);
    assert.strictEqual(getRes._status, 404);
  });

  await test('returns 404 when deleting nonexistent criterion', async () => {
    const req = makeReq({ method: 'DELETE', body: { criterion: 'nope' } });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 404);
  });

  await test('rejects DELETE with missing criterion', async () => {
    const req = makeReq({ method: 'DELETE', body: {} });
    const res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 400);
  });

  // ---- FULL CRUD FLOW ----
  console.log('\nFull CRUD flow:');

  await test('create → read → add items → remove items → rename → delete', async () => {
    // 1. Create
    let req = makeReq({
      method: 'POST',
      body: { criterion: 'flow_test', label: 'Flow', items: [{ key: 'a', label: 'Alpha' }] },
    });
    let res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 201);

    // 2. Read
    req = makeReq({ method: 'GET', query: { criterion: 'flow_test' } });
    res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
    assert.strictEqual(res._json.items.length, 1);

    // 3. Add items
    req = makeReq({
      method: 'PUT',
      body: { criterion: 'flow_test', action: 'add_items', items: [{ key: 'b', label: 'Beta' }, { key: 'c', label: 'Gamma' }] },
    });
    res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
    assert.strictEqual(res._json.items.length, 3);

    // 4. Remove items
    req = makeReq({
      method: 'PUT',
      body: { criterion: 'flow_test', action: 'remove_items', keys: ['b'] },
    });
    res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
    assert.strictEqual(res._json.items.length, 2);

    // 5. Rename
    req = makeReq({
      method: 'PUT',
      body: { criterion: 'flow_test', action: 'update_label', label: 'Renamed Flow' },
    });
    res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
    assert.strictEqual(res._json.label, 'Renamed Flow');

    // 6. Delete
    req = makeReq({ method: 'DELETE', body: { criterion: 'flow_test' } });
    res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);

    // 7. Confirm gone
    req = makeReq({ method: 'GET', query: { criterion: 'flow_test' } });
    res = makeRes();
    await handler(req, res);
    assert.strictEqual(res._status, 404);
  });

  // ---- SEED DATA VERIFICATION ----
  console.log('\nSeed data verification:');

  await test('seed data has correct structure for all 15 criteria', async () => {
    const fs = require('fs');
    const path = require('path');

    // Verify the reference file exists and has content
    const mdPath = path.join(__dirname, '..', 'quick-access.md');
    assert.ok(fs.existsSync(mdPath), 'quick-access.md should exist');
    const md = fs.readFileSync(mdPath, 'utf8');

    // Verify the seed script exists
    const seedPath = path.join(__dirname, '..', 'backend', 'scripts', 'seed-quick-access.ts');
    assert.ok(fs.existsSync(seedPath), 'seed-quick-access.ts should exist');
    const seedSrc = fs.readFileSync(seedPath, 'utf8');

    // Check all 15 criteria exist in both seed script and reference file
    const expectedCriteria = [
      'suppliers_raw', 'suppliers_dates', 'categories',
      'items_spices', 'items_labels', 'items_packaging',
      'drink_types', 'tank_sizes', 'd1_types', 'still_names',
      'd2_product_types', 'bottling_color', 'bottling_taste',
      'bottling_decision', 'user_roles',
    ];
    for (const c of expectedCriteria) {
      assert.ok(md.includes(c), `Reference file should contain criterion "${c}"`);
      assert.ok(seedSrc.includes(`criterion: '${c}'`), `Seed script should contain criterion "${c}"`);
    }
  });

  await test('reference file documents API usage examples', async () => {
    const fs = require('fs');
    const path = require('path');
    const md = fs.readFileSync(path.join(__dirname, '..', 'quick-access.md'), 'utf8');
    assert.ok(md.includes('GET /api/quick-access'));
    assert.ok(md.includes('POST /api/quick-access'));
    assert.ok(md.includes('PUT /api/quick-access'));
    assert.ok(md.includes('DELETE /api/quick-access'));
  });

  // ---- SUMMARY ----
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
