import React, { useState, useMemo } from 'react';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, Lightbulb, Search, X } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TagSuggestSelectProps {
  category: 'character' | 'type' | 'series';
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  contentId?: string | null;
  disabled?: boolean;
}

interface Tag {
  id: string;
  name: string;
  category: string;
  content_id: string | null;
  display_context: string | null;
  usage_count: number;
  status: string;
}

export function TagSuggestSelect({
  category,
  label,
  value,
  onChange,
  contentId,
  disabled = false,
}: TagSuggestSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 承認済みタグを取得
  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ["approved-tags", category, contentId],
    queryFn: async () => {
      let query = supabase
        .from("tags")
        .select("id, name, category, content_id, display_context, usage_count, status")
        .eq("category", category)
        .eq("status", "approved");
      
      if ((category === "character" || category === "series") && contentId) {
        query = query.eq("content_id", contentId);
      } else if (category === "type") {
        query = query.is("content_id", null);
      }
      
      const { data, error } = await query.order("usage_count", { ascending: false }).order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // エイリアスも検索対象に含める
  const { data: aliases = [] } = useQuery({
    queryKey: ["tag-aliases", category, searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      
      const { data, error } = await supabase
        .from("tag_aliases")
        .select("alias_name, canonical_tag_id, tags!inner(id, name, category)")
        .ilike("alias_name", `%${searchQuery}%`);
      
      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.length > 0,
  });

  // 検索結果のフィルタリング
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) {
      return tags.slice(0, 20); // 人気順で上位20件
    }
    
    const query = searchQuery.toLowerCase();
    const matched = tags.filter(tag => 
      tag.name.toLowerCase().includes(query)
    );
    
    // エイリアスからマッチしたタグも追加
    const aliasTagIds = aliases.map((a: any) => a.canonical_tag_id);
    const aliasMatchedTags = tags.filter(tag => 
      aliasTagIds.includes(tag.id) && !matched.some(m => m.id === tag.id)
    );
    
    return [...matched, ...aliasMatchedTags];
  }, [tags, aliases, searchQuery]);

  // 完全一致があるかチェック
  const hasExactMatch = useMemo(() => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return tags.some(tag => tag.name.toLowerCase() === query) ||
           aliases.some((a: any) => a.alias_name.toLowerCase() === query);
  }, [tags, aliases, searchQuery]);

  // タグ提案のミューテーション
  const suggestMutation = useMutation({
    mutationFn: async (tagName: string) => {
      if (!user) throw new Error("ログインが必要です");
      
      const { data: existing, error: checkError } = await supabase
        .from("tag_candidates")
        .select("id, suggestion_count")
        .eq("name", tagName.trim())
        .eq("category", category)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existing) {
        // 既存の提案があれば回数を増やす
        const { error } = await supabase
          .from("tag_candidates")
          .update({ 
            suggestion_count: existing.suggestion_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // 新規提案
        const insertData: any = {
          name: tagName.trim(),
          category,
          suggested_by: user.id,
        };
        if ((category === "character" || category === "series") && contentId) {
          insertData.content_id = contentId;
        }
        
        const { error } = await supabase
          .from("tag_candidates")
          .insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "タグを提案しました",
        description: "運営が確認後、正式なタグとして追加される場合があります。",
      });
      queryClient.invalidateQueries({ queryKey: ["tag-candidates"] });
    },
    onError: (error) => {
      console.error("Tag suggestion error:", error);
      toast({
        title: "提案に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleSelect = (tagName: string) => {
    onChange(tagName);
    setOpen(false);
    setSearchQuery('');
  };

  const handleSuggest = () => {
    if (searchQuery.trim() && user) {
      suggestMutation.mutate(searchQuery.trim());
      // 一時的に選択値として使用
      onChange(searchQuery.trim());
      setOpen(false);
      setSearchQuery('');
    }
  };

  const handleClear = () => {
    onChange(null);
    setSearchQuery('');
  };

  // カテゴリ別のプレースホルダー
  const getPlaceholder = () => {
    switch (category) {
      case 'character': return 'キャラ・人物名を選択';
      case 'type': return 'グッズタイプを選択';
      case 'series': return 'グッズシリーズを選択';
      default: return '選択してください';
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between bg-background",
              !value && "text-muted-foreground"
            )}
          >
            {value || getPlaceholder()}
            <div className="flex items-center gap-1">
              {value && (
                <X
                  className="h-4 w-4 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                />
              )}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                autoFocus
              />
            </div>
          </div>
          
          <ScrollArea className="h-[200px]">
            <div className="p-1">
              {filteredTags.length > 0 ? (
                filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleSelect(tag.name)}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground",
                      value === tag.name && "bg-accent"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {tag.name}
                      {tag.display_context && (
                        <span className="text-xs text-muted-foreground">
                          ({tag.display_context})
                        </span>
                      )}
                    </span>
                    {value === tag.name && <Check className="h-4 w-4" />}
                  </button>
                ))
              ) : searchQuery.trim() ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  該当するタグが見つかりません
                </div>
              ) : (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  タグがありません
                </div>
              )}
            </div>
          </ScrollArea>

          {/* 提案ボタン（完全一致がない場合のみ表示） */}
          {searchQuery.trim() && !hasExactMatch && user && (
            <div className="p-2 border-t bg-muted/50">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-primary"
                onClick={handleSuggest}
                disabled={suggestMutation.isPending}
              >
                <Lightbulb className="h-4 w-4" />
                「{searchQuery.trim()}」を追加提案
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
