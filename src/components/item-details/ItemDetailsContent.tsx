
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ItemImageEditor } from "./ItemImageEditor";
import { ContentNameSection } from "./ContentNameSection";
import { CreatorSection } from "./CreatorSection";
import { MemoriesSection } from "./MemoriesSection";
import { CategoryTagSelect } from "../tag/CategoryTagSelect";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ItemDescriptionField } from "./ItemDescriptionField";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
  itemId?: string;
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
  itemId,
}: ItemDetailsContentProps) {
  const [isInShowcase, setIsInShowcase] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleImageUpdate = (newImageUrl: string) => {
    setEditedData({ ...editedData, image: newImageUrl });
  };

  // ショーケースのステータスをチェック
  useEffect(() => {
    if (isUserItem && itemId && user) {
      const checkShowcaseStatus = async () => {
        const { data, error } = await supabase
          .from("user_items")
          .select("is_showcased")
          .eq("id", itemId)
          .single();
        
        if (!error && data) {
          setIsInShowcase(data.is_showcased || false);
        }
      };
      
      checkShowcaseStatus();
    }
  }, [isUserItem, itemId, user]);

  // ショーケース切り替え処理
  const toggleShowcase = async () => {
    if (!isUserItem || !itemId || !user) return;
    
    try {
      const newShowcaseStatus = !isInShowcase;
      
      const { error } = await supabase
        .from("user_items")
        .update({ is_showcased: newShowcaseStatus })
        .eq("id", itemId);
      
      if (error) throw error;
      
      setIsInShowcase(newShowcaseStatus);
      
      toast({
        title: newShowcaseStatus ? "ショーケースに追加しました" : "ショーケースから削除しました",
        description: newShowcaseStatus 
          ? "コレクションのショーケースに表示されるようになりました" 
          : "コレクションのショーケースから削除されました",
      });
    } catch (error) {
      console.error("Error toggling showcase status:", error);
      toast({
        title: "エラーが発生しました",
        description: "ショーケースの更新に失敗しました。もう一度お試しください。",
        variant: "destructive",
      });
    }
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
    <ScrollArea className="flex-1 h-[70vh] px-6">
      <div className="space-y-4 bg-white pb-6">
        <ItemImageEditor
          image={isEditing ? editedData.image : image}
          title={title}
          isEditing={isEditing}
          onImageUpdate={handleImageUpdate}
        />

        {/* ショーケースボタン (ユーザーアイテムの場合のみ表示) */}
        {isUserItem && !isEditing && itemId && (
          <Button
            variant={isInShowcase ? "default" : "outline"}
            className={`w-full ${isInShowcase ? "bg-purple-500 hover:bg-purple-600" : "border-purple-300 text-purple-600 hover:bg-purple-50"}`}
            onClick={toggleShowcase}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isInShowcase ? "ショーケース中" : "ショーケースに追加"}
          </Button>
        )}

        {/* タグ表示セクション（ユーザーアイテムかつ編集モードでない場合） */}
        {isUserItem && !isEditing && tags.length > 0 && (
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

        {isUserItem && (
          <MemoriesSection memories={memories} />
        )}
      </div>
    </ScrollArea>
  );
}
