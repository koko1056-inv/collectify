import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CardImage } from "./collection/CardImage";
import { useState } from "react";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";

interface ItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  image: string;
  artist?: string | null;
  anime?: string | null;
  price?: string;
  releaseDate?: string;
  description?: string;
  itemId: string;
  isUserItem?: boolean;
}

export function ItemDetailsModal({
  isOpen,
  onClose,
  title,
  image,
  artist,
  anime,
  price,
  releaseDate,
  description,
  itemId,
  isUserItem = false,
}: ItemDetailsModalProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    title,
    artist: artist || "",
    anime: anime || "",
    price: price || "",
    releaseDate: releaseDate || "",
    description: description || "",
  });

  const handleSave = async () => {
    try {
      const table = isUserItem ? "user_items" : "official_items";
      const { error } = await supabase
        .from(table)
        .update({
          title: editedData.title,
          artist: editedData.artist,
          anime: editedData.anime,
          [isUserItem ? "prize" : "price"]: editedData.price,
          release_date: editedData.releaseDate,
          description: editedData.description,
        })
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "更新完了",
        description: "アイテム情報を更新しました",
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating item:", error);
      toast({
        title: "エラー",
        description: "アイテム情報の更新に失敗しました",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          {isEditing ? (
            <Input
              value={editedData.title}
              onChange={(e) =>
                setEditedData({ ...editedData, title: e.target.value })
              }
              className="text-xl font-bold"
            />
          ) : (
            <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          )}
        </DialogHeader>
        <div className="space-y-4">
          <div className="w-full aspect-square relative">
            <CardImage image={image} title={title} />
          </div>
          <div className="space-y-2">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">アーティスト</label>
                  <Input
                    value={editedData.artist}
                    onChange={(e) =>
                      setEditedData({ ...editedData, artist: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">アニメ/キャラクター</label>
                  <Input
                    value={editedData.anime}
                    onChange={(e) =>
                      setEditedData({ ...editedData, anime: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">価格</label>
                  <Input
                    value={editedData.price}
                    onChange={(e) =>
                      setEditedData({ ...editedData, price: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">発売日</label>
                  <Input
                    type="date"
                    value={editedData.releaseDate}
                    onChange={(e) =>
                      setEditedData({ ...editedData, releaseDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">詳細</label>
                  <Textarea
                    value={editedData.description}
                    onChange={(e) =>
                      setEditedData({ ...editedData, description: e.target.value })
                    }
                  />
                </div>
              </>
            ) : (
              <>
                {artist && (
                  <div>
                    <span className="font-semibold">アーティスト：</span>
                    <span>{artist}</span>
                  </div>
                )}
                {anime && (
                  <div>
                    <span className="font-semibold">アニメ/キャラクター：</span>
                    <span>{anime}</span>
                  </div>
                )}
                {price && (
                  <div>
                    <span className="font-semibold">価格：</span>
                    <span>{price}</span>
                  </div>
                )}
                {releaseDate && (
                  <div>
                    <span className="font-semibold">発売日：</span>
                    <span>{releaseDate}</span>
                  </div>
                )}
                {description && (
                  <div>
                    <span className="font-semibold">詳細：</span>
                    <span>{description}</span>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleSave}>保存</Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>編集</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}