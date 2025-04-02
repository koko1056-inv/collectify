
import { SimpleItemTag } from "@/utils/tag/types";
import { TagUpdate } from "@/types/tag";
import { Input } from "@/components/ui/input";
import { useState } from "react";

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
      
      {/* ここに検索結果を表示 */}
      <div className="mt-4">
        <p className="text-sm text-muted-foreground">
          タグを検索するためにテキストを入力してください
        </p>
      </div>
    </div>
  );
}
