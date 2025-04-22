import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ItemImageEditor } from "./ItemImageEditor";
import { ContentNameSection } from "./ContentNameSection";
import { CreatorSection } from "./CreatorSection";
import { MemoriesSection } from "./MemoriesSection";
import { CategoryTagSelect } from "../tag/CategoryTagSelect";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ItemDescriptionField } from "./ItemDescriptionField";
import { TagsSection } from "./TagsSection";
import { ItemNoteField } from "./ItemNoteField";

interface ItemDetailsContentProps {
  image: string;
  title: string;
  tags?: Array<{ tags: { id: string; name: string; category?: string; } | null; }>;
  memories?: any[];
  isUserItem?: boolean;
  isEditing: boolean;
  editedData: any;
  setEditedData: (data: any) => void;
  contentName?: string | null;
  releaseDate?: string;
  createdBy?: string | null;
  description?: string;
}

export function ItemDetailsContent({
  image,
  title,
  tags = [],
  memories = [],
  isUserItem = false,
  isEditing,
  editedData,
  setEditedData,
  contentName,
  releaseDate,
  createdBy,
  description,
}: ItemDetailsContentProps) {
  const handleImageUpdate = (newImageUrl: string) => {
    setEditedData({ ...editedData, image: newImageUrl });
  };

  // タグの初期値をセット
  useEffect(() => {
    if (tags.length > 0) {
      const typeTag = tags.find(tag => tag.tags?.category === 'type')?.tags?.id;
      const characterTag = tags.find(tag => tag.tags?.category === 'character')?.tags?.id;
      const seriesTag = tags.find(tag => tag.tags?.category === 'series')?.tags?.id;

      setEditedData(prev => ({
        ...prev,
        typeTag,
        characterTag,
        seriesTag,
      }));
    }
  }, [tags, setEditedData]);

  // カテゴリごとにタグをグループ化
  const groupedTags = {
    character: tags.filter(tag => tag.tags?.category === 'character'),
    type: tags.filter(tag => tag.tags?.category === 'type'),
    series: tags.filter(tag => tag.tags?.category === 'series'),
    other: tags.filter(tag => !tag.tags?.category || !['character', 'type', 'series'].includes(tag.tags?.category)),
  };

  return (
    <ScrollArea className="flex-1 h-[calc(100vh-250px)] px-4">
      <div className="space-y-4 bg-white pb-6 pt-2">
        {/* 画像表示エリアの改善 */}
        <div className="w-full aspect-square relative overflow-hidden rounded-lg bg-white">
          <ItemImageEditor
            image={isEditing ? editedData.image : image}
            title={title}
            isEditing={isEditing}
            onImageUpdate={handleImageUpdate}
          />
        </div>

        {/* 以降の既存コード */}
        {isUserItem && (
          <div className="space-y-4">
            {/* タグセクション（編集中の場合も含む） */}
            <TagsSection
              isEditing={isEditing}
              tags={tags}
              editedData={editedData}
              setEditedData={setEditedData}
            />

            {/* 思い出（メモリー）セクション */}
            <MemoriesSection memories={memories} />

            {/* メモ欄 */}
            <ItemNoteField
              isEditing={isEditing}
              note={editedData.note}
              onChange={(v) => setEditedData({ ...editedData, note: v })}
            />
          </div>
        )}

        {/* タグ（公式アイテムのみ、非編集時） */}
        {isUserItem === false && !isEditing && tags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">タグ</h3>
            <div className="space-y-1">
              {Object.entries(groupedTags).map(([category, categoryTags]) => 
                categoryTags.length > 0 && (
                  <div key={category} className="flex flex-wrap gap-1">
                    {categoryTags.map((tag, idx) => (
                      tag.tags && (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag.tags.name}
                        </Badge>
                      )
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* 公式アイテム: 編集モード時のみコンテンツ編集可能 */}
        {!isUserItem && (
          <div className="space-y-4">
            <ContentNameSection
              isEditing={isEditing}
              editedData={editedData}
              setEditedData={setEditedData}
              contentName={contentName}
            />
            
            {isEditing && (
              <>
                <ItemDescriptionField
                  isEditing={isEditing}
                  description={editedData.description || ""}
                  onChange={(value) => setEditedData({ ...editedData, description: value })}
                />
                
                <div className="space-y-4 mt-4">
                  <CategoryTagSelect
                    category="character"
                    label="キャラクター・人物名"
                    value={editedData.characterTag}
                    onChange={(value) => setEditedData({ ...editedData, characterTag: value })}
                  />
                  <CategoryTagSelect
                    category="type"
                    label="グッズタイプ"
                    value={editedData.typeTag}
                    onChange={(value) => setEditedData({ ...editedData, typeTag: value })}
                  />
                  <CategoryTagSelect
                    category="series"
                    label="グッズシリーズ"
                    value={editedData.seriesTag}
                    onChange={(value) => setEditedData({ ...editedData, seriesTag: value })}
                  />
                </div>
              </>
            )}
            
            <CreatorSection
              isEditing={isEditing}
              createdBy={createdBy}
            />

            {!isEditing && (
              <>
                {description && (
                  <ItemDescriptionField
                    isEditing={false}
                    description={description}
                    onChange={() => {}}
                  />
                )}
                
                {releaseDate && (
                  <div className="text-sm">
                    <span className="font-medium">登録日: </span>
                    <span>{format(new Date(releaseDate), 'yyyy/MM/dd')}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ユーザーアイテムの場合も編集モードでContentNameSectionを表示 */}
        {isUserItem && isEditing && (
          <ContentNameSection
            isEditing={isEditing}
            editedData={editedData}
            setEditedData={setEditedData}
            contentName={editedData.content_name ?? contentName}
          />
        )}
      </div>
    </ScrollArea>
  );
}
