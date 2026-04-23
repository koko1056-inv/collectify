import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight, Image as ImageIcon, Loader2, Shirt, Trash2 } from "lucide-react";
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

interface Props {
  avatars: ReturnType<typeof useAvatars>;
  onSwitchToGenerate: () => void;
}

export function GalleryTab({ avatars, onSwitchToGenerate }: Props) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (avatars.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (avatars.avatars.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-4">まだアバターがありません</p>
        <Button variant="outline" onClick={onSwitchToGenerate}>
          アバターを生成する
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
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
                <img
                  src={a.image_url}
                  alt={a.name || "Avatar"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute top-2 left-2 flex gap-1">
                {isCurrent && (
                  <Badge className="text-xs">
                    <Check className="w-3 h-3 mr-1" />
                    使用中
                  </Badge>
                )}
                {a.item_ids && a.item_ids.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Shirt className="w-3 h-3 mr-1" />
                    {a.item_ids.length}
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
                  選択
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleteId(a.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-xs text-white truncate">
                  {a.name || new Date(a.created_at).toLocaleDateString("ja-JP")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>アバターを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>この操作は取り消せません。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) avatars.remove.mutate(deleteId);
                setDeleteId(null);
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
