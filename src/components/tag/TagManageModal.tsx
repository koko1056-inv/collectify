import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TagManageDialogHeader } from "./TagManageDialogHeader";
import { TagManageDialogFooter } from "./TagManageDialogFooter";
import { ContentNameSection } from "./ContentNameSection";
import { SimpleTagSelect } from "./SimpleTagSelect";
import { useSimpleTagManage } from "@/hooks/useSimpleTagManage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
interface TagManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemIds: string[];
  title?: string;
  itemTitle?: string;
  isUserItem?: boolean;
}
export function TagManageModal({
  isOpen,
  onClose,
  itemIds,
  title = "タグ管理",
  itemTitle,
  isUserItem = false
}: TagManageModalProps) {
  const {
    tagSelections,
    contentName,
    isLoading,
    isSubmitting,
    handleTagChange,
    handleContentChange,
    handleSubmit
  } = useSimpleTagManage(isOpen, itemIds, isUserItem, onClose);

  // 複数アイテムの場合はカウントを表示、単一アイテムの場合はタイトルを表示
  const modalTitle = itemIds.length > 1 ? `${title} (${itemIds.length}件のアイテム)` : itemTitle ? `${title}: ${itemTitle}` : title;
  return <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <TagManageDialogHeader title={modalTitle} />
        
        {isLoading ? <div className="py-4 text-center">読み込み中...</div> : <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-2">
              {/* コンテンツ名セクション */}
              <div className="space-y-3">
                
                <ContentNameSection contentName={contentName} onContentChange={handleContentChange} />
              </div>
              
              <Separator />
              
              {/* タグ選択セクション */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">タグ設定</h4>
                
                <SimpleTagSelect category="character" label="キャラ・人物名" value={tagSelections.character} onChange={value => handleTagChange('character', value)} />
                
                <SimpleTagSelect category="type" label="グッズタイプ" value={tagSelections.type} onChange={value => handleTagChange('type', value)} />
                
                <SimpleTagSelect category="series" label="グッズシリーズ" value={tagSelections.series} onChange={value => handleTagChange('series', value)} />
              </div>
            </div>
          </ScrollArea>}
        
        <TagManageDialogFooter onCancel={onClose} onSubmit={handleSubmit} itemCount={itemIds.length} />
      </DialogContent>
    </Dialog>;
}