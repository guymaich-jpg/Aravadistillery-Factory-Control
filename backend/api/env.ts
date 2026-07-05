import type { VercelRequest, VercelResponse } from '@vercel/node';

// Serves environment config as an inline JS script.
// The frontend loads this before firebase.js so Firebase can be initialized
// with the correct project per environment (staging vs production).
// All actual keys live in Vercel environment variables — never in git.
export default function handler(_req: VercelRequest, res: VercelResponse) {
  const config = {
    firebaseApiKey:            process.env.FIREBASE_API_KEY            || '',
    firebaseAuthDomain:        process.env.FIREBASE_AUTH_DOMAIN        || '',
    firebaseProjectId:         process.env.FIREBASE_PROJECT_ID         || '',
    firebaseStorageBucket:     process.env.FIREBASE_STORAGE_BUCKET     || '',
    firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    firebaseAppId:             process.env.FIREBASE_APP_ID             || '',
    environment:               process.env.APP_ENV                     || 'development',
  };

  // 5-minute browser cache, 60-second CDN cache — config rarely changes
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=60');
  res.status(200).send(`window.__FC_CONFIG__ = ${JSON.stringify(config)};`);
}
