import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Filter, Hash, Package, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface PostsSidebarProps {
  onFiltersChange?: (filters: {
    selectedTags: string[];
    selectedContent: string;
    searchQuery: string;
  }) => void;
}

export function PostsSidebar({ onFiltersChange }: PostsSidebarProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // 不要なhooksを削除してパフォーマンス向上

  // コンテンツ名の一覧を取得（キャッシュを強化）
  const { data: contentNames = [] } = useQuery({
    queryKey: ["posts", "content-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goods_posts')
        .select(`
          user_items:user_item_id!inner (
            content_name
          )
        `)
        .not('user_items.content_name', 'is', null)
        .limit(100); // 効率化のため制限

      if (error) throw error;

      return Array.from(new Set(
        data?.map(post => post.user_items?.content_name)
          .filter(Boolean)
      )).slice(0, 10);
    },
    staleTime: 15 * 60 * 1000, // 15分間キャッシュ
    gcTime: 60 * 60 * 1000, // 1時間保持
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // 人気タグ（効率化されたクエリ）
  const { data: popularTags = [] } = useQuery({
    queryKey: ["posts", "popular-tags-optimized"],
    queryFn: async () => {
      // シンプルなクエリに変更
      const { data, error } = await supabase
        .from('tags')
        .select('id, name')
        .in('category', ['type', 'character', 'series'])
        .order('name')
        .limit(15);
        
      if (error) throw error;
      return data || [];
    },
    staleTime: 20 * 60 * 1000, // 20分間キャッシュ
    gcTime: 2 * 60 * 60 * 1000, // 2時間保持
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const handleTagToggle = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];
    
    setSelectedTags(newTags);
    onFiltersChange?.({
      selectedTags: newTags,
      selectedContent,
      searchQuery
    });
  };

  const handleContentSelect = (content: string) => {
    const newContent = selectedContent === content ? "" : content;
    setSelectedContent(newContent);
    onFiltersChange?.({
      selectedTags,
      selectedContent: newContent,
      searchQuery
    });
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    onFiltersChange?.({
      selectedTags,
      selectedContent,
      searchQuery: query
    });
  };

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedContent("");
    setSearchQuery("");
    onFiltersChange?.({
      selectedTags: [],
      selectedContent: "",
      searchQuery: ""
    });
  };

  const hasActiveFilters = selectedTags.length > 0 || selectedContent || searchQuery;

  return (
    <div className="w-full space-y-4 p-0 md:p-4 md:border-r md:border-border md:w-72">
      <div className="md:hidden block">
        <div className="w-full space-y-4">
          {/* 検索 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                投稿を絞り込み
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search-mobile">キーワード検索</Label>
                <Input
                  id="search-mobile"
                  placeholder="投稿を検索..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-9 bg-background border-input"
                  autoComplete="off"
                  autoFocus={false}
                />
              </div>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  フィルターをクリア
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* デスクトップ用（既存） */}
      <div className="hidden md:block">
        {/* 検索 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              投稿を絞り込み
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">キーワード検索</Label>
              <Input
                id="search"
                placeholder="投稿を検索..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-9"
              />
            </div>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                フィルターをクリア
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* コンテンツ名で絞り込み（共通） */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            作品で絞り込み
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {contentNames.length > 0 ? (
              contentNames.map((content) => (
                <Button
                  key={content}
                  variant={selectedContent === content ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleContentSelect(content)}
                  className="w-full justify-start text-left h-auto py-2 px-3"
                >
                  <span className="truncate">{content}</span>
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                コンテンツを読み込み中...
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* タグで絞り込み（共通） */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-4 w-4" />
            タグで絞り込み
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {popularTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.name) ? "default" : "secondary"}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleTagToggle(tag.name)}
                  >
                    #{tag.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                タグを読み込み中...
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 選択中のフィルター */}
      {hasActiveFilters && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">選択中のフィルター</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {searchQuery && (
              <div>
                <Label className="text-xs text-muted-foreground">キーワード</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {searchQuery}
                  </Badge>
                </div>
              </div>
            )}

            {selectedContent && (
              <div>
                <Label className="text-xs text-muted-foreground">作品</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {selectedContent}
                  </Badge>
                </div>
              </div>
            )}

            {selectedTags.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">タグ</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}