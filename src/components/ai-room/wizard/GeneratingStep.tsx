import { Sparkles, Wand2 } from "lucide-react";
import { motion } from "framer-motion";

export function GeneratingStep() {
  return (
    <motion.div
      key="generating"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-10 flex flex-col items-center justify-center min-h-[400px] space-y-5"
    >
      <div className="relative">
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 15, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-2xl"
        >
          <Wand2 className="w-10 h-10 text-primary-foreground" />
        </motion.div>
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${50 + Math.cos((i / 5) * Math.PI * 2) * 60}%`,
              top: `${50 + Math.sin((i / 5) * Math.PI * 2) * 60}%`,
            }}
            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0], rotate: [0, 180, 360] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
          </motion.div>
        ))}
      </div>
      <div className="text-center space-y-1">
        <p className="font-semibold text-base">AIが部屋を描いています...</p>
        <p className="text-xs text-muted-foreground">
          30〜60秒ほどかかります。お楽しみに！
        </p>
      </div>
    </motion.div>
  );
}
