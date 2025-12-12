import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ImageEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onEditComplete: (prompt: string, avatarUrl?: string) => void;
  isEditing: boolean;
}

interface AvatarOption {
  id: string;
  image_url: string;
  name?: string;
  isProfile?: boolean;
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
  const [avatars, setAvatars] = useState<AvatarOption[]>([]);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user && isOpen) {
      loadUserAvatars();
    }
  }, [user, isOpen]);

  const loadUserAvatars = async () => {
    if (!user) return;
    
    // プロフィールのアバターを取得
    const { data: profileData } = await supabase
      .from("profiles")
      .select("avatar_url, username")
      .eq("id", user.id)
      .single();

    if (profileData?.avatar_url) {
      setProfileAvatar(profileData.avatar_url);
    }

    // ギャラリーのアバターを取得
    const { data, error } = await supabase
      .from("avatar_gallery")
      .select("id, image_url, name, item_ids")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // ベースアバターのみを表示（item_idsが存在しないもの）
      const baseAvatars = data
        .filter(avatar => !avatar.item_ids || avatar.item_ids.length === 0)
        .slice(0, 5)
        .map(a => ({ ...a, isProfile: false }));
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

  const allAvatarOptions: AvatarOption[] = [
    ...(profileAvatar ? [{ id: 'profile', image_url: profileAvatar, name: 'プロフィール', isProfile: true }] : []),
    ...avatars,
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AIで画像を生成
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 参照画像 */}
          <div className="rounded-lg overflow-hidden border">
            <img
              src={imageUrl}
              alt="参照画像"
              className="w-full h-48 object-cover"
            />
          </div>

          {/* アバター選択 */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <User className="w-4 h-4" />
              アバターを使用（任意）
            </Label>
            
            {allAvatarOptions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allAvatarOptions.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatarUrl(
                      selectedAvatarUrl === avatar.image_url ? null : avatar.image_url
                    )}
                    disabled={isEditing}
                    className={`relative rounded-full overflow-hidden border-2 transition-all ${
                      selectedAvatarUrl === avatar.image_url
                        ? 'border-primary ring-2 ring-primary/30 scale-110'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={avatar.image_url} className="object-cover" />
                      <AvatarFallback>
                        <User className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                    {selectedAvatarUrl === avatar.image_url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                          ✓
                        </div>
                      </div>
                    )}
                    {avatar.isProfile && (
                      <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[8px] px-1.5 rounded-full">
                        メイン
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                アバターがありません。プロフィールでアバターを設定してください。
              </p>
            )}
            
            {selectedAvatarUrl && (
              <p className="text-xs text-primary">
                選択したアバターが画像生成に使用されます
              </p>
            )}
          </div>

          {/* プロンプト入力 */}
          <div className="space-y-2">
            <Label htmlFor="edit-prompt">生成内容を入力</Label>
            <Input
              id="edit-prompt"
              placeholder="例: アバターがグッズを持っている、背景を青空に"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              disabled={isEditing}
            />
            <p className="text-xs text-muted-foreground">
              {selectedAvatarUrl 
                ? "選択したアバターとグッズ画像を参考にAIが画像を生成します"
                : "グッズ画像を参考にAIが画像を生成します"
              }
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
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  生成する
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
