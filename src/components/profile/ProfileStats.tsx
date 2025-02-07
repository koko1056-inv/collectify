
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FollowList } from "./FollowList";

interface ProfileStatsProps {
  userId: string;
}

export function ProfileStats({ userId }: ProfileStatsProps) {
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("followers_count, following_count")
        .eq("id", userId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: collectionCount = 0 } = useQuery({
    queryKey: ["collection-count", userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_items")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", userId);
      
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: wishlistCount = 0 } = useQuery({
    queryKey: ["wishlist-count", userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("wishlists")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", userId);
      
      if (error) throw error;
      return count || 0;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 md:gap-4 text-xs md:text-sm text-gray-600">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" className="h-auto px-1 md:px-0 py-0 font-normal">
              <span className="font-bold">{profile?.followers_count || 0}</span>{" "}
              フォロワー
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>フォロワー</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FollowList userId={userId} type="followers" />
            </div>
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" className="h-auto px-1 md:px-0 py-0 font-normal">
              <span className="font-bold">{profile?.following_count || 0}</span>{" "}
              フォロー中
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>フォロー中</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FollowList userId={userId} type="following" />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-wrap gap-4 md:gap-4 text-xs md:text-sm text-gray-600">
        <Button variant="ghost" className="h-auto px-1 md:px-0 py-0 font-normal">
          <span className="font-bold">{collectionCount}</span>{" "}
          コレクション
        </Button>

        <Button variant="ghost" className="h-auto px-1 md:px-0 py-0 font-normal">
          <span className="font-bold">{wishlistCount}</span>{" "}
          ウィッシュリスト
        </Button>
      </div>
    </div>
  );
}

