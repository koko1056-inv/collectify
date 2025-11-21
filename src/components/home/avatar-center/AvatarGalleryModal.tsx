import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AvatarGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentAvatarUrl: string | null;
}

interface AvatarItem {
  id: string;
  image_url: string;
  created_at: string;
  is_current: boolean;
}

export function AvatarGalleryModal({ isOpen, onClose, userId, currentAvatarUrl }: AvatarGalleryModalProps) {
  const [avatars, setAvatars] = useState<AvatarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchAvatars();
    }
  }, [isOpen]);

  const fetchAvatars = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("avatar_gallery")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAvatars(data || []);
    } catch (error) {
      console.error("Error fetching avatars:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "アバターギャラリーの取得に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAvatar = async (avatarUrl: string, avatarId: string) => {
    try {
      // すべてのアバターの is_current を false に
      await supabase
        .from("avatar_gallery")
        .update({ is_current: false })
        .eq("user_id", userId);

      // 選択したアバターの is_current を true に
      const { error: galleryError } = await supabase
        .from("avatar_gallery")
        .update({ is_current: true })
        .eq("id", avatarId);

      if (galleryError) throw galleryError;

      // プロフィールのアバターURLを更新
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", userId);

      if (profileError) throw profileError;

      toast({
        title: "アバターを変更しました",
        description: "プロフィールのアバターが更新されました",
      });

      // データの更新を確実に完了させてから画面を更新
      await fetchAvatars();
      
      // 少し待ってから閉じることで、親コンポーネントが確実に最新データを取得できるようにする
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (error) {
      console.error("Error selecting avatar:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "アバターの変更に失敗しました",
      });
    }
  };

  const handleDeleteAvatar = async (avatarId: string) => {
    try {
      const { error } = await supabase
        .from("avatar_gallery")
        .delete()
        .eq("id", avatarId);

      if (error) throw error;

      toast({
        title: "削除しました",
        description: "アバターをギャラリーから削除しました",
      });

      fetchAvatars();
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting avatar:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "アバターの削除に失敗しました",
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              アバターギャラリー
            </DialogTitle>
            <DialogDescription>
              過去に生成したアバターを表示・選択できます
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              過去に生成したアバターから選択できます
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : avatars.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  まだアバターが生成されていません
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  グッズ着せ替えで生成したアバターがここに保存されます
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {avatars.map((avatar) => (
                  <div
                    key={avatar.id}
                    className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                      avatar.image_url === currentAvatarUrl
                        ? "border-primary shadow-lg"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="aspect-square bg-muted">
                      <img
                        src={avatar.image_url}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* 現在使用中のバッジ */}
                    {avatar.image_url === currentAvatarUrl && (
                      <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        使用中
                      </div>
                    )}

                    {/* ホバー時のアクション */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSelectAvatar(avatar.image_url, avatar.id)}
                        disabled={avatar.image_url === currentAvatarUrl}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        選択
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteId(avatar.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* 生成日時 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-xs text-white">
                        {new Date(avatar.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>アバターを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。ギャラリーからアバターが削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDeleteAvatar(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
