import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dices, Store, Shirt, ChevronDown, Image, User, UploadCloud, Sparkles, Check, Trash2, Edit2, Search } from "lucide-react";
import { Profile } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { AvatarGenerationModal } from "@/components/profile/AvatarGenerationModal";
import { RandomPickupModal } from "./avatar-center/RandomPickupModal";
import { GoodsDisplayModal } from "./avatar-center/GoodsDisplayModal";
import { AvatarDressUpModal } from "./avatar-center/AvatarDressUpModal";
import { AvatarGalleryModal } from "./avatar-center/AvatarGalleryModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AvatarCenterHomeProps {
  profile: Profile | undefined;
  onAvatarGenerated: (url: string) => void;
}

export function AvatarCenterHome({ profile, onAvatarGenerated }: AvatarCenterHomeProps) {
  console.log("[AvatarCenterHome] Received profile:", { 
    profile, 
    hasId: !!profile?.id, 
    id: profile?.id,
    keys: profile ? Object.keys(profile) : [] 
  });

  // プロフィールが存在しない場合の早期リターン
  if (!profile) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">プロフィールを読み込み中...</p>
        </div>
      </div>
    );
  }

  const { user } = useAuth();
  const userId = user?.id;
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showRandomPickup, setShowRandomPickup] = useState(false);
  const [showGoodsDisplay, setShowGoodsDisplay] = useState(false);
  const [showDressUp, setShowDressUp] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showGoodsGallery, setShowGoodsGallery] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [recentAvatars, setRecentAvatars] = useState<Array<{ id: string; image_url: string; name: string | null }>>([]);
  const [isAvatarPopoverOpen, setIsAvatarPopoverOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [avatarToDelete, setAvatarToDelete] = useState<string | null>(null);
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [avatarToEdit, setAvatarToEdit] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // 最新のアバターを取得（プロフィールとギャラリーを並行取得）
  const fetchCurrentAvatar = async () => {
    if (!userId) {
      console.log("[AvatarCenterHome] No user ID. profile:", profile);
      return;
    }

    console.log("[AvatarCenterHome] Fetching current avatar for user:", userId);

    try {
      // 1. プロフィールのavatar_urlを最優先
      if (profile?.avatar_url) {
        console.log("[AvatarCenterHome] Using profile avatar_url");
        setCurrentAvatarUrl(profile.avatar_url);
        return;
      }

      // 2. avatar_galleryから最新のアバターを取得（is_currentに関わらず）
      const { data: latestAvatar } = await supabase
        .from("avatar_gallery")
        .select("image_url")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestAvatar?.image_url) {
        console.log("[AvatarCenterHome] Using latest gallery avatar as fallback");
        setCurrentAvatarUrl(latestAvatar.image_url);
        return;
      }

      // どちらもない場合は null
      console.log("[AvatarCenterHome] No avatar found");
      setCurrentAvatarUrl(null);
    } catch (error) {
      console.error("[AvatarCenterHome] Error fetching current avatar:", error);
      setCurrentAvatarUrl(null);
    }
  };

  // すべてのアバターを取得（ポップオーバー用）
  const fetchRecentAvatars = async () => {
    if (!userId) return;

    try {
      const { data } = await supabase
        .from("avatar_gallery")
        .select("id, image_url, item_ids, prompt, name")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30); // 最新30件まで表示

      if (data) {
        // 重複URLを除外してすべてのアバターを表示
        const seen = new Set<string>();
        const allAvatars = [] as Array<{ id: string; image_url: string; name: string | null }>;

        for (const avatar of data) {
          if (!seen.has(avatar.image_url)) {
            seen.add(avatar.image_url);
            allAvatars.push({ id: avatar.id, image_url: avatar.image_url, name: avatar.name });
          }
        }

        setRecentAvatars(allAvatars);
      }
    } catch (error) {
      console.error("Error fetching recent avatars:", error);
    }
  };

  // アバターを選択
  const handleSelectAvatar = async (avatarUrl: string, avatarId: string) => {
    if (!userId) return;

    try {
      // 1. まずprofiles.avatar_urlを更新（最優先）
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", userId);

      if (profileError) throw profileError;

      // 2. avatar_galleryの同期
      await supabase
        .from("avatar_gallery")
        .update({ is_current: false })
        .eq("user_id", userId);

      await supabase
        .from("avatar_gallery")
        .update({ is_current: true })
        .eq("id", avatarId);

      // 3. UIを更新
      setCurrentAvatarUrl(avatarUrl);
      setIsAvatarPopoverOpen(false);
      toast.success("アバターを切り替えました");
      
      // 親コンポーネントに通知
      onAvatarGenerated(avatarUrl);
      
      // 再取得
      await fetchCurrentAvatar();
      await fetchRecentAvatars();
    } catch (error) {
      console.error("Error selecting avatar:", error);
      toast.error("アバターの切り替えに失敗しました");
    }
  };

  // ファイルアップロード
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !userId) return;

    const file = e.target.files[0];
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile_images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profile_images")
        .getPublicUrl(filePath);

      // 1. profiles.avatar_urlを更新
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      // 2. avatar_galleryの同期
      await supabase
        .from("avatar_gallery")
        .update({ is_current: false })
        .eq("user_id", userId);

      const { data: existingProfileAvatar } = await supabase
        .from("avatar_gallery")
        .select("id")
        .eq("user_id", userId)
        .eq("prompt", "プロフィール画像")
        .maybeSingle();

      if (existingProfileAvatar) {
        await supabase
          .from("avatar_gallery")
          .update({ image_url: publicUrl, is_current: true })
          .eq("id", existingProfileAvatar.id);
      } else {
        await supabase.from("avatar_gallery").insert({
          user_id: userId,
          image_url: publicUrl,
          is_current: true,
          item_ids: null,
          prompt: "プロフィール画像",
        });
      }

      setCurrentAvatarUrl(publicUrl);
      setIsAvatarPopoverOpen(false);
      toast.success("プロフィール画像を更新しました");
      
      await fetchCurrentAvatar();
      await fetchRecentAvatars();
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("画像のアップロードに失敗しました");
    }
  };

  // AI生成したアバターを設定
  const handleAvatarGenerated = async (imageUrl: string) => {
    if (!userId) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], "ai-avatar.png", { type: "image/png" });
      
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile_images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profile_images")
        .getPublicUrl(filePath);

      // 1. profiles.avatar_urlを更新
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      // 2. avatar_galleryに新しいアバターを追加（削除はしない）
      setCurrentAvatarUrl(publicUrl);
      toast.success("AIで生成したアバターを設定しました");
      onAvatarGenerated(publicUrl);
      
      await fetchCurrentAvatar();
      await fetchRecentAvatars();
    } catch (error) {
      console.error("Error setting avatar:", error);
      toast.error("アバターの設定に失敗しました");
    }
  };

  // アバター名を編集
  const handleEditNameClick = (avatar: { id: string; name: string | null }, e: React.MouseEvent) => {
    e.stopPropagation();
    setAvatarToEdit({ id: avatar.id, name: avatar.name || "" });
    setEditNameDialogOpen(true);
  };

  const handleConfirmNameEdit = async () => {
    if (!avatarToEdit) return;
    
    try {
      await supabase
        .from("avatar_gallery")
        .update({ name: avatarToEdit.name })
        .eq("id", avatarToEdit.id);
      
      setRecentAvatars(prev => 
        prev.map(avatar => 
          avatar.id === avatarToEdit.id 
            ? { ...avatar, name: avatarToEdit.name } 
            : avatar
        )
      );
      
      toast.success("アバター名を更新しました");
    } catch (error) {
      console.error("Error updating avatar name:", error);
      toast.error("アバター名の更新に失敗しました");
    } finally {
      setEditNameDialogOpen(false);
      setAvatarToEdit(null);
    }
  };

  // アバター削除
  const handleDeleteClick = (avatarId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAvatarToDelete(avatarId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!avatarToDelete) return;
    
    try {
      await supabase
        .from("avatar_gallery")
        .delete()
        .eq("id", avatarToDelete);
      
      await fetchRecentAvatars();
      toast.success("アバターを削除しました");
    } catch (error) {
      console.error("Error deleting avatar:", error);
      toast.error("アバターの削除に失敗しました");
    } finally {
      setDeleteDialogOpen(false);
      setAvatarToDelete(null);
    }
  };

  // 検索フィルタリング
  const filteredAvatars = recentAvatars.filter(avatar => {
    if (!searchQuery) return true;
    return avatar.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // 初回ロード時とユーザーID変更時にアバターを取得
  useEffect(() => {
    fetchCurrentAvatar();
    fetchRecentAvatars();
  }, [userId]);

  // リアルタイムでアバター更新を監視
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('avatar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'avatar_gallery',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchCurrentAvatar();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        () => {
          fetchCurrentAvatar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const buttons = [
    {
      icon: Image,
      label: "着せ替えギャラリー",
      onClick: () => setShowGallery(true),
      color: "from-gray-800 to-gray-900"
    },
    {
      icon: Store,
      label: "グッズギャラリー",
      onClick: () => setShowGoodsGallery(true),
      color: "from-gray-700 to-gray-800"
    },
    {
      icon: Dices,
      label: "ランダムピックアップ",
      onClick: () => setShowRandomPickup(true),
      color: "from-gray-600 to-gray-700"
    },
    {
      icon: Shirt,
      label: "グッズ着せ替え",
      onClick: () => setShowDressUp(true),
      color: "from-gray-500 to-gray-600"
    }
  ];

  return (
    <>
      <div className="min-h-[80vh] flex flex-col items-center justify-center relative px-4 sm:px-8">
        {/* 背景のグラデーション */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 rounded-3xl" />
        
        {/* アバター */}
        <Popover open={isAvatarPopoverOpen} onOpenChange={setIsAvatarPopoverOpen}>
          <PopoverTrigger asChild>
            <div className="relative mb-4 mt-16 sm:mt-0 cursor-pointer">
              {currentAvatarUrl ? (
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-xl" />
                  <Avatar className="w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96 border-4 border-background shadow-2xl relative z-10 transition-transform hover:scale-105">
                    <AvatarImage src={currentAvatarUrl} />
                  </Avatar>
                  <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm text-foreground px-4 py-2 rounded-full shadow-lg z-20 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">編集</span>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-muted/10 to-muted/5 blur-xl" />
                  <div className="w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96 border-4 border-dashed border-muted-foreground/20 rounded-full flex items-center justify-center relative z-10 bg-muted/5">
                    <div className="text-center">
                      <User className="w-20 h-20 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground/70 text-lg font-medium">アバターを設定</p>
                      <p className="text-muted-foreground/50 text-sm mt-2">クリックして画像を選択またはAI生成</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3 bg-background border shadow-lg z-50" align="center">
            <div className="flex flex-col gap-3">
              {/* 保存済みアバター */}
              {recentAvatars.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-muted-foreground font-medium">
                      保存済みアバター ({filteredAvatars.length}/{recentAvatars.length})
                    </p>
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="名前で検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto">
                    {filteredAvatars.map((avatar) => (
                      <div key={avatar.id} className="relative group flex flex-col items-center">
                        <Avatar className="w-full aspect-square border-2 border-border group-hover:border-primary transition-all duration-200">
                          <AvatarImage src={avatar.image_url} className="object-cover" />
                          <AvatarFallback>?</AvatarFallback>
                        </Avatar>
                        {avatar.name && (
                          <p className="text-[10px] text-muted-foreground truncate w-full text-center mt-1">
                            {avatar.name}
                          </p>
                        )}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSelectAvatar(avatar.image_url, avatar.id)}
                            className="p-1.5 bg-background text-foreground rounded-full hover:bg-background/90 transition-colors shadow-lg"
                            title="選択"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleEditNameClick(avatar, e)}
                            className="p-1.5 bg-background text-foreground rounded-full hover:bg-background/90 transition-colors shadow-lg"
                            title="名前を編集"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(avatar.id, e)}
                            className="p-1.5 bg-background text-foreground rounded-full hover:bg-background/90 transition-colors shadow-lg"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {filteredAvatars.length === 0 && searchQuery && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      「{searchQuery}」に一致するアバターが見つかりません
                    </p>
                  )}
                </div>
              )}
              
              {recentAvatars.length > 0 && <div className="border-t border-border" />}
              
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  className="justify-start h-auto py-3 px-3"
                  onClick={() => {
                    document.getElementById('home-avatar-upload')?.click();
                    setIsAvatarPopoverOpen(false);
                  }}
                >
                  <UploadCloud className="w-4 h-4 mr-3" />
                  <span className="text-sm">ファイルを選択</span>
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start h-auto py-3 px-3"
                  onClick={() => {
                    setShowAvatarModal(true);
                    setIsAvatarPopoverOpen(false);
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-3" />
                  <span className="text-sm">AIでアバター生成</span>
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <input
          id="home-avatar-upload"
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*"
        />

        {/* 機能ボタン */}
        <div className="grid grid-cols-2 sm:flex gap-4 sm:gap-6 mb-8 max-w-md w-full px-4">
          {buttons.map((btn, index) => (
            <div key={index} className="relative group flex flex-col items-center">
              <Button
                onClick={btn.onClick}
                size="lg"
                className={`rounded-full w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 shadow-lg hover:scale-110 transition-all duration-300 bg-gradient-to-br ${btn.color} border-2 border-background`}
              >
                <btn.icon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />
              </Button>
              <div className="mt-2 sm:absolute sm:top-full sm:mt-2 sm:left-1/2 sm:-translate-x-1/2 whitespace-nowrap sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <span className="text-xs sm:text-sm font-medium bg-background/90 px-3 py-1 rounded-full shadow-lg">
                  {btn.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* スクロール誘導 */}
        <div className="flex flex-col items-center gap-2 animate-bounce mt-8">
          <p className="text-sm text-muted-foreground">他のコレクターを見る</p>
          <ChevronDown className="w-6 h-6 text-muted-foreground" />
        </div>
      </div>

      {/* モーダル */}
      <AvatarGenerationModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onAvatarGenerated={handleAvatarGenerated}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>アバターを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。本当にこのアバターを削除してもよろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editNameDialogOpen} onOpenChange={setEditNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>アバター名を編集</DialogTitle>
            <DialogDescription>
              このアバターの名前を変更できます
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="アバター名を入力..."
              value={avatarToEdit?.name || ""}
              onChange={(e) => setAvatarToEdit(prev => prev ? { ...prev, name: e.target.value } : null)}
              maxLength={50}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNameDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleConfirmNameEdit}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RandomPickupModal
        isOpen={showRandomPickup}
        onClose={() => setShowRandomPickup(false)}
        userId={userId}
      />

      <GoodsDisplayModal
        isOpen={showGoodsDisplay}
        onClose={() => setShowGoodsDisplay(false)}
        userId={userId}
      />

      <GoodsDisplayModal
        isOpen={showGoodsGallery}
        onClose={() => setShowGoodsGallery(false)}
        userId={userId}
        initialShowGallery={true}
      />

      <AvatarDressUpModal
        isOpen={showDressUp}
        onClose={() => {
          setShowDressUp(false);
          fetchCurrentAvatar();
        }}
        userId={userId}
      />

      <AvatarGalleryModal
        isOpen={showGallery}
        onClose={() => {
          setShowGallery(false);
          fetchCurrentAvatar();
        }}
        userId={userId}
        currentAvatarUrl={currentAvatarUrl || profile?.avatar_url}
      />
    </>
  );
}
