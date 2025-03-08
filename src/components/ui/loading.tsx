
import { Loader2 } from "lucide-react";

interface LoadingProps {
  className?: string;
}

export function Loading({ className = "h-8 w-8" }: LoadingProps) {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className={`animate-spin text-primary ${className}`} />
    </div>
  );
}
