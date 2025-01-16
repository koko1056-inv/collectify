import { Home, BookMarked, PlusCircle, User, UserSearch } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MemoriesListModal } from "./memories/MemoriesListModal";
import { UserSearchModal } from "./UserSearchModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const { data: memories = [] } = useQuery({
    queryKey: ["memories", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("item_memories")
        .select(`
          *,
          user_items (
            title,
            image
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching memories:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id,
  });

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4">
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
          onClick={() => setIsSearchModalOpen(true)}
          className="flex items-center justify-center w-12 h-12"
        >
          <UserSearch className="h-6 w-6 text-gray-500" />
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
        memories={memories}
      />

      <UserSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </footer>
  );
}