import { Sparkles, Share2, Download } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AiGeneratedRoom } from "@/hooks/ai-room/useAiRooms";

interface Props {
  room: AiGeneratedRoom;
  onShare: () => void;
  onDownload: () => void;
}

export function ResultStep({ room, onShare, onDownload }: Props) {
  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-5 space-y-4"
    >
      <div className="flex items-center gap-2 justify-center mb-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold">完成！</h3>
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
          保存
        </Button>
        <Button onClick={onShare} className="flex-1 gap-2">
          <Share2 className="w-4 h-4" />
          シェア
        </Button>
      </div>
    </motion.div>
  );
}
