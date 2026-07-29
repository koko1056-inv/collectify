import { useEffect, useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

/** 目安の所要時間（秒）。これを超えたら文言を変えて「止まっていない」ことを伝える。 */
const EXPECTED_SECONDS = 60;

export function GeneratingStep() {
  const { t } = useLanguage();
  const [elapsed, setElapsed] = useState(0);

  // 完了時刻が読めない処理で偽の進捗バーを出すと、途中で止まって見えて
  // 「壊れた」と思われる。実際に分かる情報（経過秒数）だけを見せる。
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const overdue = elapsed > EXPECTED_SECONDS;

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
        <p className="font-semibold text-base">{t("aiRoom.generating.title")}</p>
        <p className="text-xs text-muted-foreground">
          {overdue ? t("aiRoom.generating.stillWorking") : t("aiRoom.generating.subtitle")}
        </p>
        <p className="text-xs tabular-nums text-muted-foreground/80">
          {t("aiRoom.generating.elapsed", { s: elapsed })}
        </p>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {t("aiRoom.generating.keepOpen")}
      </p>
    </motion.div>
  );
}
