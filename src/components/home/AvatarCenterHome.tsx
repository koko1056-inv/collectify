import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { AvatarSocialSection } from "./AvatarSocialSection";

interface AvatarCenterHomeProps {
  profile: Profile | undefined;
}

export function AvatarCenterHome({ profile }: AvatarCenterHomeProps) {
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

  if (!profile) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-muted-foreground">プロフィールを読み込み中...</p>
      </div>
    );
  }

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

  const actions = [
    {
      icon: Sparkles,
      label: "生成",
      hint: "AIでつくる",
      onClick: () => openStudio("generate"),
    },
    {
      icon: Shirt,
      label: "着せ替え",
      hint: "グッズで変身",
      onClick: () => openStudio("dressup", currentUrl),
    },
    {
      icon: ImageIcon,
      label: "ギャラリー",
      hint: "一覧から選ぶ",
      onClick: () => openStudio("gallery"),
    },
    {
      icon: Dices,
      label: "ランダム",
      hint: "おまかせ",
      onClick: () => setShowRandom(true),
    },
  ];

  return (
    <div className="space-y-5">
      {/* メインアバターカード（HeroCardと同じトーン） */}
      <Card className="relative overflow-hidden border-border/40 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-card to-card pointer-events-none" />
        <div className="absolute -top-6 -right-6 w-40 h-40 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-gradient-to-tr from-pink-500/10 to-transparent blur-3xl pointer-events-none" />

        <CardContent className="relative p-6 sm:p-8 flex flex-col items-center">
          {/* メインアバター */}
          <button
            onClick={() => openStudio("gallery")}
            className="relative group focus:outline-none mb-5"
            aria-label="アバターを管理する"
          >
            {currentUrl ? (
              <>
                <div className="absolute -inset-3 bg-gradient-to-br from-primary/30 to-primary/5 rounded-full blur-xl opacity-60 group-hover:opacity-90 transition-opacity" />
                <Avatar className="relative w-36 h-36 sm:w-44 sm:h-44 border-4 border-background shadow-2xl ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300 group-hover:scale-105">
                  <AvatarImage src={currentUrl} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="w-14 h-14" />
                  </AvatarFallback>
                </Avatar>
              </>
            ) : (
              <div className="w-36 h-36 sm:w-44 sm:h-44 border-2 border-dashed border-primary/40 bg-primary/5 rounded-full flex flex-col items-center justify-center gap-2 group-hover:border-primary group-hover:bg-primary/10 transition-all">
                <Sparkles className="w-10 h-10 text-primary" />
                <span className="text-xs font-medium text-primary">アバターをつくる</span>
              </div>
            )}
          </button>

          {/* タイトル */}
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            {avatars.currentAvatar?.name || "マイアバター"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 mb-5">
            あなたの分身を自由にデザインしよう
          </p>

          {/* 4つのアクションボタン（カード化して他ページのトーンに揃える） */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-md">
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                className="group flex flex-col items-center gap-1.5 p-2.5 sm:p-3 rounded-2xl bg-background/80 border border-border/40 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                  <a.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-foreground">{a.label}</span>
                <span className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:block">{a.hint}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ギャラリーカード */}
      <Card className="border-border/40 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <ImageIcon className="w-3.5 h-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold">
                マイギャラリー
                {avatars.avatars.length > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                    ({avatars.avatars.length})
                  </span>
                )}
              </h3>
            </div>
            {avatars.avatars.length > 0 && (
              <button
                onClick={() => openStudio("gallery")}
                className="text-xs text-primary font-medium hover:underline"
              >
                すべて見る →
              </button>
            )}
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {/* 新規生成タイル */}
            <button
              onClick={() => openStudio("generate")}
              className="flex-shrink-0 w-[72px]"
              aria-label="新しいアバターを生成"
            >
              <div className="w-[72px] h-[72px] rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/10 transition-all">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-[9px] font-medium text-primary">新規生成</span>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1.5">作る</p>
            </button>

            {/* アップロードタイル */}
            <label className="flex-shrink-0 w-[72px] cursor-pointer">
              <div className="w-[72px] h-[72px] rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex flex-col items-center justify-center gap-1 hover:border-foreground/40 hover:bg-muted/30 transition-all">
                <UploadCloud className="w-5 h-5 text-muted-foreground" />
                <span className="text-[9px] font-medium text-muted-foreground">アップ</span>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1.5">画像から</p>
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
                <div key={a.id} className="flex-shrink-0 w-[72px] group">
                  <div
                    className={`relative w-[72px] h-[72px] rounded-2xl overflow-hidden border-2 transition-all ${
                      isCurrent
                        ? "border-primary shadow-md ring-2 ring-primary/30"
                        : "border-border/60 hover:border-primary/60"
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
                  <p className="text-[10px] text-muted-foreground truncate text-center mt-1.5">
                    {a.name || (isCurrent ? "現在" : "—")}
                  </p>
                </div>
              );
            })}
          </div>

          {avatars.avatars.length === 0 && !avatars.isLoading && (
            <p className="text-center text-xs text-muted-foreground py-3">
              まだアバターがありません。生成またはアップロードして始めましょう
            </p>
          )}
        </CardContent>
      </Card>

      {/* ソーシャルセクション（コレクション・コレクター） */}
      {userId && (
        <AvatarSocialSection userId={userId} avatarUrl={currentUrl || undefined} />
      )}

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
    </div>
  );
}
