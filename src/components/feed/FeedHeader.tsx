import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function FeedHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link to="/" className="mr-4 flex items-center space-x-2">
          <span className="font-righteous text-xl">Collectify</span>
        </Link>

        <span className="font-medium">フィード</span>

        <div className="ml-auto flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            asChild
          >
            <Link to="/add-item">
              <Plus className="h-4 w-4" />
              <span className="sr-only">新規投稿</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}