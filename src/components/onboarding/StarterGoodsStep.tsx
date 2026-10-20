import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Check, Heart, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { GoodsPickTile } from "@/components/collection/GoodsPickTile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCatalogContents, useCatalogFeed, useContentNamesEn } from "@/hooks/useOfficialItems";
import { useQuickAddGoods } from "@/hooks/useQuickAddGoods";
import { useGuestPouch } from "@/hooks/useGuestPouch";
import { cn } from "@/lib/utils";
import { OnboardingBottomBar, OnboardingPrimaryButton } from "./OnboardingParts";
import { PockeSays, type PockePose } from "@/components/pocke/Pocke";
import { CatalogRequestButton } from "@/components/catalog/CatalogRequestButton";
import type { OfficialItem } from "@/types";

/** ここまで選ぶと「完成度が見える」と案内する数 */
const GOAL = 3;
/** 作品ごとに最初に並べる件数 */
const PER_CONTENT = 30;

interface StarterGoodsStepProps {
  /** 選んだ数と、そのグッズの写真（新しい順）を渡して次へ（0 のときは「あとで選ぶ」） */
  onDone: (addedCount: number, images: string[]) => void;
  /** 写真から登録する（このウェルカム画面を抜けて登録画面へ）。渡さなければ出さない */
  onPhoto?: () => void;
  /** ログインせずに試すとき。選んだものはおためしの袋（この端末）に入れ、登録したらコレクションへ移す */
  guest?: boolean;
}

/**
 * はじめの1コレ。
 *
 * 登録の最初の一歩を「写真を撮る」ではなく「持っているグッズをタップする」にする。
 * カタログに公式のグッズが数万件あるので、推しの作品のグッズを並べて、
 * 持っているものをタップするだけで、数秒で自分のコレクションが立ち上がる。
 * 選んだ数が増えるにつれ「完成度が見える」までの距離を見せ、最初の価値を早く届ける。
 */
export function StarterGoodsStep({ onDone, onPhoto, guest = false }: StarterGoodsStepProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [content, setContent] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const quick = useQuickAddGoods();
  const pouch = useGuestPouch();
  const { added, wished, busyId, add, wish: handleWish } = guest ? pouch : quick;
  // 登録できたグッズの写真。締めの画面で、いま登録したものを並べて見せる
  const addedImages = useRef<string[]>([]);
  const handleAdd = useCallback(
    async (item: OfficialItem) => {
      const ok = await add(item);
      if (ok && item.image) addedImages.current = [item.image, ...addedImages.current];
    },
    [add]
  );

  // 推しの作品（ウェルカムの「興味」で選んだもの）。無ければ、グッズの多い作品から
  const { data: interests } = useQuery({
    queryKey: ["onboarding-interests", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("interests").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return (data?.interests ?? []) as string[];
    },
  });
  const { data: contents = [] } = useCatalogContents();
  const { data: namesEn } = useContentNamesEn();
  const label = useCallback(
    (name: string) => (language === "en" ? namesEn?.get(name) ?? name : name),
    [language, namesEn]
  );

  const chips = useMemo(() => {
    const known = new Set(contents.map((c) => c.name));
    const mine = (interests ?? []).filter((n) => known.has(n));
    const rest = contents.filter((c) => c.name !== "なし" && !mine.includes(c.name)).map((c) => c.name);
    return [...mine, ...rest].slice(0, 8);
  }, [contents, interests]);
  const activeContent = content ?? chips[0] ?? null;

  // 作品を選んでいるとき: その作品の新しいグッズ（写真があるもの）
  const starter = useQuery({
    queryKey: ["onboarding-starter-goods", activeContent],
    enabled: !!activeContent && deferredQuery.length < 2,
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<OfficialItem[]> => {
      const { data, error } = await supabase
        .from("official_items")
        .select("id, title, image, price, release_date, content_name, created_at")
        .eq("content_name", activeContent!)
        .is("merged_into", null)
        .neq("image", "/placeholder.svg")
        .order("release_date", { ascending: false })
        .limit(PER_CONTENT);
      if (error) throw error;
      return (data ?? []) as unknown as OfficialItem[];
    },
  });
  // 言葉を入れたとき: あいまい検索
  const search = useCatalogFeed(deferredQuery, deferredQuery.length >= 2);

  const searching = deferredQuery.length >= 2;
  const items = searching ? search.items.slice(0, 60) : starter.data ?? [];
  const isLoading = searching ? search.isLoading : starter.isLoading || (!activeContent && contents.length === 0);

  const n = added.size;
  // 選んだ数へのポッケの返事。1つ目・あと1つ・そろった・それ以降で表情を変える
  const reaction: { pose: PockePose; line: string } =
    n === 0
      ? { pose: "point", line: t("misc.onboarding.starter.title") }
      : n === 1
        ? { pose: "wink", line: t("pocke.onboarding.starter1") }
        : n < GOAL
          ? { pose: "cheer", line: t("pocke.onboarding.starterAlmost", { n: GOAL - n }) }
          : n === GOAL
            ? { pose: "celebrate", line: t("pocke.onboarding.starterGoal") }
            : { pose: "love", line: t("pocke.onboarding.starterMany", { n }) };
  const progressText =
    n === 0
      ? t("misc.onboarding.starter.progressNone")
      : n < GOAL
        ? t("misc.onboarding.starter.progressSome", { n: GOAL - n })
        : t("misc.onboarding.starter.progressDone");

  return (
    // 切り替えの動きは親（WelcomeOnboarding の StepFrame）が持つ
    <div className="flex h-full min-h-0 flex-col">
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-4 pt-6">
        {/* ポッケが話しかけ、タップするたびに表情とセリフで返す（Duolingo の「正解！」の手ごたえ）。
            一覧の場所を取らないよう、ポッケは小さめ */}
        <PockeSays pose={reaction.pose} height={84} reactKey={n}>
          <p className="text-base font-bold leading-snug" aria-live="polite">
            {reaction.line}
          </p>
          {n === 0 && <p className="mt-0.5 text-xs text-muted-foreground">{t("pocke.onboarding.starterDesc")}</p>}
        </PockeSays>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("misc.onboarding.starter.searchPlaceholder")}
            className="h-11 rounded-xl pl-9"
          />
        </div>

        {!searching && chips.length > 0 && (
          <div
            role="group"
            className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
          >
            {chips.map((name) => {
              const on = name === activeContent;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setContent(name)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                  )}
                >
                  <span className="inline-block max-w-[9rem] truncate align-middle">{label(name)}</span>
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-1 text-2xs text-muted-foreground">{t("misc.onboarding.starter.hint")}</p>

        {/* 選んだタイルのリング（外側に2px）が上端で切れないよう、内側に少し余白を取る */}
        <div className="-mx-1 mt-1 min-h-0 flex-1 overflow-y-auto px-1 pb-4 pt-1">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-2.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">{t("misc.onboarding.starter.empty")}</p>
              {deferredQuery.length >= 2 && (
                <CatalogRequestButton
                  query={deferredQuery}
                  context={guest ? "guest_starter" : "starter"}
                />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {items.map((item) => {
                const owned = added.has(item.id);
                const isWished = wished.has(item.id);
                return (
                  <div key={item.id} className="relative min-w-0">
                    <GoodsPickTile
                      image={item.image}
                      title={item.title}
                      subtitle={item.content_name ? label(item.content_name) : null}
                      selected={owned}
                      busy={busyId === item.id}
                      disabled={owned}
                      onClick={() => handleAdd(item)}
                      ariaLabel={owned ? `${item.title} ${t("misc.onboarding.starter.added")}` : item.title}
                      footer={
                        <span
                          className={cn(
                            "mt-auto rounded-md py-1 text-center text-3xs font-bold",
                            owned ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                          )}
                        >
                          {owned ? (
                            <span className="inline-flex items-center gap-0.5">
                              <Check className="h-3 w-3" aria-hidden="true" />
                              {t("misc.onboarding.starter.added")}
                            </span>
                          ) : (
                            `+ ${t("chrome.fab.addShort")}`
                          )}
                        </span>
                      }
                    />
                    {!owned && (
                      <button
                        type="button"
                        disabled={isWished || busyId === item.id}
                        onClick={() => handleWish(item)}
                        aria-pressed={isWished}
                        aria-label={`${item.title} ${t("collectionScreen.addSheet.wantIt")}`}
                        className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 shadow backdrop-blur disabled:opacity-100"
                      >
                        {busyId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Heart className={cn("h-4 w-4", isWished ? "fill-primary text-primary" : "text-muted-foreground")} />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 進み具合と、先へ進むボタン。選ぶほど「完成度が見える」までが縮む */}
      <OnboardingBottomBar>
        <div className="mb-2 flex items-center gap-2" aria-live="polite">
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: GOAL }).map((_, i) => (
              <span key={i} className={cn("h-2 w-6 rounded-full transition-colors", i < n ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{progressText}</span>
        </div>
        <OnboardingPrimaryButton variant={n > 0 ? "default" : "outline"} onClick={() => onDone(n, addedImages.current)}>
          {n > 0 ? t("misc.onboarding.starter.cta", { n }) : t("misc.onboarding.starter.later")}
        </OnboardingPrimaryButton>
        {n === 0 && onPhoto && (
          <button
            type="button"
            onClick={onPhoto}
            className="mx-auto mt-2 flex items-center gap-1 text-xs text-muted-foreground underline"
          >
            <Camera className="h-3 w-3" aria-hidden="true" />
            {t("misc.onboarding.starter.photoLink")}
          </button>
        )}
      </OnboardingBottomBar>
    </div>
  );
}
