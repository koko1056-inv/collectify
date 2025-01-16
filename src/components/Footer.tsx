import { Home, BookMarked, PlusCircle, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MemoriesListModal } from "./memories/MemoriesListModal";

export function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 sm:hidden">
      <div className="flex justify-around items-center">
        <button
          onClick={() => navigate("/")}
          className="flex items-center justify-center w-12 h-12"
        >
          <Home
            className={`h-6 w-6 ${
              location.pathname === "/" ? "text-purple-500" : "text-gray-500"
            }`}
          />
        </button>

        <button
          onClick={() => setIsMemoriesModalOpen(true)}
          className="flex items-center justify-center w-12 h-12"
        >
          <BookMarked className="h-6 w-6 text-gray-500" />
        </button>

        <button
          onClick={() => navigate("/add-item")}
          className="flex items-center justify-center w-12 h-12"
        >
          <PlusCircle className="h-6 w-6 text-gray-500" />
        </button>

        <button
          onClick={() => navigate(user ? `/user/${user.id}` : "/login")}
          className="flex items-center justify-center w-12 h-12"
        >
          <User
            className={`h-6 w-6 ${
              location.pathname === `/user/${user?.id}` ? "text-purple-500" : "text-gray-500"
            }`}
          />
        </button>
      </div>

      <MemoriesListModal
        isOpen={isMemoriesModalOpen}
        onClose={() => setIsMemoriesModalOpen(false)}
      />
    </footer>
  );
}