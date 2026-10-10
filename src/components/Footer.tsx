import { Link, useLocation } from "react-router-dom";
import { isNavActive } from "@/components/navigation/navGroups";
import { useState } from "react";
import { ArrowLeftRight, Boxes, Compass, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { AddGoodsSheet } from "@/components/collection/AddGoodsSheet";
import { useMyTrades } from "@/hooks/trade/useMyTrades";

/**
 * モバイルの下タブ。
 *
 * 並びは「自分のもの → 人とのやりとり → 追加 → 人を見る → 自分の見せ方」。
 * ログイン後の着地点が /collection なので、左端をコレクションにして
 * 着地した画面とタブの位置を一致させている。
 *
 * 以前との違いと理由:
 * - 中央の丸ボタンを「みつける(検索)」から「追加」に変えた。
 *   コレクション画面にも「+追加」の浮きボタンがあり、丸いボタンが2つ並んで
 *   意味が取れなかった（コード側のコメントにもその旨が残っていた）。
 *   登録が最初の体験なので、常設の1タップはこちらに割り当てる。
 *   カタログから探す経路は、この追加シートの「一覧から選ぶ」が持っている。
 * - 「プロフィール」(/edit-profile) を外した。タブから編集フォームへ直行する
 *   のは行き先として不自然で、ヘッダのアバターメニューに同じ入口がある。
 *   代わりに /my-room を置いた。下タブから到達できない画面だったが、
 *   ここは AIスタジオ（部屋・アバター）と自分の見せ方をまとめた画面で、
 *   タブが無いまま放置するには重すぎる。
 * - 「AIスタジオ」(/ai-rooms) 単独のタブをやめ、/my-room に寄せた。
 *   /my-room は既定で AI Studio タブを開くので、入口としては同じ場所に着く。
 * - 「交換」を入れた。交換は申込と承諾は動いていたのに、入口が
 *   /search の4番目のタブの中だけで、画面上どこからも見つからなかった。
 */
export function Footer() {
  const location = useLocation();
  const { t } = useLanguage();
  const [isAddOpen, setIsAddOpen] = useState(false);
  // 「交換」タブのバッジ: いま自分が動く番の取引の数（返事・発送・受け取り報告・完了後の反映）
  const { myTurn } = useMyTrades();
  const tradeBadge = myTurn.length;

  const isActive = (to: string) => isNavActive(to, location.pathname);

  const leftTabs = [
    { to: "/collection", icon: Boxes, label: t("chrome.nav.collection") },
    { to: "/trade", icon: ArrowLeftRight, label: t("chrome.nav.trade") },
  ];
  const rightTabs = [
    { to: "/explore", icon: Compass, label: t("chrome.nav.explore") },
    { to: "/me", icon: User, label: t("chrome.nav.myPage") },
  ];

  const renderTab = ({ to, icon: Icon, label }: typeof leftTabs[number]) => {
    const active = isActive(to);
    return (
      <Link
        key={to}
        to={to}
        aria-current={active ? "page" : undefined}
        className={cn(
          // ラベルが折り返して高さが変わらないよう truncate で1行に固定する
          "flex flex-col items-center justify-center flex-1 min-w-0 px-0.5 py-2 transition-colors",
          active ? "text-primary" : "text-muted-foreground"
        )}
      >
        <span className="relative">
          <Icon
            className={cn(
              "h-6 w-6 mb-0.5 transition-transform",
              active && "scale-110"
            )}
          />
          {to === "/trade" && tradeBadge > 0 && (
            <span
              aria-label={t("trade.inbox.badgeLabel", { n: tradeBadge })}
              className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-3xs font-bold leading-none text-primary-foreground tabular-nums"
            >
              {tradeBadge > 9 ? "9+" : tradeBadge}
            </span>
          )}
        </span>
        <span
          className={cn(
            "text-2xs leading-tight w-full text-center truncate",
            active ? "font-bold" : "font-medium"
          )}
        >
          {label}
        </span>
      </Link>
    );
  };

  return (
    <>
      <div
        data-tour="nav-bar"
        className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t sm:hidden z-50 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center justify-around h-16 relative">
          {leftTabs.map(renderTab)}
          {/* 中央: グッズを追加（撮る / 一覧から選ぶ / 手入力） */}
          <div className="flex-1 flex items-center justify-center">
            <div className="-mt-8 flex flex-col items-center">
              <motion.button
                data-tour="collection-add"
                onClick={() => setIsAddOpen(true)}
                whileTap={{ scale: 0.95 }}
                aria-label={t("chrome.fab.addGoods")}
                className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center shadow-lg",
                  "bg-primary text-primary-foreground hover:shadow-xl transition-all"
                )}
              >
                <Plus className="h-7 w-7" />
              </motion.button>
              <span className="text-3xs font-medium text-muted-foreground mt-0.5">
                {t("chrome.nav.add")}
              </span>
            </div>
          </div>
          {rightTabs.map(renderTab)}
        </div>
      </div>

      <AddGoodsSheet open={isAddOpen} onOpenChange={setIsAddOpen} />
    </>
  );
}
