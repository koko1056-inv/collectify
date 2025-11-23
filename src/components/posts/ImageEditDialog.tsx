import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ImageEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onEditComplete: (prompt: string, avatarUrl?: string) => void;
  isEditing: boolean;
}

export function ImageEditDialog({
  isOpen,
  onClose,
  imageUrl,
  onEditComplete,
  isEditing,
}: ImageEditDialogProps) {
  const [editPrompt, setEditPrompt] = useState("");
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);
  const [avatars, setAvatars] = useState<Array<{ id: string; image_url: string }>>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user && isOpen) {
      loadUserAvatars();
    }
  }, [user, isOpen]);

  const loadUserAvatars = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("avatar_gallery")
      .select("id, image_url, item_ids")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // ベースアバターのみを表示（item_idsが存在しないもの）
      const baseAvatars = data.filter(avatar => 
        !avatar.item_ids || avatar.item_ids.length === 0
      ).slice(0, 6);
      setAvatars(baseAvatars);
    }
  };

  const handleEdit = () => {
    if (editPrompt.trim()) {
      const prompt = editPrompt.trim();
      onEditComplete(prompt, selectedAvatarUrl || undefined);
      setEditPrompt("");
      setSelectedAvatarUrl(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>画像を編集</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <img
              src={imageUrl}
              alt="編集対象"
              className="w-full h-64 object-cover rounded-lg"
            />
          </div>

          {avatars.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                ベースアバターを選択（任意）
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {avatars.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatarUrl(
                      selectedAvatarUrl === avatar.image_url ? null : avatar.image_url
                    )}
                    disabled={isEditing}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedAvatarUrl === avatar.image_url
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img
                      src={avatar.image_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                    {selectedAvatarUrl === avatar.image_url && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          ✓
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-prompt">編集内容を入力</Label>
            <Input
              id="edit-prompt"
              placeholder="例: アバターを左上に配置して、背景を青空にして"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              disabled={isEditing}
            />
            <p className="text-xs text-muted-foreground">
              AI が画像を編集します。具体的な指示を入力してください。
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isEditing}>
              キャンセル
            </Button>
            <Button 
              onClick={handleEdit}
              disabled={!editPrompt.trim() || isEditing}
            >
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  編集中...
                </>
              ) : (
                "編集する"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
