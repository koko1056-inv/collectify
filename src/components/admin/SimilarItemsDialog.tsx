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
import { useLanguage } from "@/contexts/LanguageContext";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";
import type { SimilarOfficialItem } from "@/hooks/useSimilarOfficialItems";

interface SimilarItemsDialogProps {
  items: SimilarOfficialItem[];
  onCancel: () => void;
  onProceed: () => void;
}

/**
 * 登録前に「同じ名前のものが既にあります」と見せる。
 *
 * 止めはしない。同名の別商品は正当に存在する。
 * 一番くじの「D賞アクリルスタンド」はキャラごとに別商品で、
 * このカタログにも同じ名前で10種類入っている。
 * 名前が同じという理由で登録を拒むと、今度は登録できない不具合になる。
 *
 * だから出すのは既存の写真と使われ方だけ。同じか別かは人が見て決める。
 */
export function SimilarItemsDialog({ items, onCancel, onProceed }: SimilarItemsDialogProps) {
  const { t } = useLanguage();

  return (
    <AlertDialog open={items.length > 0} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("admin.similar.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("admin.similar.description", { count: items.length })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-lg border p-2">
              <img
                src={getOptimizedImageUrl(item.image, { width: 240 })}
                onError={fallbackToOriginal(item.image)}
                loading="lazy"
                decoding="async"
                alt=""
                className="h-14 w-14 shrink-0 rounded object-cover bg-muted"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{item.title}</p>
                {item.content_name && (
                  <p className="truncate text-[11px] text-muted-foreground">{item.content_name}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {t("admin.similar.usage", {
                    owners: item.owner_count,
                    wishes: item.wish_count,
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t("admin.similar.back")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onProceed();
            }}
          >
            {t("admin.similar.proceed")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
