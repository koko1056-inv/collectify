import { useEffect, useState } from "react";
import { Loader2, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { formatYen, parseYen } from "@/utils/preorders";

export interface PurchaseRecord {
  purchase_date: string | null;
  purchase_price: string | null;
  purchase_shop?: string | null;
}

/**
 * 自分のグッズの「買ったときの記録」（買った日・1個の値段・お店）。どれも任意。
 * 値段を入れたものは「推し活費」（/spending）に入る。
 * 以前は買った日だけ入れられ、値段の列（purchase_price）はあっても入れる画面が無かった。
 */
export function PurchaseRecordSection({ itemId, record }: { itemId: string; record: PurchaseRecord | null | undefined }) {
  const { t } = useLanguage();
  const { formatDate } = useDateFormat();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState("");
  const [price, setPrice] = useState("");
  const [shop, setShop] = useState("");

  useEffect(() => {
    if (editing) return;
    setDate(record?.purchase_date ?? "");
    const n = parseYen(record?.purchase_price);
    setPrice(n != null ? String(n) : "");
    setShop(record?.purchase_shop ?? "");
  }, [record, editing]);

  const priceNumber = parseYen(record?.purchase_price);

  const handleSave = async () => {
    setSaving(true);
    try {
      const digits = price.replace(/[^\d]/g, "");
      const { error } = await supabase
        .from("user_items")
        .update({
          purchase_date: date || null,
          purchase_price: digits ? String(Number(digits)) : null,
          purchase_shop: shop.trim().slice(0, 60) || null,
        })
        .eq("id", itemId);
      if (error) throw error;
      toast.success(t("records.purchase.saved"));
      setEditing(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-item-details", itemId] }),
        queryClient.invalidateQueries({ queryKey: ["spending"] }),
      ]);
    } catch (e) {
      console.error("[PurchaseRecordSection] save failed:", e);
      toast.error(t("records.purchase.failed"));
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="space-y-3 rounded-xl border border-border p-3" data-testid="purchase-record-edit">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ReceiptText className="h-4 w-4 text-muted-foreground" />
          {t("records.purchase.title")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor={`pr-date-${itemId}`} className="text-xs">{t("records.purchase.date")}</Label>
            <Input id={`pr-date-${itemId}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`pr-price-${itemId}`} className="text-xs">{t("records.purchase.price")}</Label>
            <Input
              id={`pr-price-${itemId}`}
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, "").slice(0, 7))}
              placeholder={t("records.purchase.pricePlaceholder")}
              className="h-9"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`pr-shop-${itemId}`} className="text-xs">{t("records.purchase.shop")}</Label>
          <Input
            id={`pr-shop-${itemId}`}
            value={shop}
            maxLength={60}
            onChange={(e) => setShop(e.target.value)}
            placeholder={t("records.purchase.shopPlaceholder")}
            className="h-9"
          />
        </div>
        <p className="text-2xs text-muted-foreground">{t("records.purchase.hint")}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
            {t("records.purchase.cancel")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            {t("records.purchase.save")}
          </Button>
        </div>
      </div>
    );
  }

  const rows: { label: string; value: string | null }[] = [
    { label: t("records.purchase.date"), value: record?.purchase_date ? formatDate(record.purchase_date) : null },
    { label: t("records.purchase.price"), value: priceNumber != null ? formatYen(priceNumber) : null },
    { label: t("records.purchase.shop"), value: record?.purchase_shop || null },
  ];

  return (
    <div className="rounded-xl border border-border p-3" data-testid="purchase-record">
      <div className="mb-1.5 flex items-center gap-2">
        <ReceiptText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{t("records.purchase.title")}</span>
        <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => setEditing(true)}>
          {t("records.purchase.edit")}
        </Button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className={r.value ? "font-medium tabular-nums" : "text-muted-foreground"}>{r.value ?? t("records.purchase.notSet")}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
