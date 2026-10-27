import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BookOpen, ChevronRight, UserRound } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/navigation/BackButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { PockeSays } from "@/components/pocke/Pocke";
import { OfficialItemsList } from "@/components/OfficialItemsList";
import { ZukanPanel } from "@/components/zukan/ZukanPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useZukanView } from "@/hooks/useZukanView";
import { isTagId, useCharacterCompletion, useCharacterInfo, useCharacterItems } from "@/hooks/useCharacterPage";
import { contentCatalogPath } from "@/utils/characterPage";

/**
 * キャラページ（/character/:tagId）。1 人のキャラのグッズを図鑑として見る。
 *  - 見出し: キャラ名と作品（作品のカタログへ戻れる）
 *  - 所持率（シリーズ・種類の内訳つき）。ゲストは件数と登録のおすすめ
 *  - 未所持だけ・一覧/シリーズ別・発売年（URL の missing / view / year に残る。/search と同じ）
 *  - グッズ一覧（カタログと同じカード。タップで詳細、ハートで「ほしい」）
 * ログインしていなくても見られる（共有しやすいように）。
 */
const CharacterPage = () => {
  const { tagId } = useParams<{ tagId: string }>();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const validId = isTagId(tagId);

  const info = useCharacterInfo(tagId);
  const character = info.data ?? null;
  const itemsQuery = useCharacterItems(character?.tagIds);
  const items = itemsQuery.data;
  const zukan = useZukanView(items ?? [], character ? character.id : null);
  const completion = useCharacterCompletion(
    character?.id,
    character?.name ?? null,
    itemsQuery.isPlaceholderData ? undefined : items,
    zukan.ownedIds,
    zukan.ownedUpdatedAt
  );

  useEffect(() => {
    if (!character) return;
    const prev = document.title;
    document.title = t("characterPage.docTitle", {
      name: character.name,
      content: character.contentName ?? t("characterPage.noContent"),
    });
    return () => {
      document.title = prev;
    };
  }, [character, t]);

  const notFound = !validId || (info.isSuccess && !character);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container mx-auto flex-1 px-2 pb-nav pt-4 sm:px-4 sm:pb-8 sm:pt-6">
        <div className="mx-auto max-w-5xl space-y-3">
          <BackButton fallbackTo="/search" className="-ml-2" />

          {notFound ? (
            <div className="space-y-4">
              <EmptyState pose="think" title={t("characterPage.notFoundTitle")} description={t("characterPage.notFoundBody")} />
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => navigate("/search")}>
                  {t("characterPage.toCatalog")}
                </Button>
              </div>
            </div>
          ) : info.isError ? (
            <QueryErrorState title={t("characterPage.loadFailed")} onRetry={() => void info.refetch()} />
          ) : !character ? (
            <div className="space-y-3 px-1" aria-busy="true">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-7 w-48" />
              <PockeSays pose="think" height={56} bubbleClassName="text-xs">
                {t("characterPage.loading")}
              </PockeSays>
            </div>
          ) : (
            <>
              <header className="px-1" data-character-header>
                <p className="flex items-center gap-1 text-2xs font-bold text-primary">
                  <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("characterPage.kicker")}
                </p>
                <h1 className="mt-0.5 break-words text-xl font-bold leading-tight text-foreground">{character.name}</h1>
                {character.contentName && (
                  <Link
                    to={contentCatalogPath(character.contentName)}
                    className="mt-1 inline-flex min-h-10 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{t("characterPage.contentLink", { content: character.contentName })}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </Link>
                )}
              </header>

              {/* 所持率・未所持だけ・一覧/シリーズ別・発売年（/search の図鑑の帯と同じ部品） */}
              <ZukanPanel
                zukan={zukan}
                content={character.name}
                contentItems={itemsQuery.isPlaceholderData ? undefined : items}
                completion={completion}
              />

              {itemsQuery.isSuccess && !itemsQuery.isPlaceholderData && items?.length === 0 ? (
                <EmptyState pose="think" title={t("characterPage.emptyTitle")} description={t("characterPage.emptyBody")} />
              ) : (
                <OfficialItemsList
                  items={zukan.items}
                  seriesView={zukan.seriesView}
                  ownedIds={zukan.ownedIds}
                  initialSort="release-desc"
                  isInitialLoading={itemsQuery.isLoading}
                  isError={itemsQuery.isError}
                  onRetry={() => void itemsQuery.refetch()}
                />
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CharacterPage;
