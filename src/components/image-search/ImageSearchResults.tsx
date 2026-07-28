import { OfficialItem } from "@/types/index";
import { OfficialGoodsCard } from "../OfficialGoodsCard";
import { WebSearchResult } from "@/utils/image-search";
import { ExternalLink, Globe, Image as ImageIcon, PackagePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { useLanguage } from "@/contexts/LanguageContext";

interface ImageSearchResultsProps {
  detectedObjects?: string[];
  labels?: Array<{ description: string; score: number }>;
  caption?: string;
  items?: OfficialItem[];
  webResults?: WebSearchResult;
  isLoading?: boolean;
  /** 解析が一度完了しているか。true なら 0件でも「見つからなかった」ことを表示する */
  hasSearched?: boolean;
  /** 見つからなかったときに、この写真から登録フローへ進む */
  onRegisterWithPhoto?: () => void;
}

export function ImageSearchResults({
  detectedObjects = [],
  labels = [],
  caption = "",
  items = [],
  webResults,
  isLoading = false,
  hasSearched = false,
  onRegisterWithPhoto,
}: ImageSearchResultsProps) {
  const { t } = useLanguage();
  if (isLoading) {
    return <div className="text-center p-4 text-muted-foreground">{t("misc.imageSearch.searching")}</div>;
  }

  const hasAppResults = items.length > 0;
  const hasWebResults = webResults && (
    webResults.visuallySimilarImages.length > 0 ||
    webResults.pagesWithMatchingImages.length > 0
  );
  const hasDetection = labels.length > 0 || !!caption;

  if (!hasSearched && !hasAppResults && !hasWebResults && !hasDetection && detectedObjects.length === 0) {
    return null;
  }

  // 「同じグッズが無い」ときの主導線: この写真でそのまま登録する
  const registerButton = onRegisterWithPhoto ? (
    <Button onClick={onRegisterWithPhoto} className="gap-2">
      <PackagePlus className="h-4 w-4" />
      {t("misc.imageSearch.registerWithPhoto")}
    </Button>
  ) : undefined;

  // 結果があるときの控えめな導線（完全一致が無いことは普通にあるため）
  const registerHint = onRegisterWithPhoto ? (
    <div className="flex justify-center pt-1">
      <Button variant="ghost" size="sm" onClick={onRegisterWithPhoto} className="gap-2 text-muted-foreground">
        <PackagePlus className="h-4 w-4" />
        {t("misc.imageSearch.registerAnyway")}
      </Button>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      {/* 検出情報 */}
      {(labels.length > 0 || caption) && (
        <div className="bg-muted/50 p-4 rounded-xl border border-border">
          {caption && (
            <div className="mb-3">
              <h3 className="font-medium text-sm text-muted-foreground mb-1">{t("misc.imageSearch.captionHeading")}</h3>
              <p className="text-sm text-foreground font-medium">{caption}</p>
            </div>
          )}
          
          {labels.length > 0 && (
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">{t("misc.imageSearch.labelsHeading")}</h3>
              <div className="flex flex-wrap gap-1.5">
                {labels.slice(0, 8).map((label, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {label.description} ({Math.round(label.score * 100)}%)
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {webResults?.webEntities && webResults.webEntities.length > 0 && (
            <div className="mt-3">
              <h3 className="font-medium text-sm text-muted-foreground mb-2">{t("misc.imageSearch.keywordsHeading")}</h3>
              <div className="flex flex-wrap gap-1.5">
                {webResults.webEntities.slice(0, 6).map((entity, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {entity.description}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* 検索結果タブ */}
      {(hasAppResults || hasWebResults) && (
        <Tabs defaultValue={hasAppResults ? "app" : "web"}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="app" className="gap-1.5">
              <ImageIcon className="h-4 w-4" />
              {t("misc.imageSearch.tabApp", { n: items.length })}
            </TabsTrigger>
            <TabsTrigger value="web" className="gap-1.5">
              <Globe className="h-4 w-4" />
              Web ({(webResults?.visuallySimilarImages.length || 0) + (webResults?.pagesWithMatchingImages.length || 0)})
            </TabsTrigger>
          </TabsList>

          {/* アプリ内結果 */}
          <TabsContent value="app">
            {hasAppResults ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {items.map((item) => (
                    <OfficialGoodsCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      image={item.image}
                      price={item.price}
                      releaseDate={item.release_date}
                      artist={item.artist}
                      anime={item.anime}
                      description={item.description}
                    />
                  ))}
                </div>
                {registerHint}
              </div>
            ) : (
              <EmptyState
                icon={PackagePlus}
                title={t("misc.imageSearch.noAppResults")}
                description={t("misc.imageSearch.noAppResultsDesc")}
                action={registerButton}
              />
            )}
          </TabsContent>

          {/* Web結果 */}
          <TabsContent value="web">
            <div className="space-y-6">
              {/* 類似画像 */}
              {webResults?.visuallySimilarImages && webResults.visuallySimilarImages.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-foreground">{t("misc.imageSearch.webSimilarHeading")}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {webResults.visuallySimilarImages.map((img, index) => (
                      <a
                        key={index}
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-muted hover:shadow-md transition-all"
                      >
                        <img
                          src={img.url}
                          alt={t("misc.imageSearch.similarImageAlt", { n: index + 1 })}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* マッチしたページ */}
              {webResults?.pagesWithMatchingImages && webResults.pagesWithMatchingImages.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-foreground">{t("misc.imageSearch.webPagesHeading")}</h3>
                  <div className="space-y-2">
                    {webResults.pagesWithMatchingImages.map((page, index) => (
                      <a
                        key={index}
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {page.pageTitle || page.url}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{page.url}</p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {!hasWebResults && (
                <EmptyState icon={Globe} title={t("misc.imageSearch.noWebResults")} />
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* アプリ内もWebも0件。ここで行き止まりにせず、写真から登録できるようにする */}
      {!hasAppResults && !hasWebResults && (
        <EmptyState
          icon={PackagePlus}
          title={t("misc.imageSearch.noAppResults")}
          description={t("misc.imageSearch.noAppResultsDesc")}
          action={registerButton}
        />
      )}
    </div>
  );
}