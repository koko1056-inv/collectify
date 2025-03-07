
import { Input } from "./input";
import { ImageSearch } from "@/components/image-search/ImageSearch";
import { cn } from "@/lib/utils";

interface InputImageSearchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function InputImageSearch({ className, ...props }: InputImageSearchProps) {
  return (
    <div className="relative">
      <Input className={cn("pr-10", className)} {...props} />
      <div className="absolute inset-y-0 right-0 flex items-center">
        <ImageSearch />
      </div>
    </div>
  );
}
