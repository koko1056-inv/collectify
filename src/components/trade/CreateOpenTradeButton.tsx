
import { Button } from "@/components/ui/button";
import { Plus, Repeat } from "lucide-react";
import { useState } from "react";
import { TradeRequestModal } from "./TradeRequestModal";

interface CreateOpenTradeButtonProps {
  onTradeCreated?: () => void;
}

export function CreateOpenTradeButton({ onTradeCreated }: CreateOpenTradeButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        className="w-full mb-4 bg-purple-600 hover:bg-purple-700 text-white"
      >
        <Plus className="mr-2 h-4 w-4" />
        トレードに出す
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
