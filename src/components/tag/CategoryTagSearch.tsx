
import { Badge } from "@/components/ui/badge";
import { SimpleItemTag } from "@/utils/tag/types";
import { TagUpdate } from "@/types/tag";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useTags } from "@/hooks/useTags";

export interface CategoryTagSearchProps {
  currentTags: SimpleItemTag[];
  pendingUpdates: TagUpdate[];
  onTagChange: (category: string) => (value: string | null) => void;
}

export function CategoryTagSearch({
  currentTags,
  pendingUpdates,
  onTagChange
}: CategoryTagSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTags, setFilteredTags] = useState<any[]>([]);
  
  // タグデータを取得
  const { data: allTags = [] } = useTags();
  
  // 検索クエリが変更されたときにタグをフィルタリング
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTags([]);
      return;
    }
    
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = allTags.filter(tag => 
      tag.name.toLowerCase().includes(lowerQuery)
    );
    
    setFilteredTags(filtered);
  }, [searchQuery, allTags]);
  
  return (
    <div className="space-y-4">
      <div>
        <Input
          placeholder="タグを検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>
      
      {searchQuery.trim() !== '' && (
        <div className="mt-4 max-h-[200px] overflow-y-auto">
          {filteredTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {filteredTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (tag.category) {
                      onTagChange(tag.category)(tag.name);
                    } else {
                      // カテゴリーがない場合はデフォルトのカテゴリーを使用
                      onTagChange('other')(tag.name);
                    }
                    setSearchQuery('');
                  }}
                >
                  {tag.name}
                  {tag.category && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({tag.category})
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              該当するタグはありません
            </p>
          )}
        </div>
      )}
      
      {searchQuery.trim() === '' && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            タグを検索するためにテキストを入力してください
          </p>
        </div>
      )}
    </div>
  );
}
