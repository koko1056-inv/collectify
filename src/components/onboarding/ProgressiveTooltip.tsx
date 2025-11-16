import { useEffect, useState, ReactNode } from 'react';
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
}

export function ProgressiveTooltip({
  id,
  title,
  description,
  children,
  position = 'bottom',
  delay = 500,
}: ProgressiveTooltipProps) {
  const { shouldShowTooltip, markTooltipShown } = useOnboarding();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (shouldShowTooltip(id)) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [id, delay, shouldShowTooltip]);

  const handleDismiss = () => {
    setIsVisible(false);
    markTooltipShown(id);
  };

  if (!isVisible) {
    return <>{children}</>;
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
    <div className="relative inline-block">
      {children}
      <div
        className={cn(
          'absolute z-50 w-64 sm:w-80',
          positionClasses[position]
        )}
      >
        <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm">{title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-5 w-5 p-0 text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-xs text-primary-foreground/90">{description}</p>
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
            'absolute w-0 h-0 border-8',
            arrowClasses[position]
          )}
        />
      </div>
    </div>
  );
}
