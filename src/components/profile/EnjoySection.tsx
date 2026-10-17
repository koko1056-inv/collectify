import { useNavigate } from "react-router-dom";
import { ChevronRight, Gift, Shirt, Wand2, type LucideIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PointIcon } from "@/components/ui/point-icon";
import { IconTile } from "@/components/ui/icon-tile";

/**
 * マイページの「楽しむ」まとまり。AI推しルーム・AIアバター・ポイントショップ・ポイントのもらい方への入口。
 *
 * AI の機能は、以前はコレクション画面の選択バーの主ボタン・はじめてガイドの2項目・マイページ上部のショーケースなど、
 * 主要な画面の目立つ位置にあり、初めての人には「AI で絵を作るアプリ」に見えていた。
 * アプリの中心（登録する → 眺める → コンプ → 交換）を前に出すため、AI はここと「AI作品」タブ・ポイントショップから入る形にまとめる。
 * 機能は消していない（行き先はこれまでと同じ）。
 */
export function EnjoySection({ compact = false }: { compact?: boolean } = {}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const rows: { key: string; icon: LucideIcon | null; title: string; desc: string; to: string }[] = [
    { key: "ai-room", icon: Wand2, title: t("profileScreen.enjoy.aiRoom"), desc: t("profileScreen.enjoy.aiRoomDesc"), to: "/ai-rooms" },
    { key: "avatar", icon: Shirt, title: t("profileScreen.enjoy.avatar"), desc: t("profileScreen.enjoy.avatarDesc"), to: "/me?tab=ai&view=avatar" },
    { key: "shop", icon: null, title: t("profileScreen.enjoy.shop"), desc: t("profileScreen.enjoy.shopDesc"), to: "/point-shop" },
    { key: "earn", icon: Gift, title: t("profileScreen.enjoy.earn"), desc: t("profileScreen.enjoy.earnDesc"), to: "/point-shop/earn" },
  ];
  if (compact) {
    // 1行の小さな札（マイページ）。以前は見出しと 2×2 の札で約130px
    return (
      <section aria-label={t("profileScreen.enjoy.title")} data-testid="me-enjoy">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {rows.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => navigate(r.to)}
              data-enjoy={r.key}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium transition-colors hover:bg-accent"
            >
              {r.icon ? <r.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> : <PointIcon size={16} />}
              <span className="whitespace-nowrap">{r.title}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2" aria-label={t("profileScreen.enjoy.title")} data-testid="me-enjoy">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="text-sm font-bold">{t("profileScreen.enjoy.title")}</h2>
        <span className="truncate text-2xs text-muted-foreground">{t("profileScreen.enjoy.desc")}</span>
      </div>
      {/* 2列（スマホも）。1行ずつ並べると縦に長くなり、本題より場所を取ってしまう */}
      <div className="grid grid-cols-2 gap-2">
        {rows.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => navigate(r.to)}
            data-enjoy={r.key}
            className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-left transition-colors hover:bg-accent"
          >
            {r.icon ? (
              <IconTile tone="muted" size="sm">
                <r.icon />
              </IconTile>
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                <PointIcon size={20} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block line-clamp-2 text-xs font-bold leading-tight">{r.title}</span>
              <span className="block truncate text-3xs text-muted-foreground">{r.desc}</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
