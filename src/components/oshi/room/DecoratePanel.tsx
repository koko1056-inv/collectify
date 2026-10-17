import { useState } from "react";
import { ArrowDownToLine, ArrowUpToLine, FlipHorizontal2, Loader2, Lock, Minus, PackageOpen, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  FRAME_DEFS,
  MAX_FURNITURE,
  SCALE_MAX,
  SCALE_MIN,
  assetsOfKind,
  bringTo,
  clampGoods,
  isAssetUsable,
  moveFurniture,
  placeNewFurniture,
  removeFurniture,
  roomAsset,
  roomI18nId,
  setUnlockLevel,
  snapGoods,
  type RoomAssetKind,
  type RoomAssetMeta,
  type RoomSet,
  type RoomState,
} from "@/lib/oshiRoom";
import type { OshiColor } from "@/lib/cosmetics";
import { cn } from "@/lib/utils";
import { fallbackToOriginal, getOptimizedImageUrl } from "@/utils/optimized-image";
import { RoomShell } from "./art/RoomShell";
import { FurnitureArt } from "./art/Furniture";
import { GoodsFrame } from "./art/GoodsFrame";
import type { EditTarget, SceneGoods } from "./RoomScene";

interface DecoratePanelProps {
  state: RoomState;
  onChange: (next: RoomState) => void;
  target: EditTarget | null;
  onTarget: (t: EditTarget | null) => void;
  goods: Map<string, SceneGoods>;
  /** 推しグッズの id（順位の順） */
  goodsOrder: string[];
  owned: ReadonlySet<string>;
  oshi: OshiColor;
  /** 鍵の付いた物を押したとき（ショップの案内を出す） */
  onLocked: (set: RoomSet, key: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
  saving: boolean;
  /** 保存していない変更があるか（保存の帯に一言出す） */
  dirty?: boolean;
}

/**
 * 模様替えの道具（部屋の下に出す）。
 *  - 選んだ物: 重なり順（前へ・後ろへ）、大きさ、左右反転、しまう
 *  - 家具 / 壁紙 / 床 / フレーム の棚。買っていないセットの物は鍵を付けて見せ、押すとショップの案内へ
 *  - 保存 / やめる（棚が長くて下の方に隠れ、押されずに終わっていたので、画面の下に貼り付けておく）
 */
export function DecoratePanel({ state, onChange, target, onTarget, goods, goodsOrder, owned, oshi, onLocked, onSave, onCancel, onReset, saving, dirty }: DecoratePanelProps) {
  const { t } = useLanguage();
  const [tab, setTab] = useState("furniture");
  const layout = state.layout;
  const name = (key: string) => t(`oshiRoom.assets.${roomI18nId(key)}`);

  const selectedFurniture = target?.type === "furniture" ? layout.furniture.find((f) => f.id === target.id) : undefined;
  const selectedGoods = target?.type === "goods" ? layout.goods.find((g) => g.item === target.id) : undefined;
  const selectedName = selectedFurniture ? name(selectedFurniture.key) : selectedGoods ? goods.get(selectedGoods.item)?.title : null;
  // フレームの棚で着せ替えるグッズ（選んでいなければ1位）
  const frameItem = selectedGoods?.item ?? goodsOrder.find((id) => layout.goods.some((g) => g.item === id)) ?? null;

  const setLayout = (next: RoomState["layout"]) => onChange({ ...state, layout: next });

  // 棚の並び: 使える物（基本・持っているセット・単品・解放済みの特典）→ レベルで解放される物 → ショップの物。
  // セットが増えて棚が長くなったので、いま置ける物を上に集める（同じ組の中は目録の順）
  const shelf = (kind: RoomAssetKind) => {
    const rank = (m: RoomAssetMeta) => (isAssetUsable(m.key, owned) ? 0 : setUnlockLevel(m.set) !== null ? 1 : 2);
    return assetsOfKind(kind)
      .map((m, i) => ({ m, i }))
      .sort((a, b) => rank(a.m) - rank(b.m) || a.i - b.i)
      .map((v) => v.m);
  };

  const order = (where: "forward" | "backward") => {
    if (selectedFurniture) {
      const i = layout.furniture.findIndex((f) => f.id === selectedFurniture.id);
      setLayout({ ...layout, furniture: bringTo(layout.furniture, i, where) });
    } else if (selectedGoods) {
      const i = layout.goods.findIndex((g) => g.item === selectedGoods.item);
      setLayout({ ...layout, goods: bringTo(layout.goods, i, where) });
    }
  };

  const resize = (delta: number) => {
    if (selectedFurniture) {
      const s = Math.round(Math.min(SCALE_MAX, Math.max(SCALE_MIN, selectedFurniture.s + delta)) * 10) / 10;
      setLayout(moveFurniture(layout, selectedFurniture.id, { ...selectedFurniture, s }));
    } else if (selectedGoods) {
      const s = Math.round(Math.min(SCALE_MAX, Math.max(SCALE_MIN, selectedGoods.s + delta)) * 10) / 10;
      // 大きさが変わっても、置いていた面の上に立ったままにする
      const next = selectedGoods.on ? snapGoods({ ...selectedGoods, s }, layout.furniture).goods : clampGoods({ ...selectedGoods, s });
      setLayout({ ...layout, goods: layout.goods.map((g) => (g.item === selectedGoods.item ? next : g)) });
    }
  };

  const flip = () => {
    if (!selectedFurniture) return;
    setLayout(moveFurniture(layout, selectedFurniture.id, { ...selectedFurniture, flip: !selectedFurniture.flip }));
  };

  const remove = () => {
    if (!selectedFurniture) return;
    setLayout(removeFurniture(layout, selectedFurniture.id));
    onTarget(null);
  };

  const addFurniture = (meta: RoomAssetMeta) => {
    if (!isAssetUsable(meta.key, owned)) return onLocked(meta.set, meta.key);
    if (layout.furniture.length >= MAX_FURNITURE) {
      toast.error(t("oshiRoom.decorate.furnitureFull", { max: MAX_FURNITURE }));
      return;
    }
    const next = placeNewFurniture(layout, meta.key);
    setLayout(next);
    onTarget({ type: "furniture", id: next.furniture[next.furniture.length - 1].id });
  };

  const pickSurface = (meta: RoomAssetMeta) => {
    if (!isAssetUsable(meta.key, owned)) return onLocked(meta.set, meta.key);
    onChange(meta.kind === "wallpaper" ? { ...state, wallpaper: meta.key } : { ...state, floor: meta.key });
  };

  const pickFrame = (meta: RoomAssetMeta) => {
    if (!isAssetUsable(meta.key, owned)) return onLocked(meta.set, meta.key);
    if (!frameItem) return;
    setLayout({
      ...layout,
      goods: layout.goods.map((g) => {
        if (g.item !== frameItem) return g;
        // フレームが変わると縦の長さが変わる。面の上に置いていたら、面に立たせ直す
        const next = { ...g, frame: meta.key };
        return g.on ? snapGoods(next, layout.furniture).goods : clampGoods(next);
      }),
    });
    onTarget({ type: "goods", id: frameItem });
  };

  return (
    <section className="rounded-3xl border bg-card p-3 shadow-sm" aria-label={t("oshiRoom.decorate.open")}>
      {/* 選んだ物の道具 */}
      <div className="min-h-[3.25rem] rounded-2xl bg-muted/50 p-2">
        {selectedName ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="mr-auto min-w-0 truncate px-1 text-xs font-bold">{t("oshiRoom.decorate.selectedLabel", { name: selectedName })}</p>
            <ToolButton icon={<ArrowDownToLine className="h-4 w-4" />} label={t("oshiRoom.decorate.back")} onClick={() => order("backward")} />
            <ToolButton icon={<ArrowUpToLine className="h-4 w-4" />} label={t("oshiRoom.decorate.front")} onClick={() => order("forward")} />
            <ToolButton icon={<Minus className="h-4 w-4" />} label={t("oshiRoom.decorate.smaller")} onClick={() => resize(-0.1)} disabled={(selectedFurniture?.s ?? selectedGoods?.s ?? 1) <= SCALE_MIN} />
            <ToolButton icon={<Plus className="h-4 w-4" />} label={t("oshiRoom.decorate.bigger")} onClick={() => resize(0.1)} disabled={(selectedFurniture?.s ?? selectedGoods?.s ?? 1) >= SCALE_MAX} />
            {selectedFurniture && (
              <>
                <ToolButton icon={<FlipHorizontal2 className="h-4 w-4" />} label={t("oshiRoom.decorate.flip")} onClick={flip} />
                <ToolButton icon={<PackageOpen className="h-4 w-4" />} label={t("oshiRoom.decorate.remove")} onClick={remove} />
              </>
            )}
          </div>
        ) : (
          <p className="px-1 py-1 text-2xs leading-relaxed text-muted-foreground">{t("oshiRoom.decorate.hint")}</p>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-3">
        <TabsList className="w-full">
          <TabsTrigger value="furniture" className="flex-1 text-xs">{t("oshiRoom.decorate.tabFurniture")}</TabsTrigger>
          <TabsTrigger value="wallpaper" className="flex-1 text-xs">{t("oshiRoom.decorate.tabWallpaper")}</TabsTrigger>
          <TabsTrigger value="floor" className="flex-1 text-xs">{t("oshiRoom.decorate.tabFloor")}</TabsTrigger>
          <TabsTrigger value="frame" className="flex-1 text-xs">{t("oshiRoom.decorate.tabFrame")}</TabsTrigger>
        </TabsList>

        <TabsContent value="furniture" className="mt-2">
          <p className="mb-1.5 text-right text-3xs tabular-nums text-muted-foreground">{t("oshiRoom.decorate.furnitureCount", { n: layout.furniture.length, max: MAX_FURNITURE })}</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {shelf("furniture").map((m) => (
              <Tile key={m.key} meta={m} label={name(m.key)} locked={!isAssetUsable(m.key, owned)} onClick={() => addFurniture(m)}>
                <span className="block h-[78%] w-[78%]">
                  <FurnitureArt k={m.key} oshi={oshi} animate={false} lit={false} />
                </span>
              </Tile>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="wallpaper" className="mt-2">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {shelf("wallpaper").map((m) => (
              <Tile key={m.key} meta={m} label={name(m.key)} locked={!isAssetUsable(m.key, owned)} active={state.wallpaper === m.key} onClick={() => pickSurface(m)} bare>
                <RoomShell wallpaper={m.key} floor={state.floor} time="day" oshi={oshi} animate={false} />
              </Tile>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="floor" className="mt-2">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {shelf("floor").map((m) => (
              <Tile key={m.key} meta={m} label={name(m.key)} locked={!isAssetUsable(m.key, owned)} active={state.floor === m.key} onClick={() => pickSurface(m)} bare>
                <RoomShell wallpaper={state.wallpaper} floor={m.key} time="day" oshi={oshi} animate={false} />
              </Tile>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="frame" className="mt-2">
          {goodsOrder.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">{t("oshiRoom.emptyTitle")}</p>
          ) : (
            <>
              <p className="mb-1.5 text-2xs text-muted-foreground">{t("oshiRoom.decorate.chooseGoodsForFrame")}</p>
              <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-hide" role="radiogroup" aria-label={t("oshiRoom.decorate.chooseGoodsForFrame")}>
                {goodsOrder.map((id) => {
                  const g = goods.get(id);
                  if (!g) return null;
                  const active = id === frameItem;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={g.title}
                      onClick={() => onTarget({ type: "goods", id })}
                      className={cn("relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 bg-muted", active ? "border-primary" : "border-transparent opacity-70")}
                    >
                      <img src={getOptimizedImageUrl(g.image, { width: 96 })} onError={fallbackToOriginal(g.image)} alt="" className="h-full w-full object-cover" loading="lazy" />
                      <span className="absolute left-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background text-3xs font-bold tabular-nums">{g.rank}</span>
                    </button>
                  );
                })}
              </div>
              {frameItem && (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5" role="group" aria-label={t("oshiRoom.decorate.frameFor", { name: goods.get(frameItem)?.title ?? "" })}>
                  {shelf("frame").map((m) => {
                    const current = layout.goods.find((g) => g.item === frameItem)?.frame;
                    const def = FRAME_DEFS[m.key];
                    return (
                      <Tile key={m.key} meta={m} label={name(m.key)} locked={!isAssetUsable(m.key, owned)} active={current === m.key} onClick={() => pickFrame(m)}>
                        <span className="block h-[80%]" style={{ aspectRatio: `1 / ${def.aspect}` }}>
                          <GoodsFrame frame={m.key} image={goods.get(frameItem)?.image ?? null} oshi={oshi} imageWidth={120} />
                        </span>
                      </Tile>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Button variant="ghost" size="sm" className="mt-2 gap-1 px-2 text-2xs text-muted-foreground" onClick={onReset} disabled={saving}>
        <RotateCcw className="h-3.5 w-3.5" />
        {t("oshiRoom.decorate.reset")}
      </Button>

      {/* 保存の帯。スクロールしても下タブのすぐ上（PC は画面の下）に残る */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] z-30 -mx-3 -mb-3 mt-2 flex items-center gap-2 rounded-b-3xl border-t bg-card/95 px-3 py-2.5 shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.15)] backdrop-blur-sm sm:bottom-2">
        <p className={cn("min-w-0 flex-1 text-2xs leading-snug", dirty ? "font-bold text-primary" : "text-muted-foreground")} aria-live="polite">
          {dirty ? t("oshiRoom.decorate.unsaved") : t("oshiRoom.decorate.noChanges")}
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" className="rounded-xl" onClick={onCancel} disabled={saving}>
            {t("oshiRoom.decorate.cancel")}
          </Button>
          <Button className="min-w-[6.5rem] gap-1.5 rounded-xl" onClick={onSave} disabled={saving} data-testid="oshi-room-save">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? t("oshiRoom.decorate.saving") : t("oshiRoom.decorate.save")}
          </Button>
        </div>
      </div>
    </section>
  );
}

function ToolButton({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button type="button" variant="outline" size="sm" className="h-9 gap-1 rounded-xl bg-card px-2 text-2xs" onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

/** 棚の1枠。買っていないセットの物は鍵と、セットの名前を出す */
function Tile({
  meta,
  label,
  locked,
  active = false,
  onClick,
  children,
  bare = false,
}: {
  meta: RoomAssetMeta;
  label: string;
  locked: boolean;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** 絵を枠いっぱいに（壁紙・床の見本） */
  bare?: boolean;
}) {
  const { t } = useLanguage();
  const set = roomAsset(meta.key)?.set ?? "base";
  // なかよしレベルの特典は「Lv5で解放」と出す（ショップでは買えないので、セット名より達成の条件が分かるほうがいい）
  const unlockLevel = setUnlockLevel(set);
  const setLabel = unlockLevel !== null && locked ? t("oshiRoom.decorate.unlockAt", { level: unlockLevel }) : t(`oshiRoom.sets.${set}`);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={locked ? `${label}（${t("oshiRoom.decorate.locked")}・${setLabel}）` : label}
      className="group flex min-w-0 flex-col items-center gap-1 text-center focus-visible:outline-none"
    >
      <span
        className={cn(
          "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 bg-muted/40 transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ring",
          active ? "border-primary" : "border-transparent group-hover:border-border",
          bare && "items-stretch justify-stretch"
        )}
      >
        {bare ? <span className="relative block h-full w-full">{children}</span> : children}
        {locked && (
          <span className="absolute inset-0 flex items-start justify-end bg-background/35 p-1">
            {unlockLevel !== null ? (
              // レベルの特典は鍵ではなく、届けば開く「Lv5」の札
              <span className="rounded-full bg-points px-1.5 py-px text-3xs font-black tabular-nums text-points-foreground shadow">Lv{unlockLevel}</span>
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/75 text-background shadow">
                <Lock className="h-3 w-3" />
              </span>
            )}
          </span>
        )}
        {active && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 text-3xs font-bold text-primary-foreground">{t("oshiRoom.decorate.inUse")}</span>}
      </span>
      <span className="w-full truncate text-3xs font-medium leading-tight">{label}</span>
      {set !== "base" && (
        <span className={cn("-mt-0.5 w-full truncate text-3xs leading-tight", locked ? (unlockLevel !== null ? "font-bold text-points" : "text-muted-foreground") : "text-primary")}>{setLabel}</span>
      )}
    </button>
  );
}
