import admin from 'firebase-admin';

let cachedApp: admin.app.App | null = null;

function getFirebaseAdminApp(): admin.app.App {
  if (cachedApp) return cachedApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin is not configured on server. Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.');
  }

  if (admin.apps.length) {
    cachedApp = admin.app();
    return cachedApp;
  }

  cachedApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return cachedApp;
}

export async function verifyFirebasePhoneToken(firebaseIdToken: string): Promise<string> {
  if (!firebaseIdToken) {
    throw new Error('Missing Firebase ID token');
  }

  const app = getFirebaseAdminApp();
  const decoded = await app.auth().verifyIdToken(firebaseIdToken, true);

  if (!decoded.phone_number) {
    throw new Error('Firebase token does not contain a verified phone number');
  }

  return decoded.phone_number;
}
