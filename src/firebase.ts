import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import firebaseConfigJson from '../firebase-applet-config.json';

// Initialize Firebase using values from config JSON
const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore targeting the specific databaseId if provided, with local cache persistence
const dbId = firebaseConfigJson.firestoreDatabaseId;
const firestoreSettings = {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
};

export const db = dbId && dbId !== '(default)'
  ? initializeFirestore(app, firestoreSettings, dbId)
  : initializeFirestore(app, firestoreSettings);

// Initialize Auth
export const auth = getAuth(app);
export { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
};

export function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as any;
  }
  const result: any = {};
  Object.entries(obj as Record<string, any>).forEach(([key, val]) => {
    if (val !== undefined) {
      if (typeof val === 'object' && val !== null) {
        result[key] = cleanUndefined(val);
      } else {
        result[key] = val;
      }
    }
  });
  return result as T;
}


