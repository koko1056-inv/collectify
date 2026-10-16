import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePreorders, type Preorder } from "@/hooks/usePreorders";
import { formatYen as yen, lineTotal } from "@/utils/preorders";
import { shortGoodsTitle } from "@/utils/goodsTitle";

/** 「届いた」を押したとき（コレクションに入れる・上限ならポイントショップへ）。一覧とお知らせの両方で使う */
export function useReceivePreorder() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const pre = usePreorders();
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (p: Preorder) => {
    setBusyId(p.id);
    try {
      const res = await pre.receive(p);
      if (res.ok) {
        toast.success(
          res.quantity != null ? t("preorders.list.receivedIncrement", { count: res.quantity }) : t("preorders.list.receivedToast"),
          { description: p.price != null ? `${shortGoodsTitle(p.title, p.contentName)} ・ ${yen(lineTotal(p))}` : shortGoodsTitle(p.title, p.contentName) }
        );
      } else if (res.atLimit) {
        toast.error(t("collectionScreen.addFlow.limitTitle"), {
          description: res.maxSlots
            ? t("collectionScreen.addFlow.limitDescWithMax", { max: res.maxSlots })
            : t("collectionScreen.addFlow.limitDesc"),
        });
        navigate("/point-shop");
      } else {
        toast.error(t("preorders.list.receiveFailed"));
      }
    } catch (e) {
      console.error("[useReceivePreorder] failed:", e);
      toast.error(t("preorders.list.receiveFailed"));
    } finally {
      setBusyId(null);
    }
  };

  return { run, busyId };
}
