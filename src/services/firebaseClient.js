import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getFirebaseConfig, isFirebaseConfigured } from "./cloudSyncAdapter";

let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;

if (isFirebaseConfigured()) {
  firebaseApp = initializeApp(getFirebaseConfig());
  firebaseAuth = getAuth(firebaseApp);

  try {
    firestoreDb = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch {
    firestoreDb = getFirestore(firebaseApp);
  }
}

export const app = firebaseApp;
export const auth = firebaseAuth;
export const db = firestoreDb;
export const googleProvider = new GoogleAuthProvider();

export function assertFirebaseReady() {
  if (!app || !auth || !db) {
    throw new Error(
      "Firebase belum dikonfigurasi. Isi VITE_FIREBASE_* di .env.local dan Vercel Environment Variables."
    );
  }
}
