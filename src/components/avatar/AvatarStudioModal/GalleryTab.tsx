import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Check, ChevronRight, Globe, Image as ImageIcon, Loader2, Lock, Shirt, Trash2 } from "lucide-react";
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
import type { useAvatars } from "@/hooks/useAvatars";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useSetAvatarVisibility } from "@/hooks/ai-avatar/usePublicAvatars";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";

interface Props {
  avatars: ReturnType<typeof useAvatars>;
  onSwitchToGenerate: () => void;
}

export function GalleryTab({ avatars, onSwitchToGenerate }: Props) {
  const { t } = useLanguage();
  const { formatNumericDate } = useDateFormat();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const setVisibility = useSetAvatarVisibility();

  if (avatars.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (avatars.avatars.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title={t("misc.avatar.galleryEmpty")}
        action={
          <Button variant="outline" onClick={onSwitchToGenerate}>
            {t("misc.avatar.generateCta")}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {avatars.avatars.map((a) => {
          const isCurrent = a.is_current;
          return (
            <div
              key={a.id}
              className={`relative group rounded-xl overflow-hidden border-2 ${
                isCurrent
                  ? "border-primary shadow-lg ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="aspect-square bg-muted">
                <img loading="lazy" decoding="async"
                  src={getOptimizedImageUrl(a.image_url, { width: 300 })}
                      onError={fallbackToOriginal(a.image_url)}
                  alt={a.name || "Avatar"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute top-2 left-2 flex gap-1">
                {isCurrent && (
                  <Badge className="text-xs">
                    <Check className="w-3 h-3 mr-1" />
                    {t("misc.avatar.inUse")}
                  </Badge>
                )}
                {a.item_ids && a.item_ids.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Shirt className="w-3 h-3 mr-1" />
                    {a.item_ids.length}
                  </Badge>
                )}
                {a.is_public && (
                  <Badge variant="secondary" className="text-xs">
                    <Globe className="w-3 h-3 mr-1" />
                    {t("misc.avatar.public")}
                  </Badge>
                )}
              </div>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  onClick={() => avatars.setCurrent.mutate(a.id)}
                  disabled={!!isCurrent || avatars.setCurrent.isPending}
                >
                  <Check className="w-4 h-4 mr-1" />
                  {t("misc.avatar.select")}
                </Button>
                {/* 探索タブへの公開切り替え。既存アバターは既定で非公開。
                    is_public が無い＝マイグレーション未適用なので操作を出さない。 */}
                {a.is_public !== undefined && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setVisibility.mutate({ avatarId: a.id, isPublic: !a.is_public })
                  }
                  disabled={setVisibility.isPending}
                  title={a.is_public ? t("misc.avatar.unpublish") : t("misc.avatar.publish")}
                >
                  {a.is_public ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => setDeleteId(a.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-xs text-white truncate">
                  {a.name || formatNumericDate(a.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("misc.avatar.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("misc.common.irreversible")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("misc.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) avatars.remove.mutate(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("misc.common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
