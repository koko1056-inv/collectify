
import { Button } from "@/components/ui/button";
import { Share2, BookOpen } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface RandomItemActionButtonsProps {
  onRandom: () => void;
  onShare?: () => void;
  onMemories?: () => void;
  onClose: () => void;
  isLoading: boolean;
  isSpinning: boolean;
  hasItem: boolean;
  isMobile: boolean;
}

export function RandomItemActionButtons({
  onRandom,
  onShare,
  onMemories,
  onClose,
  isLoading,
  isSpinning,
  hasItem,
  isMobile
}: RandomItemActionButtonsProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap justify-between gap-4">
      <div className="flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          onClick={onRandom}
          disabled={isLoading}
          className={isSpinning ? "animate-pulse" : ""}
        >
          {t("collectionScreen.random.draw")}
        </Button>
        {hasItem && (
          <>
            <Button
              variant="outline"
              onClick={onShare}
              disabled={isLoading}
              size={isMobile ? "sm" : "default"}
            >
              <Share2 className="h-4 w-4 mr-1" />
              {t("collectionScreen.random.share")}
            </Button>
            <Button
              variant="outline"
              onClick={onMemories}
              disabled={isLoading}
              size={isMobile ? "sm" : "default"}
            >
              <BookOpen className="h-4 w-4 mr-1" />
              {t("collectionScreen.random.memories")}
            </Button>
          </>
        )}
      </div>
      <Button onClick={onClose}>{t("collectionScreen.common.close")}</Button>
    </div>
  );
}
