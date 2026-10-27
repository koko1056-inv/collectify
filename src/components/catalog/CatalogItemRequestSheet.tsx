import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, CopyX, ImagePlus, Loader2, PencilLine, Search, Send, Trash2, type LucideIcon } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pocke, PockeBubble } from "@/components/pocke/Pocke";
import { pockeCheer } from "@/components/pocke/pockeCheer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useCharacterTagOptions,
  useContentNameOptions,
  useSubmitCatalogItemRequest,
  useTypeTagOptions,
} from "@/hooks/useCatalogItemRequests";
import {
  CHARACTERS_MAX,
  DELETE_REASONS,
  NOTE_MAX,
  currentValuesFromItem,
  normalizeProposedChange,
  requestErrorKey,
  type CatalogItemRequestKind,
  type DeleteReason,
  type EditDraft,
} from "@/utils/catalogItemRequests";
import { compressImageFile, ITEM_IMAGE_OPTIONS, UPLOAD_CACHE_CONTROL } from "@/utils/compress-image";
import { fallbackToOriginal, getOptimizedImageUrl } from "@/utils/optimized-image";
import { cn } from "@/lib/utils";

interface CatalogItemRequestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 最初に開く申請の種類（シートの中で切り替えられる） */
  initialKind: CatalogItemRequestKind;
  itemId: string;
  /** 読み込むまでの仮の表示 */
  itemTitle?: string;
  itemImage?: string | null;
}

interface ItemForRequest {
  id: string;
  title: string;
  image: string | null;
  content_name: string | null;
  release_date: string | null;
  price: string | null;
  item_tags: { tags: { id: string; name: string; category: string | null } | null }[];
}

interface PickedItem {
  id: string;
  title: string;
  image: string | null;
  content_name: string | null;
}

const KIND_ICON: Record<CatalogItemRequestKind, LucideIcon> = {
  edit: PencilLine,
  duplicate: CopyX,
  delete: Trash2,
};
const KINDS: CatalogItemRequestKind[] = ["edit", "duplicate", "delete"];

/**
 * カタログのグッズ1件への申請（修正申請・重複の報告・削除申請）を送るシート。
 * 送った内容は本人と運営だけが見る。承認されるまでカタログは変わらない。
 * 送れたらポッケが一言（トーストは出さない）。失敗だけ Sonner で知らせる。
 * 未ログイン（お試し中を含む）のときは、登録をやさしくすすめる。
 */
export function CatalogItemRequestSheet({
  open,
  onOpenChange,
  initialKind,
  itemId,
  itemTitle,
  itemImage,
}: CatalogItemRequestSheetProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [kind, setKind] = useState<CatalogItemRequestKind>(initialKind);
  const [reason, setReason] = useState<DeleteReason | null>(null);
  const [note, setNote] = useState("");
  const [duplicate, setDuplicate] = useState<PickedItem | null>(null);
  const [draft, setDraft] = useState<EditDraft>({});
  const [triedSubmit, setTriedSubmit] = useState(false);
  const submit = useSubmitCatalogItemRequest();

  // 開くたびに、渡された種類で始め直す
  useEffect(() => {
    if (!open) return;
    setKind(initialKind);
    setReason(null);
    setNote("");
    setDuplicate(null);
    setDraft({});
    setTriedSubmit(false);
  }, [open, initialKind, itemId]);

  const { data: item, isLoading: itemLoading } = useQuery({
    queryKey: ["catalog-request-item", itemId],
    enabled: open && !!user,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<ItemForRequest | null> => {
      const { data, error } = await supabase
        .from("official_items")
        .select("id, title, image, content_name, release_date, price, item_tags(tags(id, name, category))")
        .eq("id", itemId)
        .maybeSingle();
      if (error) throw error;
      return (data as ItemForRequest | null) ?? null;
    },
  });

  const current = useMemo(() => (item ? currentValuesFromItem(item) : null), [item]);
  const normalized = useMemo(
    () => (current ? normalizeProposedChange(current, draft) : { changes: {}, errors: ["empty" as const] }),
    [current, draft]
  );

  const noteMissing = kind === "delete" && reason === "other" && note.trim() === "";
  const canSubmit =
    !!user &&
    !submit.isPending &&
    (kind === "delete"
      ? !!reason && !noteMissing
      : kind === "duplicate"
        ? !!duplicate
        : !!current && normalized.errors.length === 0);

  const handleSubmit = async () => {
    setTriedSubmit(true);
    if (!canSubmit) return;
    // 削除申請で「重複」を選び、同じグッズも選んだときは、重複の報告として送る（統合できるので）
    const sendKind: CatalogItemRequestKind = kind === "delete" && reason === "duplicate" && duplicate ? "duplicate" : kind;
    try {
      await submit.mutateAsync({
        officialItemId: itemId,
        kind: sendKind,
        reason: sendKind === "delete" ? reason : null,
        note,
        proposed: sendKind === "edit" ? normalized.changes : null,
        duplicateOf: sendKind === "duplicate" ? duplicate?.id ?? null : null,
      });
      onOpenChange(false);
      pockeCheer("catalogRequestSent");
    } catch (e) {
      console.error("catalog item request failed:", e);
      // 失敗もポッケが一言で伝える（トーストは出さない）
      pockeCheer("catalogRequestFailed", undefined, requestErrorKey(e));
    }
  };

  const title = item?.title ?? itemTitle ?? "";
  const image = item?.image ?? itemImage ?? null;
  const loginHref = `/login?redirect=${encodeURIComponent(`/item/${itemId}`)}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[92vh] flex-col gap-0 rounded-t-2xl p-0 sm:mx-auto sm:max-w-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
        data-testid="catalog-item-request-sheet"
      >
        <SheetHeader className="border-b px-5 pb-3 pt-5 text-left">
          <SheetTitle>{t(`catalogItemRequest.kind.${kind}`)}</SheetTitle>
          <SheetDescription className="text-xs">{t(`catalogItemRequest.sheet.desc.${kind}`)}</SheetDescription>
        </SheetHeader>

        {!user ? (
          <div className="flex flex-col items-center gap-3 px-5 pb-8 pt-6 text-center">
            <PockeBubble tail="bottom" className="max-w-xs">
              <p className="font-bold">{t("catalogItemRequest.sheet.guestTitle")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("catalogItemRequest.sheet.guestBody")}</p>
            </PockeBubble>
            <Pocke pose="point" height={88} motion="pop" />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild>
                <Link to={`${loginHref}&from=try`}>{t("catalogItemRequest.sheet.guestCta")}</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to={loginHref}>{t("catalogItemRequest.sheet.guestLogin")}</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4 pt-4">
              {/* 種類の切り替え */}
              <div role="tablist" className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/60 p-1">
                {KINDS.map((k) => {
                  const Icon = KIND_ICON[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      role="tab"
                      aria-selected={kind === k}
                      onClick={() => {
                        setKind(k);
                        setTriedSubmit(false);
                      }}
                      className={cn(
                        "flex items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs font-medium transition-colors",
                        kind === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{t(`catalogItemRequest.menu.${k}`)}</span>
                    </button>
                  );
                })}
              </div>

              <ItemMini title={title} image={image} contentName={item?.content_name ?? null} />

              {kind === "delete" && (
                <div className="space-y-4">
                  <fieldset className="space-y-1.5">
                    <legend className="mb-1.5 text-sm font-medium">{t("catalogItemRequest.sheet.reasonLabel")}</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {DELETE_REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          aria-pressed={reason === r}
                          onClick={() => setReason(r)}
                          className={cn(
                            "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                            reason === r ? "border-primary bg-primary/10 font-bold text-primary" : "border-border hover:bg-muted/50",
                            r === "other" && "col-span-2"
                          )}
                        >
                          {t(`catalogItemRequest.reason.${r}`)}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  {reason === "duplicate" && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">{t("catalogItemRequest.sheet.duplicate.hintFromDelete")}</p>
                      <DuplicatePicker excludeId={itemId} picked={duplicate} onPick={setDuplicate} />
                    </div>
                  )}
                </div>
              )}

              {kind === "duplicate" && (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{t("catalogItemRequest.sheet.duplicate.label")}</p>
                  <DuplicatePicker excludeId={itemId} picked={duplicate} onPick={setDuplicate} />
                  {triedSubmit && !duplicate && (
                    <p className="text-xs text-destructive">{t("catalogItemRequest.sheet.duplicate.required")}</p>
                  )}
                </div>
              )}

              {kind === "edit" &&
                (itemLoading || !current || !item ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-2/3 rounded-lg" />
                  </div>
                ) : (
                  <EditFields
                    item={item}
                    current={current}
                    draft={draft}
                    setDraft={setDraft}
                    errors={triedSubmit ? normalized.errors : normalized.errors.filter((e) => e !== "empty")}
                    userId={user.id}
                  />
                ))}

              <div className="space-y-1.5">
                <label htmlFor="cir-note" className="text-sm font-medium">
                  {kind === "delete" && reason === "other"
                    ? t("catalogItemRequest.sheet.noteLabelRequired")
                    : t("catalogItemRequest.sheet.noteLabel")}
                </label>
                <Textarea
                  id="cir-note"
                  value={note}
                  rows={3}
                  maxLength={NOTE_MAX}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("catalogItemRequest.sheet.notePlaceholder")}
                />
                {triedSubmit && noteMissing && (
                  <p className="text-xs text-destructive">{t("catalogItemRequest.sheet.noteRequired")}</p>
                )}
              </div>
            </div>

            <div className="space-y-2 border-t bg-background px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
              <p className="text-center text-3xs text-muted-foreground">{t("catalogItemRequest.sheet.privacy")}</p>
              <Button
                className="w-full gap-2"
                onClick={handleSubmit}
                disabled={submit.isPending || (kind === "delete" && !reason)}
                data-testid="catalog-item-request-submit"
              >
                {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submit.isPending ? t("catalogItemRequest.sheet.sending") : t("catalogItemRequest.sheet.submit")}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ItemMini({ title, image, contentName }: { title: string; image: string | null; contentName: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-2">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted/40">
        {image && (
          <img
            src={getOptimizedImageUrl(image, { width: 160 })}
            onError={fallbackToOriginal(image)}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
      </div>
      <div className="min-w-0">
        {contentName && <p className="truncate text-2xs font-medium text-primary">{contentName}</p>}
        <p className="line-clamp-2 text-sm font-medium leading-snug">{title}</p>
      </div>
    </div>
  );
}

/** 「同じグッズ」をシートの中で探して選ぶ */
function DuplicatePicker({
  excludeId,
  picked,
  onPick,
}: {
  excludeId: string;
  picked: PickedItem | null;
  onPick: (item: PickedItem | null) => void;
}) {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const debounced = useDebounce(q.trim(), 300);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["catalog-request-duplicate-search", debounced],
    enabled: debounced.length > 0 && !picked,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<PickedItem[]> => {
      const { data, error } = await supabase.rpc("search_official_items_with_owners", { _q: debounced, _limit: 12 });
      if (error) throw error;
      return (data ?? []).map((r) => ({ id: r.id, title: r.title, image: r.image, content_name: r.content_name }));
    },
  });

  if (picked) {
    return (
      <div className="space-y-1.5" data-testid="duplicate-picked">
        <p className="flex items-center gap-1 text-xs font-medium text-primary">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          {t("catalogItemRequest.sheet.duplicate.picked")}
        </p>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <ItemMini title={picked.title} image={picked.image} contentName={picked.content_name} />
          </div>
          <Button variant="outline" size="sm" onClick={() => onPick(null)} className="shrink-0">
            {t("catalogItemRequest.sheet.duplicate.change")}
          </Button>
        </div>
      </div>
    );
  }

  const shown = results.filter((r) => r.id !== excludeId);
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("catalogItemRequest.sheet.duplicate.searchPlaceholder")}
          className="pl-9"
          aria-label={t("catalogItemRequest.sheet.duplicate.searchPlaceholder")}
          data-testid="duplicate-search"
        />
      </div>
      {debounced.length > 0 &&
        (isFetching && shown.length === 0 ? (
          <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("catalogItemRequest.sheet.duplicate.searching")}
          </p>
        ) : shown.length === 0 ? (
          <p className="px-1 text-xs text-muted-foreground">{t("catalogItemRequest.sheet.duplicate.none")}</p>
        ) : (
          <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {shown.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onPick(r)}
                  className="flex w-full items-center gap-2.5 p-2 text-left hover:bg-muted/50"
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-muted/40">
                    {r.image && (
                      <img
                        src={getOptimizedImageUrl(r.image, { width: 120 })}
                        onError={fallbackToOriginal(r.image)}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-contain"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {r.content_name && <p className="truncate text-3xs text-muted-foreground">{r.content_name}</p>}
                    <p className="line-clamp-2 text-xs leading-snug">{r.title}</p>
                  </div>
                  <span className="shrink-0 text-2xs font-bold text-primary">{t("catalogItemRequest.sheet.duplicate.pick")}</span>
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}

/** 修正申請の入力欄。最初は今の値が入っていて、変えたところだけが申請になる */
function EditFields({
  item,
  current,
  draft,
  setDraft,
  errors,
  userId,
}: {
  item: ItemForRequest;
  current: ReturnType<typeof currentValuesFromItem>;
  draft: EditDraft;
  setDraft: React.Dispatch<React.SetStateAction<EditDraft>>;
  errors: string[];
  userId: string;
}) {
  const { t } = useLanguage();
  const { data: contents = [] } = useContentNameOptions(true);
  const { data: types = [] } = useTypeTagOptions(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const contentName = draft.content_name ?? current.content_name ?? "";
  const contentId = contents.find((c) => c.name === contentName)?.id ?? null;
  const { data: characters = [], isLoading: charactersLoading } = useCharacterTagOptions(contentId);
  const selectedChars = draft.character_tag_ids ?? current.character_tag_ids;
  const [charFilter, setCharFilter] = useState("");

  // いまのキャラが一覧の上位に無くても選んだ状態で見えるよう、先頭に寄せる
  const characterOptions = useMemo(() => {
    const selected = new Set(selectedChars);
    const list = [...characters].sort((a, b) => Number(selected.has(b.id)) - Number(selected.has(a.id)));
    const f = charFilter.trim();
    return f ? list.filter((c) => c.name.includes(f) || selected.has(c.id)) : list;
  }, [characters, selectedChars, charFilter]);

  const currentTypeName = item.item_tags.find((r) => r.tags?.category === "type")?.tags?.name ?? null;
  const currentCharNames = item.item_tags
    .filter((r) => r.tags?.category === "character")
    .map((r) => r.tags!.name)
    .join("、");

  const err = (field: string) =>
    errors.includes(field) ? <p className="text-xs text-destructive">{t(`catalogItemRequest.sheet.errors.${field}`)}</p> : null;
  const now = (value: string | null | undefined) => (
    <p className="truncate text-3xs text-muted-foreground">
      {t("catalogItemRequest.sheet.edit.current", { value: value || t("catalogItemRequest.sheet.edit.empty") })}
    </p>
  );

  const toggleChar = (id: string) => {
    setDraft((d) => {
      const base = d.character_tag_ids ?? current.character_tag_ids;
      const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
      return { ...d, character_tag_ids: next.slice(0, CHARACTERS_MAX) };
    });
  };

  // 写真は、ほかの画面と同じ公開バケット（kuji_images）の自分のフォルダに上げて、その URL を申請に入れる
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImageFile(file, ITEM_IMAGE_OPTIONS);
      const ext = compressed.name.split(".").pop() || "jpg";
      const path = `${userId}/catalog-requests/${item.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("kuji_images")
        .upload(path, compressed, { cacheControl: UPLOAD_CACHE_CONTROL });
      if (error) throw error;
      const { data } = supabase.storage.from("kuji_images").getPublicUrl(path);
      setDraft((d) => ({ ...d, image: data.publicUrl }));
    } catch (err) {
      console.error("catalog request image upload failed:", err);
      pockeCheer("catalogPhotoFailed");
    } finally {
      setUploading(false);
    }
  };

  const proposedImage = draft.image?.trim() && draft.image.trim() !== (current.image ?? "") ? draft.image.trim() : null;

  return (
    <div className="space-y-4" data-testid="edit-fields">
      <div className="space-y-1">
        <label htmlFor="cir-title" className="text-sm font-medium">
          {t("catalogItemRequest.field.title")}
        </label>
        <Input
          id="cir-title"
          value={draft.title ?? current.title}
          maxLength={220}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        />
        {err("title")}
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">{t("catalogItemRequest.field.content_name")}</p>
        <Select
          value={contentName || undefined}
          onValueChange={(v) => setDraft((d) => ({ ...d, content_name: v, character_tag_ids: v === current.content_name ? undefined : [] }))}
        >
          <SelectTrigger aria-label={t("catalogItemRequest.field.content_name")}>
            <SelectValue placeholder={t("catalogItemRequest.sheet.edit.contentPlaceholder")} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {contents.map((c) => (
              <SelectItem key={c.id} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {now(current.content_name)}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">{t("catalogItemRequest.field.character_tag_ids")}</p>
          {draft.character_tag_ids && (
            <button
              type="button"
              className="text-2xs text-muted-foreground underline underline-offset-2"
              onClick={() => setDraft((d) => ({ ...d, character_tag_ids: undefined }))}
            >
              {t("catalogItemRequest.sheet.edit.charactersReset")}
            </button>
          )}
        </div>
        {!contentId ? (
          <p className="text-xs text-muted-foreground">{t("catalogItemRequest.sheet.edit.charactersNeedContent")}</p>
        ) : charactersLoading ? (
          <Skeleton className="h-8 w-full rounded-lg" />
        ) : characters.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("catalogItemRequest.sheet.edit.charactersNone")}</p>
        ) : (
          <>
            {characters.length > 24 && (
              <Input
                value={charFilter}
                onChange={(e) => setCharFilter(e.target.value)}
                placeholder={t("catalogItemRequest.sheet.duplicate.searchPlaceholder")}
                className="h-8 text-xs"
              />
            )}
            <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
              {characterOptions.map((c) => {
                const on = selectedChars.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleChar(c.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      on ? "border-primary bg-primary/10 font-bold text-primary" : "border-border text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {now(currentCharNames)}
        {err("character_tag_ids")}
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">{t("catalogItemRequest.field.type_tag_id")}</p>
        <Select
          value={draft.type_tag_id ?? current.type_tag_id ?? undefined}
          onValueChange={(v) => setDraft((d) => ({ ...d, type_tag_id: v }))}
        >
          <SelectTrigger aria-label={t("catalogItemRequest.field.type_tag_id")}>
            <SelectValue placeholder={t("catalogItemRequest.sheet.edit.typePlaceholder")} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {types.map((tg) => (
              <SelectItem key={tg.id} value={tg.id}>
                {tg.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {now(currentTypeName)}
        {err("type_tag_id")}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-1">
          <label htmlFor="cir-release" className="text-sm font-medium">
            {t("catalogItemRequest.field.release_date")}
          </label>
          <Input
            id="cir-release"
            type="date"
            value={draft.release_date ?? current.release_date ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, release_date: e.target.value }))}
          />
          {err("release_date")}
        </div>
        <div className="min-w-0 space-y-1">
          <label htmlFor="cir-price" className="text-sm font-medium">
            {t("catalogItemRequest.field.price")}
          </label>
          <Input
            id="cir-price"
            value={draft.price ?? current.price ?? ""}
            inputMode="text"
            maxLength={60}
            placeholder="1650"
            onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
          />
          {err("price")}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cir-image" className="text-sm font-medium">
          {t("catalogItemRequest.field.image")}
        </label>
        <div className="flex gap-2">
          <Input
            id="cir-image"
            value={draft.image ?? ""}
            inputMode="url"
            placeholder={t("catalogItemRequest.sheet.edit.imageUrlPlaceholder")}
            onChange={(e) => setDraft((d) => ({ ...d, image: e.target.value }))}
            className="min-w-0 flex-1"
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0 gap-1 px-2.5"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            <span className="text-xs">
              {uploading ? t("catalogItemRequest.sheet.edit.imageUploading") : t("catalogItemRequest.sheet.edit.imageUpload")}
            </span>
          </Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
        {proposedImage && !errors.includes("image") && (
          <div className="flex items-center gap-2">
            <img
              src={proposedImage}
              alt={t("catalogItemRequest.sheet.edit.imagePreview")}
              className="h-16 w-16 rounded-lg border border-border object-contain"
            />
            <span className="text-3xs text-muted-foreground">{t("catalogItemRequest.sheet.edit.imagePreview")}</span>
          </div>
        )}
        {err("image")}
      </div>

      {errors.includes("empty") && <p className="text-xs text-destructive">{t("catalogItemRequest.sheet.errors.empty")}</p>}
    </div>
  );
}
