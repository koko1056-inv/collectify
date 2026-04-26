import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Wand2,
  Sparkles,
  Plus,
  Trash2,
  Globe,
  Lock,
  Download,
  Share2,
  X,
  Home,
  Shirt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Footer } from "@/components/Footer";
import { useAvatars } from "@/hooks/useAvatars";
import { AvatarStudioModal, type StudioTab } from "@/components/avatar";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  useUserAiRooms,
  useDeleteAiRoom,
  useToggleAiRoomPublic,
  AiGeneratedRoom,
} from "@/hooks/ai-room/useAiRooms";
import { AiRoomCreateWizard } from "@/components/ai-room/AiRoomCreateWizard";
import { getStylePresetById } from "@/components/ai-room/roomStylePresets";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ActiveTab = "rooms" | "avatar";

export default function AiRoomsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>("rooms");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [avatarStudioTab, setAvatarStudioTab] = useState<StudioTab | null>(null);
  const [viewing, setViewing] = useState<AiGeneratedRoom | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAvatarId, setDeletingAvatarId] = useState<string | null>(null);

  const avatarsHook = useAvatars(user?.id);

  const { data: rooms = [], isLoading } = useUserAiRooms(user?.id);
  const deleteMutation = useDeleteAiRoom();
  const toggleMutation = useToggleAiRoomPublic();

  const handleShare = async (room: AiGeneratedRoom) => {
    const text = `AIで作った推し部屋 🏠✨\n#Collectify`;
    try {
      if (navigator.share) {
        try {
          const res = await fetch(room.image_url);
          const blob = await res.blob();
          const file = new File([blob], "ai-room.png", { type: blob.type });
          if ((navigator as any).canShare?.({ files: [file] })) {
            await navigator.share({ text, files: [file] });
            return;
          }
        } catch {}
        await navigator.share({ text, url: room.image_url });
      } else {
        await navigator.clipboard.writeText(room.image_url);
        toast.success("画像URLをコピーしました");
      }
    } catch {}
  };

  const handleDownload = (room: AiGeneratedRoom) => {
    const a = document.createElement("a");
    a.href = room.image_url;
    a.download = `collectify-ai-room-${room.id}.png`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleNewClick = () => {
    if (activeTab === "rooms") setWizardOpen(true);
    else setAvatarStudioTab("generate");
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* ヘッダー */}
      <div className="sticky top-0 z-30 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-orange-400/10 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <h1 className="text-base sm:text-lg font-bold truncate">
                AIスタジオ
              </h1>
            </div>
            <p className="text-[10px] text-muted-foreground">
              AIで推しルームとアバターを生成
            </p>
          </div>
          <Button
            onClick={handleNewClick}
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 text-white hover:opacity-95 shadow-md"
          >
            <Plus className="w-4 h-4" />
            新規
          </Button>
        </div>
        {/* タブ */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
            <TabsList className="grid grid-cols-2 w-full h-10">
              <TabsTrigger value="rooms" className="gap-1.5">
                <Home className="w-4 h-4" />
                ルーム
              </TabsTrigger>
              <TabsTrigger value="avatar" className="gap-1.5">
                <Shirt className="w-4 h-4" />
                アバター
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
        {activeTab === "rooms" && (
          <>
            {/* ヒーロー CTA (ルームが空のとき) */}
            {!isLoading && rooms.length === 0 && (
              <EmptyHero onStart={() => setWizardOpen(true)} />
            )}

            {/* ローディング */}
            {isLoading && (
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="aspect-video rounded-2xl bg-muted/60 animate-pulse"
                  />
                ))}
              </div>
            )}

            {/* グリッド */}
            {!isLoading && rooms.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-foreground">
                    マイAIルーム
                    <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                      ({rooms.length})
                    </span>
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onOpen={() => setViewing(room)}
                      onDelete={() => setDeletingId(room.id)}
                      onTogglePublic={() =>
                        toggleMutation.mutate({
                          roomId: room.id,
                          isPublic: !room.is_public,
                        })
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "avatar" && (
          <AvatarPanel
            avatars={avatarsHook}
            onGenerate={() => setAvatarStudioTab("generate")}
            onDressUp={() => setAvatarStudioTab("dressup")}
            onOpenGallery={() => setAvatarStudioTab("gallery")}
            onDelete={(id) => setDeletingAvatarId(id)}
          />
        )}
      </div>

      {/* 作成ウィザード (ルーム) */}
      <AiRoomCreateWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
      />

      {/* アバタースタジオ */}
      {user && avatarStudioTab && (
        <AvatarStudioModal
          isOpen={!!avatarStudioTab}
          onClose={() => setAvatarStudioTab(null)}
          userId={user.id}
          initialTab={avatarStudioTab}
        />
      )}

      {/* アバター削除確認 */}
      <AlertDialog
        open={!!deletingAvatarId}
        onOpenChange={(o) => !o && setDeletingAvatarId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>このアバターを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              削除すると元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingAvatarId) {
                  avatarsHook.remove.mutate(deletingAvatarId);
                  setDeletingAvatarId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* 画像ビューアー */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/95 border-0">
          {viewing && (
            <div className="relative">
              <button
                onClick={() => setViewing(null)}
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 backdrop-blur hover:bg-black/80 flex items-center justify-center text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={viewing.image_url}
                alt=""
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <div className="p-4 space-y-3 bg-background">
                {viewing.title && (
                  <p className="font-semibold text-base">{viewing.title}</p>
                )}
                {viewing.style_preset && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sparkles className="w-3.5 h-3.5" />
                    {getStylePresetById(viewing.style_preset)?.name ||
                      viewing.style_preset}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(viewing)}
                    className="flex-1 gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    保存
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleShare(viewing)}
                    className="flex-1 gap-1.5"
                  >
                    <Share2 className="w-4 h-4" />
                    シェア
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 削除確認 */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>このAIルームを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              削除すると元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingId) {
                  deleteMutation.mutate(deletingId);
                  setDeletingId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}

// ==================== AvatarPanel ====================

function AvatarPanel({
  avatars,
  onGenerate,
  onDressUp,
  onOpenGallery,
  onDelete,
}: {
  avatars: ReturnType<typeof useAvatars>;
  onGenerate: () => void;
  onDressUp: () => void;
  onOpenGallery: () => void;
  onDelete: (id: string) => void;
}) {
  if (avatars.isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="aspect-[3/4] rounded-2xl bg-muted/60 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* アクションカード */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onGenerate}
          className="relative overflow-hidden rounded-2xl p-4 text-left bg-gradient-to-br from-pink-500/15 via-purple-500/15 to-orange-400/15 border border-border/40 hover:shadow-md transition"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center mb-2">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm font-semibold">AIで生成</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            プロンプトから新しい姿に
          </p>
        </button>
        <button
          onClick={onDressUp}
          className="relative overflow-hidden rounded-2xl p-4 text-left bg-gradient-to-br from-sky-500/15 via-blue-500/15 to-cyan-400/15 border border-border/40 hover:shadow-md transition"
          disabled={avatars.avatars.length === 0}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center mb-2">
            <Shirt className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm font-semibold">着せ替え</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            グッズで着せ替えて変身
          </p>
        </button>
      </div>

      {/* 空状態 */}
      {avatars.avatars.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border/60 p-8 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">まだアバターがありません</p>
            <p className="text-xs text-muted-foreground mt-1">
              AI生成で最初のアバターを作りましょう
            </p>
          </div>
          <Button onClick={onGenerate} className="gap-1.5">
            <Wand2 className="w-4 h-4" />
            生成をはじめる
          </Button>
        </div>
      )}

      {/* ギャラリー */}
      {avatars.avatars.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">
              マイアバター
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                ({avatars.avatars.length})
              </span>
            </p>
            <Button variant="ghost" size="sm" onClick={onOpenGallery} className="text-xs">
              詳しく管理
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {avatars.avatars.map((a) => {
              const isCurrent = !!a.is_current;
              return (
                <div
                  key={a.id}
                  className={cn(
                    "relative rounded-2xl overflow-hidden border bg-card group",
                    isCurrent ? "border-primary ring-2 ring-primary/40" : "border-border/40"
                  )}
                >
                  <button
                    onClick={() => avatars.setCurrent.mutate(a.id)}
                    className="block w-full aspect-[3/4] bg-muted"
                  >
                    <img
                      src={a.image_url}
                      alt={a.name || "avatar"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                  {isCurrent && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                      使用中
                    </div>
                  )}
                  <button
                    onClick={() => onDelete(a.id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== EmptyHero ====================

function EmptyHero({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl overflow-hidden border border-border/40 shadow-sm mb-6"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-purple-500/15 to-orange-400/20" />
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-pink-400/30 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-purple-400/30 blur-3xl" />

      <div className="relative p-6 sm:p-8 text-center space-y-5">
        <div className="relative w-20 h-20 mx-auto">
          <motion.div
            animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 flex items-center justify-center shadow-xl"
          >
            <Wand2 className="w-9 h-9 text-white" />
          </motion.div>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${50 + Math.cos((i / 3) * Math.PI * 2) * 55}%`,
                top: `${50 + Math.sin((i / 3) * Math.PI * 2) * 55}%`,
              }}
              animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
            >
              <Sparkles className="w-4 h-4 text-pink-500" />
            </motion.div>
          ))}
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold mb-1.5">
            あなただけの推しルーム
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            コレクションから好きなグッズを選ぶと、AIがあなた専用の
            <br className="hidden sm:block" />
            一度きりの部屋を描きます ✨
          </p>
        </div>

        <Button
          size="lg"
          onClick={onStart}
          className="gap-2 h-12 px-6 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 text-white hover:opacity-95 shadow-lg"
        >
          <Wand2 className="w-5 h-5" />
          はじめて作る
        </Button>
      </div>
    </motion.div>
  );
}

// ==================== RoomCard ====================

function RoomCard({
  room,
  onOpen,
  onDelete,
  onTogglePublic,
}: {
  room: AiGeneratedRoom;
  onOpen: () => void;
  onDelete: () => void;
  onTogglePublic: () => void;
}) {
  const preset = room.style_preset
    ? getStylePresetById(room.style_preset)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm hover:shadow-lg transition-shadow"
    >
      <button
        onClick={onOpen}
        className="relative w-full aspect-video overflow-hidden bg-muted block"
      >
        <img
          src={room.image_url}
          alt=""
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* 下部グラデ */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
        {/* スタイルバッジ */}
        {preset && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-semibold flex items-center gap-1">
            <span>{preset.emoji}</span>
            <span>{preset.name}</span>
          </div>
        )}
        {/* 公開バッジ */}
        <div
          className={cn(
            "absolute top-2 right-2 px-2 py-1 rounded-full backdrop-blur text-[10px] font-semibold flex items-center gap-1",
            room.is_public
              ? "bg-emerald-500/90 text-white"
              : "bg-black/50 text-white"
          )}
        >
          {room.is_public ? (
            <>
              <Globe className="w-3 h-3" /> 公開
            </>
          ) : (
            <>
              <Lock className="w-3 h-3" /> 非公開
            </>
          )}
        </div>
        {/* タイトル */}
        {room.title && (
          <div className="absolute left-2 right-2 bottom-2 text-white text-sm font-semibold truncate text-left">
            {room.title}
          </div>
        )}
      </button>

      {/* アクション */}
      <div className="flex items-center gap-1 p-2 border-t border-border/40 bg-card">
        <Button
          variant="ghost"
          size="sm"
          onClick={onTogglePublic}
          className="flex-1 text-xs h-8"
        >
          {room.is_public ? (
            <>
              <Lock className="w-3.5 h-3.5 mr-1" />
              非公開にする
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5 mr-1" />
              公開する
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
