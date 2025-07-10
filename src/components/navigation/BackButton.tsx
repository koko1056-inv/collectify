
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface BackButtonProps {
  className?: string;
  to?: string; // 特定のルートに戻るためのオプショナルプロパティ
}

export function BackButton({ className, to }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (to) {
      // 特定のルートが指定されている場合はそこに移動
      navigate(to);
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
      戻る
    </Button>
  );
}
