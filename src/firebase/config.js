import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// TODO: Replace with your actual Firebase configuration
// You can find this in your Firebase Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyCxFi0-FKvyJYNcM9AHLM0w4gUDdV8fvAk",
  authDomain: "gelato-3d553.firebaseapp.com",
  projectId: "gelato-3d553",
  storageBucket: "gelato-3d553.firebasestorage.app",
  messagingSenderId: "206530551098",
  appId: "1:206530551098:web:5291ab37b51e7143694403",
  measurementId: "G-6W6YLXCP4S"
};

// Initialize Primary App
console.log("FirebaseConfig: Initializing Primary App");
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Secondary instance for Web Customers to isolate their login from Admin
console.log("FirebaseConfig: Initializing Customer App");
let customerApp = getApps().find(a => a.name === 'customer-app');
if (!customerApp) {
  customerApp = initializeApp(firebaseConfig, 'customer-app');
}

export const webAuth = getAuth(customerApp);
export const webDb = getFirestore(customerApp);
export const webFunctions = getFunctions(customerApp);

// Default persistence
setPersistence(auth, browserLocalPersistence).catch(console.warn);
setPersistence(webAuth, browserLocalPersistence).catch(console.warn);

export default app;
