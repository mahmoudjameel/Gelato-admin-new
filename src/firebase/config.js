import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// الحفاظ على تسجيل الدخول حتى بعد إغلاق المتصفح
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Auth persistence error:", err);
});
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
