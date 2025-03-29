
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ModalHeaderProps {
  onClose: () => void;
  title?: string;
}

export function ModalHeader({ onClose, title = "アイテム詳細" }: ModalHeaderProps) {
  return (
    <div className="flex items-center p-4 border-b relative">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onClose}
        className="mr-2 h-8 w-8"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <h2 className="text-sm font-medium flex-1 text-center">{title}</h2>
      <div className="w-8"></div> {/* スペーサー */}
    </div>
  );
}
