import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Bell, Cloud } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { authErrorMessage, useAuth } from "../context/AuthContext";
import { Badge, Button, Card, ErrorState, Field, Input, Skeleton, Toggle } from "../components/ui";

const schema = z.object({
  notifyEnabled: z.boolean(),
  notifyEmail: z.string().trim().min(1, "Enter an email to receive notifications").email("Enter a valid email address"),
  defaultLeadMinutes: z.coerce.number({ invalid_type_error: "Enter a number" }).int("Whole minutes only").min(0, "Cannot be negative").max(10080, "Maximum is 7 days (10080)"),
});

export default function Settings() {
  const { user, driveConnected, connectDrive } = useAuth();
  const [state, setState] = useState({ loading: true, error: "" });
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm({ resolver: zodResolver(schema) });

  const load = async () => {
    setState({ loading: true, error: "" });
    try { const { data } = await api.get("/settings"); reset(data); setState({ loading: false, error: "" }); }
    catch (e) { setState({ loading: false, error: errorMessage(e, "Could not load settings.") }); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const onSave = handleSubmit(async (v) => {
    setSaving(true);
    try { const { data } = await api.put("/settings", v); reset(data); toast.success("Settings saved"); }
    catch (e) { toast.error(errorMessage(e, "Could not save settings.")); }
    finally { setSaving(false); }
  });

  const connect = async () => {
    setConnecting(true);
    try { await connectDrive(); toast.success("Google Drive connected"); }
    catch (e) { toast.error(authErrorMessage(e)); }
    finally { setConnecting(false); }
  };

  const enabled = watch("notifyEnabled");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">Defaults for new posts. You can override them on each post.</p>
      </header>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Bell className="h-5 w-5 text-primary" aria-hidden="true" />Email notifications</h2>
        {state.loading && <div className="space-y-3" aria-busy="true"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>}
        {!state.loading && state.error && <ErrorState message={state.error} onRetry={load} />}
        {!state.loading && !state.error && (
          <form onSubmit={onSave} noValidate className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="notifyEnabled" className="text-sm font-medium">Send email notifications by default</label>
              <Toggle id="notifyEnabled" label="Send email notifications by default" checked={!!enabled} onChange={(v) => setValue("notifyEnabled", v, { shouldDirty: true })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Notification email" htmlFor="notifyEmail" required error={errors.notifyEmail?.message}>
                <Input id="notifyEmail" type="email" invalid={!!errors.notifyEmail} {...register("notifyEmail")} />
              </Field>
              <Field label="Default reminder (minutes before)" htmlFor="lead" error={errors.defaultLeadMinutes?.message}>
                <Input id="lead" type="number" inputMode="numeric" min={0} max={10080} invalid={!!errors.defaultLeadMinutes} {...register("defaultLeadMinutes")} />
              </Field>
            </div>
            <div className="flex justify-end"><Button type="submit" loading={saving} disabled={!isDirty}>Save settings</Button></div>
          </form>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold"><Cloud className="h-5 w-5 text-primary" aria-hidden="true" />Google Drive</h2>
        <p className="text-sm text-muted">Posts are saved as JSON files in a “Venture Spark Posts” folder in your Drive. We can only see files this app created.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {driveConnected ? <Badge tone="success"><Cloud className="h-3 w-3" aria-hidden="true" />Connected</Badge> : <Badge tone="warning">Not connected</Badge>}
          <Button variant="secondary" size="sm" loading={connecting} onClick={connect}>{driveConnected ? "Reconnect" : "Connect Google Drive"}</Button>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Account</h2>
        <p className="mt-1 text-sm text-muted">Signed in as <span className="font-medium text-text">{user?.email}</span></p>
      </Card>
    </div>
  );
}
