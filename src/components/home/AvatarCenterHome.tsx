import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Check,
  ChevronDown,
  Dices,
  Edit2,
  Image as ImageIcon,
  Sparkles,
  Shirt,
  Trash2,
  UploadCloud,
  User,
} from "lucide-react";
import { Profile } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { AvatarStudioModal, type StudioTab } from "@/components/avatar";
import { useAvatars, type AvatarRow } from "@/hooks/useAvatars";
import { RandomPickupModal } from "./avatar-center/RandomPickupModal";

interface AvatarCenterHomeProps {
  profile: Profile | undefined;
}

export function AvatarCenterHome({ profile }: AvatarCenterHomeProps) {
  if (!profile) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <p className="text-muted-foreground">プロフィールを読み込み中...</p>
      </div>
    );
  }

  const { user } = useAuth();
  const userId = user?.id || "";
  const avatars = useAvatars(userId);

  const [showStudio, setShowStudio] = useState(false);
  const [studioTab, setStudioTab] = useState<StudioTab>("generate");
  const [studioBaseUrl, setStudioBaseUrl] = useState<string | null>(null);
  const [showRandom, setShowRandom] = useState(false);

  const [renameTarget, setRenameTarget] = useState<AvatarRow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AvatarRow | null>(null);

  const currentUrl = avatars.currentAvatar?.image_url || profile.avatar_url || null;

  const openStudio = (tab: StudioTab, baseUrl?: string | null) => {
    setStudioTab(tab);
    setStudioBaseUrl(baseUrl ?? null);
    setShowStudio(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) avatars.uploadFile.mutate(f);
    e.target.value = "";
  };

  const buttons = [
    {
      icon: Sparkles,
      label: "生成",
      onClick: () => openStudio("generate"),
      color: "from-violet-500 to-purple-600",
    },
    {
      icon: Shirt,
      label: "着せ替え",
      onClick: () => openStudio("dressup", currentUrl),
      color: "from-pink-500 to-rose-600",
    },
    {
      icon: ImageIcon,
      label: "ギャラリー",
      onClick: () => openStudio("gallery"),
      color: "from-sky-500 to-blue-600",
    },
    {
      icon: Dices,
      label: "ランダム",
      onClick: () => setShowRandom(true),
      color: "from-amber-500 to-orange-600",
    },
  ];

  return (
    <>
      <div className="min-h-[80vh] flex flex-col items-center justify-start pt-8 sm:pt-12 relative px-4 sm:px-8 gap-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 rounded-3xl pointer-events-none" />

        {/* メインアバター（タップでギャラリー） */}
        <button
          onClick={() => openStudio("gallery")}
          className="relative cursor-pointer group focus:outline-none"
          aria-label="アバターを管理する"
        >
          {currentUrl ? (
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-xl" />
              <Avatar className="w-44 h-44 sm:w-56 sm:h-56 lg:w-64 lg:h-64 border-4 border-background shadow-2xl relative z-10 transition-transform group-hover:scale-105">
                <AvatarImage src={currentUrl} />
                <AvatarFallback>
                  <User className="w-16 h-16" />
                </AvatarFallback>
              </Avatar>
            </div>
          ) : (
            <div className="w-44 h-44 sm:w-56 sm:h-56 lg:w-64 lg:h-64 border-4 border-dashed border-muted-foreground/30 rounded-full flex flex-col items-center justify-center bg-muted/5">
              <User className="w-16 h-16 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">アバターを設定</p>
            </div>
          )}
        </button>

        {/* カルーセル */}
        <div className="w-full max-w-2xl relative z-10">
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-xs font-medium text-muted-foreground">
              {avatars.avatars.length > 0
                ? `保存済みアバター (${avatars.avatars.length})`
                : "アバターをつくろう"}
            </p>
            {avatars.avatars.length > 0 && (
              <button
                onClick={() => openStudio("gallery")}
                className="text-xs text-primary font-medium hover:underline"
              >
                すべて見る →
              </button>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 px-2 snap-x">
            {/* 新規生成タイル */}
            <button
              onClick={() => openStudio("generate")}
              className="flex-shrink-0 snap-start w-20 h-20 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/10 transition-all"
              aria-label="新しいアバターを生成"
            >
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-medium text-primary">新規生成</span>
            </button>

            {/* アップロードタイル */}
            <label className="flex-shrink-0 snap-start w-20 h-20 rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-foreground/40 hover:bg-muted/30 transition-all">
              <UploadCloud className="w-5 h-5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">アップロード</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {avatars.avatars.map((a) => {
              const isCurrent = a.is_current || a.image_url === currentUrl;
              return (
                <div
                  key={a.id}
                  className="flex-shrink-0 snap-start flex flex-col items-center gap-1 group"
                >
                  <div
                    className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${
                      isCurrent
                        ? "border-primary shadow-lg ring-2 ring-primary/30"
                        : "border-border hover:border-primary/60"
                    }`}
                  >
                    <button
                      onClick={() => avatars.setCurrent.mutate(a.id)}
                      disabled={!!isCurrent || avatars.setCurrent.isPending}
                      className="w-full h-full"
                    >
                      <img
                        src={a.image_url}
                        alt={a.name || "アバター"}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    {isCurrent && (
                      <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    {/* タイル右下のメニューボタン */}
                    <div className="absolute bottom-0 right-0 flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameTarget(a);
                          setRenameValue(a.name || "");
                        }}
                        className="p-1 bg-background/90 rounded-tl-md hover:bg-background"
                        aria-label="名前を編集"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(a);
                        }}
                        className="p-1 bg-background/90 hover:bg-background"
                        aria-label="削除"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[80px] text-center">
                    {a.name || (isCurrent ? "現在" : "—")}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 機能ボタン */}
        <div className="grid grid-cols-2 sm:flex gap-4 sm:gap-6 mb-8 max-w-md w-full px-4">
          {buttons.map((btn, i) => (
            <div key={i} className="relative flex flex-col items-center">
              <Button
                onClick={btn.onClick}
                size="lg"
                className={`rounded-full w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 shadow-lg hover:scale-110 transition-all duration-300 bg-gradient-to-br ${btn.color} border-2 border-background`}
              >
                <btn.icon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />
              </Button>
              <span className="mt-2 text-xs sm:text-sm font-medium text-foreground/80">
                {btn.label}
              </span>
            </div>
          ))}
        </div>

        {/* スクロール誘導 */}
        <div className="flex flex-col items-center gap-2 animate-bounce mt-8">
          <p className="text-sm text-muted-foreground">コレクション、コレクターを見る</p>
          <ChevronDown className="w-6 h-6 text-muted-foreground" />
        </div>
      </div>

      {/* スタジオモーダル */}
      {userId && (
        <AvatarStudioModal
          isOpen={showStudio}
          onClose={() => setShowStudio(false)}
          userId={userId}
          initialTab={studioTab}
          initialBaseAvatarUrl={studioBaseUrl}
        />
      )}

      {/* ランダムピックアップ */}
      <RandomPickupModal
        isOpen={showRandom}
        onClose={() => setShowRandom(false)}
        userId={userId}
      />

      {/* 名前編集 */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(o) => {
          if (!o) setRenameTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>アバター名を編集</DialogTitle>
            <DialogDescription>このアバターの名前を変更できます</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="アバター名を入力..."
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={50}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              キャンセル
            </Button>
            <Button
              onClick={() => {
                if (renameTarget) {
                  avatars.rename.mutate({ id: renameTarget.id, name: renameValue });
                }
                setRenameTarget(null);
              }}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>アバターを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。本当にこのアバターを削除してもよろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) avatars.remove.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
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
