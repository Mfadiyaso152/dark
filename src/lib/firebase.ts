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
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

// Your web app's Firebase configuration from user
export const firebaseConfig = {
  apiKey: "AIzaSyBQp80jJi8KVZXGlx9Reg60c86LNtkrD6A",
  authDomain: "thanwy-15084.firebaseapp.com",
  projectId: "thanwy-15084",
  storageBucket: "thanwy-15084.firebasestorage.app",
  messagingSenderId: "41455937556",
  appId: "1:41455937556:web:786ffe4041eb8429505f01",
  measurementId: "G-ZW5RM8V9E7"
};

// Initialize Firebase with ignoreUndefinedProperties and robust offline caching
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = (() => {
  try {
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e) {
    try {
      return initializeFirestore(app, {
        ignoreUndefinedProperties: true
      });
    } catch (err) {
      return getFirestore(app);
    }
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
  deleteDoc
};
export type { FirebaseUser };

