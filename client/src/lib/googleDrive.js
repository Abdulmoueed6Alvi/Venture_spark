// Requests a Google Drive access token with Google Identity Services (separate from Firebase login),
// so the Drive OAuth client can live in a different Google Cloud project than Firebase Auth.
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const driveOAuthConfigured = Boolean(CLIENT_ID);

let scriptPromise;
function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = resolve;
    s.onerror = () => { scriptPromise = undefined; reject(Object.assign(new Error("Could not load Google sign-in"), { code: "gis/load-failed" })); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export async function requestDriveToken(loginHint) {
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      hint: loginHint,
      callback: (resp) => {
        if (resp.error) reject(Object.assign(new Error(resp.error_description || resp.error), { code: `gis/${resp.error}` }));
        else resolve(resp.access_token);
      },
      error_callback: (err) => reject(Object.assign(new Error(err.message || err.type), { code: `gis/${err.type}` })),
    });
    client.requestAccessToken({ prompt: "" });
  });
}
