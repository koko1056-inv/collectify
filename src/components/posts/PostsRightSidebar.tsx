import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { memo } from "react";

interface PopularTag {
  name: string;
  count: number;
}

export const PostsRightSidebar = memo(function PostsRightSidebar() {
  // 人気タグの取得
  const { data: popularTags = [] } = useQuery({
    queryKey: ["posts", "popular-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_item_tags')
        .select(`
          tags:tag_id (
            name
          )
        `);
      
      if (error) throw error;

      // タグの使用回数をカウント
      const tagCounts: { [key: string]: number } = {};
      data?.forEach(item => {
        if (item.tags?.name) {
          tagCounts[item.tags.name] = (tagCounts[item.tags.name] || 0) + 1;
        }
      });

      return Object.entries(tagCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    },
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    gcTime: 10 * 60 * 1000, // 10分間保持
  });

  // アクティブユーザーの取得
  const { data: activeUsers = [] } = useQuery({
    queryKey: ["posts", "active-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goods_posts')
        .select(`
          user_id,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;

      // 重複するユーザーを除去
      const uniqueUsers = [];
      const seenUsers = new Set();
      for (const post of data || []) {
        if (!seenUsers.has(post.user_id) && post.profiles) {
          seenUsers.add(post.user_id);
          uniqueUsers.push(post.profiles);
        }
        if (uniqueUsers.length >= 5) break;
      }
      return uniqueUsers;
    },
    staleTime: 2 * 60 * 1000, // 2分間キャッシュ
    gcTime: 5 * 60 * 1000, // 5分間保持
  });

  return (
    <aside className="hidden lg:block w-80 p-4 space-y-4">
      {/* 人気のタグ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            人気のタグ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {popularTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {popularTags.map(tag => (
                <Badge key={tag.name} variant="secondary" className="text-xs">
                  #{tag.name} ({tag.count})
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              タグ情報を読み込み中...
            </p>
          )}
        </CardContent>
      </Card>

      {/* アクティブユーザー */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            最近のアクティブユーザー
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeUsers.length > 0 ? (
            <div className="space-y-3">
              {activeUsers.map((user, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {user.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">
                    {user.username}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              ユーザー情報を読み込み中...
            </p>
          )}
        </CardContent>
      </Card>
    </aside>
  );
});