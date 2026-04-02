
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ContentInfo } from "@/utils/tag/types";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { 
  BookOpen, Gamepad2, Music, Film, Tv, Heart, Star, Zap, 
  Award, Users, Boxes, PenTool, Palette, BookMarked, Pin, PlusCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";

const ICON_MAP: Record<string, any> = {
  BookOpen,
  Gamepad2,
  Music,
  Film,
  Tv,
  Heart,
  Star,
  Zap,
  Award,
  Users,
  Boxes,
  PenTool,
  Palette,
  BookMarked,
  Pin
};

// カテゴリーに基づいたデフォルトアイコンを取得する関数
const getDefaultIcon = (contentName: string): any => {
  const lowercaseName = contentName.toLowerCase();
  
  if (lowercaseName.includes('ゲーム') || lowercaseName.includes('game')) return Gamepad2;
  if (lowercaseName.includes('音楽') || lowercaseName.includes('music')) return Music;
  if (lowercaseName.includes('映画') || lowercaseName.includes('movie')) return Film;
  if (lowercaseName.includes('テレビ') || lowercaseName.includes('tv')) return Tv;
  if (lowercaseName.includes('アニメ') || lowercaseName.includes('anime')) return BookMarked;
  if (lowercaseName.includes('マンガ') || lowercaseName.includes('manga')) return BookOpen;
  if (lowercaseName.includes('アート') || lowercaseName.includes('art')) return Palette;
  if (lowercaseName.includes('スポーツ') || lowercaseName.includes('sport')) return Award;
  
  // デフォルトのフォールバックアイコン
  return Star;
};

interface InitialInterestSelectionProps {
  isOpen?: boolean;
  onClose?: () => void;
  onComplete?: () => void;
  standalone?: boolean;
}

export function InitialInterestSelection({
  isOpen = true,
  onClose,
  onComplete,
  standalone = false,
}: InitialInterestSelectionProps) {
  const [selectedContents, setSelectedContents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewContentDialog, setShowNewContentDialog] = useState(false);
  const [newContentName, setNewContentName] = useState("");
  const [creatingContent, setCreatingContent] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { completeWalkthrough } = useOnboarding();
  const queryClient = useQueryClient();

  const { data: contentNames = [] } = useQuery({
    queryKey: ["content-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_names")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as ContentInfo[];
    },
  });

  // ユーザーの既存の興味を取得する
  useEffect(() => {
    if (user && isOpen) {
      const fetchUserInterests = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('interests')
          .eq('id', user.id)
          .single();
          
        if (!error && data?.interests) {
          setSelectedContents(data.interests);
        }
      };
      
      fetchUserInterests();
    }
  }, [user, isOpen]);

  const handleContentToggle = (contentName: string) => {
    setSelectedContents(prev =>
      prev.includes(contentName)
        ? prev.filter(t => t !== contentName)
        : [...prev, contentName]
    );
  };

  const handleCreateNewContent = async () => {
    if (!newContentName.trim() || !user) return;
    setCreatingContent(true);
    try {
      const { error } = await supabase
        .from('content_names')
        .insert({ name: newContentName.trim(), type: 'anime', created_by: user.id });
      if (error) throw error;
      
      // Add to selected and refresh
      setSelectedContents(prev => [...prev, newContentName.trim()]);
      queryClient.invalidateQueries({ queryKey: ['content-names'] });
      setNewContentName("");
      setShowNewContentDialog(false);
      toast({ title: `「${newContentName.trim()}」を追加しました` });
    } catch (error) {
      console.error('Error creating content:', error);
      toast({ title: "エラーが発生しました", variant: "destructive" });
    } finally {
      setCreatingContent(false);
    }
  };

  const handleConfirm = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // スキップの場合でも空配列を保存して、次回表示されないようにする
      const interestsToSave = selectedContents.length > 0 ? selectedContents : [];
      
      const { error } = await supabase
        .from('profiles')
        .update({ interests: interestsToSave })
        .eq('id', user.id);

      if (error) throw error;

      // オンボーディングを完了としてマーク
      completeWalkthrough();

      toast({
        title: selectedContents.length > 0 ? "興味のあるコンテンツを保存しました" : "設定をスキップしました",
        description: selectedContents.length > 0 ? "おすすめのアイテムが表示されます" : "後からプロフィールで設定できます",
      });
      
      if (onComplete) {
        onComplete();
      } else if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving interests:', error);
      toast({
        title: "エラーが発生しました",
        description: "興味のあるコンテンツの保存に失敗しました",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredContents = contentNames.filter(content =>
    content.name && content.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (standalone) {
    return (
      <div className="space-y-4">
        <div className="text-center text-gray-600 mb-4 text-sm">
          好みに合わせたグッズを表示するために、興味のあるコンテンツを選んでください
        </div>
        
        <div className="relative">
          <Input
            placeholder="コンテンツを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4 pl-10 bg-white border border-gray-200 rounded-full focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
          />
          <div className="absolute top-3 left-3 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>
        
        <ScrollArea className="h-[40vh]">
          <div className="grid grid-cols-2 gap-3">
            {filteredContents.map((content) => {
              const IconComponent = content.icon_name && ICON_MAP[content.icon_name] 
                ? ICON_MAP[content.icon_name] 
                : getDefaultIcon(content.name);
                
              const isSelected = selectedContents.includes(content.name);
              
              return (
                <Button
                  key={content.id}
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "h-auto min-h-[5rem] px-4 py-6 flex flex-col items-center justify-center gap-2 transition-all duration-200 rounded-xl shadow-sm",
                    isSelected 
                      ? "bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white animate-scale-in"
                      : "bg-white hover:bg-gray-50 border-gray-200 hover:border-purple-300 hover:shadow"
                  )}
                  onClick={() => handleContentToggle(content.name)}
                >
                  <IconComponent className={cn(
                    "h-6 w-6",
                    isSelected ? "text-white" : "text-purple-500"
                  )} />
                  <span className="text-sm font-medium break-words text-center w-full line-clamp-2">
                    {content.name}
                  </span>
                </Button>
              );
            })}
            {/* その他ボタン */}
            {!searchQuery && (
              <Button
                variant="outline"
                className="h-auto min-h-[5rem] px-4 py-6 flex flex-col items-center justify-center gap-2 transition-all duration-200 rounded-xl shadow-sm bg-muted/30 hover:bg-muted/60 border-dashed border-2 border-muted-foreground/20 hover:border-primary/40"
                onClick={() => setShowNewContentDialog(true)}
              >
                <PlusCircle className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">その他</span>
              </Button>
            )}
          </div>
        </ScrollArea>

        {/* 新規コンテンツ作成ダイアログ */}
        <Dialog open={showNewContentDialog} onOpenChange={setShowNewContentDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>新しいコンテンツを追加</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="コンテンツ名を入力..."
                value={newContentName}
                onChange={(e) => setNewContentName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNewContent()}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowNewContentDialog(false)}>
                  キャンセル
                </Button>
                <Button size="sm" onClick={handleCreateNewContent} disabled={!newContentName.trim() || creatingContent}>
                  {creatingContent ? '追加中...' : '追加する'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <div className="flex justify-center mt-4">
          <Button 
            onClick={handleConfirm} 
            className="w-full max-w-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-2.5 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
            disabled={saving}
          >
            {saving ? "保存中..." : selectedContents.length > 0 ? "次へ" : "スキップする"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white border border-gray-300 shadow-lg">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
            興味のあるコンテンツ
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-center text-gray-600 mb-4 px-4 text-sm">
          好みに合わせたグッズを表示するために、興味のあるコンテンツを選んでください
        </div>
        
        <div className="relative px-4">
          <Input
            placeholder="コンテンツを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4 pl-10 bg-white border border-gray-200 rounded-full focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
          />
          <div className="absolute top-3 left-7 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>
        
        <ScrollArea className="h-[50vh] pr-4">
          <div className="grid grid-cols-2 gap-3 p-4">
            {filteredContents.map((content) => {
              const IconComponent = content.icon_name && ICON_MAP[content.icon_name] 
                ? ICON_MAP[content.icon_name] 
                : getDefaultIcon(content.name);
                
              const isSelected = selectedContents.includes(content.name);
              
              return (
                <Button
                  key={content.id}
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "h-auto min-h-[5rem] px-4 py-6 flex flex-col items-center justify-center gap-2 transition-all duration-200 rounded-xl shadow-sm",
                    isSelected 
                      ? "bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white animate-scale-in"
                      : "bg-white hover:bg-gray-50 border-gray-200 hover:border-purple-300 hover:shadow"
                  )}
                  onClick={() => handleContentToggle(content.name)}
                >
                  <IconComponent className={cn(
                    "h-6 w-6",
                    isSelected ? "text-white" : "text-purple-500"
                  )} />
                  <span className="text-sm font-medium break-words text-center w-full line-clamp-2">
                    {content.name}
                  </span>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
        
        <div className="flex justify-center mt-4 px-4">
          <Button 
            onClick={handleConfirm} 
            className="w-full max-w-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-2.5 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
            disabled={saving}
          >
            {saving ? "保存中..." : selectedContents.length > 0 ? "設定を保存する" : "スキップする"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
