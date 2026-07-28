import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, ChevronLeft, ListChecks, Loader2, Pencil, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOfficialItems } from "@/hooks/useOfficialItems";
import { addToCollection } from "@/utils/collection-actions";

type View = "menu" | "pick";

interface AddGoodsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 開いたときに最初に見せる画面。「探して追加」からは選択肢を挟まず一覧へ直行する。 */
  initialView?: View;
}

/**
 * コレクション画面の「追加」から開く選択肢。
 *
 * 撮影(/quick-add)と手入力(/add-item)に加えて、
 * 「みんなのカタログに既にあるグッズを探して、そのまま自分のものとして追加する」
 * を画面を離れずにできるようにする。
 * 既にある物を撮り直すとカタログに同じグッズが重複して登録されてしまうため、
 * まずここで探してもらえるほうが望ましい。
 */
export function AddGoodsSheet({ open, onOpenChange, initialView = "menu" }: AddGoodsSheetProps) {
  const [view, setView] = useState<View>(initialView);

  // 開き直したときは、その時の入口に合わせた画面から始める
  useEffect(() => {
    if (open) setView(initialView);
  }, [open, initialView]);

  const close = () => {
    onOpenChange(false);
    // 閉じるアニメーションが終わってから戻す（切り替わりが見えないように）
    setTimeout(() => setView(initialView), 250);
  };

  return (
    <Drawer open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DrawerContent className="max-h-[88vh]">
        {view === "menu" ? (
          <MenuView onPick={() => setView("pick")} onNavigate={close} />
        ) : (
          <PickFromCatalogView onBack={() => setView("menu")} />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function MenuView({ onPick, onNavigate }: { onPick: () => void; onNavigate: () => void }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const go = (path: string) => {
    onNavigate();
    navigate(path);
  };

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="mx-auto w-full max-w-sm space-y-3">
        <DrawerTitle className="text-center text-base font-semibold">
          {t("collectionScreen.addSheet.title")}
        </DrawerTitle>
        <DrawerDescription className="sr-only">
          {t("collectionScreen.addSheet.description")}
        </DrawerDescription>

        <AddOption
          icon={Camera}
          title={t("chrome.collection.addByPhoto")}
          desc={t("chrome.collection.addByPhotoHint")}
          onClick={() => go("/quick-add")}
          primary
        />
        <AddOption
          icon={ListChecks}
          title={t("collectionScreen.addSheet.pickTitle")}
          desc={t("collectionScreen.addSheet.pickDesc")}
          onClick={onPick}
        />
        <AddOption
          icon={Pencil}
          title={t("chrome.collection.addManually")}
          desc={t("collectionScreen.addSheet.manualDesc")}
          onClick={() => go("/add-item")}
        />
      </div>
    </div>
  );
}

function AddOption({
  icon: Icon,
  title,
  desc,
  onClick,
  primary = false,
}: {
  icon: typeof Camera;
  title: string;
  desc: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "w-full flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3.5 text-left transition-colors hover:bg-primary/10"
          : "w-full flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-muted/60"
      }
    >
      <span
        className={
          primary
            ? "shrink-0 rounded-lg bg-primary p-2 text-primary-foreground"
            : "shrink-0 rounded-lg bg-muted p-2 text-foreground"
        }
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  );
}

function PickFromCatalogView({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  const { data: items = [], isLoading, isError, refetch } = useOfficialItems();

  // 既に持っているグッズを一度に取得する。
  // 行ごとに問い合わせると、表示件数ぶんクエリが飛んでしまう。
  const { data: ownedIds } = useQuery({
    queryKey: ["owned-official-item-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("official_item_id")
        .eq("user_id", user!.id)
        .not("official_item_id", "is", null);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.official_item_id as string));
    },
  });

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? items.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            (i.content_name?.toLowerCase() ?? "").includes(q)
        )
      : items;
    // 未検索で全件流すと重いので、先頭だけ出して「検索してください」に誘導する
    return matched.slice(0, 50);
  }, [items, query]);

  const handleAdd = async (item: (typeof items)[number]) => {
    if (!user) return;
    setAddingId(item.id);
    try {
      const result = await addToCollection({
        userId: user.id,
        title: item.title,
        image: item.image,
        officialItemId: item.id,
        contentName: item.content_name || undefined,
        releaseDate: item.release_date,
        prize: item.price,
      });

      if (result.success) {
        toast.success(t("collectionScreen.official.added"), {
          description: result.pointsAwarded
            ? t("notices.adminItem.pointsEarnedDesc", { n: result.pointsAwarded })
            : item.title,
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["user-items"], refetchType: "all" }),
          queryClient.invalidateQueries({ queryKey: ["owned-official-item-ids", user.id] }),
          queryClient.invalidateQueries({ queryKey: ["collectionCount"], refetchType: "all" }),
          queryClient.invalidateQueries({ queryKey: ["userPoints"], refetchType: "all" }),
          queryClient.invalidateQueries({ queryKey: ["hero-stats", user.id], refetchType: "all" }),
        ]);
      } else if (result.isAtLimit) {
        toast.error(t("collectionScreen.addFlow.limitTitle"), {
          description: t("notices.adminItem.limitDesc", { max: result.maxSlots ?? 0 }),
        });
      } else {
        // result.error は Supabase の技術的メッセージなので表示しない
        console.error("addToCollection failed:", result.error);
        toast.error(t("collectionScreen.common.error"), {
          description: t("notices.adminItem.collectionFailedDesc"),
        });
      }
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="flex max-h-[88vh] flex-col px-4 pt-4 pb-6">
      <div className="mx-auto flex w-full max-w-sm flex-col overflow-hidden">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label={t("chrome.common.back")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <DrawerTitle className="text-base font-semibold">
            {t("collectionScreen.addSheet.pickTitle")}
          </DrawerTitle>
        </div>
        <DrawerDescription className="sr-only">
          {t("collectionScreen.addSheet.pickDesc")}
        </DrawerDescription>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("collectionScreen.addSheet.searchPlaceholder")}
            className="pl-9"
          />
        </div>

        <ScrollArea className="mt-3 h-[52vh] pr-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <QueryErrorState
              title={t("chrome.officialItems.loadFailed")}
              onRetry={() => refetch()}
            />
          ) : results.length === 0 ? (
            <EmptyState
              icon={Search}
              title={t("collectionScreen.addSheet.noHitTitle")}
              description={t("collectionScreen.addSheet.noHitDesc")}
            />
          ) : (
            <div className="space-y-2">
              {results.map((item) => {
                const owned = ownedIds?.has(item.id) ?? false;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-2"
                  >
                    <img
                      src={item.image}
                      alt=""
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-lg object-cover bg-muted"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      {item.content_name && (
                        <p className="truncate text-xs text-muted-foreground">
                          {item.content_name}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={owned ? "outline" : "default"}
                      disabled={owned || addingId === item.id}
                      onClick={() => handleAdd(item)}
                      className="shrink-0 gap-1"
                    >
                      {addingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : owned ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : null}
                      {owned
                        ? t("collectionScreen.addSheet.owned")
                        : t("chrome.fab.addShort")}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
