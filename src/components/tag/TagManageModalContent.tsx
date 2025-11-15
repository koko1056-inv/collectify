
import { CategoryTagSelections } from "./CategoryTagSelections";
import { CurrentTagsList } from "./CurrentTagsList";
import { PendingTagsList } from "./PendingTagsList";
import { ContentNameSection } from "./ContentNameSection";
import { OfficialTagsSection } from "./OfficialTagsSection";
import { TagUpdate } from "@/types/tag";
import { removeTagFromItem } from "@/utils/tag/tag-mutations";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { SimpleItemTag } from "@/utils/tag/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

interface TagManageModalContentProps {
  currentTags: SimpleItemTag[];
  pendingUpdates: TagUpdate[];
  onTagChange: (category: string) => (value: string | null) => void;
  itemIds: string[];
  isUserItem?: boolean;
  contentName?: string | null;
  onContentChange?: (contentName: string | null) => void;
  officialTags?: SimpleItemTag[];
}

export function TagManageModalContent({
  currentTags,
  pendingUpdates,
  onTagChange,
  itemIds,
  isUserItem = false,
  contentName,
  onContentChange,
  officialTags = []
}: TagManageModalContentProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleRemoveTag = async (tagId: string) => {
    // 楽観的更新：UIから即座に削除 + フェッチの競合を回避
    const queryKey = ["current-tags", itemIds] as const;

    // 進行中のクエリをキャンセル（古い結果での上書き防止）
    await queryClient.cancelQueries({ queryKey });

    const previous = (queryClient.getQueryData<SimpleItemTag[]>(queryKey) || []).slice();

    // キャッシュから先に取り除く（即時反映）
    queryClient.setQueryData<SimpleItemTag[]>(queryKey, (old) => {
      const base = old ?? currentTags;
      return (base || []).filter((t) => t.tag_id !== tagId);
    });

    try {
      // 並列で削除して整合性ウィンドウを短縮し、結果をチェック
      const results = await Promise.all(
        itemIds.map((itemId) => removeTagFromItem(tagId, itemId, isUserItem))
      );

      // 1つでも失敗したらロールバック
      if (results.some((ok) => !ok)) {
        throw new Error("One or more tag deletions failed");
      }
      // 念のため最新化
      await queryClient.invalidateQueries({ queryKey });

      toast({
        title: "タグを削除しました",
        description: "タグが正常に削除されました。",
      });
    } catch (error) {
      console.error("Error removing tag:", error);
      // ロールバック
      queryClient.setQueryData(queryKey, previous);
      toast({
        title: "エラー",
        description: "タグの削除中にエラーが発生しました。",
        variant: "destructive",
      });
    }
  };
  return (
    <ScrollArea className="max-h-[60vh] pr-4">
      <div className="space-y-6 py-2">
        {/* 現在のタグ */}
        <Card className="border-0 shadow-none bg-gray-50/50">
          <CardContent className="p-4">
            <CurrentTagsList 
              currentTags={currentTags} 
              onRemoveTag={handleRemoveTag}
            />
          </CardContent>
        </Card>
        
        {/* 公式タグセクション */}
        {isUserItem && officialTags && officialTags.length > 0 && (
          <>
            <Separator className="my-4" />
            <Card className="border-0 shadow-none bg-blue-50/30">
              <CardContent className="p-4">
                <OfficialTagsSection officialTags={officialTags} />
              </CardContent>
            </Card>
          </>
        )}
        
        {/* コンテンツ名セクション */}
        {onContentChange && (
          <>
            <Separator className="my-4" />
            <Card className="border-0 shadow-none bg-green-50/30">
              <CardContent className="p-4">
                <ContentNameSection 
                  contentName={contentName || null} 
                  onContentChange={onContentChange} 
                />
              </CardContent>
            </Card>
          </>
        )}
        
        <Separator className="my-4" />
        
        {/* タグ選択 */}
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <CategoryTagSelections 
              currentTags={currentTags}
              pendingUpdates={pendingUpdates}
              onTagChange={onTagChange}
            />
          </CardContent>
        </Card>

        {/* 保留中のタグ */}
        {pendingUpdates.length > 0 && (
          <>
            <Separator className="my-4" />
            <Card className="border-0 shadow-none bg-amber-50/50">
              <CardContent className="p-4">
                <PendingTagsList pendingUpdates={pendingUpdates} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
