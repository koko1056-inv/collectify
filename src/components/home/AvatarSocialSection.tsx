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
    <div className="space-y-4 w-full max-w-md mx-auto">
      {/* アバターへのリアクション */}
      {avatarUrl && (
        <div className="flex justify-center gap-3">
          <Button
            variant={isLiked ? "default" : "outline"}
            size="sm"
            onClick={handleLike}
            className={`gap-2 rounded-full px-5 transition-all duration-200 ${isLiked ? 'shadow-md' : ''}`}
          >
            <Heart className={`w-4 h-4 transition-transform ${isLiked ? "fill-current scale-110" : ""}`} />
            <span>{t("posts.like") || "いいね"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2 rounded-full px-5">
            <Share2 className="w-4 h-4" />
            <span>{t("posts.share") || "シェア"}</span>
          </Button>
        </div>
      )}

      {/* 同じ推しを持つユーザー */}
      {similarUsers && similarUsers.length > 0 && (
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-medium">同じ推しのコレクター</h3>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
              {similarUsers.map((user: any) => (
                <button
                  key={user.id}
                  onClick={() => navigate(`/user/${user.id}`)}
                  className="flex flex-col items-center gap-1.5 min-w-[64px] group"
                >
                  <div className="relative">
                    <Avatar className="w-14 h-14 border-2 border-transparent group-hover:border-primary/50 transition-all duration-200 group-hover:scale-105">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {user.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground truncate max-w-[64px] transition-colors">
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
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-yellow-500" />
              </div>
              <h3 className="text-sm font-medium">人気アバター</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {popularAvatars.slice(0, 6).map((avatar: any, index: number) => (
                <button
                  key={avatar.id}
                  onClick={() => navigate(`/user/${avatar.user_id}`)}
                  className="relative group focus:outline-none"
                >
                  <div className="aspect-square rounded-xl overflow-hidden border border-border/50 group-hover:border-primary/30 transition-all duration-200 group-hover:shadow-md">
                    <img
                      src={avatar.image_url}
                      alt="Avatar"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    {/* ホバーオーバーレイ */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-end justify-center pb-2">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  {/* ランキングバッジ */}
                  {index < 3 && (
                    <div className={`absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ${
                      index === 0 ? "bg-gradient-to-br from-yellow-400 to-yellow-600" : 
                      index === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500" : 
                      "bg-gradient-to-br from-amber-500 to-amber-700"
                    }`}>
                      {index + 1}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
