import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUpDown, Camera, Check, Flame, Heart, Loader2, Moon, Paintbrush, Star, Sun, Sunrise, Sunset } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconTile } from "@/components/ui/icon-tile";
import { PhotoCalendar } from "@/components/oshi/PhotoCalendar";
import { TodayPhotoDialog } from "@/components/oshi/TodayPhotoDialog";
import { DailyMissionCard } from "@/components/daily/DailyMissionCard";
import { useDailyMission } from "@/hooks/useDailyMission";
import { RoomScene, type EditTarget, type SceneGoods } from "@/components/oshi/room/RoomScene";
import { GoodsCarePanel } from "@/components/oshi/room/GoodsCarePanel";
import { DecoratePanel } from "@/components/oshi/room/DecoratePanel";
import { LockedSetSheet } from "@/components/oshi/room/LockedSetSheet";
import { RoomLikersSheet } from "@/components/oshi/room/RoomLikersSheet";
import { useOshiRoomLikes } from "@/hooks/useOshiRoomSocial";
import { FX_DURATION, LEVELUP_WITH_REWARDS_MS, type RoomFxEvent } from "@/components/oshi/room/fx";
import { TIER_START, expectedRewards, pickLine, reactionTier, type ServerRewards } from "@/lib/oshiLevel";
import { OshiGoodsEditModal } from "@/components/profile/OshiGoodsEditModal";
import { ItemDetailsModal } from "@/components/ItemDetailsModal";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompanions, useOshiPhotos, type Companion } from "@/hooks/useOshi";
import { roomSaveErrorCode, useProfileOshiRoom, useSaveOshiRoom } from "@/hooks/useOshiRoom";
import { useMyUnlocks } from "@/hooks/useCosmetics";
import { MAX_OSHI_GOODS, levelFromXp, todayJst } from "@/utils/companion";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";
import {
  DEFAULT_FLOOR,
  DEFAULT_WALLPAPER,
  ROOM_ASSETS,
  defaultLayout,
  layoutForSave,
  mergeGoods,
  roomI18nId,
  timeOfDayJst,
  type RoomSet,
  type RoomState,
} from "@/lib/oshiRoom";
import { cn } from "@/lib/utils";

/**
 * 推しの部屋（以前の「推しフォト」）。
 *
 * 以前は推しグッズのカードが縦に並び、ボタンで撫でる・磨くだけだった。たまごっちのように「そこに居る」感じがせず、
 * 愛着がわきにくかったので、正面から見た1部屋に推しグッズを飾り、部屋の中でお世話する形にした。
 *  - グッズは写真のまま、額縁・アクスタ台・缶バッジ・写真立てなどに入れて、棚・机・床・壁に置く
 *  - 放っておいても何も減らない（機嫌・空腹のような状態はない）。毎日のお世話でなかよし度がたまるだけで、
 *    楽しさは演出（部屋の時間の移ろい・待機の揺れ・お世話のアニメ）で出す
 *  - 模様替えで家具・壁紙・床・フレームを選べる。基本セットは無料、季節や推し色のセットはポイントショップで買う
 *  - 1日1枚の推しフォト（カレンダー）は「フォト」のタブに残す
 */
const Oshi = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduceMotion = !!useReducedMotion();
  const companions = useCompanions();
  const photos = useOshiPhotos();
  const room = useProfileOshiRoom(user?.id);
  const saveRoom = useSaveOshiRoom();
  const { owned } = useMyUnlocks();
  // ?item=<id>: コレクション画面のミニ部屋から「この推しのお世話がまだ」で来たとき、そのグッズを選んだ状態で開く。
  // ?likes=1: いいねの通知から来たとき、誰がいいねしたかを開く
  const [searchParams, setSearchParams] = useSearchParams();
  // ?tab=photo: コレクション画面の「推しフォト」から来たとき、写真のタブで開く
  const [tab, setTab] = useState(() => (searchParams.get("tab") === "photo" ? "photo" : "room"));
  const likes = useOshiRoomLikes(user?.id);
  const likersOpen = searchParams.get("likes") === "1";
  const setLikersOpen = (o: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (o) next.set("likes", "1");
    else next.delete("likes");
    setSearchParams(next, { replace: true });
  };
  const [editorOpen, setEditorOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoItem, setPhotoItem] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(() => searchParams.get("item"));
  const [detail, setDetail] = useState<Companion | null>(null);
  const [fx, setFx] = useState<RoomFxEvent[]>([]);
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RoomState | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [locked, setLocked] = useState<{ set: RoomSet; key: string } | null>(null);
  const roomRef = useRef<HTMLDivElement>(null);

  // 窓の外の時間（日本時間）。1分ごとに見直す
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const time = timeOfDayJst(now);

  const list = useMemo(() => companions.data ?? [], [companions.data]);
  const goodsIds = useMemo(() => list.map((c) => c.user_item_id), [list]);
  const goodsMap = useMemo(() => {
    const m = new Map<string, SceneGoods>();
    for (const c of list) m.set(c.user_item_id, { title: c.title, image: c.image, level: levelFromXp(c.xp), rank: c.rank });
    return m;
  }, [list]);

  // 保存されている部屋（まだ無ければ基本の部屋）に、いまの推しグッズを合わせる
  const saved = room.data;
  const baseState = useMemo<RoomState>(
    () => ({
      wallpaper: saved?.wallpaper ?? DEFAULT_WALLPAPER,
      floor: saved?.floor ?? DEFAULT_FLOOR,
      layout: saved?.layout ? mergeGoods(saved.layout, goodsIds) : defaultLayout(goodsIds),
    }),
    [saved, goodsIds]
  );
  const shown = editing && draft ? draft : baseState;
  const oshi = saved?.oshiColor ?? "pink";

  // 選んでいるグッズ（無ければ1位）
  const current: Companion | undefined = list.find((c) => c.user_item_id === selected) ?? list[0];

  const addFx = useCallback((e: Omit<RoomFxEvent, "id">) => {
    const id = Date.now() + Math.random();
    setFx((prev) => [...prev, { ...e, id }]);
    window.setTimeout(() => setFx((prev) => prev.filter((v) => v.id !== id)), e.duration ?? FX_DURATION[e.kind]);
  }, []);

  // なかよしレベルの反応（タップ・お世話のあと）。ひとことは出すときに選び、直前と同じ言葉は続けない
  const lastLine = useRef<number | undefined>(undefined);
  const react = useCallback(
    (c: Companion, delay = 0) => {
      const level = levelFromXp(c.xp);
      const line = pickLine(reactionTier(level), Math.random(), lastLine.current);
      if (line) lastLine.current = line.n;
      const fire = () => addFx({ kind: "react", item: c.user_item_id, level, line: line?.key });
      if (delay > 0) window.setTimeout(fire, delay);
      else fire();
    },
    [addFx]
  );

  // 部屋のグッズをタップ: はじめはそのグッズを選んで（反応して）お世話のパネルを出し、選んでいるグッズをもう一度タップすると詳細を開く。
  // 1回で詳細を開くと、毎日のお世話のたびにダイアログを閉じる手間がかかる
  const selectGoods = (id: string) => {
    const hit = list.find((c) => c.user_item_id === id);
    if (!hit) return;
    if (id === selected) {
      setDetail(hit);
      return;
    }
    setSelected(id);
    react(hit);
  };

  /**
   * レベルアップのお祝い（部屋じゅうの紙吹雪と、称号・特典の札）と通知。
   * 特典はサーバーが返したもの（受け取ったポイント・はじめて解放したセット）。返ってこないとき（写真の保存から・古いサーバー）は見込みを出す
   */
  const celebrate = useCallback(
    (level: number, c: Companion, rewards: ServerRewards | null, fromLevel: number) => {
      const got = rewards ?? expectedRewards(fromLevel, level, owned);
      const unlocks = ROOM_ASSETS.filter((a) => (got.unlocked as string[]).includes(a.set)).map((a) => a.key);
      // この間に反応の段階が上がったか（Lv4・7・10）
      const tierUp = ([4, 3, 2] as const).find((tier) => TIER_START[tier] > fromLevel && TIER_START[tier] <= level);
      const hasRewards = got.points > 0 || unlocks.length > 0 || !!tierUp;
      addFx({ kind: "levelup", level, name: c.title, points: got.points, unlocks, tierUp, duration: hasRewards ? LEVELUP_WITH_REWARDS_MS : undefined });
      setCelebrating(c.user_item_id);
      window.setTimeout(() => setCelebrating(null), 2800);
      const extras = [
        got.points > 0 ? t("oshiRoom.fx.points", { n: got.points }) : null,
        unlocks.length > 0 ? t("oshiRoom.fx.unlocked", { names: unlocks.map((k) => t(`oshiRoom.assets.${roomI18nId(k)}`)).join(t("oshiRoom.fx.listSep")) }) : null,
      ].filter(Boolean);
      toast.success(t("engage.oshi.levelUp", { name: c.title, level }), {
        description: [t(`engage.oshi.levelTitle.${level}`), ...extras].join(" ・ "),
        duration: hasRewards ? 8000 : 6000,
      });
    },
    [addFx, owned, t]
  );

  // ?mission=1: 今日のミッションの「撮る」から来たとき、そのグッズを選んで撮る画面を開く
  const { data: mission } = useDailyMission();
  const missionParam = searchParams.get("mission") === "1";
  useEffect(() => {
    if (!missionParam || !mission) return;
    if (mission.item && !mission.completed) {
      setPhotoItem(mission.item.id);
      setPhotoOpen(true);
    }
    const next = new URLSearchParams(searchParams);
    next.delete("mission");
    setSearchParams(next, { replace: true });
  }, [missionParam, mission, searchParams, setSearchParams]);

  const openPhoto = (c?: Companion) => {
    setPhotoItem(c?.user_item_id ?? null);
    setPhotoOpen(true);
  };

  /** 推しフォトを保存できた。撮ったグッズが今日まだ撮っていなければ +3 の演出（サーバーと同じ決まり） */
  const onPhotoSaved = (itemId: string | null) => {
    const c = list.find((v) => v.user_item_id === itemId);
    if (!c || c.last_photo_on === todayJst()) return;
    addFx({ kind: "photoDone", item: c.user_item_id, xp: 3 });
    const before = levelFromXp(c.xp);
    const after = levelFromXp(c.xp + 3);
    if (after > before) {
      // 写真の保存はサーバーの特典の答えを受け取らないので、見込み（表と、まだ持っていないセット）で見せる
      window.setTimeout(() => celebrate(after, c, null, before), reduceMotion ? 0 : 900);
    }
  };

  const startEditing = () => {
    setDraft(baseState);
    setEditTarget(null);
    setEditing(true);
    toast.dismiss();
    roomRef.current?.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  };

  const dirty = editing && !!draft && JSON.stringify(draft) !== JSON.stringify(baseState);

  const stopEditing = () => {
    if (dirty && !window.confirm(t("oshiRoom.decorate.leaveConfirm"))) return;
    setEditing(false);
    setDraft(null);
    setEditTarget(null);
  };

  const save = async () => {
    if (!draft) return;
    try {
      await saveRoom.mutateAsync({ wallpaper: draft.wallpaper, floor: draft.floor, layout: layoutForSave(draft.layout, goodsIds) });
      toast.success(t("oshiRoom.decorate.saved"));
      setEditing(false);
      setDraft(null);
      setEditTarget(null);
    } catch (e) {
      console.error("save room failed:", e);
      toast.error(roomSaveErrorCode(e) === "room_item_locked" ? t("oshiRoom.decorate.lockedSaveFailed") : t("oshiRoom.decorate.saveFailed"));
    }
  };

  const loading = companions.isLoading || room.isLoading;
  const TimeIcon = time === "morning" ? Sunrise : time === "day" ? Sun : time === "evening" ? Sunset : Moon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-4 pb-nav md:max-w-4xl md:py-5">
        {/* 戻るボタンは見出しの横に置く（見出しの上の小さな「戻る」では気づかれなかった） */}
        <header className="mb-2 flex items-center gap-1 md:mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 h-10 w-10 shrink-0 rounded-full"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/collection"))}
            aria-label={t("chrome.common.back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold md:text-2xl">{t("engage.oshi.pageTitle")}</h1>
            {/* スマホでは説明を出さない（部屋とお世話のボタンを、スクロールなしで1画面に収めるため） */}
            <p className="hidden text-sm text-muted-foreground md:block">{t("engage.oshi.pageSub")}</p>
          </div>
          {/* もらったいいね。押すと誰がいいねしたか（みんなの「お部屋」に並んでいることに気づくきっかけにもなる） */}
          {tab === "room" && !editing && !loading && list.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1 rounded-xl px-2.5"
              onClick={() => setLikersOpen(true)}
              aria-label={t("oshiRoom.social.likers.open", { n: likes.data?.likes ?? 0 })}
              data-testid="oshi-likes"
            >
              <Heart className={cn("h-4 w-4", (likes.data?.likes ?? 0) > 0 ? "fill-primary text-primary" : "text-muted-foreground")} />
              <span className="tabular-nums">{likes.data?.likes ?? 0}</span>
            </Button>
          )}
          {/* 模様替え中は、部屋のすぐ上にも保存を出す（下の道具の帯だけだと見落とされていた） */}
          {editing && draft && (
            <Button size="sm" className="shrink-0 gap-1.5 rounded-xl" onClick={save} disabled={saveRoom.isPending}>
              {saveRoom.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saveRoom.isPending ? t("oshiRoom.decorate.saving") : t("oshiRoom.decorate.save")}
            </Button>
          )}
          {tab === "room" && !editing && !loading && (
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5 rounded-xl" onClick={startEditing} data-tour="oshi-room-decorate">
              <Paintbrush className="h-4 w-4" />
              {t("oshiRoom.decorate.open")}
            </Button>
          )}
        </header>

        <Tabs value={tab} onValueChange={(v) => (editing ? undefined : setTab(v))}>
          {!editing && (
            <TabsList className="mb-3 h-9 w-full md:w-80">
              <TabsTrigger value="room" className="flex-1">
                {t("oshiRoom.tabRoom")}
              </TabsTrigger>
              <TabsTrigger value="photo" className="flex-1">
                {t("oshiRoom.tabPhoto")}
              </TabsTrigger>
            </TabsList>
          )}

          {/* スマホ: 部屋の下に、お世話のバー（部屋に少し重ねる）とパネル。
              部屋の幅は「画面の高さから見出し・タブ・お世話のバー・下タブの分を引いた高さ」に収まるように縮める。
              PC（md 以上）: 左に部屋、右にパネルを並べ、パネルが最初から見えるようにする */}
          <TabsContent value="room" className="mt-0 md:grid md:grid-cols-[minmax(0,1fr)_23rem] md:items-start md:gap-5">
            <div
              ref={roomRef}
              className="relative mx-auto w-[min(100%,calc((100dvh_-_330px)*360/420))] scroll-mt-20 md:w-[min(100%,calc((100dvh_-_170px)*360/420))]"
              data-tour="oshi-room"
            >
              {loading ? (
                <Skeleton className="aspect-[360/420] w-full rounded-3xl" />
              ) : (
                <>
                  <RoomScene
                    state={shown}
                    goods={goodsMap}
                    oshi={oshi}
                    time={time}
                    mode={editing ? "edit" : "view"}
                    reduceMotion={reduceMotion}
                    selectedGoods={current?.user_item_id ?? null}
                    onSelectGoods={selectGoods}
                    editTarget={editTarget}
                    onEditTarget={setEditTarget}
                    onLayoutChange={(layout) => setDraft((d) => (d ? { ...d, layout } : d))}
                    fx={fx}
                    onPlaceholder={() => setEditorOpen(true)}
                    celebrating={celebrating}
                    label={t("oshiRoom.roomAria")}
                  />
                  {/* 部屋の上の札: 時間と、今日の1枚 */}
                  {!editing ? (
                    <>
                      <span className="pointer-events-none absolute left-2.5 top-2.5 z-40 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-2xs font-bold shadow-sm backdrop-blur-sm">
                        <TimeIcon className="h-3.5 w-3.5 text-primary" />
                        {t(`oshiRoom.time.${time}`)}
                      </span>
                      <button
                        type="button"
                        onClick={() => openPhoto()}
                        className="absolute right-2.5 top-2.5 z-40 inline-flex items-center gap-1 rounded-full bg-background/85 px-2.5 py-1 text-2xs font-bold shadow-sm backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                        aria-label={`${t("engage.oshi.todayCard")}: ${photos.todayDone ? t("engage.oshi.todayDone") : t("engage.oshi.todayNotYet")}`}
                      >
                        {photos.todayDone ? <Check className="h-3.5 w-3.5 text-primary" /> : <Camera className="h-3.5 w-3.5 text-primary" />}
                        {t("oshiRoom.todayPhoto")}
                        {photos.streak > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-points">
                            <Flame className="h-3 w-3" />
                            <span className="tabular-nums">{photos.streak}</span>
                          </span>
                        )}
                      </button>
                    </>
                  ) : (
                    <span className="pointer-events-none absolute left-1/2 top-2.5 z-40 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-2xs font-bold text-primary-foreground shadow">
                      {t("oshiRoom.decorate.open")}
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="mt-3 space-y-3 md:mt-0">
              {loading ? (
                <Skeleton className="h-44 w-full rounded-3xl" />
              ) : editing && draft ? (
                <DecoratePanel
                  state={draft}
                  onChange={setDraft}
                  target={editTarget}
                  onTarget={setEditTarget}
                  goods={goodsMap}
                  goodsOrder={goodsIds}
                  owned={owned}
                  oshi={oshi}
                  onLocked={(set, key) => setLocked({ set, key })}
                  onSave={save}
                  onCancel={stopEditing}
                  onReset={() => {
                    setDraft({ wallpaper: DEFAULT_WALLPAPER, floor: DEFAULT_FLOOR, layout: defaultLayout(goodsIds) });
                    setEditTarget(null);
                    toast(t("oshiRoom.decorate.resetDone"));
                  }}
                  saving={saveRoom.isPending}
                  dirty={dirty}
                />
              ) : list.length === 0 ? (
                <section className="rounded-3xl border border-dashed bg-card p-5 text-center">
                  <div className="mx-auto mb-2 w-fit">
                    <IconTile tone="primary" size="md">
                      <Star />
                    </IconTile>
                  </div>
                  <h2 className="text-base font-bold">{t("oshiRoom.emptyTitle")}</h2>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{t("oshiRoom.emptyDesc", { max: MAX_OSHI_GOODS })}</p>
                  <Button className="mt-4 gap-1.5 rounded-xl" onClick={() => setEditorOpen(true)}>
                    <Star className="h-4 w-4" />
                    {t("oshiRoom.choose")}
                  </Button>
                </section>
              ) : (
                // 推しグッズの切り替え（部屋の中の小さなグッズも、ここから選べる）はパネルの頭に入れる。
                // 別の行にすると、スマホでお世話のボタンが画面の下に押し出される
                current && (
                  <GoodsCarePanel
                    key={current.user_item_id}
                    companion={current}
                    onFx={addFx}
                    onReact={react}
                    owned={owned}
                    oshi={oshi}
                    onPhoto={openPhoto}
                    onLevelUp={celebrate}
                    onDetail={() => setDetail(current)}
                    header={
                      <div className="flex items-center gap-2">
                        <div className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 py-1 scrollbar-hide" role="radiogroup" aria-label={t("oshiRoom.pickHint")}>
                          {list.map((c) => {
                            const active = c.user_item_id === current?.user_item_id;
                            const today = todayJst();
                            const done = [c.last_pat_on, c.last_polish_on, c.last_photo_on].filter((d) => d === today).length;
                            return (
                              <button
                                key={c.user_item_id}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                aria-label={t("oshiRoom.goodsAria", { rank: c.rank, name: c.title, level: levelFromXp(c.xp) })}
                                onClick={() => setSelected(c.user_item_id)}
                                className={cn(
                                  "relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border-2 bg-muted transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                                  active ? "scale-105 border-primary shadow" : "border-transparent opacity-75"
                                )}
                              >
                                <img src={getOptimizedImageUrl(c.image, { width: 96 })} onError={fallbackToOriginal(c.image)} alt="" className="h-full w-full object-cover" loading="lazy" />
                                <span className="absolute left-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background text-3xs font-bold tabular-nums">{c.rank}</span>
                                {/* 今日のお世話がぜんぶ済んだら印 */}
                                {done === 3 && (
                                  <span className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <Button variant="ghost" size="sm" className="h-10 shrink-0 gap-1 rounded-xl px-2 text-2xs text-muted-foreground" onClick={() => setEditorOpen(true)}>
                          <ArrowUpDown className="h-3.5 w-3.5" />
                          <span className="tabular-nums">{t("engage.oshi.companions", { n: list.length, max: MAX_OSHI_GOODS })}</span>
                          <span className="sr-only">{t("oshiRoom.editGoods")}</span>
                        </Button>
                      </div>
                    }
                  />
                )
              )}
            </div>
          </TabsContent>

          <TabsContent value="photo" className="mx-auto mt-0 max-w-lg">
            {/* 今日のミッション（推しグッズと、日替わりの写真のお題） */}
            <DailyMissionCard className="mb-3" onShoot={(id) => { setPhotoItem(id); setPhotoOpen(true); }} />
            {/* 今日の1枚 */}
            <section className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-background p-4">
              <IconTile tone={photos.streak > 0 ? "warning" : "muted"} size="md">
                <Flame />
              </IconTile>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{photos.streak > 0 ? t("engage.oshi.streak", { n: photos.streak }) : t("engage.oshi.streakNone")}</p>
                <p className="text-xs text-muted-foreground">
                  {photos.todayDone ? t("engage.oshi.todayDone") : t("engage.oshi.todayNotYet")}
                  <span className="ml-2 tabular-nums">{t("engage.oshi.total", { n: photos.total })}</span>
                </p>
              </div>
              <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => openPhoto()}>
                <Camera className="h-4 w-4" />
                {t("engage.oshi.shoot")}
              </Button>
            </section>
            {photos.isLoading ? (
              <Skeleton className="h-72 w-full rounded-2xl" />
            ) : (
              <>
                <PhotoCalendar photos={photos.photos} />
                {photos.total === 0 && <p className="mt-4 text-center text-sm text-muted-foreground">{t("engage.oshi.calendarEmpty")}</p>}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {user && <OshiGoodsEditModal open={editorOpen} onOpenChange={setEditorOpen} userId={user.id} />}
      {detail && (
        <ItemDetailsModal
          itemId={detail.user_item_id}
          title={detail.title}
          image={detail.image}
          contentName={detail.content_name}
          isUserItem
          userId={user?.id}
          isOpen={!!detail}
          onClose={() => setDetail(null)}
        />
      )}
      <RoomLikersSheet open={likersOpen} onOpenChange={setLikersOpen} />
      <TodayPhotoDialog open={photoOpen} onOpenChange={setPhotoOpen} initialItemId={photoItem} onSaved={onPhotoSaved} />
      <LockedSetSheet
        set={locked?.set ?? null}
        itemKey={locked?.key}
        oshi={oshi}
        onOpenChange={(o) => !o && setLocked(null)}
        onGoShop={(key) => {
          // 模様替えの途中なら、保存していない変更が消えることを先に確かめる
          const changed = editing && draft && JSON.stringify(draft) !== JSON.stringify(baseState);
          if (changed && !window.confirm(t("oshiRoom.decorate.leaveConfirm"))) return;
          setLocked(null);
          navigate(`/point-shop?item=${encodeURIComponent(key)}`);
        }}
      />
      <Footer />
    </div>
  );
};

export default Oshi;
