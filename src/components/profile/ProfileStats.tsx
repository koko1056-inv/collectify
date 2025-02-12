
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
import { Users, BookMarked, Heart } from "lucide-react";

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
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 sm:col-span-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all hover:scale-[1.01] hover:bg-white/10 duration-300">
          <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-xs sm:text-sm">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" className="h-auto px-1 py-0 font-normal hover:bg-white/5">
                  <div className="flex flex-col items-center sm:items-start">
                    <div className="relative w-16 h-16 flex items-center justify-center bg-black/90 rounded-full mb-1">
                      <Users className="w-6 h-6 text-white absolute opacity-10" />
                      <span className="font-bold text-xl text-white">{profile?.followers_count || 0}</span>
                    </div>
                    フォロワー
                  </div>
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>フォロワー</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <FollowList userId={userId} type="followers" />
                </div>
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" className="h-auto px-1 py-0 font-normal hover:bg-white/5">
                  <div className="flex flex-col items-center sm:items-start">
                    <div className="relative w-16 h-16 flex items-center justify-center bg-black/90 rounded-full mb-1">
                      <Users className="w-6 h-6 text-white absolute opacity-10" />
                      <span className="font-bold text-xl text-white">{profile?.following_count || 0}</span>
                    </div>
                    フォロー中
                  </div>
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>フォロー中</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <FollowList userId={userId} type="following" />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all hover:scale-[1.01] hover:bg-white/10 duration-300">
          <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-xs sm:text-sm">
            <Button variant="ghost" className="h-auto px-1 py-0 font-normal hover:bg-white/5">
              <div className="flex flex-col items-center sm:items-start">
                <div className="relative w-16 h-16 flex items-center justify-center bg-black/90 rounded-full mb-1">
                  <BookMarked className="w-6 h-6 text-white absolute opacity-10" />
                  <span className="font-bold text-xl text-white">{collectionCount}</span>
                </div>
                コレクション
              </div>
            </Button>

            <Button variant="ghost" className="h-auto px-1 py-0 font-normal hover:bg-white/5">
              <div className="flex flex-col items-center sm:items-start">
                <div className="relative w-16 h-16 flex items-center justify-center bg-black/90 rounded-full mb-1">
                  <Heart className="w-6 h-6 text-white absolute opacity-10" />
                  <span className="font-bold text-xl text-white">{wishlistCount}</span>
                </div>
                ウィッシュリスト
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
