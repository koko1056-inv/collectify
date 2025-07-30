
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "overlay" | "inline";
  message?: string;
}

export function Loading({ 
  className, 
  size = "md",
  variant = "default",
  message
}: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  const variantClasses = {
    default: "flex items-center justify-center min-h-[200px]",
    overlay: "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
    inline: "flex items-center justify-center p-4"
  };

  return (
    <div className={cn(variantClasses[variant])}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Loader2 className={cn(
            "animate-spin text-primary",
            sizeClasses[size],
            className
          )} />
          <div className={cn(
            "absolute inset-0 rounded-full border-2 border-primary/20",
            sizeClasses[size]
          )} />
        </div>
        {message && (
          <p className="text-sm text-muted-foreground animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
