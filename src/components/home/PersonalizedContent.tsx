import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

interface PersonalizedContentProps {
  userId: string;
}

export function PersonalizedContent({ userId }: PersonalizedContentProps) {
  const { data: personalizedItems = [], isLoading } = useQuery({
    queryKey: ["personalized-items", userId],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("interests")
        .eq("id", userId)
        .single();

      if (!profile?.interests?.length) return [];

      const { data: items } = await supabase
        .from("official_items")
        .select(`
          *,
          item_tags (
            tags (
              name
            )
          )
        `)
        .order("created_at", { ascending: false })
        .limit(6);

      if (!items) return [];

      return items.filter(item =>
        item.item_tags?.some(tag =>
          profile.interests.includes(tag.tags?.name)
        )
      );
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!personalizedItems.length) {
    return (
      <div className="text-center text-gray-500 py-8">
        興味のあるタグを設定すると、おすすめのアイテムが表示されます
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {personalizedItems.map((item) => (
        <Link key={item.id} to={`/items/${item.id}`}>
          <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            <img
              src={item.image}
              alt={item.title}
              className="w-full aspect-square object-cover"
            />
            <div className="p-3">
              <h3 className="font-medium text-sm line-clamp-2">{item.title}</h3>
              {item.artist && (
                <p className="text-sm text-gray-500 mt-1">{item.artist}</p>
              )}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}