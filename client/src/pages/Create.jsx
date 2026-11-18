import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { CheckCircle2, Sparkles } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { reportSaved } from "../lib/savedToast";
import PostEditor, { PLATFORMS } from "../components/PostEditor";
import { Badge, Button, Card, ErrorState, Field, Select, Skeleton, Textarea, cx } from "../components/ui";

const TONES = ["friendly", "professional", "funny", "inspirational", "bold"];
const schema = z.object({
  prompt: z.string().trim().min(3, "Describe your post in at least 3 characters").max(500, "Keep it under 500 characters"),
  tone: z.enum(TONES),
  platform: z.enum(PLATFORMS),
});

export default function Create() {
  const { markDriveExpired } = useAuth();
  const [state, setState] = useState({ status: "idle", options: [], error: "" });
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState(false);
  const [defaults, setDefaults] = useState({});
  const [lastRequest, setLastRequest] = useState(null);
  const editorRef = useRef(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { prompt: "", tone: "friendly", platform: "Instagram" },
  });

  useEffect(() => { api.get("/settings").then((r) => setDefaults(r.data)).catch(() => {}); }, []);

  const generate = async (values) => {
    setLastRequest(values);
    setState({ status: "loading", options: [], error: "" });
    setSelected(null); setSaved(false);
    try {
      const { data } = await api.post("/ai/captions", values);
      setState({ status: "success", options: data.options, error: "" });
    } catch (e) {
      setState({ status: "error", options: [], error: errorMessage(e, "Could not generate captions.") });
    }
  };

  const choose = (i) => {
    setSelected(i); setSaved(false);
    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const save = async (payload, mode) => {
    setSaving(mode);
    try {
      const { data } = await api.post("/posts", { ...payload, prompt: lastRequest?.prompt, tone: lastRequest?.tone });
      reportSaved(data, { markDriveExpired, verb: mode === "scheduled" ? "scheduled" : "saved as draft" });
      setSaved(true);
    } catch (e) { toast.error(errorMessage(e, "Could not save the post.")); }
    finally { setSaving(null); }
  };

  const option = selected !== null ? state.options[selected] : null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Create a post</h1>
        <p className="mt-1 text-sm text-muted">Describe what you want to post and let AI draft the captions.</p>
      </header>

      <Card className="p-5 sm:p-6">
        <form onSubmit={handleSubmit(generate)} noValidate className="space-y-4">
          <Field label="What is the post about?" htmlFor="prompt" required error={errors.prompt?.message}>
            <Textarea id="prompt" rows={3} placeholder="e.g. Launching our new cold brew at the Lahore café this Friday" invalid={!!errors.prompt} {...register("prompt")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tone" htmlFor="tone"><Select id="tone" {...register("tone")}>{TONES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}</Select></Field>
            <Field label="Platform" htmlFor="platform"><Select id="platform" {...register("platform")}>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</Select></Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={state.status === "loading"}><Sparkles className="h-4 w-4" aria-hidden="true" />{state.status === "success" ? "Regenerate" : "Generate captions"}</Button>
          </div>
        </form>
      </Card>

      {state.status === "loading" && (
        <section aria-label="Generating captions" aria-busy="true" className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => <Card key={i} className="space-y-3 p-5"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></Card>)}
        </section>
      )}

      {state.status === "error" && <ErrorState message={state.error} onRetry={() => lastRequest && generate(lastRequest)} />}

      {state.status === "success" && (
        <section aria-labelledby="options-h" className="space-y-3">
          <h2 id="options-h" className="text-lg font-semibold">Pick a caption</h2>
          <div className="grid gap-4 md:grid-cols-3" role="radiogroup" aria-labelledby="options-h">
            {state.options.map((o, i) => (
              <button key={i} type="button" role="radio" aria-checked={selected === i} onClick={() => choose(i)}
                className={cx("flex flex-col rounded-xl border bg-surface p-5 text-left shadow-card transition-colors hover:border-primary", selected === i ? "border-primary ring-2 ring-ring/40" : "border-border")}>
                <div className="mb-3 flex items-center justify-between"><Badge tone="primary">Option {i + 1}</Badge>{selected === i && <CheckCircle2 className="h-5 w-5 text-primary" aria-label="Selected" />}</div>
                <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed">{o.caption}</p>
                <p className="mt-3 text-sm text-primary">{o.hashtags.join(" ")}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {option && (
        <section ref={editorRef} aria-labelledby="editor-h" className="scroll-mt-4">
          <Card className="p-5 sm:p-6">
            <h2 id="editor-h" className="mb-4 text-lg font-semibold">Edit &amp; schedule</h2>
            {saved ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
                <p className="font-medium">Your post is saved.</p>
                <div className="flex gap-2"><Link to="/posts"><Button>View my posts</Button></Link><Button variant="secondary" onClick={() => { setSelected(null); setSaved(false); }}>Create another</Button></div>
              </div>
            ) : (
              <PostEditor key={`${selected}-${state.options.length}-${lastRequest?.prompt}`} idPrefix="new" initial={{ caption: option.caption, hashtags: option.hashtags, platform: lastRequest?.platform }} defaults={defaults} onSave={save} saving={saving} />
            )}
          </Card>
        </section>
      )}
    </div>
  );
}
