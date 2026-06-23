import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCoffxR0D9aAbb-Qfu_BuUHPhyGLpMyHvY",
  authDomain: "speedwashpro.firebaseapp.com",
  databaseURL: "https://speedwashpro-default-rtdb.firebaseio.com",
  projectId: "speedwashpro",
  storageBucket: "speedwashpro.firebasestorage.app",
  messagingSenderId: "384167624766",
  appId: "1:384167624766:web:a7ddf21cf890438f0c116f"
};

// Initialize Firebase only if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;