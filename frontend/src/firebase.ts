import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDzSg41W4ixmtqcgAiDvyTPSnGJEdY170U",
  authDomain: "capstone-af3eb.firebaseapp.com",
  projectId: "capstone-af3eb",
  storageBucket: "capstone-af3eb.firebasestorage.app",
  messagingSenderId: "967699911081",
  appId: "1:967699911081:web:df8b0adcdaede25b32b4b8",
  measurementId: "G-7WTS321354",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
