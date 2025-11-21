import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { memo } from "react";

export const UserInfo = memo(function UserInfo() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    gcTime: 30 * 60 * 1000, // 30分間保持
  });

  if (!user || !profile?.username) return null;

  return (
    <div className="text-sm text-gray-600">
      {profile.username}
    </div>
  );
});