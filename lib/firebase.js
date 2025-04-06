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

// Enhanced error handling for Firebase initialization
let app;
let db;
let auth;
let storage;

try {
  // Check if Firebase app has been initialized before to avoid multiple instances
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  
  // Initialize services
  db = getFirestore(app);
  auth = getAuth(app);
  
  // Make sure we're using the correct storage bucket URL
  storage = getStorage(app, 'gs://blog-4f176.firebasestorage.app');
  
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
} catch (error) {
  console.error('Error initializing Firebase:', error);
  
  // Check for specific configuration errors
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 
      !process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 
      !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.error('Missing required Firebase configuration. Please check your .env.local file.');
  }
  
  // Fallback to prevent app crashes in case of initialization failure
  if (!app && typeof window !== 'undefined') {
    console.warn('Using fallback Firebase configuration for recovery');
    // This is just to prevent crashes, actual operations will still fail
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
  }
}

export { db, auth, storage };
