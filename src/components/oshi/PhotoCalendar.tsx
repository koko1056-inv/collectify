import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LazyImage } from "@/components/ui/lazy-image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDeleteOshiPhoto, type OshiPhoto } from "@/hooks/useOshi";
import { todayJst } from "@/utils/companion";
import { cn } from "@/lib/utils";

interface PhotoCalendarProps {
  photos: OshiPhoto[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 月ごとのカレンダー。撮った日にサムネイルが入る。タップで大きく見る・消す・シェア */
export function PhotoCalendar({ photos }: PhotoCalendarProps) {
  const { t, language } = useLanguage();
  const today = todayJst();
  const [cursor, setCursor] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }));
  const [viewing, setViewing] = useState<OshiPhoto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<OshiPhoto | null>(null);
  const del = useDeleteOshiPhoto();

  // その日の写真（新しい順の先頭を代表にする）
  const byDate = useMemo(() => {
    const map = new Map<string, OshiPhoto[]>();
    for (const p of photos) {
      const list = map.get(p.taken_on) ?? [];
      list.push(p);
      map.set(p.taken_on, list);
    }
    return map;
  }, [photos]);

  const daysInMonth = new Date(cursor.y, cursor.m, 0).getDate();
  const firstWeekday = new Date(cursor.y, cursor.m - 1, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const isCurrentMonth = cursor.y === Number(today.slice(0, 4)) && cursor.m === Number(today.slice(5, 7));
  const weekdays = language === "en" ? ["S", "M", "T", "W", "T", "F", "S"] : ["日", "月", "火", "水", "木", "金", "土"];

  const move = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.y, c.m - 1 + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    });
  };

  const share = async (photo: OshiPhoto) => {
    const text = t("engage.oshi.shareText");
    try {
      if (navigator.share) {
        await navigator.share({ text, url: photo.image_url });
      } else {
        await navigator.clipboard.writeText(`${text} ${photo.image_url}`);
        toast.success(t("engage.oshi.copied"));
      }
    } catch {
      // キャンセルは何もしない
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await del.mutateAsync(confirmDelete);
      toast.success(t("engage.oshi.deleted"));
      setViewing(null);
    } catch (e) {
      console.error("delete oshi photo failed:", e);
      toast.error(t("engage.oshi.careFailed"));
    } finally {
      setConfirmDelete(null);
    }
  };

  const monthPrefix = `${cursor.y}-${pad(cursor.m)}`;
  const monthCount = photos.filter((p) => p.taken_on.startsWith(monthPrefix)).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Button type="button" variant="ghost" size="icon" aria-label={t("engage.oshi.prevMonth")} onClick={() => move(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <p className="text-sm font-semibold tabular-nums">
          {t("engage.oshi.monthLabel", { y: cursor.y, m: language === "en" ? pad(cursor.m) : cursor.m })}
          <span className="ml-2 text-xs font-normal text-muted-foreground">{t("engage.oshi.total", { n: monthCount })}</span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("engage.oshi.nextMonth")}
          disabled={isCurrentMonth}
          onClick={() => move(1)}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground" aria-hidden="true">
        {weekdays.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <span key={`b${i}`} />;
          const date = `${monthPrefix}-${pad(day)}`;
          const list = byDate.get(date);
          const photo = list?.[0];
          const isToday = date === today;
          return photo ? (
            <button
              key={date}
              type="button"
              onClick={() => setViewing(photo)}
              aria-label={t("engage.oshi.photoOf", { date })}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                isToday && "ring-2 ring-primary"
              )}
            >
              <LazyImage src={photo.image_url} alt="" className="h-full w-full object-cover" />
              <span className="absolute left-0.5 top-0.5 rounded bg-black/50 px-1 text-[9px] tabular-nums text-white">{day}</span>
              {list && list.length > 1 && (
                <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[9px] tabular-nums text-white">
                  {list.length}
                </span>
              )}
            </button>
          ) : (
            <span
              key={date}
              className={cn(
                "flex aspect-square items-start justify-start rounded-lg bg-muted/40 p-1 text-[10px] tabular-nums text-muted-foreground",
                isToday && "ring-2 ring-primary/60"
              )}
            >
              {day}
            </span>
          );
        })}
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{t("engage.oshi.photoOf", { date: viewing.taken_on })}</DialogTitle>
                <DialogDescription>{viewing.caption ?? ""}</DialogDescription>
              </DialogHeader>
              {/* 同じ日の他の写真も見られるよう、その日の分を縦に並べる */}
              <div className="space-y-3">
                {(byDate.get(viewing.taken_on) ?? [viewing]).map((p) => (
                  <div key={p.id} className="space-y-2">
                    <img src={p.image_url} alt={p.caption ?? ""} className="w-full rounded-2xl object-cover" />
                    {p.caption && p.id !== viewing.id && <p className="text-xs text-muted-foreground">{p.caption}</p>}
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" className="flex-1 gap-1" onClick={() => share(p)}>
                        <Share2 className="h-4 w-4" />
                        {t("engage.oshi.share")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1 text-destructive hover:text-destructive"
                        onClick={() => setConfirmDelete(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("engage.oshi.delete")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("engage.oshi.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("engage.oshi.close")}</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>{t("engage.oshi.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
