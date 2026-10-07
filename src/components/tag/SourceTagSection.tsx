import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTagsForItem } from "@/utils/tag/tag-queries";
import { addTagToItem, removeTagFromItem } from "@/utils/tag/tag-mutations";
import { cn } from "@/lib/utils";

interface SourceTagSectionProps {
  itemIds: string[];
  isUserItem: boolean;
}

/**
 * 入手方法（ガチャ・一番くじ・ライブ・ツアー など）を、複数まとめて付け外しする。
 *
 * 作品・種類・キャラは「1つだけ選ぶ」ので、既存の保存処理は同じカテゴリのタグを入れ替える。
 * 入手方法は「ガチャで、ライブ会場限定」のように複数付くので、その仕組みに乗せると
 * 付いているものが消えてしまう。そのため独立させ、タップした時点で追加・削除する。
 * 複数のグッズを選んでいるときは、全部のグッズに同じ操作を行う。
 */
export function SourceTagSection({ itemIds, isUserItem }: SourceTagSectionProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const { data: sourceTags = [] } = useQuery({
    queryKey: ["source-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, usage_count")
        .eq("category", "source")
        .eq("status", "approved")
        .order("usage_count", { ascending: false })
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60,
  });

  const { data: current, isFetched } = useQuery({
    queryKey: ["source-tags-of-item", itemIds[0], isUserItem],
    queryFn: async () => {
      const tags = await getTagsForItem(itemIds[0], isUserItem);
      return tags.filter((x) => x.tags?.category === "source").map((x) => x.tag_id);
    },
    enabled: itemIds.length > 0,
  });

  useEffect(() => {
    if (isFetched) setSelected(new Set(current ?? []));
  }, [isFetched, current]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["source-tags-of-item"] }),
      queryClient.invalidateQueries({ queryKey: ["current-tags"] }),
      queryClient.invalidateQueries({ queryKey: ["source-tags"] }),
      queryClient.invalidateQueries({ queryKey: ["item-tags"] }),
      queryClient.invalidateQueries({ queryKey: ["user-item-tags"] }),
      queryClient.invalidateQueries({ queryKey: [isUserItem ? "user-items" : "official-items"] }),
    ]);
  };

  const apply = async (tagId: string, on: boolean) => {
    setBusy(tagId);
    // 先に画面へ反映し、失敗したら戻す
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(tagId);
      else next.delete(tagId);
      return next;
    });
    const results = await Promise.all(
      itemIds.map((id) => (on ? addTagToItem(id, tagId, isUserItem) : removeTagFromItem(tagId, id, isUserItem)))
    );
    setBusy(null);
    if (results.some((ok) => !ok)) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (on) next.delete(tagId);
        else next.add(tagId);
        return next;
      });
      toast.error(t("engage.sourceTags.failed"));
      return;
    }
    await refresh();
  };

  const createAndApply = async () => {
    const name = newName.trim();
    if (!name) return;
    const existing = sourceTags.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setNewName("");
      if (!selected.has(existing.id)) await apply(existing.id, true);
      return;
    }
    setBusy("new");
    const { data, error } = await supabase
      .from("tags")
      .insert({ name, category: "source", status: "approved", display_context: "入手方法" })
      .select("id")
      .single();
    setBusy(null);
    if (error || !data) {
      toast.error(t("engage.sourceTags.failed"));
      return;
    }
    setNewName("");
    await queryClient.invalidateQueries({ queryKey: ["source-tags"] });
    await apply(data.id, true);
    toast.success(t("engage.sourceTags.created", { name }));
  };

  return (
    <div className="space-y-2" data-tour="source-tags">
      <div>
        <h4 className="text-sm font-medium">{t("engage.sourceTags.title")}</h4>
        <p className="text-xs text-muted-foreground">{t("engage.sourceTags.hint")}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sourceTags.map((tag) => {
          const on = selected.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              aria-pressed={on}
              disabled={busy !== null}
              onClick={() => apply(tag.id, !on)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-60",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
              )}
            >
              {on && <Check className="h-3 w-3" />}
              {tag.name}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void createAndApply();
            }
          }}
          placeholder={t("engage.sourceTags.addPlaceholder")}
          maxLength={30}
          className="h-9"
        />
        <Button type="button" size="sm" variant="outline" disabled={!newName.trim() || busy !== null} onClick={() => void createAndApply()} className="gap-1 shrink-0">
          <Plus className="h-3.5 w-3.5" />
          {t("engage.sourceTags.add")}
        </Button>
      </div>
    </div>
  );
}
