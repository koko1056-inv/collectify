import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wand2,
  Sparkles,
  Plus,
  Trash2,
  Globe,
  Lock,
  Download,
  Share2,
  X,
  Image as ImageIcon,
  Pencil,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  useUpdateAiRoomTitle,
  AiGeneratedRoom,
} from "@/hooks/ai-room/useAiRooms";
import { AiRoomCreateWizard } from "./AiRoomCreateWizard";
import { getStylePresetById } from "./roomStylePresets";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ShareModal } from "@/components/ShareModal";

/**
 * マイルームの「ルーム」タブで表示するAIルーム一覧。
 * - 最新の1枚をヒーロー表示
 * - 残りを2列グリッドでサムネ
 * - 空の状態は大きなCTAヒーロー
 */
export function MyAiRoomsView() {
  const { user } = useAuth();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [viewing, setViewing] = useState<AiGeneratedRoom | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sharingRoom, setSharingRoom] = useState<AiGeneratedRoom | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const { data: rooms = [], isLoading } = useUserAiRooms(user?.id);
  const deleteMutation = useDeleteAiRoom();
  const updateTitleMutation = useUpdateAiRoomTitle();
  const toggleMutation = useToggleAiRoomPublic();

  const [hero, ...rest] = rooms;

  const handleShare = (room: AiGeneratedRoom) => {
    setSharingRoom(room);
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
      {/* イントロ + 新規ボタン */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Wand2 className="w-4 h-4 text-primary" />
            <h2 className="text-base font-bold">AI推しルーム</h2>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
              NEW
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            グッズを選ぶだけで、あなただけの一度きりの部屋が完成
          </p>
        </div>
        {rooms.length > 0 && (
          <Button
            onClick={() => setWizardOpen(true)}
            size="sm"
            className="shrink-0 gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            新規
          </Button>
        )}
      </div>

      {/* ローディング */}
      {isLoading && (
        <div className="space-y-3">
          <div className="aspect-video rounded-3xl bg-muted/60 animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="aspect-video rounded-2xl bg-muted/60 animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

      {/* 空のヒーロー */}
      {!isLoading && rooms.length === 0 && (
        <EmptyHero onStart={() => setWizardOpen(true)} />
      )}

      {/* ヒーロー (最新1枚) */}
      {!isLoading && hero && (
        <HeroRoom
          room={hero}
          onOpen={() => setViewing(hero)}
          onShare={() => handleShare(hero)}
          onDownload={() => handleDownload(hero)}
          onTogglePublic={() =>
            toggleMutation.mutate({
              roomId: hero.id,
              isPublic: !hero.is_public,
            })
          }
        />
      )}

      {/* グリッド (それ以降) */}
      {!isLoading && rest.length > 0 && (
        <>
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              履歴
              <span className="ml-1.5 normal-case font-normal">
                ({rest.length})
              </span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {rest.map((room) => (
              <RoomThumbCard
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

      {/* 作成ウィザード */}
      <AiRoomCreateWizard open={wizardOpen} onOpenChange={setWizardOpen} />

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
                {/* タイトル編集 */}
                {editingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      placeholder="ルーム名を入力"
                      maxLength={60}
                      className="h-9 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateTitleMutation.mutate(
                            { roomId: viewing.id, title: titleDraft },
                            {
                              onSuccess: () => {
                                setViewing({ ...viewing, title: titleDraft.trim() || null });
                                setEditingTitle(false);
                              },
                            }
                          );
                        } else if (e.key === "Escape") {
                          setEditingTitle(false);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-9 px-2"
                      disabled={updateTitleMutation.isPending}
                      onClick={() =>
                        updateTitleMutation.mutate(
                          { roomId: viewing.id, title: titleDraft },
                          {
                            onSuccess: () => {
                              setViewing({ ...viewing, title: titleDraft.trim() || null });
                              setEditingTitle(false);
                            },
                          }
                        )
                      }
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-2"
                      onClick={() => setEditingTitle(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group/title">
                    <p className="font-semibold text-base flex-1 truncate">
                      {viewing.title || "無題のAIルーム"}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs gap-1"
                      onClick={() => {
                        setTitleDraft(viewing.title || "");
                        setEditingTitle(true);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      編集
                    </Button>
                  </div>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDeletingId(viewing.id);
                      setViewing(null);
                    }}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
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

      {/* シェアモーダル */}
      {sharingRoom && (
        <ShareModal
          isOpen={!!sharingRoom}
          onClose={() => setSharingRoom(null)}
          title={`AIで作った推し部屋 🏠✨ ${sharingRoom.title || ""} #Collectify`}
          url={sharingRoom.image_url}
          image={sharingRoom.image_url}
        />
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
      className="relative rounded-3xl overflow-hidden border border-border/40 shadow-sm"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-accent/30 to-primary/10" />
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-primary/15 blur-3xl" />

      <div className="relative p-6 sm:p-10 text-center space-y-5">
        <div className="relative w-20 h-20 mx-auto">
          <motion.div
            animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full rounded-full bg-primary flex items-center justify-center shadow-xl"
          >
            <Wand2 className="w-9 h-9 text-primary-foreground" />
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
          className="gap-2 h-12 px-6 shadow-lg"
        >
          <Wand2 className="w-5 h-5" />
          はじめて作る
        </Button>
      </div>
    </motion.div>
  );
}

// ==================== HeroRoom (最新1枚を大きく) ====================
function HeroRoom({
  room,
  onOpen,
  onShare,
  onDownload,
  onTogglePublic,
}: {
  room: AiGeneratedRoom;
  onOpen: () => void;
  onShare: () => void;
  onDownload: () => void;
  onTogglePublic: () => void;
}) {
  const preset = room.style_preset
    ? getStylePresetById(room.style_preset)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl overflow-hidden border border-border/40 shadow-xl bg-card"
    >
      <button
        onClick={onOpen}
        className="relative w-full aspect-video block bg-muted overflow-hidden"
      >
        <img
          src={room.image_url}
          alt={room.title || "AI room"}
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.03]"
          loading="eager"
        />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {preset && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-xs font-semibold flex items-center gap-1.5">
            <span>{preset.emoji}</span>
            <span>{preset.name}</span>
          </div>
        )}
        <div
          className={cn(
            "absolute top-3 right-3 px-2.5 py-1 rounded-full backdrop-blur text-xs font-semibold flex items-center gap-1.5",
            room.is_public
              ? "bg-emerald-500/90 text-white"
              : "bg-black/60 text-white"
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

        <div className="absolute left-4 right-4 bottom-3 text-left text-white">
          <p className="text-[10px] uppercase tracking-widest opacity-80 mb-0.5">
            最新の推しルーム
          </p>
          <p className="text-base font-bold truncate drop-shadow-md">
            {room.title || "無題のAIルーム"}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-2 p-3 border-t border-border/40">
        <Button
          variant="ghost"
          size="sm"
          onClick={onTogglePublic}
          className="flex-1 text-xs h-9"
        >
          {room.is_public ? (
            <>
              <Lock className="w-3.5 h-3.5 mr-1" />
              非公開
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
          size="sm"
          onClick={onDownload}
          className="text-xs h-9"
        >
          <Download className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          onClick={onShare}
          className="text-xs h-9 gap-1.5"
        >
          <Share2 className="w-3.5 h-3.5" />
          シェア
        </Button>
      </div>
    </motion.div>
  );
}

// ==================== Thumb Card ====================
function RoomThumbCard({
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
      className="group relative rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm hover:shadow-md transition-shadow"
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
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
        {preset && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-black/55 backdrop-blur text-white text-[9px] font-semibold flex items-center gap-1">
            <span>{preset.emoji}</span>
          </div>
        )}
        {room.is_public && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500/90 text-white text-[9px] font-semibold flex items-center gap-0.5">
            <Globe className="w-2.5 h-2.5" />
          </div>
        )}
        {room.title && (
          <div className="absolute left-2 right-2 bottom-1.5 text-white text-[11px] font-semibold truncate text-left">
            {room.title}
          </div>
        )}
      </button>

      <div className="flex items-center gap-1 p-1.5 border-t border-border/40">
        <Button
          variant="ghost"
          size="sm"
          onClick={onTogglePublic}
          className="flex-1 text-[10px] h-7 px-2"
        >
          {room.is_public ? (
            <>
              <Lock className="w-3 h-3 mr-0.5" />
              非公開に
            </>
          ) : (
            <>
              <Globe className="w-3 h-3 mr-0.5" />
              公開
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
