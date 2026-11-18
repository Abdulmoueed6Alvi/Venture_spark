import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarClock, Cloud, Sparkles, Wand2 } from "lucide-react";
import { authErrorMessage, useAuth } from "../context/AuthContext";
import { useTheme } from "../lib/theme";
import { Button, Field, Input } from "../components/ui";

const base = {
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
};
const signInSchema = z.object(base);
const signUpSchema = z.object({ name: z.string().trim().min(2, "Enter your name"), ...base });

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9H1.3v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.3 14.4a7.2 7.2 0 0 1 0-4.8V6.5H1.3a12 12 0 0 0 0 11l4-3.1z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.5l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
  </svg>
);

const FEATURES = [
  { icon: Wand2, text: "AI captions & hashtags in seconds" },
  { icon: CalendarClock, text: "Schedule posts with email reminders" },
  { icon: Cloud, text: "Every draft synced to your Google Drive" },
];

export default function Login() {
  useTheme();
  const { user, loading, googleSignIn, emailSignIn, emailSignUp } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState("signin");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const isSignUp = mode === "signup";
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(isSignUp ? signUpSchema : signInSchema),
  });

  if (!loading && user) return <Navigate to={location.state?.from || "/"} replace />;

  const run = async (kind, fn) => {
    setError(""); setBusy(kind);
    try { await fn(); } catch (e) { setError(authErrorMessage(e)); } finally { setBusy(null); }
  };

  const onSubmit = handleSubmit((v) => run("email", () => (isSignUp ? emailSignUp(v.name, v.email, v.password) : emailSignIn(v.email, v.password))));

  const switchMode = (m) => { setMode(m); setError(""); reset(); };

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-primary p-12 text-primary-fg lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-6 w-6" aria-hidden="true" />Venture Spark</div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Plan a week of content in minutes.</h1>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-base opacity-95"><span className="rounded-lg bg-white/15 p-2"><Icon className="h-5 w-5" aria-hidden="true" /></span>{text}</li>
            ))}
          </ul>
        </div>
        <p className="text-sm opacity-70">Built for creators who want less admin and more posting.</p>
      </aside>

      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-lg font-semibold lg:hidden"><Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />Venture Spark</div>
          <h2 className="text-2xl font-bold">{isSignUp ? "Create your account" : "Welcome back"}</h2>
          <p className="mt-1 text-sm text-muted">{isSignUp ? "Start generating and scheduling posts." : "Sign in to your content workspace."}</p>

          <Button variant="secondary" className="mt-6 w-full" loading={busy === "google"} disabled={!!busy} onClick={() => run("google", googleSignIn)}>
            {busy !== "google" && <GoogleIcon />}Continue with Google
          </Button>
          <p className="mt-2 text-center text-xs text-muted">Google sign-in also connects your Drive for post backups.</p>

          <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" />or with email<span className="h-px flex-1 bg-border" /></div>

          <form onSubmit={onSubmit} noValidate className="space-y-4" key={mode}>
            {isSignUp && (
              <Field label="Name" htmlFor="name" required error={errors.name?.message}>
                <Input id="name" autoComplete="name" invalid={!!errors.name} {...register("name")} />
              </Field>
            )}
            <Field label="Email" htmlFor="email" required error={errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register("email")} />
            </Field>
            <Field label="Password" htmlFor="password" required error={errors.password?.message}>
              <Input id="password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} invalid={!!errors.password} {...register("password")} />
            </Field>
            {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" loading={busy === "email"} disabled={!!busy}>{isSignUp ? "Create account" : "Sign in"}</Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {isSignUp ? "Already have an account?" : "New here?"}{" "}
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => switchMode(isSignUp ? "signin" : "signup")}>
              {isSignUp ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
