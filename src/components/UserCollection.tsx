import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CollectionGoodsCard } from "./CollectionGoodsCard";
import { Skeleton } from "./ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useState } from "react";

export function UserCollection() {
  const { user } = useAuth();
  const [selectedArtist, setSelectedArtist] = useState<string>("all");
  const [selectedAnime, setSelectedAnime] = useState<string>("all");

  const { data: userItems = [], isLoading } = useQuery({
    queryKey: ["user-items", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Extract unique artists and anime from user items
  const artists = Array.from(new Set(userItems.map(item => item.artist).filter(Boolean)));
  const animes = Array.from(new Set(userItems.map(item => item.anime).filter(Boolean)));

  // Filter items based on selected artist and anime
  const filteredItems = userItems.filter(item => {
    const matchesArtist = selectedArtist === "all" || item.artist === selectedArtist;
    const matchesAnime = selectedAnime === "all" || item.anime === selectedAnime;
    return matchesArtist && matchesAnime;
  });

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">コレクションを表示するにはログインしてください。</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (userItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">まだコレクションに追加されたアイテムがありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <div className="w-48">
          <Select value={selectedArtist} onValueChange={setSelectedArtist}>
            <SelectTrigger>
              <SelectValue placeholder="アーティストで絞り込み" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {artists.map((artist) => (
                <SelectItem key={artist} value={artist}>
                  {artist}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={selectedAnime} onValueChange={setSelectedAnime}>
            <SelectTrigger>
              <SelectValue placeholder="アニメで絞り込み" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {animes.map((anime) => (
                <SelectItem key={anime} value={anime}>
                  {anime}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map((item) => (
          <CollectionGoodsCard
            key={item.id}
            id={item.id}
            title={item.title}
            image={item.image}
          />
        ))}
      </div>
    </div>
  );
}