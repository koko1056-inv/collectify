import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  className?: string;
}

export function BackButton({ className }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      className={className}
      onClick={() => navigate(-1)}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      戻る
    </Button>
  );
}