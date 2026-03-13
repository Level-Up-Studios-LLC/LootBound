/**
 * Firebase configuration and initialization for Quest Board.
 *
 * Initializes Firebase App, Firestore (with offline persistence),
 * Authentication, and Storage.
 *
 * Create a .env file in the project root with your Firebase config values.
 * See .env.example for the required keys.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

var firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env
    .VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

var app = initializeApp(firebaseConfig);
var db = getFirestore(app);
var auth = getAuth(app);
var storage = getStorage(app);

// Enable offline persistence — Firestore caches data in IndexedDB
// so the app works fully offline and syncs when connectivity returns.
enableIndexedDbPersistence(db).catch(function (err) {
  if (err.code === 'failed-precondition') {
    console.warn(
      'Firestore persistence unavailable: multiple tabs open. Only one tab can use offline persistence at a time.'
    );
  } else if (err.code === 'unimplemented') {
    console.warn(
      'Firestore persistence unavailable: this browser does not support IndexedDB persistence.'
    );
  }
});

export { app, db, auth, storage };
