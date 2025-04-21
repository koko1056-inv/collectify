
import { TagsSection } from "./TagsSection";
import { MemoriesSection } from "./MemoriesSection";
import { ItemNoteField } from "./ItemNoteField";
import { SimpleItemTag } from "@/utils/tag/types";

interface ItemDetailsMainInfoProps {
  tags: SimpleItemTag[];
  isUserItem: boolean;
  isEditing: boolean;
  editedData: any;
  setEditedData: (data: any) => void;
  memories?: any[];
  note?: string | null;
}

export function ItemDetailsMainInfo({
  tags,
  isUserItem,
  isEditing,
  editedData,
  setEditedData,
  memories = [],
  note,
}: ItemDetailsMainInfoProps) {
  return (
    <div className="space-y-4 px-6">
      {/* タグ（公式/ユーザー共通） */}
      <TagsSection
        isEditing={isEditing}
        tags={tags}
        editedData={editedData}
        setEditedData={setEditedData}
      />

      {/* 思い出セクション */}
      {isUserItem && <MemoriesSection memories={memories} />}

      {/* メモ欄 */}
      {isUserItem &&
        <ItemNoteField
          isEditing={isEditing}
          note={editedData?.note ?? note}
          onChange={(v) => setEditedData({ ...editedData, note: v })}
        />
      }
    </div>
  );
}
