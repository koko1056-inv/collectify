
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface BackButtonProps {
  className?: string;
  to?: string; // 特定のルートに戻るためのオプショナルプロパティ
  /**
   * 履歴が無いとき（直リンクで開かれたとき）だけ移動する先。
   * `to` と違って、履歴があれば通常どおり1つ戻る。
   * 直リンクで navigate(-1) するとアプリ外へ出てしまうのを防ぐ。
   */
  fallbackTo?: string;
}

export function BackButton({ className, to, fallbackTo }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const handleBack = () => {
    if (to) {
      // 特定のルートが指定されている場合はそこに移動
      navigate(to);
    } else if (fallbackTo && location.key === "default") {
      // このルーターでの最初のエントリ＝直リンク。戻る履歴が無いので逃がす。
      navigate(fallbackTo);
    } else if (location.pathname === "/add-item") {
      // add-item画面の場合は検索画面に戻る
      navigate("/search");
    } else {
      // それ以外の場合は履歴を1つ戻る
      navigate(-1);
    }
  };

  return (
    <Button
      variant="ghost"
      className={`px-4 py-2 min-w-fit whitespace-nowrap ${className || ""}`}
      onClick={handleBack}
    >
      <ArrowLeft className="mr-2 h-4 w-4 flex-shrink-0" />
      {t("chrome.common.back")}
    </Button>
  );
}
