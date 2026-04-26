import { useEffect, useState, ReactNode, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { cn } from '@/lib/utils';

interface ProgressiveTooltipProps {
  id: 'search' | 'collection' | 'wishlist' | 'post';
  title: string;
  description: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  showOnce?: boolean; // 最初の要素だけに表示
}

// グローバルに表示中のツールチップを追跡
const activeTooltips = new Set<string>();

export function ProgressiveTooltip({
  id,
  title,
  description,
  children,
  position = 'bottom',
  delay = 500,
  showOnce = true,
}: ProgressiveTooltipProps) {
  const { shouldShowTooltip, markTooltipShown } = useOnboarding();
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const instanceId = useRef(`${id}-${Math.random()}`);

  useEffect(() => {
    if (shouldShowTooltip(id)) {
      // showOnceがtrueの場合、すでに表示されているツールチップがあれば表示しない
      if (showOnce && activeTooltips.has(id)) {
        return;
      }

      const timer = setTimeout(() => {
        setIsVisible(true);
        if (showOnce) {
          activeTooltips.add(id);
        }
      }, delay);

      return () => {
        clearTimeout(timer);
        if (showOnce) {
          activeTooltips.delete(id);
        }
      };
    }
  }, [id, delay, shouldShowTooltip, showOnce]);

  const handleDismiss = () => {
    setIsVisible(false);
    markTooltipShown(id);
    if (showOnce) {
      activeTooltips.delete(id);
    }
  };

  if (!isVisible) {
    return <div ref={elementRef} className="w-full">{children}</div>;
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-primary',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-primary',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-primary',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-primary',
  };

  return (
    <div className="relative inline-block" ref={elementRef}>
      {children}
      <div
        className={cn(
          'fixed sm:absolute z-[9999] w-[calc(100vw-2rem)] max-w-[320px] sm:w-80 sm:max-w-none',
          'left-1/2 -translate-x-1/2',
          position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          'sm:left-auto sm:translate-x-0',
          positionClasses[position].replace('left-1/2 -translate-x-1/2', '')
        )}
        style={{
          position: window.innerWidth < 640 ? 'fixed' : 'absolute',
          left: window.innerWidth < 640 ? '50%' : undefined,
          transform: window.innerWidth < 640 ? 'translateX(-50%)' : undefined,
        }}
      >
        <div className="bg-primary text-primary-foreground rounded-lg shadow-xl p-4 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm">{title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-5 w-5 p-0 text-primary-foreground hover:bg-primary-foreground/20 flex-shrink-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-xs text-primary-foreground/90 leading-relaxed">{description}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleDismiss}
            className="w-full mt-2"
          >
            わかった
          </Button>
        </div>
        <div
          className={cn(
            'hidden sm:block absolute w-0 h-0 border-8',
            arrowClasses[position]
          )}
        />
      </div>
    </div>
  );
}
