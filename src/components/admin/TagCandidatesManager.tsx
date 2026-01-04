import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Merge, Search, Tag, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface TagCandidate {
  id: string;
  name: string;
  category: string;
  content_id: string | null;
  status: string;
  suggestion_count: number;
  suggested_by: string;
  created_at: string;
  updated_at: string;
  content_names?: { name: string } | null;
  profiles?: { username: string; display_name: string | null } | null;
}

interface ExistingTag {
  id: string;
  name: string;
  category: string;
  display_context: string | null;
}

export function TagCandidatesManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<TagCandidate | null>(null);
  const [selectedMergeTagId, setSelectedMergeTagId] = useState<string>("");
  const [displayContext, setDisplayContext] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // タグ候補を取得
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["tag-candidates", statusFilter, categoryFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("tag_candidates")
        .select(`
          *,
          content_names:content_id(name)
        `)
        .order("suggestion_count", { ascending: false })
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }
      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      
      // プロフィール情報を別途取得
      const candidatesWithProfiles = await Promise.all(
        (data || []).map(async (candidate) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, display_name")
            .eq("id", candidate.suggested_by)
            .single();
          
          return {
            ...candidate,
            profiles: profile
          };
        })
      );
      
      return candidatesWithProfiles as TagCandidate[];
    },
  });

  // 既存のタグ一覧（マージ用）
  const { data: existingTags = [] } = useQuery({
    queryKey: ["existing-tags-for-merge", selectedCandidate?.category],
    queryFn: async () => {
      if (!selectedCandidate) return [];
      
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, category, display_context")
        .eq("category", selectedCandidate.category)
        .eq("status", "approved")
        .order("usage_count", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ExistingTag[];
    },
    enabled: !!selectedCandidate,
  });

  // タグ候補を承認
  const approveMutation = useMutation({
    mutationFn: async ({ candidate, displayContext }: { candidate: TagCandidate; displayContext?: string }) => {
      // 新しいタグを作成
      const { data: newTag, error: tagError } = await supabase
        .from("tags")
        .insert({
          name: candidate.name,
          category: candidate.category,
          content_id: candidate.content_id,
          status: "approved",
          display_context: displayContext || null,
        })
        .select()
        .single();

      if (tagError) throw tagError;

      // 候補のステータスを更新
      const { error: updateError } = await supabase
        .from("tag_candidates")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", candidate.id);

      if (updateError) throw updateError;

      return newTag;
    },
    onSuccess: () => {
      toast({ title: "タグを承認しました" });
      queryClient.invalidateQueries({ queryKey: ["tag-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["approved-tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
    onError: (error) => {
      console.error("Approve error:", error);
      toast({ title: "承認に失敗しました", variant: "destructive" });
    },
  });

  // タグ候補を却下
  const rejectMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      const { error } = await supabase
        .from("tag_candidates")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", candidateId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "タグを却下しました" });
      queryClient.invalidateQueries({ queryKey: ["tag-candidates"] });
    },
    onError: () => {
      toast({ title: "却下に失敗しました", variant: "destructive" });
    },
  });

  // 既存タグにマージ（エイリアスとして追加）
  const mergeMutation = useMutation({
    mutationFn: async ({ candidate, targetTagId }: { candidate: TagCandidate; targetTagId: string }) => {
      // エイリアスとして追加
      const { error: aliasError } = await supabase
        .from("tag_aliases")
        .insert({
          alias_name: candidate.name,
          canonical_tag_id: targetTagId,
        });

      if (aliasError) throw aliasError;

      // 候補のステータスを更新
      const { error: updateError } = await supabase
        .from("tag_candidates")
        .update({
          status: "merged",
          merged_to_tag_id: targetTagId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", candidate.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({ title: "エイリアスとしてマージしました" });
      queryClient.invalidateQueries({ queryKey: ["tag-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["tag-aliases"] });
      setMergeDialogOpen(false);
      setSelectedCandidate(null);
      setSelectedMergeTagId("");
    },
    onError: (error) => {
      console.error("Merge error:", error);
      toast({ title: "マージに失敗しました", variant: "destructive" });
    },
  });

  const handleApprove = (candidate: TagCandidate) => {
    approveMutation.mutate({ candidate, displayContext });
    setDisplayContext("");
  };

  const handleMergeClick = (candidate: TagCandidate) => {
    setSelectedCandidate(candidate);
    setMergeDialogOpen(true);
  };

  const handleMergeConfirm = () => {
    if (selectedCandidate && selectedMergeTagId) {
      mergeMutation.mutate({ candidate: selectedCandidate, targetTagId: selectedMergeTagId });
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "character": return "キャラクター";
      case "type": return "グッズタイプ";
      case "series": return "シリーズ";
      default: return category;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">審査中</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-100 text-green-800">承認済</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800">却下</Badge>;
      case "merged":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">マージ済</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          タグ候補管理
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* フィルター */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label className="sr-only">検索</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="タグ名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="pending">審査中</SelectItem>
              <SelectItem value="approved">承認済</SelectItem>
              <SelectItem value="rejected">却下</SelectItem>
              <SelectItem value="merged">マージ済</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="カテゴリ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="character">キャラクター</SelectItem>
              <SelectItem value="type">グッズタイプ</SelectItem>
              <SelectItem value="series">シリーズ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 候補リスト */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            タグ候補がありません
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{candidate.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {getCategoryLabel(candidate.category)}
                      </Badge>
                      {getStatusBadge(candidate.status)}
                      {candidate.suggestion_count > 1 && (
                        <Badge variant="outline" className="text-xs">
                          {candidate.suggestion_count}回提案
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {candidate.content_names?.name && (
                        <span>コンテンツ: {candidate.content_names.name}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {candidate.profiles?.display_name || candidate.profiles?.username}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(candidate.created_at), "MM/dd HH:mm", { locale: ja })}
                      </span>
                    </div>
                  </div>

                  {candidate.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMergeClick(candidate)}
                        title="既存タグにマージ"
                      >
                        <Merge className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => rejectMutation.mutate(candidate.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(candidate)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        承認
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* マージダイアログ */}
        <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>既存タグにマージ</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                「<span className="font-medium">{selectedCandidate?.name}</span>」を既存のタグのエイリアス（別名）として登録します。
              </p>
              <div className="space-y-2">
                <Label>マージ先のタグ</Label>
                <Select value={selectedMergeTagId} onValueChange={setSelectedMergeTagId}>
                  <SelectTrigger>
                    <SelectValue placeholder="タグを選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingTags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        {tag.name}
                        {tag.display_context && ` (${tag.display_context})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
                キャンセル
              </Button>
              <Button
                onClick={handleMergeConfirm}
                disabled={!selectedMergeTagId || mergeMutation.isPending}
              >
                マージ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
