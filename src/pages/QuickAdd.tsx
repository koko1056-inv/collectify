import { useNavigate } from "react-router-dom";
import { PenLine } from "lucide-react";
import { QuickAddFlow } from "@/components/add-item/QuickAddFlow";
import { BackButton } from "@/components/navigation/BackButton";
import { SlotUsageMeter } from "@/components/shop/SlotUsageMeter";
import { useLanguage } from "@/contexts/LanguageContext";

export default function QuickAdd() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // 認証チェックは App.tsx の ProtectedRoute が担当するのでここでは行わない。

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 pt-2 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-8">
        {/* 直リンクで開かれた場合は戻る履歴が無いのでコレクションへ逃がす */}
        <BackButton className="-ml-2" fallbackTo="/collection" />

        {/* 撮る前に上限が近いことが分かるように枠の使用状況を出す */}
        <SlotUsageMeter type="collection" compact className="mt-1 mb-2" />

        {/* onCancel は渡さない。ヘッダの「戻る」と同じ動作のボタンが
            撮影ステップに二重に並ぶため（実画面で確認）。 */}
        <QuickAddFlow onComplete={() => navigate("/collection")} />

        {/* AI が読み取れなかったときの逃げ道 */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            {t("chrome.quickAdd.manualHint")}
          </p>
          <button
            type="button"
            onClick={() => navigate("/add-item")}
            className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
          >
            <PenLine className="h-3.5 w-3.5" />
            {t("chrome.quickAdd.manualCta")}
          </button>
        </div>
      </div>
    </div>
  );
}
