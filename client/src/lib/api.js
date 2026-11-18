import axios from "axios";
import { auth } from "./firebase";

const TOKEN_KEY = "vs_gdrive_token";
const TOKEN_TTL = 55 * 60 * 1000; // Google access tokens last ~1h

export const driveToken = {
  set(token) {
    try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, at: Date.now() })); } catch { /* storage unavailable */ }
  },
  get() {
    try {
      const v = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || "null");
      return v && Date.now() - v.at < TOKEN_TTL ? v.token : null;
    } catch { return null; }
  },
  clear() {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
  },
};

export const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`, timeout: 60000 });

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) config.headers.Authorization = `Bearer ${await user.getIdToken()}`;
  const g = driveToken.get();
  if (g) config.headers["x-google-token"] = g;
  return config;
});

export function errorMessage(err, fallback = "Something went wrong. Please try again.") {
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.code === "ECONNABORTED") return "The server took too long to respond. It may be waking up, please try again.";
  if (err?.message === "Network Error") return "Cannot reach the server. Check your connection and try again.";
  return fallback;
}
