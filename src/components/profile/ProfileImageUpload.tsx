
import React, { useState, useEffect } from "react";
import { UploadCloud, Sparkles, Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AvatarGenerationModal } from "./AvatarGenerationModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
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

interface ProfileImageUploadProps {
  onImageChange: (file: File | null) => Promise<void>;
  previewUrl: string | null;
  setPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>;
  userId: string;
  avatarUrl?: string | null;
  className?: string;
}

export function ProfileImageUpload({
  onImageChange,
  previewUrl,
  setPreviewUrl,
  userId,
  avatarUrl,
  className
}: ProfileImageUploadProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [recentAvatars, setRecentAvatars] = useState<Array<{ id: string; image_url: string }>>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  // ゼロから生成したアバター（着せ替えではないもの）を取得
  useEffect(() => {
    const fetchRecentAvatars = async () => {
      if (!userId) return;

      try {
        const { data } = await supabase
          .from("avatar_gallery")
          .select("id, image_url, item_ids, prompt")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (data) {
          // item_idsがnullまたは空配列のもの（ゼロから生成したアバター）のみをフィルタリングし、
          // 同じ画像URLは1つだけ表示する
          const seen = new Set<string>();
          const pureAvatars = [] as Array<{ id: string; image_url: string }>;

          for (const avatar of data) {
            if (
              (!avatar.item_ids || avatar.item_ids.length === 0) &&
              avatar.prompt !== "プロフィール画像" &&
              !seen.has(avatar.image_url)
            ) {
              seen.add(avatar.image_url);
              pureAvatars.push({ id: avatar.id, image_url: avatar.image_url });
            }
          }

          setRecentAvatars(pureAvatars.slice(0, 3));
        }
      } catch (error) {
        console.error("Error fetching recent avatars:", error);
      }
    };

    fetchRecentAvatars();
  }, [userId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      await onImageChange(file);
      setIsPopoverOpen(false);
    }
  };

  const handleFileSelectClick = () => {
    document.getElementById('profile-image-upload')?.click();
    setIsPopoverOpen(false);
  };

  const handleAIGenerateClick = () => {
    setIsGenerateModalOpen(true);
    setIsPopoverOpen(false);
  };

  const handleAvatarGenerated = async (imageUrl: string) => {
    try {
      // base64画像をBlobに変換
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // BlobをFileに変換
      const file = new File([blob], "ai-avatar.png", { type: "image/png" });
      
      // プレビューを更新
      setPreviewUrl(imageUrl);
      
      // 画像をアップロード
      await onImageChange(file);
      
      // 既存のAI生成アバター（item_idsがnullまたは空配列）を取得
      const { data: existingAvatars } = await supabase
        .from("avatar_gallery")
        .select("id, item_ids, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (existingAvatars) {
        const pureAvatars = existingAvatars.filter(
          avatar => !avatar.item_ids || avatar.item_ids.length === 0
        );

        // 3つを超える場合は古いものを削除
        if (pureAvatars.length > 3) {
          const toDelete = pureAvatars.slice(3); // 4つ目以降を削除対象に
          for (const avatar of toDelete) {
            await supabase
              .from("avatar_gallery")
              .delete()
              .eq("id", avatar.id);
          }
        }
      }
      
      // アバターリストを再取得（ゼロから生成したもののみ）
      const { data } = await supabase
        .from("avatar_gallery")
        .select("id, image_url, item_ids, prompt")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (data) {
        const seen = new Set<string>();
        const pureAvatars = [] as Array<{ id: string; image_url: string }>;

        for (const avatar of data) {
          if (
            (!avatar.item_ids || avatar.item_ids.length === 0) &&
            avatar.prompt !== "プロフィール画像" &&
            !seen.has(avatar.image_url)
          ) {
            seen.add(avatar.image_url);
            pureAvatars.push({ id: avatar.id, image_url: avatar.image_url });
          }
        }

        setRecentAvatars(pureAvatars.slice(0, 3));
      }
      
      toast({
        title: "アバター設定完了",
        description: "AIで生成したアバターをプロフィールに設定しました",
      });
    } catch (error) {
      console.error("Error setting avatar:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "アバターの設定に失敗しました",
      });
    }
  };

  const handleSelectAvatar = async (avatarUrl: string, avatarId: string) => {
    try {
      // base64画像をBlobに変換
      const response = await fetch(avatarUrl);
      const blob = await response.blob();
      
      // BlobをFileに変換
      const file = new File([blob], "selected-avatar.png", { type: "image/png" });
      
      // プレビューを更新
      setPreviewUrl(avatarUrl);
      
      // 画像をアップロード
      await onImageChange(file);

      // すべてのアバターの is_current を false に設定
      await supabase
        .from("avatar_gallery")
        .update({ is_current: false })
        .eq("user_id", userId);

      // 選択したアバターを is_current = true に設定
      await supabase
        .from("avatar_gallery")
        .update({ is_current: true })
        .eq("id", avatarId);
      
      setIsPopoverOpen(false);
      sonnerToast.success("アバターを切り替えました");
    } catch (error) {
      console.error("Error selecting avatar:", error);
      sonnerToast.error("アバターの切り替えに失敗しました");
    }
  };

  const handleDeleteAvatar = async (avatarId: string) => {
    try {
      const { error } = await supabase
        .from("avatar_gallery")
        .delete()
        .eq("id", avatarId);

      if (error) throw error;

      sonnerToast.success("アバターを削除しました");
      
      // アバター一覧を再取得
      const { data } = await supabase
        .from("avatar_gallery")
        .select("id, image_url, item_ids, prompt")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (data) {
        const seen = new Set<string>();
        const pureAvatars = [] as Array<{ id: string; image_url: string }>;

        for (const avatar of data) {
          if (
            (!avatar.item_ids || avatar.item_ids.length === 0) &&
            avatar.prompt !== "プロフィール画像" &&
            !seen.has(avatar.image_url)
          ) {
            seen.add(avatar.image_url);
            pureAvatars.push({ id: avatar.id, image_url: avatar.image_url });
          }
        }

        setRecentAvatars(pureAvatars.slice(0, 3));
      }
      
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting avatar:", error);
      sonnerToast.error("アバターの削除に失敗しました");
    }
  };

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <div
            className={`relative rounded-full overflow-hidden cursor-pointer ${className || ''}`}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <img
              src={previewUrl || avatarUrl || "/placeholder.svg"}
              alt="Profile"
              className="w-24 h-24 object-cover rounded-full"
            />
            <div
              className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 transition-opacity ${
                isHovering ? "opacity-100" : "opacity-0"
              }`}
            >
              <ImageIcon className="text-white w-8 h-8" />
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 bg-background border shadow-lg z-50">
          <div className="flex flex-col gap-3">
            {/* ゼロから生成したアバター */}
            {recentAvatars.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium px-1">
                  AIで生成したアバター ({recentAvatars.length}/3)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {recentAvatars.map((avatar) => (
                    <div
                      key={avatar.id}
                      className="relative group"
                    >
                      <button
                        onClick={() => handleSelectAvatar(avatar.image_url, avatar.id)}
                        className="w-full"
                      >
                        <Avatar className="w-full aspect-square border-2 border-border hover:border-primary transition-all duration-200 hover:scale-105">
                          <AvatarImage src={avatar.image_url} className="object-cover" />
                          <AvatarFallback>?</AvatarFallback>
                        </Avatar>
                      </button>
                      
                      {/* ホバー時のオーバーレイと削除ボタン */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                        <Button
                          size="icon"
                          variant="destructive"
                          className="w-8 h-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(avatar.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 区切り線 */}
            {recentAvatars.length > 0 && (
              <div className="border-t border-border" />
            )}
            
            {/* アクション */}
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                className="justify-start h-auto py-3 px-3"
                onClick={handleFileSelectClick}
              >
                <UploadCloud className="w-4 h-4 mr-3" />
                <span className="text-sm">ファイルを選択</span>
              </Button>
              <Button
                variant="ghost"
                className="justify-start h-auto py-3 px-3"
                onClick={handleAIGenerateClick}
              >
                <Sparkles className="w-4 h-4 mr-3" />
                <span className="text-sm">AIでアバター生成</span>
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <input
        id="profile-image-upload"
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />

      <AvatarGenerationModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onAvatarGenerated={handleAvatarGenerated}
      />

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>アバターを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。アバターが削除されます。
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
