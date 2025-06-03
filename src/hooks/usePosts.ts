import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoodsPost, PostComment } from "@/types/posts";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export function usePosts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_posts")
        .select(`
          *,
          profiles!goods_posts_user_id_fkey (username, avatar_url),
          user_items!goods_posts_user_item_id_fkey (title, image),
          post_likes (id, user_id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(post => ({
        ...post,
        profiles: post.profiles || { username: "Unknown", avatar_url: null },
        user_items: post.user_items || { title: "Unknown", image: "" },
        post_likes: post.post_likes || []
      })) as GoodsPost[];
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // リアルタイム更新の設定
  useEffect(() => {
    const channel = supabase
      .channel('posts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goods_posts'
        },
        () => {
          // 投稿に変更があった場合、即座にリフェッチ
          queryClient.invalidateQueries({ queryKey: ["posts"] });
          queryClient.refetchQueries({ queryKey: ["posts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function usePostsForItem(userItemId: string) {
  return useQuery({
    queryKey: ["posts", "item", userItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_posts")
        .select(`
          *,
          profiles!goods_posts_user_id_fkey (username, avatar_url),
          user_items!goods_posts_user_item_id_fkey (title, image),
          post_likes (id, user_id)
        `)
        .eq("user_item_id", userItemId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(post => ({
        ...post,
        profiles: post.profiles || { username: "Unknown", avatar_url: null },
        user_items: post.user_items || { title: "Unknown", image: "" },
        post_likes: post.post_likes || []
      })) as GoodsPost[];
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userItemId, caption, imageUrl }: { 
      userItemId: string; 
      caption?: string; 
      imageUrl: string; 
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("ログインが必要です");

      const { data, error } = await supabase
        .from("goods_posts")
        .insert({
          user_id: userData.user.id,
          user_item_id: userItemId,
          caption,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (newPost) => {
      // すべての関連クエリを無効化
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      await queryClient.invalidateQueries({ queryKey: ["item-posts", newPost.user_item_id] });
      
      // 強制的にリフェッチを実行
      await queryClient.refetchQueries({ queryKey: ["posts"] });
      await queryClient.refetchQueries({ queryKey: ["item-posts", newPost.user_item_id] });
      
      toast({
        title: "投稿しました",
        description: "投稿が正常に作成されました。",
      });
    },
    onError: (error) => {
      console.error("投稿作成エラー:", error);
      toast({
        title: "エラー",
        description: "投稿の作成に失敗しました。",
        variant: "destructive",
      });
    },
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("ログインが必要です");

      if (isLiked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userData.user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_likes")
          .insert({
            post_id: postId,
            user_id: userData.user.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["item-posts"] });
    },
  });
}

export function usePostComments(postId: string) {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_comments")
        .select(`
          *,
          profiles!post_comments_user_id_fkey (username, avatar_url)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []).map(comment => ({
        ...comment,
        profiles: comment.profiles || { username: "Unknown", avatar_url: null }
      })) as PostComment[];
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, comment }: { postId: string; comment: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("ログインが必要です");

      const { data, error } = await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          user_id: userData.user.id,
          comment,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
    },
  });
}
