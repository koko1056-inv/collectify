import { useId, useState } from "react";
import { Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { goodsVisibilityKey, invalidateGoodsPeople, useGoodsVisibility } from "./useGoodsSocial";

/**
 * 設定の「グッズのページに自分を表示する」（profiles.show_on_goods_pages）。
 * オフにすると、グッズのページの「持ってる人・ほしい人」「交換できるかも」に出なくなる（人数には名前なしで入る）。
 * 列がまだ無い環境（マイグレーション前）では何も出さない。
 */
export function GoodsVisibilitySetting() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: value } = useGoodsVisibility();
  const [saving, setSaving] = useState(false);
  const id = useId();

  if (!user || value === null || value === undefined) return null;

  const onChange = async (next: boolean) => {
    setSaving(true);
    // すぐに切り替わって見えるように先に書き、失敗したら戻す
    queryClient.setQueryData(goodsVisibilityKey(user.id), next);
    const { error } = await supabase.from("profiles").update({ show_on_goods_pages: next }).eq("id", user.id);
    setSaving(false);
    if (error) {
      queryClient.setQueryData(goodsVisibilityKey(user.id), !next);
      toast.error(t("goodsSocial.settings.saveFailed"));
      return;
    }
    toast.success(t("goodsSocial.settings.saved"));
    void invalidateGoodsPeople(queryClient);
  };

  // 見出しもここで出す（設定が出せない環境で、見出しだけが残らないように）。見た目は設定画面の SectionHeading と同じ
  return (
    <>
      <h3 className="-mb-3 px-1 text-xs font-bold text-muted-foreground">{t("goodsSocial.settings.section")}</h3>
      <section className="bg-card rounded-2xl border border-border" data-testid="goods-visibility-setting">
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="mt-0.5 text-muted-foreground" aria-hidden="true">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor={id} className="block text-sm font-medium">
              {t("goodsSocial.settings.showOnGoods")}
            </label>
            <p id={`${id}-desc`} className="mt-0.5 text-2xs text-muted-foreground">
              {t("goodsSocial.settings.showOnGoodsDesc")}
            </p>
          </div>
          <Switch
            id={id}
            checked={value}
            disabled={saving}
            onCheckedChange={onChange}
            aria-describedby={`${id}-desc`}
            className="mt-0.5 shrink-0"
          />
        </div>
      </section>
    </>
  );
}
