import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { isComplete, progressPercent, useCollectionProgress } from "@/hooks/useCollectionProgress";
import { getItemFacets } from "@/utils/itemFacets";
import { CreateItemPostModal } from "@/components/item-posts/CreateItemPostModal";

export interface AddedItem {
  userItemId: string;
  title: string;
  image: string | null;
}

/**
 * 登録完了の直後に出す「次の一手」。
 * 登録して終わりにせず、(1) 作品の進捗が進んだことを見せる、(2) そのグッズを投稿する、へ繋ぐ。
 */
export function AddedNextSteps({ item }: { item: AddedItem }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [postOpen, setPostOpen] = useState(false);
  const [posted, setPosted] = useState(false);

  // いま登録したグッズが属する作品名（公式グッズの作品名・タグ・手入力）
  const { data: seriesNames = [] } = useQuery({
    queryKey: ["added-item-series", item.userItemId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_items")
        .select(
          "content_name, official_items!user_items_official_item_id_fkey(content_name, item_tags(tags(name, category)))"
        )
        .eq("id", item.userItemId)
        .maybeSingle();
      return data ? getItemFacets(data as never).series : [];
    },
  });

  const { data: progress = [] } = useCollectionProgress(user?.id);
  const mine = progress.find((p) =>
    seriesNames.some((n) => n.toLowerCase() === p.series_label.toLowerCase())
  );
  const showProgress = !!mine && mine.total >= 2;

  return (
    <div className="w-full max-w-xs space-y-3">
      {showProgress && mine && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-bold">
            {isComplete(mine) && <Trophy className="h-4 w-4 text-amber-500" />}
            <span className="truncate">{mine.series_label}</span>
            <span className="ml-auto shrink-0 tabular-nums text-xs text-muted-foreground">
              {t("engage.collection.ownedOf", { owned: mine.owned, total: mine.total })}
            </span>
          </div>
          <Progress value={progressPercent(mine)} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {isComplete(mine)
              ? t("engage.next.complete")
              : t("engage.next.remaining", { n: Math.max(mine.total - mine.owned, 0) })}
          </p>
        </div>
      )}

      {!posted && (
        <Button variant="outline" className="w-full gap-1.5" onClick={() => setPostOpen(true)}>
          <Camera className="h-4 w-4" />
          {t("engage.next.postThis")}
        </Button>
      )}

      {postOpen && (
        <CreateItemPostModal
          open={postOpen}
          onOpenChange={setPostOpen}
          target={{ type: "user_item", id: item.userItemId }}
          itemTitle={item.title}
          itemImage={item.image}
          initialTag={t("engage.posts.quickTag.arrival")}
          onCreated={() => setPosted(true)}
        />
      )}
    </div>
  );
}
