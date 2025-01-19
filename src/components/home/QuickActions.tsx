import { Button } from "@/components/ui/button";
import { Plus, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <section className="animate-fade-in">
      <div className="flex gap-4 justify-center sm:justify-start">
        <Button
          onClick={() => navigate("/add-item")}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          アイテムを追加
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/feed")}
          className="flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          トレンド
        </Button>
      </div>
    </section>
  );
}