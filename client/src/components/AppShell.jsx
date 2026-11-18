import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Cloud, CloudOff, ListChecks, LogOut, Moon, PanelLeft, Settings, Sparkles, Sun } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth, authErrorMessage } from "../context/AuthContext";
import { useTheme } from "../lib/theme";
import { Button, cx } from "./ui";

const NAV = [
  { to: "/", label: "Create", icon: Sparkles, end: true },
  { to: "/posts", label: "My posts", icon: ListChecks },
  { to: "/settings", label: "Settings", icon: Settings },
];

const COLLAPSE_KEY = "vs_sidebar_collapsed";
const useIsDesktop = () => {
  const query = "(min-width: 1024px)";
  const [v, setV] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setV(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return v;
};

export default function AppShell() {
  const { user, logout, driveConnected, connectDrive } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const isDesktop = useIsDesktop();
  const location = useLocation();
  const toggleRef = useRef(null);

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const expanded = isDesktop ? !collapsed : drawerOpen;

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    toggleRef.current?.focus();
  }, []);

  const onToggle = () => {
    if (isDesktop) {
      setCollapsed((c) => {
        try { localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1"); } catch { /* storage unavailable */ }
        return !c;
      });
    } else setDrawerOpen((o) => !o);
  };

  // Mobile drawer: Escape closes, scroll locked, closes on navigation.
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (isDesktop || !drawerOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && closeDrawer();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [drawerOpen, isDesktop, closeDrawer]);

  const railOnly = isDesktop && collapsed;

  const onConnect = async () => {
    try { await connectDrive(); toast.success("Google Drive connected"); }
    catch (e) { toast.error(authErrorMessage(e)); }
  };

  return (
    <div className="flex h-full">
      {!isDesktop && drawerOpen && (
        <div className="fixed inset-0 z-30 bg-black/50" aria-hidden="true" onClick={closeDrawer} data-testid="sidebar-backdrop" />
      )}

      <aside
        id="app-sidebar"
        aria-label="Sidebar"
        className={cx(
          "z-40 flex shrink-0 flex-col border-r border-border bg-surface transition-[width,transform] duration-200 ease-out",
          isDesktop ? cx("relative", railOnly ? "w-[72px]" : "w-64") : cx("fixed inset-y-0 left-0 w-64", drawerOpen ? "translate-x-0" : "-translate-x-full"),
        )}
        {...(!isDesktop && !drawerOpen ? { inert: "" } : {})}
      >
        <div className={cx("flex h-16 items-center gap-2 border-b border-border px-4", railOnly && "justify-center px-0")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-fg"><Sparkles className="h-5 w-5" aria-hidden="true" /></div>
          {!railOnly && <span className="text-base font-semibold tracking-tight">Venture Spark</span>}
        </div>

        <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto p-3">
          {!railOnly && <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted">Workspace</p>}
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} aria-label={railOnly ? label : undefined}
              className={({ isActive }) => cx(
                "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                railOnly && "justify-center px-0",
                isActive ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-text",
              )}>
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!railOnly && <span>{label}</span>}
              {railOnly && (
                <span role="tooltip" className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md bg-text px-2 py-1 text-xs text-bg opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={cx("border-t border-border p-3", railOnly && "flex flex-col items-center gap-2")}>
          <div className={cx("flex items-center gap-3", railOnly && "justify-center")}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-full" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                {(user?.displayName || user?.email || "?").charAt(0).toUpperCase()}
              </div>
            )}
            {!railOnly && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user?.displayName || "Creator"}</p>
                <p className="truncate text-xs text-muted">{user?.email}</p>
              </div>
            )}
          </div>
          <Button variant="ghost" size={railOnly ? "icon" : "sm"} className={cx(!railOnly && "mt-3 w-full justify-start")} onClick={logout} aria-label="Log out">
            <LogOut className="h-4 w-4" aria-hidden="true" />{!railOnly && "Log out"}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
          <button
            ref={toggleRef}
            type="button"
            onClick={onToggle}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={expanded}
            aria-controls="app-sidebar"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
          >
            <PanelLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex-1" />
          {driveConnected ? (
            <span className="hidden items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success sm:inline-flex"><Cloud className="h-3.5 w-3.5" aria-hidden="true" />Drive connected</span>
          ) : (
            <Button variant="secondary" size="sm" onClick={onConnect}><CloudOff className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Connect Drive</span></Button>
          )}
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
            {theme === "dark" ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </Button>
        </header>
        <main className="flex-1 overflow-y-auto"><div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8"><Outlet /></div></main>
      </div>
    </div>
  );
}
