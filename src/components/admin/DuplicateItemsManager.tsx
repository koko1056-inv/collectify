import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Merge, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";
import { cn } from "@/lib/utils";

interface DupItem {
  id: string;
  title: string;
  image: string;
  content_name: string | null;
  owner_count: number;
  wish_count: number;
}

interface DupGroup {
  normalized: string;
  item_count: number;
  items: DupItem[];
}

/**
 * カタログの重複統合。
 *
 * マッチングは official_item_id で突き合わせるので、同じグッズが
 * 2件に分かれていると、持っている人と欲しい人が永久に出会えない。
 * 交換を機能させるうえで、ここの掃除は避けて通れない。
 *
 * 見出しが完全に一致する組は自動で拾えるが、「（再販）」が付いただけの
 * ような重複は拾えない。手で探して統合する道も下に用意してある。
 */
export function DuplicateItemsManager() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<{ keep: DupItem; merge: DupItem } | null>(null);

  const { data: groups = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["duplicate-official-items"],
    queryFn: async (): Promise<DupGroup[]> => {
      const { data, error } = await supabase.rpc("find_duplicate_official_items", { _limit: 50 });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        normalized: row.normalized,
        item_count: row.item_count,
        items: (Array.isArray(row.items) ? row.items : []) as unknown as DupItem[],
      }));
    },
  });

  const merge = useMutation({
    mutationFn: async ({ keep, merge: dup }: { keep: DupItem; merge: DupItem }) => {
      const { data, error } = await supabase.rpc("merge_official_items", {
        _keep_id: keep.id,
        _merge_id: dup.id,
      });
      if (error) throw error;
      const body = data as { ok?: boolean; reason?: string } | null;
      if (!body?.ok) throw new Error(body?.reason ?? "unknown");
      return body;
    },
    onSuccess: async () => {
      toast.success(t("admin.duplicates.mergedTitle"), {
        description: t("admin.duplicates.mergedDesc"),
      });
      setPending(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["duplicate-official-items"] }),
        queryClient.invalidateQueries({ queryKey: ["official-items"] }),
      ]);
    },
    onError: (e) => {
      console.error("merge failed:", e);
      toast.error(t("admin.duplicates.mergeFailedTitle"), {
        description: t("admin.duplicates.mergeFailedDesc"),
      });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Merge className="h-5 w-5 text-primary" />
            {t("admin.duplicates.title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("admin.duplicates.description")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <QueryErrorState title={t("admin.duplicates.loadFailed")} onRetry={() => refetch()} />
          ) : groups.length === 0 ? (
            <EmptyState
              icon={Merge}
              title={t("admin.duplicates.noneTitle")}
              description={t("admin.duplicates.noneDesc")}
              className="py-8"
            />
          ) : (
            groups.map((group) => (
              <DuplicateGroup
                key={group.normalized}
                group={group}
                onMerge={(keep, dup) => setPending({ keep, merge: dup })}
              />
            ))
          )}
        </CardContent>
      </Card>

      <ManualMergeCard onMerge={(keep, dup) => setPending({ keep, merge: dup })} />

      <AlertDialog open={!!pending} onOpenChange={(next) => !next && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.duplicates.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.duplicates.confirmDesc", {
                merge: pending?.merge.title ?? "",
                keep: pending?.keep.title ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={merge.isPending}>
              {t("admin.duplicates.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={merge.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (pending) merge.mutate(pending);
              }}
            >
              {merge.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {t("admin.duplicates.confirmCta")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DuplicateGroup({
  group,
  onMerge,
}: {
  group: DupGroup;
  onMerge: (keep: DupItem, dup: DupItem) => void;
}) {
  const { t } = useLanguage();
  // 使われている数が多いほうを既定の残す側にする。
  // 付け替える行が少ないほど、間違えたときの傷が浅い。
  const sorted = [...group.items].sort(
    (a, b) => b.owner_count + b.wish_count - (a.owner_count + a.wish_count)
  );
  const [keepId, setKeepId] = useState(sorted[0]?.id);
  const keep = sorted.find((i) => i.id === keepId) ?? sorted[0];

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {t("admin.duplicates.groupCount", { count: group.item_count })}
        </Badge>
        <span className="truncate text-xs text-muted-foreground">{group.normalized}</span>
      </div>

      <div className="space-y-2">
        {sorted.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-2 rounded-lg border p-2",
              item.id === keepId ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <img
              src={getOptimizedImageUrl(item.image, { width: 120 })}
              onError={fallbackToOriginal(item.image)}
              loading="lazy"
              decoding="async"
              alt=""
              className="h-10 w-10 shrink-0 rounded object-cover bg-muted"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{item.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {t("admin.duplicates.usage", {
                  owners: item.owner_count,
                  wishes: item.wish_count,
                })}
              </p>
            </div>
            {item.id === keepId ? (
              <Badge className="shrink-0 text-[10px]">{t("admin.duplicates.keepBadge")}</Badge>
            ) : (
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setKeepId(item.id)}>
                  {t("admin.duplicates.keepThis")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => keep && onMerge(keep, item)}
                >
                  {t("admin.duplicates.mergeIn")}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 自動では拾えない重複（「（再販）」付きなど）を手で探して統合する */
function ManualMergeCard({ onMerge }: { onMerge: (keep: DupItem, dup: DupItem) => void }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [keep, setKeep] = useState<DupItem | null>(null);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["admin-item-search", query],
    enabled: query.trim().length >= 2,
    queryFn: async (): Promise<DupItem[]> => {
      const { data, error } = await supabase
        .from("official_items")
        .select("id, title, image, content_name")
        .ilike("title", `%${query.trim()}%`)
        .is("merged_into", null)
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, owner_count: 0, wish_count: 0 }));
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("admin.duplicates.manualTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("admin.duplicates.manualDesc")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin.duplicates.manualPlaceholder")}
            className="pl-9"
          />
        </div>

        {keep && (
          <div className="flex items-center gap-2 rounded-lg border border-primary bg-primary/5 p-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 truncate text-xs">
              {t("admin.duplicates.manualKeeping", { title: keep.title })}
            </p>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setKeep(null)}>
              {t("admin.duplicates.cancel")}
            </Button>
          </div>
        )}

        {isFetching && <Skeleton className="h-10 w-full rounded-lg" />}

        <div className="space-y-1.5">
          {results.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-lg border p-2">
              <img
                src={getOptimizedImageUrl(item.image, { width: 120 })}
                onError={fallbackToOriginal(item.image)}
                loading="lazy"
                decoding="async"
                alt=""
                className="h-9 w-9 shrink-0 rounded object-cover bg-muted"
              />
              <p className="min-w-0 flex-1 truncate text-sm">{item.title}</p>
              {!keep ? (
                <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs" onClick={() => setKeep(item)}>
                  {t("admin.duplicates.keepThis")}
                </Button>
              ) : (
                keep.id !== item.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 text-xs"
                    onClick={() => onMerge(keep, item)}
                  >
                    {t("admin.duplicates.mergeIn")}
                  </Button>
                )
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
