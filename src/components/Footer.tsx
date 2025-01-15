import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, UserSearch } from "lucide-react";
import { useState } from "react";
import { UserSearchModal } from "./UserSearchModal";

export function Footer() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  return (
    <footer className="fixed bottom-0 left-0 right-0 sm:hidden">
      <div className="bg-white border-t px-4 py-2">
        <div className="flex items-center justify-center -mt-3">
          <Link to="/">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full border-2 bg-white shadow-lg"
            >
              <Home className="h-6 w-6" />
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-center mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setIsSearchModalOpen(true)}
          >
            <UserSearch className="h-4 w-4 mr-1" />
            フレンドを探す
          </Button>
        </div>
      </div>
      <UserSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </footer>
  );
}