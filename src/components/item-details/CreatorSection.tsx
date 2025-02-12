
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CreatorSectionProps {
  isEditing: boolean;
  createdBy: string | null | undefined;
}

export function CreatorSection({
  isEditing,
  createdBy,
}: CreatorSectionProps) {
  const { data: creatorProfile } = useQuery({
    queryKey: ["creator-profile", createdBy],
    queryFn: async () => {
      if (!createdBy) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", createdBy)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!createdBy,
  });

  if (isEditing || !createdBy || !creatorProfile) return null;

  return (
    <div className="text-sm space-y-2">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={creatorProfile.avatar_url || ""} />
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">登録者</div>
          <div>{creatorProfile.display_name || creatorProfile.username}</div>
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm"
        asChild
        className="w-full"
      >
        <Link to={`/user/${createdBy}`}>
          プロフィールを見る
        </Link>
      </Button>
    </div>
  );
}
