import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

// Check if Firebase is configured with real credentials
export const isFirebaseConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "PLACEHOLDER_KEY" && 
  firebaseConfig.projectId !== "PLACEHOLDER_PROJECT_ID";

let app: any = null;
let db: any = null;
let auth: any = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
    auth = getAuth(app);
  } catch (error) {
    console.error("Failed to initialize Firebase SDK:", error);
  }
}

export { app, db, auth };
export { signInAnonymously };
