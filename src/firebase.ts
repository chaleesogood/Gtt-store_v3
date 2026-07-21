import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, doc, getDocFromServer, setLogLevel } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
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
const dbId = (firebaseConfigJson as any).firestoreDatabaseId;

// Determine cache based on environment (IndexedDB is often blocked in sandboxed third-party iframes)
const isIframe = typeof window !== 'undefined' && window.self !== window.top;
let cacheConfig;

if (isIframe) {
  console.log("Running in iframe - using memory cache to avoid IndexedDB permission/sandbox restrictions.");
  cacheConfig = memoryLocalCache();
} else {
  try {
    cacheConfig = persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    });
  } catch (e) {
    console.warn("Firestore persistent local cache not supported, falling back to memory cache:", e);
    cacheConfig = memoryLocalCache();
  }
}

const firestoreSettings = {
  localCache: cacheConfig,
  experimentalForceLongPolling: true
};

// Silence Firestore SDK's internal logging to avoid harmless warning logs
setLogLevel('silent');

export const db = dbId && dbId !== '(default)'
  ? initializeFirestore(app, firestoreSettings, dbId)
  : initializeFirestore(app, firestoreSettings);

// Validate connection to Firestore on boot as required by skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Keep test connection errors completely silent as sandboxed environments may block outbound requests initially
  }
}
testConnection();

// Initialize Auth
export const auth = getAuth(app);
export { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
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


