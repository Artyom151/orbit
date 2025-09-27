// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyBG8S0Ccm4bYehbpI8ozfwDlkIhYylUI-8",
  authDomain: "orbit-social-network.firebaseapp.com",
  projectId: "orbit-social-network",
  storageBucket: "orbit-social-network.firebasestorage.app",
  messagingSenderId: "871029025951",
  appId: "1:871029025951:web:b3677eb52e81f3b207c6aa",
  measurementId: "G-M12GKS0VNF",
  databaseURL: "https://orbit-social-network-default-rtdb.firebaseio.com"
};

function initializeFirebase() {
    const apps = getApps();
    let app: FirebaseApp;
    if (!apps.length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }

    const auth = getAuth(app);
    const db = getDatabase(app);

    if (process.env.NEXT_PUBLIC_EMULATOR_HOST) {
        const host = process.env.NEXT_PUBLIC_EMULATOR_HOST;
        connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
        connectDatabaseEmulator(db, host, 9000);
    }

    return { app, auth, db };
}

export const { app, auth, db } = initializeFirebase();
