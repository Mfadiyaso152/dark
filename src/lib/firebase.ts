import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey || "AIzaSyBQp80jJi8KVZXGlx9Reg60c86LNtkrD6A",
  authDomain: firebaseConfigJson.authDomain || "thanwy-15084.firebaseapp.com",
  projectId: firebaseConfigJson.projectId || "thanwy-15084",
  storageBucket: firebaseConfigJson.storageBucket || "thanwy-15084.firebasestorage.app",
  messagingSenderId: firebaseConfigJson.messagingSenderId || "41455937556",
  appId: firebaseConfigJson.appId || "1:41455937556:web:786ffe4041eb8429505f01",
  measurementId: firebaseConfigJson.measurementId || "G-ZW5RM8V9E7"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = (() => {
  try {
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true
    });
  } catch (err) {
    return getFirestore(app, (firebaseConfigJson as any).firestoreDatabaseId || '(default)');
  }
})();

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  firebaseSignOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  writeBatch
};
export type { FirebaseUser };
