import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDkePJiZOqq8BOmQv2QbrekPJzcKK1brAk",
    authDomain: "web-dj-cloud-c852e.firebaseapp.com",
    projectId: "web-dj-cloud-c852e",
    storageBucket: "web-dj-cloud-c852e.firebasestorage.app",
    messagingSenderId: "240001282787",
    appId: "1:240001282787:web:a50acc1555c03cb6d30bd6",
    measurementId: "G-TEGTNE1DHY"
};

// Initialize Firebase safely for HMR
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
