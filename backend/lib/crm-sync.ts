import { adminDb } from './firebase-admin';

/**
 * Sync factory per-item bottle counts to the CRM's stockLevels Firestore
 * collection. Keys are CRM product catalog ids — the 19-item catalog is
 * loaded live from Firestore `products`, so ids are not hardcoded here.
 * Values are written 1:1, matching the client's own direct-write path
 * (syncCrmStockLevels in sheets-sync.js) so both paths produce identical
 * data during the client→backend transition.
 *
 * Uses set({ merge: true }) so CRM-managed fields (e.g. minimumStock) are
 * preserved — only factory-owned fields are overwritten.
 */
export async function syncToCrmStockLevels(
  itemCounts: Record<string, number>,
): Promise<void> {
  const now = new Date().toISOString();
  const batch = adminDb.batch();

  for (const [productId, currentStock] of Object.entries(itemCounts)) {
    const ref = adminDb.collection('stockLevels').doc(productId);
    batch.set(ref, {
      productId,
      currentStock,
      unit: 'בקבוק',
      lastUpdated: now,
      factoryLastSync: now,
    }, { merge: true });
  }

  await batch.commit();
}
