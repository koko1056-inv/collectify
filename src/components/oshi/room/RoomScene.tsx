import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import {
  FLOOR_Y,
  FURNITURE_DEFS,
  ROOM_WINDOW as WINDOW,
  ROOM_H,
  ROOM_W,
  clampFurniture,
  furnitureSize,
  goodsSize,
  moveFurniture,
  slotFor,
  snapGoods,
  type RoomLayout,
  type RoomState,
  type RoomSurface,
  type TimeOfDay,
} from "@/lib/oshiRoom";
import type { OshiColor } from "@/lib/cosmetics";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { RoomShell } from "./art/RoomShell";
import { FurnitureArt } from "./art/Furniture";
import { GoodsFrame } from "./art/GoodsFrame";
import { SparkleArt } from "./art/FxArt";
import { RoomFx, type GoodsBox } from "./RoomFx";
import type { RoomFxEvent } from "./fx";
import { EDIT_MARK, EVENING_TINT, LAMP_GLOW, LAMP_GLOW_EDGE, LIGHT, SUNBEAM, ensureRoomTheme } from "./palette";

/** 部屋に飾るグッズの見た目に要るもの */
export interface SceneGoods {
  title: string;
  image: string;
  level: number;
  rank: number;
}

export type EditTarget = { type: "furniture" | "goods"; id: string };

interface RoomSceneProps {
  state: RoomState;
  goods: Map<string, SceneGoods>;
  oshi: OshiColor;
  time: TimeOfDay;
  /** view: 自分の部屋（グッズをタップでお世話）/ edit: 模様替え / readonly: 他の人の部屋 */
  mode: "view" | "edit" | "readonly";
  reduceMotion: boolean;
  selectedGoods?: string | null;
  onSelectGoods?: (id: string) => void;
  editTarget?: EditTarget | null;
  onEditTarget?: (t: EditTarget | null) => void;
  onLayoutChange?: (layout: RoomLayout) => void;
  fx?: RoomFxEvent[];
  /** 空いている飾り場所（推しを飾ろう）を1つ見せる。押すと推しグッズを選ぶ画面へ */
  onPlaceholder?: () => void;
  /** お祝い中のグッズ（ぴょんと跳ねる） */
  celebrating?: string | null;
  className?: string;
  /** 部屋の名札（読み上げ用） */
  label: string;
}

const L = (x: number) => `${(x / ROOM_W) * 100}%`;
const T = (y: number) => `${(y / ROOM_H) * 100}%`;
const WP = (u: number) => `${(u / ROOM_W) * 100}%`;
const HP = (u: number) => `${(u / ROOM_H) * 100}%`;

interface DragState {
  target: EditTarget;
  startX: number;
  startY: number;
  /** 押した瞬間の配置（ここからの差分で動かす） */
  base: RoomLayout;
  orig: { x: number; y: number };
  moved: boolean;
  pointerId: number;
}

/**
 * 推しの部屋の1枚の絵。正面から見た部屋に、家具とグッズ（写真のままフレームに入れたもの）を置く。
 *  - 窓の外は日本時間の朝・昼・夕方・夜で変わり、夜は部屋が少し暗くなって明かりが灯る（状態の変化ではなく、時間の雰囲気）
 *  - グッズはふわっと揺れ、ときどききらっと光る
 *  - 模様替えでは、家具とグッズを指でドラッグして動かす。グッズは棚の板・机の天板に吸い付く
 */
export function RoomScene({
  state,
  goods,
  oshi,
  time,
  mode,
  reduceMotion,
  selectedGoods,
  onSelectGoods,
  editTarget,
  onEditTarget,
  onLayoutChange,
  fx = [],
  onPlaceholder,
  celebrating,
  className,
  label,
}: RoomSceneProps) {
  const { t } = useLanguage();
  useEffect(ensureRoomTheme, []);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const [draft, setDraft] = useState<RoomLayout | null>(null);
  const [guide, setGuide] = useState<RoomSurface | null>(null);
  const layout = draft ?? state.layout;
  const editing = mode === "edit";
  const animate = !reduceMotion && !editing;
  const lit = time === "night";

  // ときどき、どれか1つのグッズがきらっと光る（模様替え中は止める）
  const [glint, setGlint] = useState<{ n: number; item: string } | null>(null);
  const placed = layout.goods.filter((g) => goods.has(g.item));
  const placedKey = placed.map((g) => g.item).join(",");
  useEffect(() => {
    if (!animate || !placedKey) return;
    const ids = placedKey.split(",");
    let n = 0;
    const timer = window.setInterval(() => {
      n += 1;
      setGlint({ n, item: ids[(n * 7) % ids.length] });
    }, 5200);
    return () => window.clearInterval(timer);
  }, [animate, placedKey]);

  const boxes = useMemo(() => {
    const m = new Map<string, GoodsBox>();
    for (const g of layout.goods) {
      const { w, h } = goodsSize(g);
      m.set(g.item, { x: g.x, y: g.y, w, h });
    }
    return m;
  }, [layout.goods]);

  const unitsPerPx = () => {
    const rect = ref.current?.getBoundingClientRect();
    return rect && rect.width > 0 ? ROOM_W / rect.width : 1;
  };

  const startDrag = (e: React.PointerEvent, target: EditTarget) => {
    if (!editing) return;
    e.stopPropagation();
    const item = target.type === "furniture" ? state.layout.furniture.find((f) => f.id === target.id) : state.layout.goods.find((g) => g.item === target.id);
    if (!item) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { target, startX: e.clientX, startY: e.clientY, base: state.layout, orig: { x: item.x, y: item.y }, moved: false, pointerId: e.pointerId };
    onEditTarget?.(target);
  };

  const moveDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const k = unitsPerPx();
    const dx = (e.clientX - d.startX) * k;
    const dy = (e.clientY - d.startY) * k;
    if (!d.moved && Math.hypot(dx, dy) < 3) return;
    d.moved = true;
    setDraft(applyMove(d, d.orig.x + dx, d.orig.y + dy, setGuide));
  };

  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    setGuide(null);
    if (d.moved && draft) {
      // 動かした物は、同じ種類の中でいちばん前にする（置いたばかりの物が後ろに隠れないように）
      onLayoutChange?.(toFront(draft, d.target));
    }
    setDraft(null);
  };

  /** キーボードでも動かせるように（矢印で 4 ずつ） */
  const keyMove = (e: React.KeyboardEvent, target: EditTarget) => {
    const step = e.shiftKey ? 12 : 4;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!delta) return;
    e.preventDefault();
    const item = target.type === "furniture" ? state.layout.furniture.find((f) => f.id === target.id) : state.layout.goods.find((g) => g.item === target.id);
    if (!item) return;
    const d: DragState = { target, startX: 0, startY: 0, base: state.layout, orig: { x: item.x, y: item.y }, moved: true, pointerId: -1 };
    onLayoutChange?.(applyMove(d, item.x + delta[0], item.y + delta[1], () => undefined));
  };

  const wall = layout.furniture.filter((f) => FURNITURE_DEFS[f.key]?.layer === "wall").sort((a, b) => a.z - b.z);
  const flat = layout.furniture.filter((f) => FURNITURE_DEFS[f.key]?.layer === "flat").sort((a, b) => a.z - b.z);
  const stand = layout.furniture.filter((f) => FURNITURE_DEFS[f.key]?.layer === "stand").sort((a, b) => a.z - b.z);
  const goodsSorted = [...placed].sort((a, b) => a.z - b.z);
  const dragging = drag.current?.moved ? drag.current.target : null;
  const isDragged = (type: EditTarget["type"], id: string) => !!dragging && dragging.type === type && dragging.id === id;
  const isTarget = (type: EditTarget["type"], id: string) => editing && editTarget?.type === type && editTarget.id === id;
  const lights = layout.furniture.filter((f) => FURNITURE_DEFS[f.key]?.light);
  const placeholder = mode === "view" && onPlaceholder && placed.length < 5 ? slotFor(layout, placed.length) : null;

  const renderFurniture = (f: RoomLayout["furniture"][number]) => {
    const { w, h } = furnitureSize(f);
    const def = FURNITURE_DEFS[f.key];
    const target: EditTarget = { type: "furniture", id: f.id };
    return (
      <div
        key={f.id}
        className={cn("absolute", editing ? "cursor-grab touch-none active:cursor-grabbing" : "pointer-events-none")}
        style={{ left: L(f.x - w / 2), top: T(f.y - h), width: WP(w), height: HP(h), zIndex: isDragged("furniture", f.id) ? 20 : undefined }}
        onPointerDown={editing ? (e) => startDrag(e, target) : undefined}
        onPointerMove={editing ? moveDrag : undefined}
        onPointerUp={editing ? endDrag : undefined}
        onPointerCancel={editing ? endDrag : undefined}
        onKeyDown={editing ? (e) => keyMove(e, target) : undefined}
        role={editing ? "button" : undefined}
        tabIndex={editing ? 0 : undefined}
        aria-label={editing ? t("oshiRoom.decorate.moveAria", { name: t(`oshiRoom.assets.${f.key.replace(".", "_")}`) }) : undefined}
        aria-pressed={editing ? isTarget("furniture", f.id) : undefined}
      >
        {def?.layer === "stand" && (
          <span className="pointer-events-none absolute -bottom-[3%] left-[6%] right-[6%] h-[8%] rounded-[50%]" style={{ background: "radial-gradient(closest-side, var(--room-shadow), transparent)" }} />
        )}
        <div className="h-full w-full" style={f.flip ? { transform: "scaleX(-1)" } : undefined}>
          <FurnitureArt k={f.key} oshi={oshi} animate={animate} lit={lit} />
        </div>
        {editing && <EditOutline active={isTarget("furniture", f.id)} />}
      </div>
    );
  };

  return (
    <div
      ref={ref}
      className={cn("oshi-room relative aspect-[360/420] w-full select-none overflow-hidden rounded-3xl border border-border bg-muted shadow-sm", className)}
      role="group"
      aria-label={label}
      onPointerDown={editing ? () => onEditTarget?.(null) : undefined}
    >
      {/* 絵の層（ダークでは少し明るさを落とす） */}
      <div className="absolute inset-0" style={{ filter: "var(--room-filter)" }}>
        <RoomShell wallpaper={state.wallpaper} floor={state.floor} time={time} oshi={oshi} animate={!reduceMotion} />
        {/* 昼と朝は、窓から床へ光が差す */}
        {(time === "day" || time === "morning") && (
          <svg viewBox={`0 0 ${ROOM_W} ${ROOM_H}`} className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <path d={`M${WINDOW.x + 8} ${WINDOW.y + WINDOW.h} L${WINDOW.x + WINDOW.w - 8} ${WINDOW.y + WINDOW.h} L${WINDOW.x + WINDOW.w + 70} ${ROOM_H} L${WINDOW.x + 20} ${ROOM_H}Z`} fill={SUNBEAM} opacity={time === "morning" ? 0.16 : 0.12} />
          </svg>
        )}
        {wall.map(renderFurniture)}
        {flat.map(renderFurniture)}
        {stand.map(renderFurniture)}

        {goodsSorted.map((g) => {
          const info = goods.get(g.item)!;
          const { w, h } = goodsSize(g);
          const target: EditTarget = { type: "goods", id: g.item };
          const selected = mode !== "edit" && selectedGoods === g.item;
          const common = {
            className: cn(
              "absolute block rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              editing ? "cursor-grab touch-none active:cursor-grabbing" : mode === "view" ? "cursor-pointer" : "cursor-default"
            ),
            style: { left: L(g.x - w / 2), top: T(g.y - h), width: WP(w), height: HP(h), zIndex: isDragged("goods", g.item) ? 21 : undefined } as React.CSSProperties,
          };
          const aria = t("oshiRoom.goodsAria", { rank: info.rank, name: info.title, level: info.level });
          return (
            <div
              key={g.item}
              {...common}
              role="button"
              tabIndex={mode === "readonly" ? -1 : 0}
              aria-label={editing ? t("oshiRoom.decorate.moveAria", { name: info.title }) : aria}
              aria-pressed={editing ? isTarget("goods", g.item) : selected}
              onClick={mode === "view" ? () => onSelectGoods?.(g.item) : mode === "readonly" ? () => onSelectGoods?.(g.item) : undefined}
              onKeyDown={
                editing
                  ? (e) => keyMove(e, target)
                  : (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectGoods?.(g.item);
                      }
                    }
              }
              onPointerDown={editing ? (e) => startDrag(e, target) : undefined}
              onPointerMove={editing ? moveDrag : undefined}
              onPointerUp={editing ? endDrag : undefined}
              onPointerCancel={editing ? endDrag : undefined}
            >
              {/* 足もとの影 */}
              <span className="pointer-events-none absolute -bottom-[4%] left-[8%] right-[8%] h-[9%] rounded-[50%]" style={{ background: "radial-gradient(closest-side, var(--room-shadow), transparent)" }} />
              <motion.div
                className="h-full w-full"
                style={{ transformOrigin: "50% 100%" }}
                animate={
                  celebrating === g.item && !reduceMotion
                    ? { y: [0, -14, 0, -6, 0], scale: [1, 1.08, 1, 1.03, 1] }
                    : animate
                      ? { y: [0, -2.5, 0], rotate: [0, info.rank % 2 ? 0.8 : -0.8, 0] }
                      : { y: 0, rotate: 0 }
                }
                transition={
                  celebrating === g.item
                    ? { duration: 0.9, repeat: 2 }
                    : animate
                      ? { duration: 3.2 + info.rank * 0.35, repeat: Infinity, ease: "easeInOut", delay: info.rank * 0.4 }
                      : { duration: 0.2 }
                }
              >
                <GoodsFrame frame={g.frame} image={info.image} oshi={oshi} level={info.level} imageWidth={w > 70 ? 320 : 240} />
              </motion.div>
              {/* なかよし度の札 */}
              <span className="pointer-events-none absolute -bottom-[2%] left-1/2 -translate-x-1/2 translate-y-1/2 whitespace-nowrap rounded-full bg-primary px-1.5 py-px text-3xs font-bold leading-tight tabular-nums text-primary-foreground shadow">
                Lv.{info.level}
              </span>
              {/* 選んでいるグッズの上に、はずむハート */}
              {selected && (
                <motion.span
                  className="pointer-events-none absolute -top-[22%] left-1/2 w-[34%] min-w-[14px]"
                  // 横の中央寄せは framer の x で（Tailwind の translate は、動きの transform に上書きされる）
                  style={{ x: "-50%" }}
                  animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                >
                  <svg viewBox="0 0 24 20" className="w-full drop-shadow" aria-hidden="true">
                    <path d="M12 19 L2 7 Q0 2 5 1 Q9 0 12 4 Q15 0 19 1 Q24 2 22 7Z" fill="hsl(var(--primary))" stroke={LIGHT} strokeWidth="1.6" />
                  </svg>
                </motion.span>
              )}
              {glint?.item === g.item && animate && (
                <motion.span
                  key={glint.n}
                  className="pointer-events-none absolute -right-[8%] -top-[6%] w-[34%] min-w-[12px]"
                  initial={{ scale: 0, rotate: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.1, 0], rotate: [0, 90], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.1 }}
                >
                  <SparkleArt className="w-full" />
                </motion.span>
              )}
              {editing && <EditOutline active={isTarget("goods", g.item)} />}
            </div>
          );
        })}

        {/* 空いている飾り場所 */}
        {placeholder && (
          <EmptyFrame
            x={placeholder.x}
            y={placeholder.y}
            s={placed.length === 0 ? 1.4 : placeholder.s}
            label={placed.length === 0 ? t("oshiRoom.placeholderFirst") : t("oshiRoom.placeholder")}
            onClick={onPlaceholder!}
            animate={!reduceMotion}
          />
        )}
      </div>

      {/* 時間の雰囲気: 夕方は部屋が少し橙に、夜は暗くなって明かりが灯る */}
      {time === "evening" && <div className="pointer-events-none absolute inset-0 z-10 mix-blend-multiply" style={{ background: EVENING_TINT }} />}
      {time === "night" && (
        <>
          <div className="pointer-events-none absolute inset-0 z-10 mix-blend-multiply" style={{ background: "var(--room-night)" }} />
          {lights.map((f) => {
            const def = FURNITURE_DEFS[f.key]!;
            const light = def.light!;
            const lx = f.x - (def.w / 2) * f.s + (f.flip ? def.w - light.x : light.x) * f.s;
            const ly = f.y - def.h * f.s + light.y * f.s;
            const r = light.r * f.s;
            return (
              <motion.div
                key={f.id}
                className="pointer-events-none absolute z-10 rounded-full mix-blend-screen"
                style={{ left: L(lx - r), top: T(ly - r), width: WP(r * 2), height: HP(r * 2), background: `radial-gradient(closest-side, ${LAMP_GLOW}, ${LAMP_GLOW_EDGE})` }}
                animate={animate ? { opacity: [0.85, 1, 0.85] } : undefined}
                transition={{ duration: 3, repeat: Infinity }}
              />
            );
          })}
        </>
      )}

      {/* 模様替え: 吸い付く面の線と、模様替え中の印 */}
      {editing && guide && (
        <div
          className="pointer-events-none absolute z-20 h-[3px] -translate-y-1/2 rounded-full"
          style={{ left: L(guide.x0), top: T(guide.y), width: WP(guide.x1 - guide.x0), background: "var(--room-guide)", boxShadow: "0 0 6px var(--room-guide)" }}
        />
      )}
      {editing && (
        <div className="pointer-events-none absolute inset-0 z-[5]" style={{ backgroundImage: `radial-gradient(circle, ${EDIT_MARK.grid} 1px, transparent 1.5px)`, backgroundSize: "6% 5.14%" }} />
      )}
      {editing && (
        <div className="pointer-events-none absolute inset-x-0 z-[5] border-t border-dashed" style={{ top: T(FLOOR_Y), borderColor: EDIT_MARK.floorLine }} />
      )}

      <RoomFx events={fx} boxes={boxes} reduceMotion={reduceMotion} />
    </div>
  );
}

function applyMove(d: DragState, x: number, y: number, onGuide: (s: RoomSurface | null) => void): RoomLayout {
  if (d.target.type === "furniture") {
    const f = d.base.furniture.find((v) => v.id === d.target.id);
    if (!f) return d.base;
    return moveFurniture(d.base, f.id, clampFurniture({ ...f, x, y }));
  }
  const g = d.base.goods.find((v) => v.item === d.target.id);
  if (!g) return d.base;
  const { goods, surface } = snapGoods({ ...g, x, y }, d.base.furniture);
  onGuide(surface);
  return { ...d.base, goods: d.base.goods.map((v) => (v.item === g.item ? goods : v)) };
}

function toFront(layout: RoomLayout, target: EditTarget): RoomLayout {
  if (target.type === "furniture") {
    const max = layout.furniture.reduce((m, f) => Math.max(m, f.z), 0);
    return { ...layout, furniture: layout.furniture.map((f) => (f.id === target.id ? { ...f, z: max + 1 } : f)) };
  }
  const max = layout.goods.reduce((m, g) => Math.max(m, g.z), 0);
  return { ...layout, goods: layout.goods.map((g) => (g.item === target.id ? { ...g, z: max + 1 } : g)) };
}

function EditOutline({ active }: { active: boolean }) {
  return (
    <span
      className={cn("pointer-events-none absolute -inset-[3%] rounded-lg border-2", active ? "border-solid" : "border-dashed opacity-60")}
      style={{ borderColor: active ? "var(--room-guide)" : EDIT_MARK.idle, boxShadow: active ? `0 0 0 2px ${EDIT_MARK.halo}` : undefined }}
    />
  );
}

/** 空の額縁（推しを飾ろう） */
function EmptyFrame({ x, y, s, label, onClick, animate }: { x: number; y: number; s: number; label: string; onClick: () => void; animate: boolean }) {
  const { w, h } = goodsSize({ s, frame: "base.frame" });
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute flex flex-col items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      style={{ left: L(x - w / 2), top: T(y - h), width: WP(w), height: HP(h) }}
      aria-label={label}
    >
      <motion.span
        className="flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed"
        style={{ borderColor: "var(--room-placeholder)", background: "var(--room-placeholder-fill)" }}
        animate={animate ? { scale: [1, 1.04, 1] } : undefined}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Plus className="h-[30%] w-[30%] text-primary" strokeWidth={3} />
        <span className="px-0.5 text-center text-[clamp(8px,2.4vw,11px)] font-bold leading-tight text-primary">{label}</span>
      </motion.span>
    </button>
  );
}
