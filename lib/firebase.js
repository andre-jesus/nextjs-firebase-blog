import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Check if Firebase app has been initialized before to avoid multiple instances
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);
// Make sure we're using the correct storage bucket URL
const storage = getStorage(app, 'gs://blog-4f176.firebasestorage.app');

// Log initialization for debugging in development
if (process.env.NODE_ENV === 'development') {
  console.log('Firebase initialized with config:', {
    apiKey: firebaseConfig.apiKey ? 'Set' : 'Not set',
    authDomain: firebaseConfig.authDomain ? 'Set' : 'Not set',
    projectId: firebaseConfig.projectId ? 'Set' : 'Not set',
    storageBucket: firebaseConfig.storageBucket ? 'Set' : 'Not set',
    app: !!app,
    auth: !!auth,
    db: !!db,
    storage: !!storage
  });
}

export { db, auth, storage };