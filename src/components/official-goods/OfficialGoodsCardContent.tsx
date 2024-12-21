import { CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OfficialGoodsCardContentProps {
  title: string;
  artist?: string | null;
  anime?: string | null;
  item_tags?: Array<{
    tags: {
      id: string;
      name: string;
    } | null;
  }>;
  itemId: string;
}

export function OfficialGoodsCardContent({ 
  title, 
  artist, 
  anime, 
  item_tags = [],
  itemId
}: OfficialGoodsCardContentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedArtist, setEditedArtist] = useState(artist || "");
  const [editedAnime, setEditedAnime] = useState(anime || "");
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('official_items')
        .update({
          artist: editedArtist || null,
          anime: editedAnime || null
        })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "更新完了",
        description: "情報を更新しました。",
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "エラー",
        description: "更新に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditedArtist(artist || "");
    setEditedAnime(anime || "");
    setIsEditing(false);
  };

  return (
    <CardContent className="p-4">
      <CardTitle className="text-lg mb-2 line-clamp-2 text-gray-900">{title}</CardTitle>
      <div className="space-y-1 mb-2">
        {isEditing ? (
          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium mb-1 block">アーティスト</label>
              <Input
                value={editedArtist}
                onChange={(e) => setEditedArtist(e.target.value)}
                placeholder="アーティスト名を入力"
                className="mb-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">アニメ</label>
              <Input
                value={editedAnime}
                onChange={(e) => setEditedAnime(e.target.value)}
                placeholder="アニメ名を入力"
                className="mb-2"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="flex items-center gap-1">
                <Check className="h-4 w-4" />
                保存
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} className="flex items-center gap-1">
                <X className="h-4 w-4" />
                キャンセル
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            {(artist || anime) && (
              <>
                {artist && (
                  <p className="text-sm text-gray-600">
                    アーティスト: {artist}
                  </p>
                )}
                {anime && (
                  <p className="text-sm text-gray-600">
                    アニメ: {anime}
                  </p>
                )}
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="absolute -right-2 -top-2"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {item_tags && item_tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {item_tags
            .filter((tag) => tag.tags !== null)
            .map((tag) => (
              <span
                key={tag.tags!.id}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
              >
                {tag.tags!.name}
              </span>
            ))}
        </div>
      )}
    </CardContent>
  );
}