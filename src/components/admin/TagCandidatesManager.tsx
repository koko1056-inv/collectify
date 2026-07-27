import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { Check, X, Merge, Search, Tag, Clock, User } from "lucide-react";
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
  
  const { t } = useLanguage();
  const { formatPaddedDateTime } = useDateFormat();
  const queryClient = useQueryClient();

  // タグ候補を取得
  const { data: candidates = [], isLoading, error, refetch } = useQuery({
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
      toast.success(t("misc.admin.approved"));
      queryClient.invalidateQueries({ queryKey: ["tag-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["approved-tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
    onError: (error) => {
      console.error("Approve error:", error);
      toast.error(t("misc.admin.approveFailed"));
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
      toast.success(t("misc.admin.rejected"));
      queryClient.invalidateQueries({ queryKey: ["tag-candidates"] });
    },
    onError: () => {
      toast.error(t("misc.admin.rejectFailed"));
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
      toast.success(t("misc.admin.merged"));
      queryClient.invalidateQueries({ queryKey: ["tag-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["tag-aliases"] });
      setMergeDialogOpen(false);
      setSelectedCandidate(null);
      setSelectedMergeTagId("");
    },
    onError: (error) => {
      console.error("Merge error:", error);
      toast.error(t("misc.admin.mergeFailed"));
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
      case "character": return t("misc.admin.categoryCharacter");
      case "type": return t("misc.admin.categoryType");
      case "series": return t("misc.admin.categorySeries");
      default: return category;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">{t("misc.admin.statusPending")}</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-100 text-green-800">{t("misc.admin.statusApproved")}</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800">{t("misc.admin.statusRejected")}</Badge>;
      case "merged":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">{t("misc.admin.statusMerged")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          {t("misc.admin.tagCandidates")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* フィルター */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label className="sr-only">{t("misc.admin.search")}</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("misc.admin.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("misc.admin.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("misc.admin.all")}</SelectItem>
              <SelectItem value="pending">{t("misc.admin.statusPending")}</SelectItem>
              <SelectItem value="approved">{t("misc.admin.statusApproved")}</SelectItem>
              <SelectItem value="rejected">{t("misc.admin.statusRejected")}</SelectItem>
              <SelectItem value="merged">{t("misc.admin.statusMerged")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("misc.admin.category")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("misc.admin.all")}</SelectItem>
              <SelectItem value="character">{t("misc.admin.categoryCharacter")}</SelectItem>
              <SelectItem value="type">{t("misc.admin.categoryType")}</SelectItem>
              <SelectItem value="series">{t("misc.admin.categorySeries")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 候補リスト */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">{t("misc.common.loading")}</div>
        ) : error ? (
          <QueryErrorState
            title={t("misc.common.error")}
            onRetry={() => refetch()}
          />
        ) : candidates.length === 0 ? (
          <EmptyState icon={Tag} title={t("misc.admin.noCandidates")} />
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
                          {t("misc.admin.suggestedTimes", { n: candidate.suggestion_count })}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {candidate.content_names?.name && (
                        <span>{t("misc.admin.contentLabel", { name: candidate.content_names.name })}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {candidate.profiles?.display_name || candidate.profiles?.username}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatPaddedDateTime(candidate.created_at)}
                      </span>
                    </div>
                  </div>

                  {candidate.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMergeClick(candidate)}
                        title={t("misc.admin.mergeToExisting")}
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
                        {t("misc.admin.approve")}
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
              <DialogTitle>{t("misc.admin.mergeToExisting")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                {t("misc.admin.mergeDesc", { name: selectedCandidate?.name ?? "" })}
              </p>
              <div className="space-y-2">
                <Label>{t("misc.admin.mergeTarget")}</Label>
                <Select value={selectedMergeTagId} onValueChange={setSelectedMergeTagId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("misc.admin.selectTag")} />
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
                {t("misc.common.cancel")}
              </Button>
              <Button
                onClick={handleMergeConfirm}
                disabled={!selectedMergeTagId || mergeMutation.isPending}
              >
                {t("misc.admin.merge")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
