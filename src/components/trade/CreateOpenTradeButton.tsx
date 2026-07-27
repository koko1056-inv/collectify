
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { TradeRequestModal } from "./TradeRequestModal";
import { useLanguage } from "@/contexts/LanguageContext";

interface CreateOpenTradeButtonProps {
  onTradeCreated?: () => void;
}

export function CreateOpenTradeButton({ onTradeCreated }: CreateOpenTradeButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useLanguage();

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (onTradeCreated) {
      onTradeCreated();
    }
  };

  return (
    <>
      <Button 
        onClick={handleOpenModal}
        className="w-full mb-4 bg-foreground hover:bg-foreground/90 text-background rounded-xl shadow-md hover:shadow-lg transition-all py-6"
      >
        <div className="flex items-center justify-center gap-2">
          <div className="relative">
            <Plus className="h-5 w-5" />
            <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-background/70" />
          </div>
          <span className="font-medium">{t("trade.list.createNew")}</span>
        </div>
      </Button>

      <TradeRequestModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        requestedItemId=""  // Empty for open trades
        requestedItemTitle=""  // Empty for open trades
        receiverId=""  // Empty for open trades
        initialTab="openTrade"  // Open the modal directly to the open trade tab
      />
    </>
  );
}
