import { useState } from "react";
import { Plus, Camera, FolderOpen, FileText, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FloatingActionButtonProps {
  className?: string;
}

export function FloatingActionButton({ className }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    {
      icon: Camera,
      label: "グッズ追加",
      onClick: () => navigate("/add-item"),
      color: "bg-pink-500",
    },
    {
      icon: FileText,
      label: "投稿作成",
      onClick: () => navigate("/posts"),
      color: "bg-purple-500",
    },
    {
      icon: FolderOpen,
      label: "コレクション",
      onClick: () => navigate("/collection"),
      color: "bg-blue-500",
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
            className="fixed inset-0 bg-black/40 z-40"
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
                  "flex items-center gap-3 px-4 py-3 rounded-full shadow-lg text-white",
                  action.color
                )}
              >
                <action.icon className="h-5 w-5" />
                <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
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
          "bg-gradient-to-br from-pink-500 to-purple-600",
          "hover:from-pink-600 hover:to-purple-700 transition-all"
        )}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Plus className="h-6 w-6 text-white" />
        )}
      </motion.button>
    </div>
  );
}
