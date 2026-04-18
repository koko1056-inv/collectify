import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SlidersHorizontal, Search, X, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Tag } from "@/types";
import { SearchBar } from "./SearchBar";

interface FilterSheetProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  selectedContent: string;
  onContentChange: (content: string) => void;
  tags: Tag[];
  selectedPersonalTag?: string;
  onPersonalTagChange?: (tag: string) => void;
}

/**
 * スリム化したフィルター UI。
 * - 検索バー + 🎛️ ボタン + 有効フィルターチップ のみ表示
 * - フィルターボタンタップで bottom sheet が開き、そこで全条件を編集
 */
export function FilterSheet({
  searchQuery,
  onSearchChange,
  selectedTags,
  onTagsChange,
  selectedContent,
  onContentChange,
  tags,
  selectedPersonalTag,
  onPersonalTagChange,
}: FilterSheetProps) {
  const { user } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [contentSearch, setContentSearch] = useState("");

  const { data: contentNames = [] } = useQuery({
    queryKey: ["content-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_names")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: personalTags = [] } = useQuery({
    queryKey: ["all-personal-tag-names", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_personal_tags")
        .select("tag_name")
        .eq("user_id", user.id);
      if (error) throw error;
      return Array.from(new Set(data.map((t) => t.tag_name))).sort();
    },
    enabled: !!user,
  });

  const filteredContent = useMemo(() => {
    if (!contentSearch) return contentNames;
    const q = contentSearch.toLowerCase();
    return contentNames.filter((c) => c.name?.toLowerCase().includes(q));
  }, [contentNames, contentSearch]);

  // 有効フィルターの数
  const activeCount =
    (selectedContent && selectedContent !== "all" ? 1 : 0) +
    (selectedPersonalTag ? 1 : 0) +
    selectedTags.length;

  const hasActive = activeCount > 0;

  const clearAll = () => {
    onContentChange("all");
    onPersonalTagChange?.("");
    onTagsChange([]);
  };

  return (
    <div className="space-y-3 w-full">
      {/* 検索行 */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 min-w-0">
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            selectedTags={selectedTags}
            onTagsChange={onTagsChange}
            tags={tags}
            selectedContent={selectedContent}
          />
        </div>
        <Button
          variant={hasActive ? "default" : "outline"}
          size="icon"
          onClick={() => setSheetOpen(true)}
          className="relative shrink-0 h-10 w-10 rounded-xl"
          aria-label="フィルターを開く"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {hasActive && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold ring-2 ring-background">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      {/* 有効フィルターチップ */}
      {hasActive && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedContent && selectedContent !== "all" && (
            <ActiveFilterChip
              label={selectedContent}
              onRemove={() => onContentChange("all")}
            />
          )}
          {selectedPersonalTag && (
            <ActiveFilterChip
              label={`#${selectedPersonalTag}`}
              onRemove={() => onPersonalTagChange?.("")}
            />
          )}
          {selectedTags.map((tagId) => {
            const tag = tags.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <ActiveFilterChip
                key={tagId}
                label={tag.name}
                onRemove={() => onTagsChange(selectedTags.filter((id) => id !== tagId))}
              />
            );
          })}
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            クリア
          </button>
        </div>
      )}

      {/* シート本体 */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-3 border-b">
            <SheetTitle className="flex items-center gap-2 text-left">
              <SlidersHorizontal className="w-5 h-5" />
              フィルター
              {hasActive && (
                <span className="ml-auto text-xs text-muted-foreground font-normal">
                  {activeCount}件 有効
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            {/* コンテンツセクション */}
            <section>
              <SectionHeading
                title="コンテンツ"
                value={
                  selectedContent && selectedContent !== "all"
                    ? selectedContent
                    : undefined
                }
              />
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="コンテンツ名で検索..."
                  value={contentSearch}
                  onChange={(e) => setContentSearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <PillOption
                  label="すべて"
                  active={!selectedContent || selectedContent === "all"}
                  onClick={() => onContentChange("all")}
                />
                {filteredContent.map((c) => (
                  <PillOption
                    key={c.id}
                    label={c.name}
                    image={c.image_url ?? undefined}
                    active={selectedContent === c.name}
                    onClick={() => onContentChange(c.name)}
                  />
                ))}
                {filteredContent.length === 0 && (
                  <p className="text-sm text-muted-foreground">該当なし</p>
                )}
              </div>
            </section>

            {/* マイタグ */}
            {user && personalTags.length > 0 && onPersonalTagChange && (
              <section>
                <SectionHeading
                  title="マイタグ"
                  value={selectedPersonalTag || undefined}
                />
                <div className="flex flex-wrap gap-2">
                  <PillOption
                    label="すべて"
                    active={!selectedPersonalTag}
                    onClick={() => onPersonalTagChange("")}
                  />
                  {personalTags.map((tag) => (
                    <PillOption
                      key={tag}
                      label={`#${tag}`}
                      active={selectedPersonalTag === tag}
                      onClick={() => onPersonalTagChange(tag)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* タグ */}
            {tags.length > 0 && (
              <section>
                <SectionHeading
                  title="タグ"
                  value={selectedTags.length ? `${selectedTags.length}件` : undefined}
                />
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 60).map((tag) => {
                    const active = selectedTags.includes(tag.id);
                    return (
                      <PillOption
                        key={tag.id}
                        label={tag.name}
                        active={active}
                        onClick={() =>
                          onTagsChange(
                            active
                              ? selectedTags.filter((id) => id !== tag.id)
                              : [...selectedTags, tag.id]
                          )
                        }
                      />
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* フッター: クリア + 適用 */}
          <div className="border-t px-5 py-3 flex gap-2 bg-background">
            <Button
              variant="outline"
              onClick={clearAll}
              disabled={!hasActive}
              className="flex-1 rounded-xl"
            >
              クリア
            </Button>
            <Button
              onClick={() => setSheetOpen(false)}
              className="flex-1 rounded-xl"
            >
              {hasActive ? `${activeCount}件で絞り込む` : "閉じる"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ---- Sub-components ----

function SectionHeading({
  title,
  value,
}: {
  title: string;
  value?: string;
}) {
  return (
    <div className="flex items-baseline justify-between mb-2.5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {value && (
        <span className="text-xs text-primary font-medium truncate max-w-[50%] text-right">
          {value}
        </span>
      )}
    </div>
  );
}

function PillOption({
  label,
  image,
  active,
  onClick,
}: {
  label: string;
  image?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
          : "bg-card text-foreground border-border hover:border-primary/40"
      )}
    >
      {image && (
        <img
          src={image}
          alt=""
          className="w-5 h-5 rounded-full object-cover"
          loading="lazy"
        />
      )}
      <span className="max-w-[180px] truncate">{label}</span>
      {active && <Check className="w-3.5 h-3.5 ml-0.5" />}
    </button>
  );
}

function ActiveFilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <Badge
      variant="secondary"
      className="bg-primary/10 text-primary hover:bg-primary/15 border-primary/20 pl-2.5 pr-1 py-1 gap-1 cursor-default"
    >
      <span className="max-w-[140px] truncate">{label}</span>
      <button
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-primary/20 transition-colors"
        aria-label="このフィルタを解除"
      >
        <X className="w-3 h-3" />
      </button>
    </Badge>
  );
}
