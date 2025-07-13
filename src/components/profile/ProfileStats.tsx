
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FollowList } from "./FollowList";

interface ProfileStatsProps {
  userId: string;
}

export function ProfileStats({ userId }: ProfileStatsProps) {
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);

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
    staleTime: 1 * 60 * 1000, // 1分間キャッシュ（useProfileと同じキーを使用）
    gcTime: 5 * 60 * 1000, // 5分間保持
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
    staleTime: 2 * 60 * 1000, // 2分間キャッシュ
    gcTime: 5 * 60 * 1000, // 5分間保持
  });

  return (
    <div className="w-full mt-4 mb-6">
      <div className="grid grid-cols-3 gap-2 text-center mb-4">
        <div 
          className="flex flex-col cursor-pointer hover:opacity-75 transition-opacity"
          onClick={() => setShowFollowingModal(true)}
        >
          <span className="text-xl font-bold">{profile?.following_count || 0}</span>
          <span className="text-sm text-gray-600">フォロー中</span>
        </div>
        <div 
          className="flex flex-col cursor-pointer hover:opacity-75 transition-opacity"
          onClick={() => setShowFollowersModal(true)}
        >
          <span className="text-xl font-bold">{profile?.followers_count || 0}</span>
          <span className="text-sm text-gray-600">フォロワー</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold">{collectionCount}</span>
          <span className="text-sm text-gray-600">コレクション</span>
        </div>
      </div>

      <Dialog open={showFollowingModal} onOpenChange={setShowFollowingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>フォロー中</DialogTitle>
          </DialogHeader>
          <FollowList userId={userId} type="following" />
        </DialogContent>
      </Dialog>

      <Dialog open={showFollowersModal} onOpenChange={setShowFollowersModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>フォロワー</DialogTitle>
          </DialogHeader>
          <FollowList userId={userId} type="followers" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
