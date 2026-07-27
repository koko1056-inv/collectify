
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
  Award, Users, Boxes, PenTool, Palette, BookMarked, Pin, PlusCircle, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
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
      toast({ title: t("chrome.interests.contentAdded", { name: newContentName.trim() }) });
    } catch (error) {
      console.error('Error creating content:', error);
      toast({ title: t("chrome.common.error"), variant: "destructive" });
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
        title: selectedContents.length > 0 ? t("chrome.interests.savedTitle") : t("chrome.interests.skippedTitle"),
        description: selectedContents.length > 0 ? t("chrome.interests.savedDesc") : t("chrome.interests.skippedDesc"),
      });
      
      if (onComplete) {
        onComplete();
      } else if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving interests:', error);
      toast({
        title: t("chrome.common.error"),
        description: t("chrome.interests.saveFailed"),
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
        <p className="text-center text-muted-foreground text-sm">
          {t("chrome.interests.description")}
        </p>
        
        {/* 検索バー */}
        <div className="relative">
          <Input
            placeholder={t("chrome.interests.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <div className="absolute top-1/2 -translate-y-1/2 left-3 text-muted-foreground">
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
                <button
                  key={content.id}
                  className={cn(
                    "relative h-auto min-h-[6rem] px-3 py-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 rounded-2xl border-2 overflow-hidden",
                    isSelected 
                      ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                  )}
                  onClick={() => handleContentToggle(content.name)}
                >
                  {/* 選択チェックマーク */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  )}

                  {/* ロゴ画像 or アイコン */}
                  {content.image_url ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted/50 flex items-center justify-center">
                      <img 
                        src={content.image_url} 
                        alt={content.name} 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      isSelected ? "bg-primary/20" : "bg-muted/60"
                    )}>
                      <IconComponent className={cn(
                        "h-5 w-5",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                  )}

                  <span className={cn(
                    "text-sm font-medium break-words text-center w-full line-clamp-2 leading-tight",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {content.name}
                  </span>
                </button>
              );
            })}
            {/* その他ボタン */}
            {!searchQuery && (
              <button
                className="h-auto min-h-[6rem] px-3 py-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 hover:border-primary/30 hover:bg-muted/40"
                onClick={() => setShowNewContentDialog(true)}
              >
                <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
                  <PlusCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{t("chrome.interests.other")}</span>
              </button>
            )}
          </div>
        </ScrollArea>

        {/* 新規コンテンツ作成ダイアログ */}
        <Dialog open={showNewContentDialog} onOpenChange={setShowNewContentDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("chrome.interests.newContentTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder={t("chrome.interests.newContentPlaceholder")}
                value={newContentName}
                onChange={(e) => setNewContentName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNewContent()}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowNewContentDialog(false)}>
                  {t("chrome.common.cancel")}
                </Button>
                <Button size="sm" onClick={handleCreateNewContent} disabled={!newContentName.trim() || creatingContent}>
                  {creatingContent ? t("chrome.interests.adding") : t("chrome.interests.add")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* CTAボタン */}
        <div className="flex justify-center pt-2">
          <Button 
            onClick={handleConfirm} 
            size="lg"
            className="w-full h-14 text-base font-semibold rounded-2xl shadow-lg gap-2"
            disabled={saving}
          >
            {saving ? t("chrome.interests.saving") : selectedContents.length > 0 ? (
              <>
                {t("chrome.interests.next")}
                <ArrowRight className="w-5 h-5" />
              </>
            ) : t("chrome.interests.skip")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card border-border shadow-lg">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-2xl font-bold text-center text-foreground">
            {t("chrome.interests.title")}
          </DialogTitle>
        </DialogHeader>
        
        <p className="text-center text-muted-foreground mb-4 px-4 text-sm">
          {t("chrome.interests.description")}
        </p>
        
        <div className="relative px-4">
          <Input
            placeholder={t("chrome.interests.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4 pl-10 bg-card border-border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <div className="absolute top-1/2 -translate-y-1/2 left-7 text-muted-foreground" style={{ marginTop: '-8px' }}>
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
                <button
                  key={content.id}
                  className={cn(
                    "relative h-auto min-h-[6rem] px-3 py-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 rounded-2xl border-2 overflow-hidden",
                    isSelected 
                      ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                  )}
                  onClick={() => handleContentToggle(content.name)}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  )}

                  {content.image_url ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted/50 flex items-center justify-center">
                      <img src={content.image_url} alt={content.name} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      isSelected ? "bg-primary/20" : "bg-muted/60"
                    )}>
                      <IconComponent className={cn(
                        "h-5 w-5",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                  )}

                  <span className={cn(
                    "text-sm font-medium break-words text-center w-full line-clamp-2 leading-tight",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {content.name}
                  </span>
                </button>
              );
            })}
            {!searchQuery && (
              <button
                className="h-auto min-h-[6rem] px-3 py-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 hover:border-primary/30 hover:bg-muted/40"
                onClick={() => setShowNewContentDialog(true)}
              >
                <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
                  <PlusCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{t("chrome.interests.other")}</span>
              </button>
            )}
          </div>
        </ScrollArea>
        
        <div className="flex justify-center mt-4 px-4">
          <Button 
            onClick={handleConfirm} 
            size="lg"
            className="w-full h-12 text-base font-semibold rounded-2xl shadow-lg"
            disabled={saving}
          >
            {saving ? t("chrome.interests.saving") : selectedContents.length > 0 ? t("chrome.interests.save") : t("chrome.interests.skip")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
