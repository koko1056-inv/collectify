import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { useState } from "react";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileBio } from "@/components/profile/ProfileBio";
import { ProfileCollection } from "@/components/profile/ProfileCollection";

const UserProfile = () => {
  const { userId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: profile } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, bio")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: userItems = [], isLoading } = useQuery({
    queryKey: ["user-items", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select(`
          *,
          user_item_tags (
            tags (
              id,
              name
            )
          )
        `)
        .eq("user_id", userId)
        .eq("is_shared", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredItems = userItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => 
        item.user_item_tags?.some(itemTag => itemTag.tags?.name === tag)
      );
    return matchesSearch && matchesTags;
  });

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8 pt-24">
          <p className="text-center text-gray-500">ユーザーが見つかりません</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="space-y-8">
          <div className="space-y-4">
            {userId && <ProfileHeader username={profile.username} userId={userId} />}
            <ProfileBio bio={profile.bio} />
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">共有アイテム</h2>
            <ProfileCollection
              isLoading={isLoading}
              items={filteredItems}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              tags={tags}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;