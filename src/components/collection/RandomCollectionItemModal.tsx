
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ShareModal } from "@/components/ShareModal";
import { useNavigate } from "react-router-dom";
import { ItemMemoriesModal } from "@/components/ItemMemoriesModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { RandomItemContent } from "./random-item/RandomItemContent";
import { RandomItemActionButtons } from "./random-item/RandomItemActionButtons";
import { useRandomItem } from "./random-item/useRandomItem";

interface RandomCollectionItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
}

export function RandomCollectionItemModal({
  isOpen,
  onClose,
  userId,
}: RandomCollectionItemModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);
  const effectiveUserId = userId || user?.id;
  
  const { randomItem, isLoading, isSpinning, fetchRandomItem } = useRandomItem(
    effectiveUserId,
    isOpen
  );

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleOpenMemories = () => {
    setIsMemoriesModalOpen(true);
  };

  const handleImageClick = () => {
    if (randomItem && effectiveUserId) {
      onClose();
      navigate(`/user/${effectiveUserId}?itemId=${randomItem.id}`);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="relative z-10 bg-white/80 backdrop-blur-sm py-2 rounded-t-md">
            <DialogTitle className="text-center text-primary font-bold">今日のラッキーコレクション</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <RandomItemContent 
              randomItem={randomItem}
              isLoading={isLoading}
              isSpinning={isSpinning}
              onImageClick={handleImageClick}
            />
          </div>
          
          <RandomItemActionButtons 
            onRandom={fetchRandomItem}
            onShare={handleShare}
            onMemories={handleOpenMemories}
            onClose={onClose}
            isLoading={isLoading}
            isSpinning={isSpinning}
            hasItem={!!randomItem}
            isMobile={isMobile}
          />
        </DialogContent>
      </Dialog>
      
      {randomItem && (
        <>
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            title={`コレクション: ${randomItem.title}`}
            url={window.location.href}
            image={randomItem.image}
          />
          <ItemMemoriesModal
            isOpen={isMemoriesModalOpen}
            onClose={() => setIsMemoriesModalOpen(false)}
            itemIds={[randomItem.id]}
            itemTitles={[randomItem.title]}
            userId={effectiveUserId}
          />
        </>
      )}
    </>
  );
}
