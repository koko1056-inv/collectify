import { useState } from "react";
import { motion } from "framer-motion";
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
  Edit2,
  Image as ImageIcon,
  Plus,
  Sparkles,
  Shirt,
  Trash2,
  UploadCloud,
  User,
  Wand2,
  ArrowRight,
} from "lucide-react";
import { Profile } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { AvatarStudioModal, type StudioTab } from "@/components/avatar";
import { useAvatars, type AvatarRow } from "@/hooks/useAvatars";

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
  const restAvatars = avatars.avatars.filter(
    (a) => a.id !== avatars.currentAvatar?.id
  );

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
      {/* イントロ + 新規ボタン (ルームページと同じスタイル) */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-base font-bold">AI推しアバター</h2>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
              NEW
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            グッズで着せ替え、AIで生成。あなただけの分身を育てよう
          </p>
        </div>
        {avatars.avatars.length > 0 && (
          <Button
            onClick={() => openStudio("generate")}
            size="sm"
            className="shrink-0 gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            新規
          </Button>
        )}
      </div>

      {/* ローディング */}
      {avatars.isLoading && (
        <div className="space-y-3">
          <div className="aspect-square sm:aspect-video rounded-3xl bg-muted/60 animate-pulse" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-square rounded-2xl bg-muted/60 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* 空のヒーロー */}
      {!avatars.isLoading && avatars.avatars.length === 0 && (
        <EmptyHero onStart={() => openStudio("generate")} onUpload={handleFileUpload} />
      )}

      {/* ヒーロー (現在のアバターを大きく) */}
      {!avatars.isLoading && currentUrl && (
        <HeroAvatar
          imageUrl={currentUrl}
          name={avatars.currentAvatar?.name || "マイアバター"}
          onOpen={() => openStudio("gallery")}
          onDressUp={() => openStudio("dressup", currentUrl)}
          onGenerate={() => openStudio("generate")}
          onUpload={handleFileUpload}
        />
      )}

      {/* ギャラリー (履歴) */}
      {!avatars.isLoading && restAvatars.length > 0 && (
        <>
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              ギャラリー
              <span className="ml-1.5 normal-case font-normal">
                ({restAvatars.length})
              </span>
            </p>
            <button
              onClick={() => openStudio("gallery")}
              className="text-xs text-primary font-medium hover:underline"
            >
              すべて見る →
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {restAvatars.map((a) => (
              <AvatarThumbCard
                key={a.id}
                avatar={a}
                onSelect={() => avatars.setCurrent.mutate(a.id)}
                onRename={() => {
                  setRenameTarget(a);
                  setRenameValue(a.name || "");
                }}
                onDelete={() => setDeleteTarget(a)}
              />
            ))}
          </div>
        </>
      )}

      {/* 次のステップヒント (アバター数に応じて) */}
      {!avatars.isLoading && avatars.avatars.length > 0 && avatars.avatars.length < 2 && (
        <NextStepHint
          onDressUp={() => openStudio("dressup", currentUrl)}
        />
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
            <AlertDialogTitle>このアバターを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              削除すると元に戻せません。
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
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== EmptyHero ====================
function EmptyHero({
  onStart,
  onUpload,
}: {
  onStart: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
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
            あなただけの推しアバター
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            写真からつくる、AIで生成、グッズで着せ替え。
            <br className="hidden sm:block" />
            自由に分身をデザインしよう ✨
          </p>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button size="lg" onClick={onStart} className="gap-2 h-12 px-6 shadow-lg">
            <Wand2 className="w-5 h-5" />
            はじめて作る
          </Button>
          <label className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-md border border-border bg-background hover:bg-muted cursor-pointer text-sm font-medium">
            <UploadCloud className="w-4 h-4" />
            画像から
            <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
          </label>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== HeroAvatar (現在のアバターを大きく) ====================
function HeroAvatar({
  imageUrl,
  name,
  onOpen,
  onDressUp,
  onGenerate,
  onUpload,
}: {
  imageUrl: string;
  name: string;
  onOpen: () => void;
  onDressUp: () => void;
  onGenerate: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl overflow-hidden border border-border/40 shadow-xl bg-card"
    >
      {/* 上半分: 大きなアバタービジュアル */}
      <button
        onClick={onOpen}
        className="relative w-full aspect-square sm:aspect-[16/10] block bg-gradient-to-br from-primary/10 via-accent/20 to-primary/5 overflow-hidden"
      >
        {/* 背景装飾 */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-pink-500/10 blur-3xl" />

        {/* アバター */}
        <div className="relative w-full h-full flex items-center justify-center p-6">
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -inset-4 rounded-full bg-gradient-to-br from-primary/40 to-pink-500/30 blur-2xl"
            />
            <Avatar className="relative w-44 h-44 sm:w-56 sm:h-56 border-4 border-background shadow-2xl ring-2 ring-primary/30">
              <AvatarImage src={imageUrl} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary">
                <User className="w-16 h-16" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* 下グラデ + ラベル */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute left-4 right-4 bottom-3 text-left text-white">
          <p className="text-[10px] uppercase tracking-widest opacity-80 mb-0.5">
            現在のアバター
          </p>
          <p className="text-base font-bold truncate drop-shadow-md">{name}</p>
        </div>

        {/* 右上バッジ */}
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-xs font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> 着用中
        </div>
      </button>

      {/* 下半分: 3つのアクション (生成 / 着せ替え★ / アップ) */}
      <div className="grid grid-cols-3 gap-1.5 p-2.5 border-t border-border/40">
        <ActionButton
          icon={Wand2}
          label="生成"
          hint="AIで作る"
          onClick={onGenerate}
        />
        <ActionButton
          icon={Shirt}
          label="着せ替え"
          hint="グッズで装う"
          onClick={onDressUp}
          accent
        />
        <label className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors text-foreground/80">
          <UploadCloud className="w-4 h-4" />
          <span className="text-[11px] font-semibold leading-none">アップ</span>
          <span className="text-[9px] text-muted-foreground leading-none">写真から</span>
          <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
        </label>
      </div>
    </motion.div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  hint,
  onClick,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg transition-colors ${
        accent
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "hover:bg-muted/60 text-foreground/80"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[11px] font-semibold leading-none">{label}</span>
      {hint && (
        <span className={`text-[9px] leading-none ${accent ? "text-primary/70" : "text-muted-foreground"}`}>
          {hint}
        </span>
      )}
    </button>
  );
}

// ==================== NextStepHint ====================
/**
 * アバター数に応じて「次にやること」を案内するシンプルなヒントカード
 * 1枚だけ持っている → 「グッズで着せ替えてみよう」
 * 2枚以上 → 何も表示しない (上級者には邪魔をしない)
 */
function NextStepHint({ onDressUp }: { onDressUp: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onDressUp}
      className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-pink-500/5 to-transparent hover:from-primary/10 hover:via-pink-500/10 transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Shirt className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">
          グッズで着せ替えてみよう
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          お気に入りのグッズで、アバターを自分らしく
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-primary shrink-0" />
    </motion.button>
  );
}

// ==================== Avatar Thumb Card (履歴グリッド) ====================
function AvatarThumbCard({
  avatar,
  onSelect,
  onRename,
  onDelete,
}: {
  avatar: AvatarRow;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm hover:shadow-md transition-shadow"
    >
      <button
        onClick={onSelect}
        className="relative w-full aspect-square overflow-hidden bg-muted block"
      >
        <img
          src={avatar.image_url}
          alt={avatar.name || ""}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />
        {avatar.item_ids && avatar.item_ids.length > 0 && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-pink-500/90 text-white text-[9px] font-semibold flex items-center gap-1">
            <Shirt className="w-2.5 h-2.5" />
          </div>
        )}
        {avatar.name && (
          <div className="absolute left-2 right-2 bottom-1.5 text-white text-[11px] font-semibold truncate text-left">
            {avatar.name}
          </div>
        )}
      </button>

      {/* ホバーアクション */}
      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRename();
          }}
          className="w-6 h-6 rounded-full bg-black/60 backdrop-blur hover:bg-black/80 flex items-center justify-center text-white"
          aria-label="名前を編集"
        >
          <Edit2 className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-6 h-6 rounded-full bg-black/60 backdrop-blur hover:bg-destructive flex items-center justify-center text-white"
          aria-label="削除"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}
