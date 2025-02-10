
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
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 transition-all hover:scale-[1.02] hover:shadow-lg">
          <div className="flex flex-wrap gap-6 justify-center sm:justify-start text-sm md:text-base">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" className="h-auto px-1 md:px-0 py-0 font-normal hover:bg-white/10">
                  <div className="flex flex-col items-center sm:items-start gap-1">
                    <span className="font-bold text-lg md:text-xl">{profile?.followers_count || 0}</span>
                    フォロワー
                  </div>
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
                <Button variant="ghost" className="h-auto px-1 md:px-0 py-0 font-normal hover:bg-white/10">
                  <div className="flex flex-col items-center sm:items-start gap-1">
                    <span className="font-bold text-lg md:text-xl">{profile?.following_count || 0}</span>
                    フォロー中
                  </div>
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
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 transition-all hover:scale-[1.02] hover:shadow-lg">
          <div className="flex flex-wrap gap-6 justify-center sm:justify-start text-sm md:text-base">
            <Button variant="ghost" className="h-auto px-1 md:px-0 py-0 font-normal hover:bg-white/10">
              <div className="flex flex-col items-center sm:items-start gap-1">
                <span className="font-bold text-lg md:text-xl">{collectionCount}</span>
                コレクション
              </div>
            </Button>

            <Button variant="ghost" className="h-auto px-1 md:px-0 py-0 font-normal hover:bg-white/10">
              <div className="flex flex-col items-center sm:items-start gap-1">
                <span className="font-bold text-lg md:text-xl">{wishlistCount}</span>
                ウィッシュリスト
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
