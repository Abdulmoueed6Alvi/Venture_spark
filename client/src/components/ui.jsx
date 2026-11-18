/* eslint-disable react-refresh/only-export-components */
import { forwardRef, useEffect, useId, useRef } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

export const cx = (...a) => a.filter(Boolean).join(" ");

const VARIANTS = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover",
  secondary: "bg-surface text-text border border-border hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-text",
  danger: "bg-danger text-white hover:opacity-90",
};
const SIZES = { md: "h-10 px-4 text-sm", sm: "h-9 px-3 text-sm", icon: "h-10 w-10" };

export function Button({ variant = "primary", size = "md", loading = false, disabled, className, children, type = "button", ...rest }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant], SIZES[size], className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Field({ label, error, hint, required, children, htmlFor, className }) {
  return (
    <div className={cx("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}

const controlBase =
  "w-full rounded-lg border bg-surface px-3 text-sm text-text placeholder:text-muted/70 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60";

export const Input = forwardRef(function Input({ invalid, className, ...rest }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cx(controlBase, "h-10", invalid ? "border-danger" : "border-border", className)} {...rest} />;
});

export const Textarea = forwardRef(function Textarea({ invalid, className, ...rest }, ref) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={cx(controlBase, "min-h-24 py-2.5", invalid ? "border-danger" : "border-border", className)} {...rest} />;
});

export const Select = forwardRef(function Select({ invalid, className, children, ...rest }, ref) {
  return (
    <select ref={ref} aria-invalid={invalid || undefined} className={cx(controlBase, "h-10", invalid ? "border-danger" : "border-border", className)} {...rest}>
      {children}
    </select>
  );
});

export function Card({ className, children, ...rest }) {
  return <div className={cx("rounded-xl border border-border bg-surface shadow-card", className)} {...rest}>{children}</div>;
}

const BADGE = {
  neutral: "bg-surface-2 text-muted",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};
export function Badge({ tone = "neutral", className, children }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", BADGE[tone], className)}>{children}</span>;
}

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cx("vs-skeleton rounded-lg", className)} />;
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-14 text-center">
      {Icon && <div className="mb-4 rounded-full bg-primary-soft p-3 text-primary"><Icon className="h-6 w-6" aria-hidden="true" /></div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-danger/30 bg-danger-soft px-6 py-10 text-center">
      <AlertTriangle className="mb-3 h-6 w-6 text-danger" aria-hidden="true" />
      <p className="text-sm font-medium text-danger">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
  const previous = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previous.current = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = ref.current?.querySelector(FOCUSABLE);
    first?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const items = [...ref.current.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const a = items[0], z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={cx("max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-surface shadow-card sm:rounded-2xl", wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", loading, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

export function Toggle({ checked, onChange, label, id }) {
  return (
    <button type="button" role="switch" id={id} aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cx("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-border")}>
      <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}
