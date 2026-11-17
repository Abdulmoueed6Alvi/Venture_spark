import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// verifyIdToken only needs the project id (public certs), no service account required.
if (!getApps().length) initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
export const adminAuth = getAuth();
