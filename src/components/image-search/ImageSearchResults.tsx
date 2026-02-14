import { OfficialItem } from "@/types/index";
import { OfficialGoodsCard } from "../OfficialGoodsCard";
import { WebSearchResult } from "@/utils/image-search";
import { ExternalLink, Globe, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ImageSearchResultsProps {
  detectedObjects?: string[];
  labels?: Array<{ description: string; score: number }>;
  caption?: string;
  items?: OfficialItem[];
  webResults?: WebSearchResult;
  isLoading?: boolean;
}

export function ImageSearchResults({ 
  detectedObjects = [], 
  labels = [],
  caption = "", 
  items = [],
  webResults,
  isLoading = false
}: ImageSearchResultsProps) {
  if (isLoading) {
    return <div className="text-center p-4 text-muted-foreground">検索中...</div>;
  }

  const hasAppResults = items.length > 0;
  const hasWebResults = webResults && (
    webResults.visuallySimilarImages.length > 0 || 
    webResults.pagesWithMatchingImages.length > 0
  );

  if (!hasAppResults && !hasWebResults && detectedObjects.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 検出情報 */}
      {(labels.length > 0 || caption) && (
        <div className="bg-muted/50 p-4 rounded-xl border border-border">
          {caption && (
            <div className="mb-3">
              <h3 className="font-medium text-sm text-muted-foreground mb-1">画像の説明</h3>
              <p className="text-sm text-foreground font-medium">{caption}</p>
            </div>
          )}
          
          {labels.length > 0 && (
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">検出されたラベル</h3>
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
              <h3 className="font-medium text-sm text-muted-foreground mb-2">関連キーワード</h3>
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
              アプリ内 ({items.length})
            </TabsTrigger>
            <TabsTrigger value="web" className="gap-1.5">
              <Globe className="h-4 w-4" />
              Web ({(webResults?.visuallySimilarImages.length || 0) + (webResults?.pagesWithMatchingImages.length || 0)})
            </TabsTrigger>
          </TabsList>

          {/* アプリ内結果 */}
          <TabsContent value="app">
            {hasAppResults ? (
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
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                アプリ内で類似アイテムは見つかりませんでした
              </div>
            )}
          </TabsContent>

          {/* Web結果 */}
          <TabsContent value="web">
            <div className="space-y-6">
              {/* 類似画像 */}
              {webResults?.visuallySimilarImages && webResults.visuallySimilarImages.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-foreground">Web上の類似画像</h3>
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
                          alt={`類似画像 ${index + 1}`}
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
                  <h3 className="font-semibold text-sm mb-3 text-foreground">関連するWebページ</h3>
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
                <div className="text-center py-8 text-muted-foreground">
                  Web上で類似画像は見つかりませんでした
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}