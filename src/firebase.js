// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC__ipc5oLQWs7VSiJM7CwxjsfpghodAoc",
  authDomain: "pawpoint-ea8e5.firebaseapp.com",
  projectId: "pawpoint-ea8e5",
  storageBucket: "pawpoint-ea8e5.firebasestorage.app",
  messagingSenderId: "248344064435",
  appId: "1:248344064435:web:de1dd7bbb37302644cdbc6",
  measurementId: "G-NCYSNJ15XV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
