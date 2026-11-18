import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Bell, Calendar, Cloud, CloudOff, ListChecks, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { reportSaved } from "../lib/savedToast";
import PostEditor from "../components/PostEditor";
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Input, Modal, Skeleton, cx } from "../components/ui";

const TABS = [["", "All"], ["draft", "Drafts"], ["scheduled", "Scheduled"], ["published", "Published"]];
const TONE = { draft: "neutral", scheduled: "info", published: "success" };
const fmt = (iso) => (iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : null);

export default function Posts() {
  const { markDriveExpired } = useAuth();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [state, setState] = useState({ loading: true, error: "", posts: [] });
  const [defaults, setDefaults] = useState({});
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { api.get("/settings").then((r) => setDefaults(r.data)).catch(() => {}); }, []);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const { data } = await api.get("/posts", { params: { status: status || undefined, q: debouncedQ || undefined } });
      setState({ loading: false, error: "", posts: data });
    } catch (e) { setState({ loading: false, error: errorMessage(e, "Could not load your posts."), posts: [] }); }
  }, [status, debouncedQ]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => state.posts.length, [state.posts]);

  const saveEdit = async (payload, mode) => {
    setSaving(mode);
    try {
      const { data } = await api.put(`/posts/${editing.id}`, payload);
      reportSaved(data, { markDriveExpired, verb: "updated" });
      setEditing(null);
      load();
    } catch (e) { toast.error(errorMessage(e, "Could not update the post.")); }
    finally { setSaving(null); }
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      const { data } = await api.delete(`/posts/${deleting.id}`);
      toast.success(data?.drive?.removed ? "Post deleted (and removed from Drive)" : "Post deleted");
      setDeleting(null);
      load();
    } catch (e) { toast.error(errorMessage(e, "Could not delete the post.")); }
    finally { setDeleteBusy(false); }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My posts</h1>
          <p className="mt-1 text-sm text-muted">Everything you drafted, scheduled or published.</p>
        </div>
        <Link to="/"><Button><Plus className="h-4 w-4" aria-hidden="true" />New post</Button></Link>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Filter by status" className="inline-flex rounded-lg border border-border bg-surface p-1">
          {TABS.map(([value, label]) => (
            <button key={label} role="tab" type="button" aria-selected={status === value} onClick={() => setStatus(value)}
              className={cx("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", status === value ? "bg-primary-soft text-primary" : "text-muted hover:text-text")}>{label}</button>
          ))}
        </div>
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input type="search" aria-label="Search posts" placeholder="Search captions" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {state.loading && (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading posts">
          {[0, 1, 2, 3].map((i) => <Card key={i} className="space-y-3 p-5"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /><Skeleton className="h-8 w-32" /></Card>)}
        </div>
      )}

      {!state.loading && state.error && <ErrorState message={state.error} onRetry={load} />}

      {!state.loading && !state.error && counts === 0 && (
        <EmptyState icon={ListChecks} title={debouncedQ || status ? "No posts match your filters" : "No posts yet"}
          description={debouncedQ || status ? "Try a different filter or search term." : "Generate your first caption and schedule it."}
          action={!debouncedQ && !status && <Link to="/"><Button><Plus className="h-4 w-4" aria-hidden="true" />Create a post</Button></Link>} />
      )}

      {!state.loading && !state.error && counts > 0 && (
        <ul className="grid gap-4 md:grid-cols-2" aria-label="Posts">
          {state.posts.map((p) => (
            <li key={p.id}>
              <Card className="flex h-full flex-col p-5" data-testid="post-card">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge tone={TONE[p.status]}>{p.status[0].toUpperCase() + p.status.slice(1)}</Badge>
                  <Badge>{p.platform}</Badge>
                  {p.driveSynced ? <Badge tone="success"><Cloud className="h-3 w-3" aria-hidden="true" />Drive</Badge> : <Badge tone="warning"><CloudOff className="h-3 w-3" aria-hidden="true" />Not in Drive</Badge>}
                </div>
                {p.imageUrl && <img src={p.imageUrl} alt="Post attachment" loading="lazy" className="mb-3 h-40 w-full rounded-lg object-cover" />}
                <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed">{p.caption}</p>
                {p.hashtags.length > 0 && <p className="mt-2 text-sm text-primary">{p.hashtags.join(" ")}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                  {p.scheduledAt && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" aria-hidden="true" />{fmt(p.scheduledAt)}</span>}
                  {p.notify?.enabled && <span className="inline-flex items-center gap-1"><Bell className="h-3.5 w-3.5" aria-hidden="true" />{p.notify.leadMinutes} min before</span>}
                </div>
                <div className="mt-4 flex gap-2 border-t border-border pt-4">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(p)} aria-label={`Edit post: ${p.caption.slice(0, 30)}`}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button>
                  <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setDeleting(p)} aria-label={`Delete post: ${p.caption.slice(0, 30)}`}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!editing} onClose={() => !saving && setEditing(null)} title="Edit post" wide>
        {editing && <PostEditor key={editing.id} idPrefix="edit" initial={editing} defaults={defaults} onSave={saveEdit} saving={saving} />}
      </Modal>

      <ConfirmDialog open={!!deleting} title="Delete this post?" message="This permanently removes the post, its image and its Google Drive file. This cannot be undone."
        loading={deleteBusy} onConfirm={confirmDelete} onClose={() => !deleteBusy && setDeleting(null)} />
    </div>
  );
}
