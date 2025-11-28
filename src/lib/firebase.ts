import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate configuration
const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
];

// Debug: Log environment variables
console.log('🔍 Checking environment variables...');
console.log('API Key exists:', !!import.meta.env.VITE_FIREBASE_API_KEY);
console.log('Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);

const missingVars = requiredEnvVars.filter(
    (varName) => !import.meta.env[varName]
);

if (missingVars.length > 0) {
    console.error('❌ Missing Firebase env vars:', missingVars);
    throw new Error(
        `Missing required Firebase environment variables: ${missingVars.join(', ')}`
    );
}

console.log('✅ All Firebase environment variables loaded successfully');

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let analytics: Analytics | null = null;

// Initialize Firebase app
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

// Initialize Firebase services
auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);

// Initialize Analytics (only in production, not in development)
if (typeof window !== 'undefined' && import.meta.env.PROD) {
    analytics = getAnalytics(app);
}

// Connect to emulators in development mode (optional)
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    const EMULATOR_HOST = 'localhost';
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`);
    connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
    connectStorageEmulator(storage, EMULATOR_HOST, 9199);
    console.log('🔧 Connected to Firebase Emulators');
}

// Export Firebase services
export { app, auth, db, storage, analytics };

// Export Firebase SDK modules for use in components/services
export {
    // Auth
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
    confirmPasswordReset,
} from 'firebase/auth';

export type {
    User,
    AuthError,
} from 'firebase/auth';

export {
    // Firestore
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    increment,
    arrayUnion,
    arrayRemove,
} from 'firebase/firestore';

export type {
    DocumentReference,
    CollectionReference,
    QuerySnapshot,
    DocumentSnapshot,
    QueryConstraint,
} from 'firebase/firestore';

export {
    // Storage
    ref,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll,
} from 'firebase/storage';

export type {
    StorageReference,
    UploadTask,
} from 'firebase/storage';

export {
    // Analytics
    logEvent,
    setUserProperties,
} from 'firebase/analytics';
