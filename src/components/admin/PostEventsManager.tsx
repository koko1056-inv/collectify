import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { usePostEventStats, usePostEvents, useSavePostEvent, type PostEventInput } from "@/hooks/usePostEvents";
import { DEFAULT_EVENT_COLOR, eventColor, eventPhase, type PostEvent, type PostEventStatus } from "@/types/postEvents";

/** 色の候補（イベントの表紙・ボタンの色） */
const COLORS = ["#E4577C", "#F29F3D", "#1F9E77", "#3E8EDE", "#7C6CF0", "#2A2A35"];
const STATUSES: PostEventStatus[] = ["draft", "active", "closed"];

interface FormState {
  title: string;
  hashtag: string;
  description: string;
  emoji: string;
  color: string;
  cover_image_url: string;
  suggested_category: string;
  pocke_line: string;
  starts_at: string;
  ends_at: string;
  status: PostEventStatus;
}

/** datetime-local の値（端末の時刻）⇔ ISO */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(): FormState {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 14 * 86_400_000);
  return {
    title: "",
    hashtag: "",
    description: "",
    emoji: "✨",
    color: DEFAULT_EVENT_COLOR,
    cover_image_url: "",
    suggested_category: "",
    pocke_line: "",
    starts_at: toLocalInput(start.toISOString()),
    ends_at: toLocalInput(end.toISOString()),
    status: "draft",
  };
}

function fromEvent(e: PostEvent): FormState {
  return {
    title: e.title,
    hashtag: e.hashtag,
    description: e.description ?? "",
    emoji: e.emoji ?? "",
    color: eventColor(e),
    cover_image_url: e.cover_image_url ?? "",
    suggested_category: e.suggested_category ?? "",
    pocke_line: e.pocke_line ?? "",
    starts_at: toLocalInput(e.starts_at),
    ends_at: toLocalInput(e.ends_at),
    status: (e.status as PostEventStatus) ?? "draft",
  };
}

/**
 * 管理画面の「お題イベント」。作る・直す・締め切るだけの、小さな管理。
 * 書き込みは RLS で管理者だけ（post_events の INSERT / UPDATE ポリシー）。
 */
export function PostEventsManager() {
  const { t } = useLanguage();
  const { formatShortDateTime } = useDateFormat();
  const { data: events = [], isLoading } = usePostEvents();
  const stats = usePostEventStats(events.map((e) => e.id).slice(0, 50));
  const save = useSavePostEvent();
  // null = 一覧だけ / "new" = 新規 / それ以外 = 編集中の id
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const startNew = () => {
    setForm(emptyForm());
    setEditing("new");
  };
  const startEdit = (e: PostEvent) => {
    setForm(fromEvent(e));
    setEditing(e.id);
  };
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const hashtag = form.hashtag.trim().replace(/^#/, "");
    if (!/^[^\s#]{1,40}$/.test(hashtag)) {
      toast.error(t("postEvents.admin.invalidHashtag"));
      return;
    }
    const starts = new Date(form.starts_at);
    const ends = new Date(form.ends_at);
    if (!(ends.getTime() > starts.getTime())) {
      toast.error(t("postEvents.admin.invalidPeriod"));
      return;
    }
    const values: PostEventInput = {
      title: form.title.trim(),
      hashtag,
      description: form.description.trim() || null,
      emoji: form.emoji.trim() || null,
      color: form.color || null,
      cover_image_url: form.cover_image_url.trim() || null,
      suggested_category: form.suggested_category.trim() || null,
      pocke_line: form.pocke_line.trim() || null,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      status: form.status,
    };
    try {
      await save.mutateAsync({ id: editing && editing !== "new" ? editing : undefined, values });
      toast.success(t("postEvents.admin.saved"));
      setEditing(null);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      toast.error(err.code === "23505" ? t("postEvents.admin.duplicateHashtag") : t("postEvents.admin.saveFailed"), {
        description: err.code === "23505" ? undefined : err.message,
      });
    }
  };

  const setStatus = async (e: PostEvent, status: PostEventStatus) => {
    try {
      await save.mutateAsync({ id: e.id, values: { status } });
      toast.success(t("postEvents.admin.saved"));
    } catch (err) {
      toast.error(t("postEvents.admin.saveFailed"), { description: (err as Error).message });
    }
  };

  return (
    <div className="space-y-4" data-testid="admin-post-events">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("postEvents.admin.title")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("postEvents.admin.desc")}</p>
        </div>
        {editing === null && (
          <Button onClick={startNew} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {t("postEvents.admin.create")}
          </Button>
        )}
      </div>

      {editing !== null && (
        <div className="grid gap-4 rounded-2xl border bg-background p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("postEvents.admin.fields.title")} className="sm:col-span-2">
              <Input value={form.title} maxLength={60} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field label={t("postEvents.admin.fields.hashtag")}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">#</span>
                <Input className="pl-6" value={form.hashtag} maxLength={41} onChange={(e) => set("hashtag", e.target.value.replace(/\s/g, ""))} />
              </div>
            </Field>
            <Field label={t("postEvents.admin.fields.status")}>
              <Select value={form.status} onValueChange={(v) => set("status", v as PostEventStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`postEvents.admin.status.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("postEvents.admin.fields.description")} className="sm:col-span-2">
              <Textarea rows={3} maxLength={500} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label={t("postEvents.admin.fields.starts")}>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
            </Field>
            <Field label={t("postEvents.admin.fields.ends")}>
              <Input type="datetime-local" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
            </Field>
            <Field label={t("postEvents.admin.fields.emoji")}>
              <Input value={form.emoji} maxLength={8} onChange={(e) => set("emoji", e.target.value)} />
            </Field>
            <Field label={t("postEvents.admin.fields.color")}>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("postEvents.admin.fields.color")}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={form.color.toLowerCase() === c.toLowerCase()}
                    aria-label={c}
                    onClick={() => set("color", c)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-transform",
                      form.color.toLowerCase() === c.toLowerCase() ? "scale-110 border-foreground" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Field>
            <Field label={t("postEvents.admin.fields.category")}>
              <Input value={form.suggested_category} maxLength={30} onChange={(e) => set("suggested_category", e.target.value)} />
            </Field>
            <Field label={t("postEvents.admin.fields.pocke")}>
              <Input value={form.pocke_line} maxLength={80} onChange={(e) => set("pocke_line", e.target.value)} />
            </Field>
            <Field label={t("postEvents.admin.fields.cover")} className="sm:col-span-2">
              <Input type="url" inputMode="url" value={form.cover_image_url} onChange={(e) => set("cover_image_url", e.target.value)} placeholder="https://" />
            </Field>
            <div className="flex gap-2 sm:col-span-2">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={save.isPending}>
                {t("postEvents.admin.cancel")}
              </Button>
              <Button onClick={submit} disabled={save.isPending || !form.title.trim() || !form.hashtag.trim()} className="gap-1.5">
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {save.isPending ? t("postEvents.admin.saving") : t("postEvents.admin.save")}
              </Button>
            </div>
          </div>
          {/* プレビュー（バナーのカードと同じ見た目） */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{t("postEvents.admin.preview")}</p>
            <div
              className="relative overflow-hidden rounded-2xl border p-4"
              style={{ borderColor: `${form.color}40`, background: `linear-gradient(140deg, ${form.color}26, ${form.color}08)` }}
            >
              <span aria-hidden="true" className="absolute -right-3 -top-4 leading-none opacity-[0.14]" style={{ fontSize: 80 }}>
                {form.emoji}
              </span>
              <span className="rounded-full px-1.5 py-px text-3xs font-bold text-white" style={{ backgroundColor: form.color }}>
                {t("postEvents.label")}
              </span>
              <p className="mt-2 text-lg font-bold leading-tight">{form.title || "—"}</p>
              <p className="text-sm font-bold" style={{ color: form.color }}>
                #{form.hashtag || "…"}
              </p>
              {form.description && <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{form.description}</p>}
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState title={t("postEvents.admin.empty")} />
      ) : (
        <ul className="divide-y rounded-2xl border bg-background">
          {events.map((e) => {
            const phase = eventPhase(e);
            const c = eventColor(e);
            const st = stats.data?.get(e.id);
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: `${c}1f` }}>
                  {e.emoji || "#"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate font-bold">{e.title}</p>
                    <PhaseBadge phase={phase} />
                  </div>
                  <p className="truncate text-xs" style={{ color: c }}>
                    #{e.hashtag}
                  </p>
                  <p className="text-2xs text-muted-foreground">
                    {formatShortDateTime(e.starts_at)} – {formatShortDateTime(e.ends_at)}
                    {st && ` · ${t("postEvents.participants", { n: st.participantCount })} · ${t("postEvents.posts", { n: st.postCount })}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <Button asChild variant="ghost" size="sm" className="gap-1">
                    <Link to={`/event/${e.id}`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      {t("postEvents.admin.view")}
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => startEdit(e)}>
                    <Pencil className="h-3.5 w-3.5" />
                    {t("postEvents.admin.edit")}
                  </Button>
                  {e.status === "active" ? (
                    <Button variant="outline" size="sm" onClick={() => setStatus(e, "closed")} disabled={save.isPending}>
                      {t("postEvents.admin.close")}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setStatus(e, "active")} disabled={save.isPending}>
                      {e.status === "draft" ? t("postEvents.admin.publish") : t("postEvents.admin.reopen")}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function PhaseBadge({ phase }: { phase: ReturnType<typeof eventPhase> }) {
  const { t } = useLanguage();
  const map = {
    draft: { label: t("postEvents.draft"), cls: "bg-muted text-muted-foreground" },
    upcoming: { label: t("postEvents.upcoming"), cls: "bg-info/15 text-info" },
    open: { label: t("postEvents.admin.status.active"), cls: "bg-success/15 text-success" },
    ended: { label: t("postEvents.ended"), cls: "bg-muted text-muted-foreground" },
  } as const;
  const m = map[phase];
  return <span className={cn("rounded-full px-1.5 py-px text-3xs font-bold", m.cls)}>{m.label}</span>;
}
