
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo, useDeferredValue, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ContentInfo } from "@/utils/tag/types";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { 
  BookOpen, Gamepad2, Music, Film, Tv, Heart, Star, Zap, 
  Award, Users, Boxes, PenTool, Palette, BookMarked, Pin, PlusCircle, ArrowRight, Check, Search,
  type LucideIcon
} from "lucide-react";
import { OnboardingBottomBar, OnboardingPrimaryButton } from "@/components/onboarding/OnboardingParts";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCatalogContents } from "@/hooks/useOfficialItems";
import { fuzzyRank } from "@/utils/fuzzy";
import { DidYouMean } from "@/components/search/DidYouMean";

const ICON_MAP: Record<string, LucideIcon> = {
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
const getDefaultIcon = (contentName: string): LucideIcon => {
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

/** 作品。英語名と別名は検索に使う */
type InterestContent = ContentInfo & { name_en?: string | null; aliases?: string[] | null };

/** 先頭の「人気」に並べる数 */
const POPULAR_COUNT = 6;

interface InitialInterestSelectionProps {
  isOpen?: boolean;
  onClose?: () => void;
  onComplete?: () => void;
  standalone?: boolean;
  /** standalone のとき、一覧の上（一緒にスクロールする位置）に置く見出し */
  header?: ReactNode;
}

export function InitialInterestSelection({
  isOpen = true,
  onClose,
  onComplete,
  standalone = false,
  header,
}: InitialInterestSelectionProps) {
  const [selectedContents, setSelectedContents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewContentDialog, setShowNewContentDialog] = useState(false);
  const [newContentName, setNewContentName] = useState("");
  const [creatingContent, setCreatingContent] = useState(false);
  const { t, language } = useLanguage();
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
      return data as InterestContent[];
    },
  });
  const { data: catalogCounts } = useCatalogContents();

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
      toast.success(t("chrome.interests.contentAdded", { name: newContentName.trim() }));
    } catch (error) {
      console.error('Error creating content:', error);
      toast.error(t("chrome.common.error"));
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

      // ウェルカム画面の中（standalone）では、すぐ次のステップへ進むので通知は出さない。
      // 出すと、次の画面の下に固定した「始める」ボタンに数秒かぶっていた。
      if (!standalone) {
        toast.success(selectedContents.length > 0 ? t("chrome.interests.savedTitle") : t("chrome.interests.skippedTitle"), {
          description: selectedContents.length > 0 ? t("chrome.interests.savedDesc") : t("chrome.interests.skippedDesc"),
        });
      }
      
      if (onComplete) {
        onComplete();
      } else if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving interests:', error);
      toast.error(t("chrome.common.error"), {
        description: t("chrome.interests.saveFailed"),
      });
    } finally {
      setSaving(false);
    }
  };

  const deferredQuery = useDeferredValue(searchQuery.trim());

  // グッズの多い順（0件は最後。同数は名前順）
  const countOf = useMemo(() => new Map((catalogCounts ?? []).map((c) => [c.name, c.count])), [catalogCounts]);
  const sortedContents = useMemo(
    () =>
      contentNames
        .filter((c) => c.name && c.name !== "なし")
        .sort((a, b) => (countOf.get(b.name) ?? 0) - (countOf.get(a.name) ?? 0) || a.name.localeCompare(b.name, "ja")),
    [contentNames, countOf]
  );
  const searchTexts = (c: InterestContent) => [c.name, c.name_en, ...(c.aliases ?? [])];

  const searching = deferredQuery.length > 0;
  // 言葉を入れたら、名前・英語名・別名のどれにでも、打ち間違いを許して近い順に
  const searchResults = useMemo(
    () => (searching ? fuzzyRank(deferredQuery, sortedContents, searchTexts, { min: 0.5, limit: 60 }).map((m) => m.item) : []),
    [searching, deferredQuery, sortedContents]
  );
  const suggestions = useMemo(
    () =>
      searching && searchResults.length === 0
        ? fuzzyRank(deferredQuery, sortedContents, searchTexts, { min: 0.3, limit: 3 })
        : [],
    [searching, searchResults.length, deferredQuery, sortedContents]
  );
  const popularContents = useMemo(
    () => sortedContents.filter((c) => (countOf.get(c.name) ?? 0) > 0).slice(0, POPULAR_COUNT),
    [sortedContents, countOf]
  );
  const restContents = useMemo(() => {
    const popular = new Set(popularContents.map((c) => c.id));
    return sortedContents.filter((c) => !popular.has(c.id));
  }, [sortedContents, popularContents]);

  const displayName = (c: InterestContent) => (language === "en" && c.name_en ? c.name_en : c.name);

  const renderCard = (content: InterestContent) => {
    const IconComponent = content.icon_name && ICON_MAP[content.icon_name] ? ICON_MAP[content.icon_name] : getDefaultIcon(content.name);
    const isSelected = selectedContents.includes(content.name);
    const count = countOf.get(content.name) ?? 0;
    // アプリのカード（rounded-2xl border bg-card）に揃えた横並び。選んだものは GoodsPickTile と同じリングとチェックで示す
    return (
      <button
        key={content.id}
        type="button"
        aria-pressed={isSelected}
        className={cn(
          "flex min-h-[4.5rem] w-full min-w-0 items-center gap-2 rounded-2xl border bg-card p-2.5 text-left shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/60" : "border-border hover:border-primary/40"
        )}
        onClick={() => handleContentToggle(content.name)}
      >
        {/* 選んだら、左の四角が primary に変わってチェックが付く（名前の幅を削らないよう、印は右に別に置かない） */}
        <div className="relative h-9 w-9 shrink-0">
          {content.image_url ? (
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-muted">
              <img src={content.image_url} alt="" className="h-full w-full object-contain" />
            </div>
          ) : (
            <div
              className={cn(
                "flex h-full w-full items-center justify-center rounded-xl transition-colors",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {isSelected ? (
                <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
              ) : (
                <IconComponent className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
          )}
          {content.image_url && isSelected && (
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
            </span>
          )}
        </div>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="line-clamp-2 break-words text-sm font-medium leading-tight text-foreground">
            {displayName(content)}
          </span>
          {count > 0 && (
            <span className="whitespace-nowrap text-3xs tabular-nums text-muted-foreground">{t("chrome.interests.goodsCount", { n: count.toLocaleString() })}</span>
          )}
        </span>
      </button>
    );
  };

  const otherButton = (
    <button
      type="button"
      className="flex min-h-[4.5rem] w-full min-w-0 items-center gap-2 rounded-2xl border border-dashed bg-card p-2.5 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={() => setShowNewContentDialog(true)}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <PlusCircle className="h-5 w-5" aria-hidden="true" />
      </div>
      <span className="text-sm font-medium text-muted-foreground">{t("chrome.interests.other")}</span>
    </button>
  );

  /** 人気 → すべて の順。言葉を入れている間は、近い順の結果と「もしかして」 */
  const contentList = searching ? (
    <div className="space-y-3">
      {searchResults.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">{searchResults.map(renderCard)}</div>
      ) : (
        <div className="space-y-3 py-4">
          <p className="text-center text-sm text-muted-foreground">{t("engage.didYouMean.noResults", { q: deferredQuery })}</p>
          <DidYouMean
            className="justify-center"
            options={suggestions.map((m) => ({
              key: m.item.name,
              label: displayName(m.item),
              hint: m.matched && m.matched !== m.item.name && m.matched !== m.item.name_en ? m.matched : undefined,
            }))}
            onPick={(name) => {
              setSearchQuery("");
              if (!selectedContents.includes(name)) handleContentToggle(name);
            }}
          />
          <div className="grid grid-cols-2 gap-3">{otherButton}</div>
        </div>
      )}
    </div>
  ) : (
    <div className="space-y-5">
      {popularContents.length > 0 && (
        <section aria-label={t("chrome.interests.popular")}>
          <h3 className="mb-2 text-xs font-bold text-muted-foreground">{t("chrome.interests.popular")}</h3>
          <div className="grid grid-cols-2 gap-3">{popularContents.map(renderCard)}</div>
        </section>
      )}
      <section aria-label={t("chrome.interests.all")}>
        {popularContents.length > 0 && <h3 className="mb-2 text-xs font-bold text-muted-foreground">{t("chrome.interests.all")}</h3>}
        <div className="grid grid-cols-2 gap-3">
          {restContents.map(renderCard)}
          {otherButton}
        </div>
      </section>
    </div>
  );

  if (standalone) {
    // ウェルカム画面の1ステップとして、画面の高さいっぱいに使う。
    // 見出し・検索・一覧は一緒にスクロールし（検索は上に貼りつく）、「次へ」は画面下に固定する。
    // 以前は一覧が 40vh の小さな枠の中だけでスクロールし、ボタンが一覧の下に埋もれていた。
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-lg px-4 pb-6 pt-6">
            {header}
            {/* 見出しの下の説明は、ウェルカム画面のサブタイトルと重なるのでここでは出さない */}
            <div className="sticky top-0 z-10 -mx-4 mt-3 bg-background px-4 pb-3 pt-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder={t("chrome.interests.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-xl pl-9"
                />
              </div>
            </div>
            {contentList}
          </div>
        </div>

        <OnboardingBottomBar>
          <p className="mb-2 text-xs text-muted-foreground" aria-live="polite">
            {selectedContents.length > 0
              ? t("misc.onboarding.interestsSelected", { n: selectedContents.length })
              : t("misc.onboarding.interestsNone")}
          </p>
          <OnboardingPrimaryButton
            onClick={handleConfirm}
            disabled={saving}
            variant={selectedContents.length > 0 ? "default" : "outline"}
          >
            {saving ? t("chrome.interests.saving") : selectedContents.length > 0 ? (
              <>
                {t("chrome.interests.next")}
                <ArrowRight />
              </>
            ) : t("chrome.interests.skip")}
          </OnboardingPrimaryButton>
        </OnboardingBottomBar>

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
        
        <div className="relative mx-4 mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder={t("chrome.interests.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 rounded-xl pl-9"
          />
        </div>

        <ScrollArea className="h-[50vh] pr-4">
          <div className="p-4">{contentList}</div>
        </ScrollArea>

        <div className="flex justify-center mt-4 px-4">
          <Button
            onClick={handleConfirm}
            size="lg"
            className="h-12 w-full text-base font-bold"
            disabled={saving}
          >
            {saving ? t("chrome.interests.saving") : selectedContents.length > 0 ? t("chrome.interests.save") : t("chrome.interests.skip")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
