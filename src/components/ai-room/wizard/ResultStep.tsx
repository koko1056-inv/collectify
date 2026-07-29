import { Sparkles, Share2, Download, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AiGeneratedRoom } from "@/hooks/ai-room/useAiRooms";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  room: AiGeneratedRoom;
  onShare: () => void;
  onDownload: () => void;
  /** 同じ素材・同じスタイルのまま、もう一度生成し直す */
  onRegenerate: () => void;
}

export function ResultStep({ room, onShare, onDownload, onRegenerate }: Props) {
  const { t } = useLanguage();
  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-5 space-y-4"
    >
      <div className="flex items-center gap-2 justify-center mb-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold">{t("aiRoom.result.done")}</h3>
      </div>
      <div className="relative rounded-2xl overflow-hidden border-2 border-border shadow-xl">
        <img src={room.image_url} alt="" className="w-full h-auto" />
      </div>
      {room.title && (
        <p className="text-center font-medium">{room.title}</p>
      )}
      <div className="flex gap-2">
        <Button onClick={onDownload} variant="outline" className="flex-1 gap-2">
          <Download className="w-4 h-4" />
          {t("aiRoom.common.save")}
        </Button>
        <Button onClick={onShare} className="flex-1 gap-2">
          <Share2 className="w-4 h-4" />
          {t("aiRoom.common.share")}
        </Button>
      </div>
      {/* 生成物は毎回変わるので「今のは違ったからもう一度」が一番欲しくなる。
          設定を選び直させずに、同じ条件でやり直せるようにする。 */}
      <Button onClick={onRegenerate} variant="ghost" className="w-full gap-2 text-muted-foreground">
        <RefreshCw className="w-4 h-4" />
        {t("aiRoom.result.regenerate")}
      </Button>
    </motion.div>
  );
}
