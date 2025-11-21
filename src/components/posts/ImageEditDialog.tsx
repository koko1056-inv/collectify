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
  const [useAvatar, setUseAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user && isOpen) {
      loadUserAvatar();
    }
  }, [user, isOpen]);

  const loadUserAvatar = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single();

    if (!error && data?.avatar_url) {
      setAvatarUrl(data.avatar_url);
    }
  };

  const handleEdit = () => {
    if (editPrompt.trim()) {
      const prompt = editPrompt.trim();
      onEditComplete(prompt, useAvatar && avatarUrl ? avatarUrl : undefined);
      setEditPrompt("");
      setUseAvatar(false);
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

          {avatarUrl && (
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <Checkbox 
                id="use-avatar" 
                checked={useAvatar}
                onCheckedChange={(checked) => setUseAvatar(checked as boolean)}
                disabled={isEditing}
              />
              <div className="flex items-center gap-2 flex-1">
                <User className="w-4 h-4 text-muted-foreground" />
                <Label 
                  htmlFor="use-avatar" 
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  アバターを素材として使用する
                </Label>
                <img 
                  src={avatarUrl} 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-full object-cover border-2 border-background"
                />
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
