import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TagManageDialogHeader } from "./TagManageDialogHeader";
import { TagManageDialogFooter } from "./TagManageDialogFooter";
import { ContentNameSection } from "./ContentNameSection";
import { TagSuggestSelect } from "./TagSuggestSelect";
import { useSimpleTagManage } from "@/hooks/useSimpleTagManage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";

interface TagManageModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  itemIds: string[];
  title?: string;
  itemTitle?: string;
  isUserItem?: boolean;
}

export function TagManageModalV2({
  isOpen,
  onClose,
  itemIds,
  title,
  itemTitle,
  isUserItem = false
}: TagManageModalV2Props) {
  const { t } = useLanguage();
  const {
    tagSelections,
    contentName,
    contentId,
    isLoading,
    isSubmitting,
    handleTagChange,
    handleContentChange,
    handleSubmit
  } = useSimpleTagManage(isOpen, itemIds, isUserItem, onClose);

  const baseTitle = title ?? t("tagManage.manage.title");

  const modalTitle = itemIds.length > 1 
    ? `${baseTitle} (${itemIds.length}${t("tagManage.manage.itemCountSuffix")}` 
    : itemTitle 
      ? `${baseTitle}: ${itemTitle}` 
      : baseTitle;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <TagManageDialogHeader title={modalTitle} />
        
        {isLoading ? (
          <div className="py-4 text-center">{t("tagManage.common.loading")}</div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-2">
              {/* コンテンツ名セクション */}
              <div className="space-y-3">
                <ContentNameSection 
                  contentName={contentName} 
                  onContentChange={handleContentChange} 
                />
              </div>
              
              <Separator />
              
              {/* タグ選択セクション（新しいPinterest型UI） */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">{t("tagManage.manage.tagSettings")}</h4>
                <p className="text-xs text-muted-foreground">
                  {t("tagManage.manage.suggestHint")}
                </p>
                
                <TagSuggestSelect 
                  category="character" 
                  label={t("tagManage.category.character")} 
                  value={tagSelections.character} 
                  onChange={value => handleTagChange('character', value)}
                  contentId={contentId}
                />
                
                <TagSuggestSelect 
                  category="type" 
                  label={t("tagManage.category.type")} 
                  value={tagSelections.type} 
                  onChange={value => handleTagChange('type', value)}
                />
                
                <TagSuggestSelect 
                  category="series" 
                  label={t("tagManage.category.series")} 
                  value={tagSelections.series} 
                  onChange={value => handleTagChange('series', value)}
                  contentId={contentId}
                />
              </div>
            </div>
          </ScrollArea>
        )}
        
        <TagManageDialogFooter 
          onCancel={onClose} 
          onSubmit={handleSubmit} 
          itemCount={itemIds.length} 
        />
      </DialogContent>
    </Dialog>
  );
}
