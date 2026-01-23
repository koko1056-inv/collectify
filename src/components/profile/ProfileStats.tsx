import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FollowList } from "./FollowList";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfileStatsProps {
  userId: string;
}

export function ProfileStats({ userId }: ProfileStatsProps) {
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const { t } = useLanguage();

  const { data: profile } = useQuery({
    queryKey: ["profile-stats", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("followers_count, following_count")
        .eq("id", userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: collectionData } = useQuery({
    queryKey: ["collection-count", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("quantity")
        .eq("user_id", userId);
      
      if (error) throw error;
      
      const itemCount = data?.length || 0;
      const totalQuantity = data?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
      
      return { itemCount, totalQuantity };
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const collectionCount = collectionData?.itemCount || 0;
  const totalQuantity = collectionData?.totalQuantity || 0;

  return (
    <div className="w-full mb-6">
      <div className="grid grid-cols-4 gap-2 text-center mb-4">
        <div 
          className="flex flex-col cursor-pointer hover:opacity-75 transition-opacity"
          onClick={() => setShowFollowingModal(true)}
        >
          <span className="text-xl font-bold">{profile?.following_count || 0}</span>
          <span className="text-xs text-muted-foreground">{t("profile.following")}</span>
        </div>
        <div 
          className="flex flex-col cursor-pointer hover:opacity-75 transition-opacity"
          onClick={() => setShowFollowersModal(true)}
        >
          <span className="text-xl font-bold">{profile?.followers_count || 0}</span>
          <span className="text-xs text-muted-foreground">{t("profile.followers")}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold">{collectionCount}</span>
          <span className="text-xs text-muted-foreground">{t("nav.collection")}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold">{totalQuantity}</span>
          <span className="text-xs text-muted-foreground">グッズ数</span>
        </div>
      </div>

      <Dialog open={showFollowingModal} onOpenChange={setShowFollowingModal}>
        <DialogContent className="max-w-md max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t("profile.following")}</DialogTitle>
          </DialogHeader>
          <FollowList userId={userId} type="following" />
        </DialogContent>
      </Dialog>

      <Dialog open={showFollowersModal} onOpenChange={setShowFollowersModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("profile.followers")}</DialogTitle>
          </DialogHeader>
          <FollowList userId={userId} type="followers" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
