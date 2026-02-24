import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAaOC1hlBD7cStK-4tpgT0HGtxgWr8EpbE",
  authDomain: "edubeta-soft.firebaseapp.com",
  projectId: "edubeta-soft",
  storageBucket: "edubeta-soft.firebasestorage.app",
  messagingSenderId: "750275040315",
  appId: "1:750275040315:web:db079b885f88dbf0b9781e",
  measurementId: "G-BY53ZRNQ0X"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
