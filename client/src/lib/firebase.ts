import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

// Your web app's Firebase configuration (Bong Bari Project)
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
