import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { auth, firebaseInitError } from '../firebase.js';

function ensureAuthReady() {
  if (firebaseInitError) {
    const error = new Error(
      'Firebase is not configured. Add your VITE_FIREBASE_* keys to a .env file and restart the dev server.'
    );
    error.code = 'firebase/not-configured';
    throw error;
  }
  if (!auth) {
    const error = new Error('Firebase authentication is unavailable.');
    error.code = 'firebase/auth-unavailable';
    throw error;
  }
}

export async function signUp(email, password) {
  ensureAuthReady();
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function login(email, password) {
  ensureAuthReady();
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function logout() {
  ensureAuthReady();
  await signOut(auth);
}
