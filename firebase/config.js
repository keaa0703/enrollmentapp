import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCd6cXt8w5pXkEE6KKmX1Elqm9pn-mNA60",
  authDomain: "enrollease-19c30.firebaseapp.com",
  databaseURL: "https://enrollease-19c30-default-rtdb.firebaseio.com",
  projectId: "enrollease-19c30",
  storageBucket: "enrollease-19c30.firebasestorage.app",
  messagingSenderId: "286529913660",
  appId: "1:286529913660:web:c1d8b0486edbe9c52e5439",
  measurementId: "G-N12T9ZDL14",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);
export { auth };