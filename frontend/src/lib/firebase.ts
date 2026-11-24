import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;

export async function initFirebase() {
  if (app) return { app, auth, db, functions };

  const firebaseConfig = {
    apiKey: 'AIzaSyDxxx', // Will use emulator in dev
    authDomain: 'demo-setu.firebaseapp.com',
    projectId: 'demo-setu',
    storageBucket: 'demo-setu.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abc123',
  };

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app, 'us-central1');

  // Use emulators in development
  if (import.meta.env.DEV) {
    const { connectAuthEmulator } = await import('firebase/auth');
    const { connectFirestoreEmulator } = await import('firebase/firestore');
    const { connectFunctionsEmulator } = await import('firebase/functions');

    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    } catch (e) {
      // Already connected
    }

    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
    } catch (e) {
      // Already connected
    }

    try {
      connectFunctionsEmulator(functions, 'localhost', 5001);
    } catch (e) {
      // Already connected
    }
  }

  return { app, auth, db, functions };
}

export function getAuthService() {
  if (!auth) throw new Error('Firebase not initialized');
  return auth;
}

export function getFirestoreService() {
  if (!db) throw new Error('Firebase not initialized');
  return db;
}

export function getFunctionsService() {
  if (!functions) throw new Error('Firebase not initialized');
  return functions;
}
