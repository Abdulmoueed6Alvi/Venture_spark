import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Bell, CalendarClock, ImagePlus, Trash2 } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { Button, Field, Input, Select, Textarea, Toggle } from "./ui";

const schema = z.object({
  caption: z.string().trim().min(1, "Write a caption first").max(2200, "Caption must be 2200 characters or fewer"),
  hashtags: z.string().max(500, "Too many hashtags"),
  platform: z.string(),
  scheduledAt: z.string(),
  notifyEnabled: z.boolean(),
  leadMinutes: z.coerce.number({ invalid_type_error: "Enter a number" }).int("Whole minutes only").min(0, "Cannot be negative").max(10080, "Maximum is 7 days (10080)"),
  notifyEmail: z.union([z.literal(""), z.string().trim().email("Enter a valid email address")]),
  note: z.string().max(500, "Note must be 500 characters or fewer"),
});

export const PLATFORMS = ["Instagram", "Twitter/X", "LinkedIn", "Facebook", "TikTok"];

const pad = (n) => String(n).padStart(2, "0");
export const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const nowLocalInput = () => toLocalInput(new Date().toISOString());
const parseTags = (s) => [...new Set(s.split(/[\s,]+/).map((t) => t.replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "")).filter(Boolean))].slice(0, 15).map((t) => `#${t}`);

export default function PostEditor({ initial = {}, defaults = {}, onSave, saving, idPrefix = "pe" }) {
  const fileRef = useRef(null);
  const [image, setImage] = useState(initial.imagePath ? { path: initial.imagePath, url: initial.imageUrl } : null);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, watch, setValue, setError, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      caption: initial.caption || "",
      hashtags: (initial.hashtags || []).join(" "),
      platform: initial.platform || "Instagram",
      scheduledAt: toLocalInput(initial.scheduledAt),
      notifyEnabled: initial.notify?.enabled ?? defaults.notifyEnabled ?? true,
      leadMinutes: initial.notify?.leadMinutes ?? defaults.defaultLeadMinutes ?? 15,
      notifyEmail: initial.notify?.email || "",
      note: initial.notify?.note || "",
    },
  });

  const notifyEnabled = watch("notifyEnabled");
  const caption = watch("caption");
  const id = (n) => `${idPrefix}-${n}`;

  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return toast.error("Choose a JPG, PNG, WEBP or GIF image");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be 5 MB or smaller");
    const form = new FormData();
    form.append("image", file);
    setUploading(true);
    try {
      const { data } = await api.post("/posts/upload", form);
      setImage(data);
      toast.success("Image uploaded");
    } catch (err) { toast.error(errorMessage(err, "Image upload failed")); }
    finally { setUploading(false); }
  };

  const submit = (mode) => handleSubmit((v) => {
    if (mode === "scheduled") {
      if (!v.scheduledAt) return setError("scheduledAt", { message: "Pick a date and time to schedule" });
      if (new Date(v.scheduledAt).getTime() < Date.now() - 60_000) return setError("scheduledAt", { message: "Pick a time in the future" });
    }
    onSave({
      caption: v.caption,
      hashtags: parseTags(v.hashtags),
      platform: v.platform,
      status: mode,
      scheduledAt: v.scheduledAt ? new Date(v.scheduledAt).toISOString() : undefined,
      imagePath: image?.path || "",
      notify: { enabled: v.notifyEnabled, leadMinutes: v.leadMinutes, email: v.notifyEmail, note: v.note },
    }, mode);
  });

  const busy = Boolean(saving) || uploading;

  return (
    <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-5">
      <Field label="Caption" htmlFor={id("caption")} required error={errors.caption?.message} hint={`${caption.length}/2200`}>
        <Textarea id={id("caption")} rows={5} invalid={!!errors.caption} {...register("caption")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hashtags" htmlFor={id("tags")} error={errors.hashtags?.message} hint="Separate with spaces or commas">
          <Input id={id("tags")} placeholder="#coffee #lahore" invalid={!!errors.hashtags} {...register("hashtags")} />
        </Field>
        <Field label="Platform" htmlFor={id("platform")}>
          <Select id={id("platform")} {...register("platform")}>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</Select>
        </Field>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Image <span className="font-normal text-muted">(optional)</span></span>
        {image ? (
          <div className="flex items-center gap-3 rounded-lg border border-border p-2">
            {image.url && <img src={image.url} alt="Selected post attachment" className="h-16 w-16 rounded-md object-cover" />}
            <span className="flex-1 truncate text-sm text-muted">Image attached</span>
            <Button variant="ghost" size="sm" onClick={() => setImage(null)} aria-label="Remove image"><Trash2 className="h-4 w-4" aria-hidden="true" />Remove</Button>
          </div>
        ) : (
          <>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" id={id("file")} onChange={pickImage} />
            <Button variant="secondary" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}><ImagePlus className="h-4 w-4" aria-hidden="true" />Upload image</Button>
          </>
        )}
      </div>

      <fieldset className="space-y-4 rounded-xl border border-border p-4">
        <legend className="flex items-center gap-2 px-1 text-sm font-semibold"><CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />Schedule &amp; reminders</legend>
        <Field label="Publish date & time" htmlFor={id("when")} error={errors.scheduledAt?.message}>
          <Input id={id("when")} type="datetime-local" min={nowLocalInput()} invalid={!!errors.scheduledAt} {...register("scheduledAt")} />
        </Field>

        <div className="flex items-center justify-between gap-4">
          <label htmlFor={id("notify")} className="flex items-center gap-2 text-sm font-medium"><Bell className="h-4 w-4 text-primary" aria-hidden="true" />Email me about this post</label>
          <Toggle id={id("notify")} label="Email notifications" checked={notifyEnabled} onChange={(v) => setValue("notifyEnabled", v, { shouldDirty: true })} />
        </div>

        {notifyEnabled && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Remind me (minutes before)" htmlFor={id("lead")} error={errors.leadMinutes?.message}>
              <Input id={id("lead")} type="number" inputMode="numeric" min={0} max={10080} invalid={!!errors.leadMinutes} {...register("leadMinutes")} />
            </Field>
            <Field label="Send to" htmlFor={id("email")} error={errors.notifyEmail?.message} hint="Leave empty to use your default email">
              <Input id={id("email")} type="email" placeholder="you@example.com" invalid={!!errors.notifyEmail} {...register("notifyEmail")} />
            </Field>
            <Field label="Task note" htmlFor={id("note")} error={errors.note?.message} className="sm:col-span-2" hint="Shown inside the notification email">
              <Textarea id={id("note")} rows={2} className="min-h-16" placeholder="e.g. Add a product photo before posting" invalid={!!errors.note} {...register("note")} />
            </Field>
          </div>
        )}
      </fieldset>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={busy} loading={saving === "draft"} onClick={submit("draft")}>Save as draft</Button>
        <Button disabled={busy} loading={saving === "scheduled"} onClick={submit("scheduled")}>Schedule post</Button>
      </div>
    </form>
  );
}
