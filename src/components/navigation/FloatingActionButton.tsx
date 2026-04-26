import { useState } from "react";
import { Plus, Camera, X, Sparkles, Home, Shirt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FloatingActionButtonProps {
  className?: string;
}

export function FloatingActionButton({ className }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // AI生成を主役に。グッズ追加は二次アクション。
  const actions = [
    {
      icon: Home,
      label: "AIでルームを作る",
      onClick: () => navigate("/my-room?tab=studio"),
      gradient: "from-violet-500 to-fuchsia-500",
      description: "AIが部屋を生成",
    },
    {
      icon: Shirt,
      label: "AIでアバターを作る",
      onClick: () => navigate("/my-room?tab=avatar"),
      gradient: "from-pink-500 to-rose-500",
      description: "好きな姿に変身",
    },
    {
      icon: Camera,
      label: "グッズを追加",
      onClick: () => navigate("/add-item"),
      gradient: "from-sky-500 to-blue-500",
      description: "素材を増やす",
    },
  ];

  return (
    <div className={cn("relative", className)}>
      {/* バックドロップ */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* アクションボタン群 */}
      <AnimatePresence>
        {isOpen && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col-reverse items-center gap-3 z-50">
            {actions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  action.onClick();
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-full shadow-lg text-primary-foreground bg-gradient-to-r",
                  action.gradient
                )}
              >
                <action.icon className="h-5 w-5" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
                  <span className="text-xs opacity-80">{action.description}</span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* メインFAB */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-full flex items-center justify-center shadow-lg z-50 relative",
          "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500",
          "hover:shadow-xl transition-all"
        )}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
        aria-label="AIで作る"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-primary-foreground" />
        ) : (
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        )}
      </motion.button>
    </div>
  );
}
