import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Check, Heart } from "lucide-react";

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  isDisabled?: boolean;
}

export function SwipeableCard({
  children,
  onSwipeRight,
  onSwipeLeft,
  isDisabled = false,
}: SwipeableCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const constraintsRef = useRef(null);
  
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 0.8, 1, 0.8, 0.5]);
  
  // インジケーターの表示
  const rightIndicatorOpacity = useTransform(x, [0, 60, 120], [0, 0.5, 1]);
  const leftIndicatorOpacity = useTransform(x, [-120, -60, 0], [1, 0.5, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (isDisabled || isAnimating) return;
    
    const threshold = 100;
    const velocity = info.velocity.x;
    const offset = info.offset.x;
    
    if (offset > threshold || velocity > 500) {
      // 右スワイプ - コレクションに追加
      setIsAnimating(true);
      onSwipeRight?.();
      setTimeout(() => setIsAnimating(false), 300);
    } else if (offset < -threshold || velocity < -500) {
      // 左スワイプ - ウィッシュリスト
      setIsAnimating(true);
      onSwipeLeft?.();
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  return (
    <div ref={constraintsRef} className="relative">
      {/* 右スワイプインジケーター */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
        style={{ opacity: rightIndicatorOpacity }}
      >
        <div className="bg-green-500 text-white p-3 rounded-full shadow-lg">
          <Check className="w-6 h-6" />
        </div>
      </motion.div>
      
      {/* 左スワイプインジケーター */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
        style={{ opacity: leftIndicatorOpacity }}
      >
        <div className="bg-pink-500 text-white p-3 rounded-full shadow-lg">
          <Heart className="w-6 h-6" />
        </div>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        style={{ x, rotate, opacity }}
        whileTap={{ cursor: "grabbing" }}
        className="touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
