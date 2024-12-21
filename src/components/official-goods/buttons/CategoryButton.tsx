import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface CategoryButtonProps {
  itemId: string;
  itemTitle: string;
  onAnimeSelect?: (anime: string | null) => void;
  onArtistSelect?: (artist: string | null) => void;
}

export function CategoryButton({ 
  itemId, 
  itemTitle,
  onAnimeSelect,
  onArtistSelect
}: CategoryButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleClick = () => {
    if (onAnimeSelect) {
      onAnimeSelect(null);
    }
    if (onArtistSelect) {
      onArtistSelect(null);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="icon"
      onClick={handleClick}
      className="border-gray-200 hover:bg-gray-50"
    >
      <Edit2 className="h-4 w-4" />
    </Button>
  );
}