
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PostComment } from "@/types/posts";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function usePostComments(postId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      console.log("コメントを取得中:", postId);
      
      // コメントを取得（parent_comment_idを含む）
      const { data: commentsData, error: commentsError } = await supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (commentsError) {
        console.error("コメント取得エラー:", commentsError);
        throw commentsError;
      }

      // 各コメントに対してプロフィール情報を取得
      const commentsWithProfiles = await Promise.all(
        (commentsData || []).map(async (comment) => {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", comment.user_id)
            .single();

          if (profileError) {
            console.error("プロフィール取得エラー:", profileError);
          }

          return {
            ...comment,
            profiles: profileData || { username: "Unknown User", avatar_url: null }
          };
        })
      );
      
      // コメントをスレッド形式に整形
      const threadedComments: PostComment[] = commentsWithProfiles
        .filter(c => !c.parent_comment_id)
        .map(parent => ({
          ...parent,
          replies: commentsWithProfiles.filter(c => c.parent_comment_id === parent.id)
        }));
      
      console.log("取得したコメントデータ:", threadedComments);
      
      return threadedComments;
    },
  });

  // コメントのリアルタイム更新
  useEffect(() => {
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${postId}`
        },
        () => {
          console.log("コメントに変更を検知、リフェッチします");
          queryClient.invalidateQueries({ queryKey: ["comments", postId] });
          queryClient.refetchQueries({ queryKey: ["comments", postId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, queryClient]);

  return query;
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, comment, parentCommentId }: { postId: string; comment: string; parentCommentId?: string }) => {
      if (!user) throw new Error("ログインが必要です");

      console.log("コメントを追加中:", { postId, comment });

      // まずコメントを挿入
      const { data: commentData, error: insertError } = await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          comment,
          parent_comment_id: parentCommentId || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error("コメント挿入エラー:", insertError);
        throw insertError;
      }

      // 次にプロフィール情報を別途取得
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("プロフィール取得エラー:", profileError);
        // プロフィール取得に失敗してもコメント自体は成功とする
      }

      const result = {
        ...commentData,
        profiles: profileData || { username: "Unknown", avatar_url: null }
      };
      
      console.log("コメントが追加されました:", result);
      return result;
    },
    onSuccess: (newComment, variables) => {
      console.log("コメント追加成功、キャッシュを更新中...");
      
      // コメントクエリを即座に更新
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
      queryClient.refetchQueries({ queryKey: ["comments", variables.postId] });
      
      toast({
        title: "コメントを追加しました",
        description: "コメントが正常に追加されました。",
      });
    },
    onError: (error) => {
      console.error("コメント追加エラー:", error);
      toast({
        title: "エラー",
        description: "コメントの追加に失敗しました。",
        variant: "destructive",
      });
    },
  });
}
