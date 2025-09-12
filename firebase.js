// firebase.js (React Native version)

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCd6cXt8w5pXkEE6KKmX1Elqm9pn-mNA60",
  authDomain: "enrollease-19c30.firebaseapp.com",
  databaseURL: "https://enrollease-19c30-default-rtdb.firebaseio.com",
  projectId: "enrollease-19c30",
  storageBucket: "enrollease-19c30.appspot.com",
  messagingSenderId: "286529913660",
  appId: "1:286529913660:web:5d92b98f74d398102e5439",
  measurementId: "G-N12T9ZDL14"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore and Storage (for uploading images, forms, etc.)
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
export { db, storage, auth };
