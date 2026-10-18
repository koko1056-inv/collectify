import { useEffect, useState } from "react";
import { CalendarCheck, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePreorders } from "@/hooks/usePreorders";
import { parseYen } from "@/utils/preorders";
import { cn } from "@/lib/utils";
import { pockeCheer } from "@/components/pocke/pockeCheer";

export interface PreorderTarget {
  officialItemId: string;
  title: string;
  releaseDate?: string | null;
  /** カタログの値段の表記。値段の欄の最初の値に使う */
  catalogPrice?: string | null;
}

/** よく使うお店。押すと「買ったお店」に入る（自由に書き換えられる） */
const SHOP_SUGGESTIONS = ["アニメイト", "公式通販", "あみあみ", "楽天ブックス", "Amazon"];

/**
 * グッズ詳細の「予約した」ボタン。押すと値段・お店・個数（どれも任意）を聞いて「予約中」に入れる。
 * すでに予約中なら「予約中」と出し、押すと内容の直し・予約をやめるができる。
 */
export function PreorderButton({ target, className }: { target: PreorderTarget; className?: string }) {
  const { t } = useLanguage();
  const pre = usePreorders();
  const [open, setOpen] = useState(false);
  const existing = pre.get(target.officialItemId);

  const onClick = () => {
    if (!pre.canUse) {
      toast.error(t("preorders.button.loginRequired"));
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant={existing ? "secondary" : "outline"}
        onClick={onClick}
        className={cn("gap-1.5", className)}
        data-testid="preorder-button"
        aria-pressed={!!existing}
      >
        <CalendarCheck className={cn("h-4 w-4", existing && "text-primary")} />
        {existing ? t("preorders.button.preordered") : t("preorders.button.preorder")}
      </Button>
      {open && <PreorderDialog target={target} onClose={() => setOpen(false)} />}
    </>
  );
}

export function PreorderDialog({ target, onClose }: { target: PreorderTarget; onClose: () => void }) {
  const { t } = useLanguage();
  const pre = usePreorders();
  const existing = pre.get(target.officialItemId);
  const [price, setPrice] = useState<string>(() => {
    const n = existing ? existing.price : parseYen(target.catalogPrice);
    return n != null ? String(n) : "";
  });
  const [shop, setShop] = useState(existing?.shop ?? "");
  const [quantity, setQuantity] = useState(existing?.quantity ?? 1);
  const [busy, setBusy] = useState<"save" | "cancel" | null>(null);

  // 予約中の一覧を読み終える前に開いたときは、読み終えたら入れてあった値にそろえる
  useEffect(() => {
    if (!existing) return;
    setPrice(existing.price != null ? String(existing.price) : "");
    setShop(existing.shop ?? "");
    setQuantity(existing.quantity);
  }, [existing]);

  const priceNumber = price.trim() === "" ? null : Number(price.replace(/[^\d]/g, ""));
  const priceValid = priceNumber == null || (Number.isFinite(priceNumber) && priceNumber >= 0 && priceNumber < 10_000_000);

  const handleSave = async () => {
    if (!priceValid) return;
    setBusy("save");
    try {
      await pre.save({ officialItemId: target.officialItemId, quantity, price: priceNumber, shop: shop.trim() || null });
      // 新規の「予約した」はポッケが伝える。内容の直し（既存の予約を更新）は変化が分かりにくいのでトーストのまま
      if (existing) toast.success(t("preorders.dialog.updated"));
      else pockeCheer("preordered");
      onClose();
    } catch (e) {
      console.error("[PreorderDialog] save failed:", e);
      toast.error(t("preorders.dialog.failed"));
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async () => {
    if (!existing) return;
    setBusy("cancel");
    try {
      await pre.cancel(existing.id);
      toast.success(t("preorders.dialog.cancelled"));
      onClose();
    } catch (e) {
      console.error("[PreorderDialog] cancel failed:", e);
      toast.error(t("preorders.dialog.failed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="preorder-dialog">
        <DialogHeader>
          <DialogTitle>{existing ? t("preorders.dialog.titleEdit") : t("preorders.dialog.titleNew")}</DialogTitle>
          <DialogDescription>{t("preorders.dialog.desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="line-clamp-2 text-sm font-medium">{target.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {target.releaseDate
                ? t("preorders.dialog.releaseOn", { date: target.releaseDate.replace(/-/g, "/") })
                : t("preorders.dialog.releaseUnknown")}
            </p>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="preorder-price">{t("preorders.dialog.price")}</Label>
              <Input
                id="preorder-price"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, "").slice(0, 7))}
                placeholder={t("preorders.dialog.pricePlaceholder")}
                aria-invalid={!priceValid}
              />
            </div>
            <div className="space-y-1.5">
              <Label id="preorder-qty-label">{t("preorders.dialog.quantity")}</Label>
              <div className="flex h-10 items-center gap-1" role="group" aria-labelledby="preorder-qty-label">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label={t("preorders.dialog.decrease")}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-7 text-center text-sm font-bold tabular-nums" aria-live="polite">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  disabled={quantity >= 99}
                  aria-label={t("preorders.dialog.increase")}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preorder-shop">{t("preorders.dialog.shop")}</Label>
            <Input
              id="preorder-shop"
              value={shop}
              maxLength={60}
              onChange={(e) => setShop(e.target.value)}
              placeholder={t("preorders.dialog.shopPlaceholder")}
            />
            <div className="flex flex-wrap gap-1.5">
              {SHOP_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShop(s)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-2xs transition-colors",
                    shop === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {existing ? (
            <Button type="button" variant="ghost" className="text-destructive" onClick={handleCancel} disabled={busy !== null}>
              {busy === "cancel" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {t("preorders.dialog.cancelPreorder")}
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}
          <Button type="button" onClick={handleSave} disabled={busy !== null || !priceValid}>
            {busy === "save" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {existing ? t("preorders.dialog.update") : t("preorders.dialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
