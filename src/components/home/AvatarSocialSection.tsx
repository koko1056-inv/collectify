import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Share2, Users, Crown, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface AvatarSocialSectionProps {
  userId: string;
  avatarUrl?: string | null;
}

export function AvatarSocialSection({ userId, avatarUrl }: AvatarSocialSectionProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLiked, setIsLiked] = useState(false);

  // 人気アバターを取得
  const { data: popularAvatars } = useQuery({
    queryKey: ["popular-avatars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avatar_gallery")
        .select(`
          id,
          image_url,
          user_id,
          created_at,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq("is_current", true)
        .limit(6);
      
      if (error) throw error;
      return data || [];
    },
  });

  // 同じ推しを持つユーザーを取得
  const { data: similarUsers } = useQuery({
    queryKey: ["similar-avatar-users", userId],
    queryFn: async () => {
      // ユーザーの推しコンテンツを取得
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("favorite_contents")
        .eq("id", userId)
        .single();

      if (!userProfile?.favorite_contents?.length) {
        return [];
      }

      // 同じ推しを持つユーザーを検索
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, favorite_contents")
        .contains("favorite_contents", [userProfile.favorite_contents[0]])
        .neq("id", userId)
        .not("avatar_url", "is", null)
        .limit(4);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const handleShare = async () => {
    if (avatarUrl) {
      try {
        await navigator.share({
          title: "My Avatar",
          text: "Check out my avatar on Collectify!",
          url: window.location.href,
        });
      } catch {
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: t("common.copied"),
          description: t("common.linkCopied"),
        });
      }
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    toast({
      title: isLiked ? "いいねを取り消しました" : "いいねしました！",
    });
  };

  return (
    <div className="space-y-6 w-full max-w-md mt-6">
      {/* アバターへのリアクション */}
      {avatarUrl && (
        <div className="flex justify-center gap-4">
          <Button
            variant={isLiked ? "default" : "outline"}
            size="sm"
            onClick={handleLike}
            className="gap-2"
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            <span>いいね</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
            <Share2 className="w-4 h-4" />
            <span>シェア</span>
          </Button>
        </div>
      )}

      {/* 同じ推しを持つユーザー */}
      {similarUsers && similarUsers.length > 0 && (
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium">同じ推しのコレクター</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {similarUsers.map((user: any) => (
                <button
                  key={user.id}
                  onClick={() => navigate(`/user/${user.id}`)}
                  className="flex flex-col items-center gap-1 min-w-[60px] hover:opacity-80 transition-opacity"
                >
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {user.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                    {user.username}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 人気アバターランキング */}
      {popularAvatars && popularAvatars.length > 0 && (
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-yellow-500" />
              <h3 className="text-sm font-medium">人気アバター</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {popularAvatars.slice(0, 6).map((avatar: any, index: number) => (
                <button
                  key={avatar.id}
                  onClick={() => navigate(`/user/${avatar.user_id}`)}
                  className="relative group"
                >
                  <div className="aspect-square rounded-lg overflow-hidden border border-border">
                    <img
                      src={avatar.image_url}
                      alt="Avatar"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  {index < 3 && (
                    <div className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : "bg-amber-600"
                    }`}>
                      {index + 1}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
