import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, Users, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
interface PopularTag {
  name: string;
  count: number;
}
interface RecentActivity {
  posts_count: number;
  active_users: number;
}
export function PostsRightSidebar() {
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity>({
    posts_count: 0,
    active_users: 0
  });
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  useEffect(() => {
    fetchPopularTags();
    fetchRecentActivity();
    fetchActiveUsers();
  }, []);
  const fetchPopularTags = async () => {
    try {
      // タグの使用頻度を取得（user_item_tagsから）
      const {
        data,
        error
      } = await supabase.from('user_item_tags').select(`
          tags:tag_id (
            name
          )
        `);
      if (error) throw error;

      // タグの使用回数をカウント
      const tagCounts: {
        [key: string]: number;
      } = {};
      data?.forEach(item => {
        if (item.tags?.name) {
          tagCounts[item.tags.name] = (tagCounts[item.tags.name] || 0) + 1;
        }
      });

      // 使用回数順にソートして上位10個を取得
      const sortedTags = Object.entries(tagCounts).map(([name, count]) => ({
        name,
        count
      })).sort((a, b) => b.count - a.count).slice(0, 8);
      setPopularTags(sortedTags);
    } catch (error) {
      console.error('人気タグの取得に失敗:', error);
    }
  };
  const fetchRecentActivity = async () => {
    try {
      // 今週の投稿数を取得
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const {
        count: postsCount,
        error: postsError
      } = await supabase.from('goods_posts').select('*', {
        count: 'exact',
        head: true
      }).gte('created_at', oneWeekAgo.toISOString());
      if (postsError) throw postsError;

      // アクティブユーザー数（今週投稿したユーザー数）
      const {
        data: activeUsersData,
        error: usersError
      } = await supabase.from('goods_posts').select('user_id').gte('created_at', oneWeekAgo.toISOString());
      if (usersError) throw usersError;
      const uniqueUsers = new Set(activeUsersData?.map(post => post.user_id) || []);
      setRecentActivity({
        posts_count: postsCount || 0,
        active_users: uniqueUsers.size
      });
    } catch (error) {
      console.error('アクティビティ情報の取得に失敗:', error);
    }
  };
  const fetchActiveUsers = async () => {
    try {
      // 最近投稿したユーザーを取得
      const {
        data,
        error
      } = await supabase.from('goods_posts').select(`
          user_id,
          profiles:user_id (
            username,
            avatar_url
          )
        `).order('created_at', {
        ascending: false
      }).limit(10);
      if (error) throw error;

      // 重複するユーザーを除去
      const uniqueUsers = [];
      const seenUsers = new Set();
      for (const post of data || []) {
        if (!seenUsers.has(post.user_id)) {
          seenUsers.add(post.user_id);
          uniqueUsers.push(post.profiles);
        }
        if (uniqueUsers.length >= 5) break;
      }
      setActiveUsers(uniqueUsers.filter(Boolean));
    } catch (error) {
      console.error('アクティブユーザーの取得に失敗:', error);
    }
  };
  return <aside className="hidden lg:block w-80 p-4 space-y-4">
      {/* 人気のタグ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            人気のタグ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {popularTags.length > 0 ? <div className="flex flex-wrap gap-2">
              {popularTags.map(tag => <Badge key={tag.name} variant="secondary" className="text-xs">
                  #{tag.name} ({tag.count})
                </Badge>)}
            </div> : <p className="text-sm text-muted-foreground">
              タグ情報を読み込み中...
            </p>}
        </CardContent>
      </Card>

      {/* アクティビティ統計 */}
      

      {/* アクティブユーザー */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            最近のアクティブユーザー
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeUsers.length > 0 ? <div className="space-y-3">
              {activeUsers.map((user, index) => <div key={index} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {user.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">
                    {user.username}
                  </span>
                </div>)}
            </div> : <p className="text-sm text-muted-foreground">
              ユーザー情報を読み込み中...
            </p>}
        </CardContent>
      </Card>
    </aside>;
}