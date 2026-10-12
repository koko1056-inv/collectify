
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { ShareModal } from "@/components/ShareModal";
import { useNavigate } from "react-router-dom";
import { CreateItemPostModal } from "@/components/item-posts/CreateItemPostModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { RandomItemContent } from "./random-item/RandomItemContent";
import { RandomItemActionButtons } from "./random-item/RandomItemActionButtons";
import { useRandomItem } from "./random-item/useRandomItem";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const effectiveUserId = userId || user?.id;
  // 投稿は自分のグッズにだけ書ける。他の人のコレクションの「今日のグッズ」では出さない
  const isOwnCollection = !!user?.id && effectiveUserId === user.id;
  const { t } = useLanguage();

  const { randomItem, isLoading, isSpinning, fetchRandomItem } = useRandomItem(
    effectiveUserId,
    isOpen
  );

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleOpenPost = () => {
    setIsPostModalOpen(true);
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
          <DialogHeader className="relative z-10 bg-background/80 backdrop-blur-sm py-2 rounded-t-md">
            <DialogTitle className="text-center text-primary font-bold">{t("collectionScreen.random.title")}</DialogTitle>
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
            onPost={isOwnCollection ? handleOpenPost : undefined}
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
            title={`${t("collectionScreen.random.sharePrefix")}${randomItem.title}`}
            url={window.location.href}
            image={randomItem.image}
          />
          {isOwnCollection && (
            <CreateItemPostModal
              open={isPostModalOpen}
              onOpenChange={setIsPostModalOpen}
              target={{ type: "user_item", id: randomItem.id }}
              itemTitle={randomItem.title}
              itemImage={randomItem.image}
            />
          )}
        </>
      )}
    </>
  );
}
