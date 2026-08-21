import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
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
import { buildWorkUrl, shareContent } from "@/utils/share";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { hasPendingAvatarPrompt } from "@/utils/ai-studio-handoff";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";

type ActiveTab = "rooms" | "avatar";

export default function AiRoomsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  // タブをURLに持たせる。以前はローカル状態だけだったので、
  // アバター側に直接リンクできず、戻ってくると必ずルームに戻っていた。
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    () =>
      (new URLSearchParams(window.location.search).get("tab") === "avatar"
        ? "avatar"
        : "rooms")
  );
  const [wizardOpen, setWizardOpen] = useState(false);
  const [avatarStudioTab, setAvatarStudioTab] = useState<StudioTab | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewing, setViewing] = useState<AiGeneratedRoom | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAvatarId, setDeletingAvatarId] = useState<string | null>(null);

  const avatarsHook = useAvatars(user?.id);

  const { data: rooms = [], isLoading } = useUserAiRooms(user?.id);
  const deleteMutation = useDeleteAiRoom();
  const toggleMutation = useToggleAiRoomPublic();

  const handleShare = async (room: AiGeneratedRoom) => {
    // 画像の直リンクではなく、アプリ内の作品ページを共有する。
    // 非公開のままだとリンク先が見られないので、先に公開してから共有する。
    if (!room.is_public) {
      try {
        await toggleMutation.mutateAsync({ roomId: room.id, isPublic: true });
        toast.success(t("aiRoom.share.madePublic"));
      } catch (e) {
        console.error("failed to publish room before sharing:", e);
        toast.error(t("aiRoom.share.publishFailed"));
        return;
      }
    }

    const result = await shareContent({
      title: t("screens.aiRooms.shareText"),
      text: `${t("screens.aiRooms.shareText")}\n${t("aiRoom.share.hashtags")}`,
      url: buildWorkUrl("ai-work", room.id),
      imageUrl: room.image_url,
      fileName: "collectify-ai-room.png",
    });

    if (result === "copied") toast.success(t("aiRoom.share.linkCopied"));
    else if (result === "failed") toast.error(t("aiRoom.share.failed"));
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

  // 探索から「このスタイルを使う」で来たときは、アバタースタジオを自動で開く。
  // ここで開かないと、引き継いだプロンプトを入力する画面に辿り着けない。
  useEffect(() => {
    if (searchParams.get("studio") === "generate" && hasPendingAvatarPrompt()) {
      setAvatarStudioTab("generate");
      const next = new URLSearchParams(searchParams);
      next.delete("studio");
      next.delete("from");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // URLの tab パラメータに追従する（ホームなど他画面からの遷移も拾う）
  useEffect(() => {
    const next = searchParams.get("tab") === "avatar" ? "avatar" : "rooms";
    setActiveTab((prev) => (prev === next ? prev : next));
  }, [searchParams]);

  const handleTabChange = (v: ActiveTab) => {
    setActiveTab(v);
    const next = new URLSearchParams(searchParams);
    if (v === "avatar") next.set("tab", "avatar");
    else next.delete("tab");
    setSearchParams(next, { replace: true });
  };

  const handleNewClick = () => {
    if (activeTab === "rooms") setWizardOpen(true);
    else setAvatarStudioTab("generate");
  };

  const latestRoom = rooms[0];
  const currentAvatar = avatarsHook.currentAvatar;
  const totalCreations = rooms.length + avatarsHook.avatars.length;

  return (
    <div className="min-h-screen bg-background pb-28">
      <Navbar />

      {/* ヒーローヘッダー */}
      <div className="relative overflow-hidden border-b border-border/40">
        {/* 背景装飾 */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5" />
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-3">
          {/* タイトル行 */}
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0 h-9 w-9"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 8, -6, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="w-7 h-7 rounded-full bg-brand-gradient flex items-center justify-center shadow-md"
                >
                  <Wand2 className="w-3.5 h-3.5 text-white" />
                </motion.div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                  {t("screens.aiRooms.studioTitle")}
                </h1>
                {totalCreations > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                    {totalCreations}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 ml-9">
                {t("screens.aiRooms.studioSubtitle")}
              </p>
            </div>
          </div>

          {/* 現在のクリエーション・スナップショット */}
          {(latestRoom || currentAvatar) && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {/* 最新ルーム */}
              <button
                onClick={() => latestRoom && setViewing(latestRoom)}
                disabled={!latestRoom}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-border/40 bg-muted disabled:opacity-50"
              >
                {latestRoom ? (
                  <>
                    <img
                      // 画面を開いた瞬間に見える位置なので、遅延させず先に読む
                      fetchPriority="high"
                      decoding="async"
                      src={getOptimizedImageUrl(latestRoom.image_url, { width: 400 })}
                      onError={fallbackToOriginal(latestRoom.image_url)}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-card/90 text-[9px] font-bold text-foreground flex items-center gap-1">
                      <Home className="w-2.5 h-2.5" /> {t("screens.aiRooms.latestRoom")}
                    </div>
                    <p className="absolute bottom-2 left-2 right-2 text-white text-xs font-semibold truncate text-left">
                      {latestRoom.title || t("screens.aiRooms.untitledRoom")}
                    </p>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
                    <Home className="w-6 h-6" />
                    <span className="text-[10px]">{t("screens.aiRooms.noRoomYet")}</span>
                  </div>
                )}
              </button>

              {/* 現在のアバター */}
              <button
                onClick={() => setActiveTab("avatar")}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-border/40 bg-muted"
              >
                {currentAvatar ? (
                  <>
                    <img
                      fetchPriority="high"
                      decoding="async"
                      src={getOptimizedImageUrl(currentAvatar.image_url, { width: 400 })}
                      onError={fallbackToOriginal(currentAvatar.image_url)}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-card/90 text-[9px] font-bold text-foreground flex items-center gap-1">
                      <Shirt className="w-2.5 h-2.5" /> {t("screens.aiRooms.currentAvatar")}
                    </div>
                    <p className="absolute bottom-2 left-2 right-2 text-white text-xs font-semibold truncate text-left">
                      {currentAvatar.name || t("screens.aiRooms.avatarFallbackName")}
                    </p>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
                    <Shirt className="w-6 h-6" />
                    <span className="text-[10px]">{t("screens.aiRooms.noAvatarYet")}</span>
                  </div>
                )}
              </button>
            </div>
          )}

          {/* タブ + CTA */}
          <div className="flex items-center gap-2">
            <Tabs
              value={activeTab}
              onValueChange={(v) => handleTabChange(v as ActiveTab)}
              className="flex-1"
            >
              <TabsList className="grid grid-cols-2 w-full h-10 bg-background/60 backdrop-blur">
                <TabsTrigger value="rooms" className="gap-1.5 text-xs">
                  <Home className="w-3.5 h-3.5" />
                  {t("screens.aiRooms.roomsTab")}
                  {rooms.length > 0 && (
                    <span className="ml-0.5 px-1 py-px rounded text-[9px] bg-muted text-muted-foreground">
                      {rooms.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="avatar" className="gap-1.5 text-xs">
                  <Shirt className="w-3.5 h-3.5" />
                  {t("screens.aiRooms.avatarTab")}
                  {avatarsHook.avatars.length > 0 && (
                    <span className="ml-0.5 px-1 py-px rounded text-[9px] bg-muted text-muted-foreground">
                      {avatarsHook.avatars.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              onClick={handleNewClick}
              size="sm"
              className="h-10 gap-1 bg-brand-gradient text-white hover:opacity-95 shadow-md shrink-0"
            >
              <Plus className="w-4 h-4" />
              {t("screens.aiRooms.createNew")}
            </Button>
          </div>
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
                  <Skeleton
                    key={i}
                    className="aspect-video rounded-2xl"
                  />
                ))}
              </div>
            )}

            {/* グリッド */}
            {!isLoading && rooms.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Home className="w-4 h-4 text-primary" />
                    {t("screens.aiRooms.myAiRooms")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("screens.aiRooms.tapToEnlarge")}
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
            <AlertDialogTitle>{t("screens.aiRooms.deleteAvatarTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("screens.aiRooms.deleteIrreversible")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("screens.aiRooms.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingAvatarId) {
                  avatarsHook.remove.mutate(deletingAvatarId);
                  setDeletingAvatarId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("screens.aiRooms.deleteConfirm")}
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
              <img loading="lazy" decoding="async"
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
                    {t("screens.aiRooms.save")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleShare(viewing)}
                    className="flex-1 gap-1.5"
                  >
                    <Share2 className="w-4 h-4" />
                    {t("screens.aiRooms.share")}
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
            <AlertDialogTitle>{t("screens.aiRooms.deleteRoomTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("screens.aiRooms.deleteIrreversible")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("screens.aiRooms.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingId) {
                  deleteMutation.mutate(deletingId);
                  setDeletingId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("screens.aiRooms.deleteConfirm")}
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
  const { t } = useLanguage();
  if (avatars.isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            className="aspect-[3/4] rounded-2xl"
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
          className="relative overflow-hidden rounded-2xl p-4 text-left bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 border border-border/40 hover:shadow-md transition"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-2">
            <Wand2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <p className="text-sm font-semibold">{t("screens.aiRooms.avatarGenerate")}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t("screens.aiRooms.avatarGenerateDesc")}
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
          <p className="text-sm font-semibold">{t("screens.aiRooms.avatarDressUp")}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t("screens.aiRooms.avatarDressUpDesc")}
          </p>
        </button>
      </div>

      {/* 空状態 */}
      {avatars.avatars.length === 0 && (
        <EmptyState
          className="rounded-3xl border border-dashed border-border/60"
          icon={Sparkles}
          title={t("screens.aiRooms.avatarEmptyTitle")}
          description={t("screens.aiRooms.avatarEmptyDesc")}
          action={
            <Button onClick={onGenerate} className="gap-1.5">
              <Wand2 className="w-4 h-4" />
              {t("screens.aiRooms.avatarStartGenerating")}
            </Button>
          }
        />
      )}

      {/* ギャラリー */}
      {avatars.avatars.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">
              {t("screens.aiRooms.myAvatars")}
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                ({avatars.avatars.length})
              </span>
            </p>
            <Button variant="ghost" size="sm" onClick={onOpenGallery} className="text-xs">
              {t("screens.aiRooms.manageAvatars")}
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
                    className="block w-full aspect-square bg-muted"
                  >
                    <img
                      src={getOptimizedImageUrl(a.image_url, { width: 400 })}
                      alt={a.name || "avatar"}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </button>

                  {isCurrent && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                      {t("screens.aiRooms.inUse")}
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
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl overflow-hidden border border-border/40 shadow-sm mb-6"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10" />
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-primary/30 blur-3xl" />

      <div className="relative p-6 sm:p-8 text-center space-y-5">
        <div className="relative w-20 h-20 mx-auto">
          <motion.div
            animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full rounded-full bg-brand-gradient flex items-center justify-center shadow-xl"
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
              <Sparkles className="w-4 h-4 text-primary" />
            </motion.div>
          ))}
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold mb-1.5">
            {t("screens.aiRooms.emptyHeroTitle")}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            {t("screens.aiRooms.emptyHeroLead1")}
            <br className="hidden sm:block" />
            {t("screens.aiRooms.emptyHeroLead2")}
          </p>
        </div>

        <Button
          size="lg"
          onClick={onStart}
          className="gap-2 h-12 px-6 bg-brand-gradient text-white hover:opacity-95 shadow-lg"
        >
          <Wand2 className="w-5 h-5" />
          {t("screens.aiRooms.emptyHeroCta")}
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
  const { t } = useLanguage();
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
          src={getOptimizedImageUrl(room.image_url, { width: 400 })}
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
              <Globe className="w-3 h-3" /> {t("screens.aiRooms.public")}
            </>
          ) : (
            <>
              <Lock className="w-3 h-3" /> {t("screens.aiRooms.private")}
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
              {t("screens.aiRooms.makePrivate")}
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5 mr-1" />
              {t("screens.aiRooms.makePublic")}
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
