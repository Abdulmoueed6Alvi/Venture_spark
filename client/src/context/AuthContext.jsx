/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { driveToken } from "../lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const FRIENDLY = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/cancelled-popup-request": "Sign-in was cancelled.",
  "auth/popup-blocked": "Your browser blocked the sign-in popup. Allow popups and try again.",
  "auth/unauthorized-domain": "This website is not authorised for sign-in yet.",
  "auth/account-exists-with-different-credential": "This email is registered with a password. Sign in with your password instead.",
  "auth/network-request-failed": "Network error. Check your connection.",
};
export const authErrorMessage = (e) => FRIENDLY[e?.code] || "Something went wrong. Please try again.";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [driveConnected, setDriveConnected] = useState(Boolean(driveToken.get()));

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); }), []);

  const googleSignIn = useCallback(async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
    if (token) { driveToken.set(token); setDriveConnected(true); }
    return result.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      driveConnected,
      googleSignIn,
      connectDrive: googleSignIn,
      async emailSignIn(email, password) { await signInWithEmailAndPassword(auth, email, password); },
      async emailSignUp(name, email, password) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(cred.user, { displayName: name });
      },
      async logout() { driveToken.clear(); setDriveConnected(false); await signOut(auth); },
      markDriveExpired() { driveToken.clear(); setDriveConnected(false); },
    }),
    [user, loading, driveConnected, googleSignIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
