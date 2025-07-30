// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgLf7dfN4AIuud2IFfYFKOiqDUyPCi0nI",
  authDomain: "kasir-5e3ad.firebaseapp.com",
  projectId: "kasir-5e3ad",
  storageBucket: "kasir-5e3ad.appspot.com",
  messagingSenderId: "1022262477243",
  appId: "1:1022262477243:web:8637d3184d242c3af3049e"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
