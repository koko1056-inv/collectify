import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Tag, Loader2 } from "lucide-react";
import { usePersonalTags } from "@/hooks/usePersonalTags";
import { toast } from "sonner";

interface PersonalTagsSectionProps {
  userItemId: string;
}

export function PersonalTagsSection({ userItemId }: PersonalTagsSectionProps) {
  const { personalTags, allUserTags, isLoading, addTag, removeTag } = usePersonalTags(userItemId);
  const [isAdding, setIsAdding] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 既存タグの中から現在のアイテムにないものをフィルタリング
  const suggestions = allUserTags.filter(
    tag => 
      !personalTags.some(pt => pt.tag_name === tag) &&
      tag.toLowerCase().includes(newTagName.toLowerCase())
  );

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      toast.error("タグ名を入力してください");
      return;
    }

    await addTag.mutateAsync({ userItemId, tagName: newTagName });
    setNewTagName("");
    setIsAdding(false);
    toast.success("マイタグを追加しました");
  };

  const handleRemoveTag = async (tagId: string) => {
    await removeTag.mutateAsync(tagId);
    toast.success("マイタグを削除しました");
  };

  const handleSelectSuggestion = (tagName: string) => {
    setNewTagName(tagName);
    setShowSuggestions(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">マイタグ</span>
          <span className="text-xs text-muted-foreground">(自分だけ)</span>
        </div>
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-3 h-3" />
            追加
          </Button>
        )}
      </div>

      {/* タグ追加フォーム */}
      {isAdding && (
        <div className="space-y-2 relative">
          <div className="flex gap-2">
            <Input
              value={newTagName}
              onChange={(e) => {
                setNewTagName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="タグ名を入力..."
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
            />
            <Button
              size="sm"
              className="h-8"
              onClick={handleAddTag}
              disabled={addTag.isPending}
            >
              {addTag.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "追加"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                setIsAdding(false);
                setNewTagName("");
              }}
            >
              キャンセル
            </Button>
          </div>
          
          {/* サジェスト */}
          {showSuggestions && suggestions.length > 0 && newTagName && (
            <div className="absolute top-10 left-0 right-0 z-10 bg-background border rounded-md shadow-lg max-h-32 overflow-y-auto">
              {suggestions.slice(0, 5).map((tag) => (
                <button
                  key={tag}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => handleSelectSuggestion(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* タグ一覧 */}
      {personalTags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {personalTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="text-xs gap-1 pr-1 bg-primary/10 text-primary border-primary/20"
            >
              {tag.tag_name}
              <button
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        !isAdding && (
          <p className="text-xs text-muted-foreground">
            マイタグはありません
          </p>
        )
      )}
    </div>
  );
}
