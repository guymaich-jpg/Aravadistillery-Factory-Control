import * as admin from 'firebase-admin';

let _initError: string | null = null;

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawKey) {
    _initError = `Missing env vars: ${[
      !projectId && 'FIREBASE_PROJECT_ID',
      !clientEmail && 'FIREBASE_CLIENT_EMAIL',
      !rawKey && 'FIREBASE_PRIVATE_KEY',
    ].filter(Boolean).join(', ')}`;
    console.error('[firebase-admin]', _initError);
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: rawKey.replace(/\\n/g, '\n'),
        }),
      });
    } catch (e: any) {
      _initError = 'initializeApp failed: ' + (e.message || e);
      console.error('[firebase-admin]', _initError);
    }
  }
}

export function getFirebaseInitError(): string | null {
  return _initError;
}

export const adminAuth = admin.apps.length ? admin.auth() : (null as any);
export const adminDb = admin.apps.length ? admin.firestore() : (null as any);
