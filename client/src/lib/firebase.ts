import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

// Firebase configuration for Bong Bari project
// NOTE: Firebase web API keys are intentionally public and designed to be in client code.
// Security is enforced via: (1) Firebase Security Rules, (2) API key HTTP referrer restrictions.
// See: https://firebase.google.com/docs/projects/api-keys
const firebaseConfig = {
    apiKey: "AIzaSyC_QMhm7zvzVg9WHP68KXHIROsf5jAuouY",
    authDomain: "bong-bari.firebaseapp.com",
    projectId: "bong-bari",
    storageBucket: "bong-bari.firebasestorage.app",
    messagingSenderId: "775734354044",
    appId: "1:775734354044:web:a16359d519441eb8a5e9f9",
    measurementId: "G-BN8L2G4QF4"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
};
