// firebase/config.js

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCd6cXt8w5pXkEE6KKmX1Elqm9pn-mNA60",
  authDomain: "enrollease-19c30.firebaseapp.com",
  databaseURL: "https://enrollease-19c30-default-rtdb.firebaseio.com",
  projectId: "enrollease-19c30",
  storageBucket: "enrollease-19c30.appspot.com",
  messagingSenderId: "286529913660",
  appId: "1:286529913660:android:37a9e3ae03eb3e4e2e5439",
  measurementId: "G-N12T9ZDL14"
};

// Prevent duplicate app initialization during hot reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Export services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
