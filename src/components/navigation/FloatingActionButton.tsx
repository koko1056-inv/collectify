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

  // メインアクション = グッズ追加。AI生成はサブメニュー。
  const actions = [
    {
      icon: Camera,
      label: "写真でグッズ追加",
      onClick: () => navigate("/image-search"),
      gradient: "from-sky-500 to-blue-500",
      description: "撮るだけで自動登録",
    },
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
  ];

  const handleMainClick = () => {
    // メイン: グッズ追加ページへ。長押し/2タップではなくシンプルに直行。
    navigate("/add-item");
  };

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

      {/* サブアクション */}
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

      {/* メインFAB: タップ=グッズ追加, 「…」マーク部分でメニューを開く */}
      <div className="relative">
        <motion.button
          onClick={handleMainClick}
          className={cn(
            "h-14 w-14 rounded-full flex items-center justify-center shadow-lg z-50 relative",
            "bg-primary text-primary-foreground",
            "hover:shadow-xl transition-all"
          )}
          whileTap={{ scale: 0.95 }}
          aria-label="グッズを追加"
        >
          <Plus className="h-7 w-7" />
        </motion.button>
        {/* サブメニュー切替 (右上の小さなSparklesボタン) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          aria-label="その他のアクション"
          className={cn(
            "absolute -top-1 -right-1 h-7 w-7 rounded-full z-[51] flex items-center justify-center shadow-md transition-transform",
            "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-primary-foreground",
            isOpen && "rotate-45"
          )}
        >
          {isOpen ? <X className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
