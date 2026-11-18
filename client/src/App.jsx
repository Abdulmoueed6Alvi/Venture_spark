import { Component } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import Login from "./pages/Login";
import Create from "./pages/Create";
import Posts from "./pages/Posts";
import Settings from "./pages/Settings";
import { Button } from "./components/ui";

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex h-full items-center justify-center" role="status" aria-label="Loading"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <h1 className="mt-3 text-xl font-semibold">Page not found</h1>
      <p className="mt-1 text-sm text-muted">The page you are looking for does not exist.</p>
      <Link to="/" className="mt-6"><Button>Back to home</Button></Link>
    </div>
  );
}

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted">Please reload the page. If it keeps happening, try again later.</p>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Protected><AppShell /></Protected>}>
              <Route index element={<Create />} />
              <Route path="posts" element={<Posts />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style: { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" } }} />
      </AuthProvider>
    </ErrorBoundary>
  );
}
