import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let firestoreInstance: Firestore | null = null;

function initApp(): App {
  if (getApps().length) return getApps()[0]!;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env",
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export function db(): Firestore {
  if (firestoreInstance) return firestoreInstance;
  initApp();
  firestoreInstance = getFirestore();
  // Switch to HTTPS/REST transport. gRPC's keepalive can stall on networks
  // that block long-lived connections (some ISPs, corporate proxies),
  // surfacing as 60s DEADLINE_EXCEEDED on the first write. REST is slower
  // per request but reliable everywhere HTTPS works.
  firestoreInstance.settings({
    preferRest: true,
    // Firestore otherwise rejects explicit `undefined` values; we have several
    // optional-by-default doc shapes (mock-test section state, etc.), so let it
    // strip them rather than 500-ing the request.
    ignoreUndefinedProperties: true,
  });
  return firestoreInstance;
}
