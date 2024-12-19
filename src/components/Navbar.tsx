import { Button } from "@/components/ui/button";
import { Heart, User } from "lucide-react";
import { Link } from "react-router-dom";

export function Navbar() {
  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary">
          AnimeCollect
        </Link>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Heart className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
          <Link to="/login">
            <Button variant="default">
              ログイン
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}