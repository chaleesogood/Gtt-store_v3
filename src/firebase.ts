import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
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

// Initialize Firestore targeting the specific databaseId if provided
const dbId = firebaseConfigJson.firestoreDatabaseId;
export const db = dbId && dbId !== '(default)'
  ? getFirestore(app, dbId)
  : getFirestore(app);

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

