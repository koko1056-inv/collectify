import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageSearchUpload } from './ImageSearchUpload';
import { ImageSearchResults } from './ImageSearchResults';
import { analyzeImageFile, ImageAnalysisResult, WebSearchResult } from '@/utils/image-search';
import { Loader2, ScanSearch } from 'lucide-react';
import { toast } from 'sonner';
import { OfficialItem } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { setPendingItemPhoto } from '@/utils/ai-studio-handoff';
import { downscaleToDataUrl } from '@/utils/downscale-image';

/** File を data URL に読み込む（プレビューと /quick-add への引き継ぎに使う） */
const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export function ImageSearch() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [results, setResults] = useState<OfficialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState<Array<{ description: string; score: number }>>([]);
  const [imageCaption, setImageCaption] = useState('');
  const [webResults, setWebResults] = useState<WebSearchResult | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleImageUpload = async (file: File) => {
    try {
      setLoading(true);
      setResults([]);
      setLabels([]);
      setImageCaption('');
      setWebResults(undefined);
      setPreviewUrl(null);
      setHasSearched(false);

      // プレビュー兼、登録フローへの引き継ぎ用に data URL を持っておく
      try {
        setPreviewUrl(await readAsDataUrl(file));
      } catch {
        // プレビューが出せなくても検索自体は続ける
      }

      const analysisResult: ImageAnalysisResult = await analyzeImageFile(file);

      setLabels(analysisResult.detection.labels || []);
      setImageCaption(analysisResult.detection.caption);
      setResults(analysisResult.items);
      setWebResults(analysisResult.webResults);
      setHasSearched(true);

      const totalResults = (analysisResult.items?.length || 0) +
        (analysisResult.webResults?.visuallySimilarImages?.length || 0);

      if (totalResults === 0) {
        toast(t("misc.imageSearch.resultTitle"), {
          description: t("misc.imageSearch.noSimilar"),
        });
      } else {
        toast.success(t("misc.imageSearch.searchDone"), {
          description: t("misc.imageSearch.foundCount", { n: totalResults }),
        });
      }
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      toast.error(t("misc.common.error"), {
        description: t("misc.imageSearch.analyzeError"),
      });
      // 解析に失敗しても写真は選び終わっているので、
      // 「この写真で登録する」へ進めるよう結果欄は出す（行き止まりにしない）。
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  /** 見つからなかった（または探しているものが無い）ときに、この写真で登録フローへ進む */
  const handleRegisterWithPhoto = async () => {
    const guessedTitle =
      imageCaption ||
      webResults?.bestGuessLabels?.[0] ||
      labels[0]?.description ||
      null;

    // 元の写真そのままだと base64 で約1.33倍に膨らみ、
    // スマホカメラの写真では sessionStorage の上限（約5MB）を超えて引き継げない。
    // 長辺1600pxに縮めてから預ける。AI解析にはこれで十分。
    const dataUrl = previewUrl ? await downscaleToDataUrl(previewUrl) : null;
    const handedOff = dataUrl ? setPendingItemPhoto({ dataUrl, guessedTitle }) : false;

    if (!handedOff) {
      // 縮小に失敗した / 容量を超えた。写真は渡せないので登録画面で選び直してもらう。
      toast(t("misc.imageSearch.handoffFailedTitle"), {
        description: t("misc.imageSearch.handoffFailedDesc"),
      });
    }

    navigate("/quick-add");
  };

  return (
    <div className="container mx-auto py-4 space-y-5 max-w-2xl">
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ScanSearch className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{t("misc.imageSearch.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("misc.imageSearch.subtitle")}
        </p>
      </div>

      <ImageSearchUpload onImageSelect={handleImageUpload} />

      {/* プレビュー画像 */}
      {previewUrl && (
        <div className="flex justify-center">
          <div className="relative w-48 h-48 rounded-xl overflow-hidden border border-border shadow-sm">
            <img
              src={previewUrl}
              alt={t("misc.imageSearch.searchImageAlt")}
              className="w-full h-full object-cover"
            />
            {loading && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        </div>
      )}

      {loading && !previewUrl && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg text-foreground">{t("misc.imageSearch.analyzing")}</span>
        </div>
      )}

      <ImageSearchResults
        items={results}
        labels={labels}
        caption={imageCaption}
        webResults={webResults}
        hasSearched={hasSearched && !loading}
        onRegisterWithPhoto={handleRegisterWithPhoto}
      />
    </div>
  );
}
