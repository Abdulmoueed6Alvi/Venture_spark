import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./lib/firebase";

export default function App() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const login = async () => {
    setError("");
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { setError(e.code + ": " + e.message); }
  };

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 420, margin: "80px auto", textAlign: "center" }}>
      <h1>Venture Spark</h1>
      {user ? (
        <>
          <p>✅ Google login kaam kar raha hai</p>
          <img src={user.photoURL} width="64" style={{ borderRadius: "50%" }} />
          <p><b>{user.displayName}</b><br />{user.email}</p>
          <button onClick={() => signOut(auth)}>Logout</button>
        </>
      ) : (
        <button onClick={login} style={{ padding: "10px 20px", fontSize: 16 }}>Sign in with Google</button>
      )}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </div>
  );
}
