import { useEffect, useState } from "react";
import { Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PointIcon } from "@/components/ui/point-icon";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEquipCosmetic, useMyUnlocks, useUnlockItems } from "@/hooks/useCosmetics";
import {
  COVER_KEYS,
  FRAME_KEYS,
  OSHI_COLORS,
  OSHI_COLOR_KEYS,
  cosmeticI18nId,
  isCoverKey,
  isFrameKey,
  resolveOshiColor,
  type CoverKey,
  type FrameKey,
  type OshiColor,
} from "@/lib/cosmetics";
import type { Profile } from "@/types";
import { CoverArt } from "./CoverArt";
import { AvatarFrame } from "./AvatarFrame";
import { DefaultCover } from "./DefaultCover";
import { UnlockConfirmDialog } from "./UnlockConfirmDialog";

type Tab = "cover" | "frame";

/**
 * プロフィールの着せ替え（本人だけが開ける）。
 * 見本を押すと上のプレビューに反映し、持っていれば「これにする」、持っていなければ解放へ進む。
 * 「標準」「なし」は無料。付けたものは profiles に保存され、プロフィールを見た人にも見える。
 */
export function CosmeticsSheet({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
}) {
  const { t } = useLanguage();
  const { owned } = useMyUnlocks();
  const { byKey } = useUnlockItems();
  const equip = useEquipCosmetic();

  const equippedCover = isCoverKey(profile.profile_cover_key) ? profile.profile_cover_key : null;
  const equippedFrame = isFrameKey(profile.avatar_frame_key) ? profile.avatar_frame_key : null;
  const equippedColor = resolveOshiColor(profile.profile_oshi_color);

  const [tab, setTab] = useState<Tab>("cover");
  const [cover, setCover] = useState<CoverKey | null>(equippedCover);
  const [frame, setFrame] = useState<FrameKey | null>(equippedFrame);
  const [color, setColor] = useState<OshiColor>(equippedColor);
  const [unlocking, setUnlocking] = useState<string | null>(null);

  // 開くたびに、いま付けているものから始める
  useEffect(() => {
    if (!open) return;
    setCover(equippedCover);
    setFrame(equippedFrame);
    setColor(equippedColor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const name = (key: string) => t(`cosmetics.items.${cosmeticI18nId(key)}.name`);
  const displayName = profile.display_name || profile.username || "";

  const selectedKey = tab === "cover" ? cover : frame;
  const equippedKey = tab === "cover" ? equippedCover : equippedFrame;
  const selectedOwned = !selectedKey || owned.has(selectedKey);
  const usesOshi = selectedKey === "cover:oshi" || selectedKey === "frame:oshi";
  const colorChanged = usesOshi && color !== equippedColor;
  const isCurrent = selectedKey === equippedKey && !colorChanged;
  const selectedItem = selectedKey ? byKey.get(selectedKey) : undefined;

  const doEquip = async (key: string | null, kind: Tab) => {
    const withColor = key === "cover:oshi" || key === "frame:oshi" ? { oshiColor: color } : {};
    await equip.mutateAsync(
      kind === "cover" ? { coverKey: key, ...withColor } : { frameKey: key, ...withColor }
    );
    toast.success(t("cosmetics.equippedToast"));
  };

  const handlePrimary = () => {
    if (isCurrent) return;
    if (!selectedOwned && selectedKey) {
      setUnlocking(selectedKey);
      return;
    }
    doEquip(selectedKey, tab).catch(() => {});
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92vh] rounded-t-3xl p-0 flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="px-5 pt-5 pb-2 text-left">
            <SheetTitle>{t("cosmetics.sheetTitle")}</SheetTitle>
            <SheetDescription>{t("cosmetics.sheetDesc")}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
            {/* プレビュー: 選んでいる柄・縁をそのまま当てる。下の一覧や推し色を選ぶあいだも見えるよう上に留める */}
            <div className="sticky top-0 z-10 -mx-5 bg-background px-5 pb-2">
              <div className="rounded-2xl border border-border overflow-hidden bg-card" aria-label={t("cosmetics.previewLabel")}>
                <div className="relative h-24 overflow-hidden">
                  {cover ? (
                    <CoverArt coverKey={cover} oshiColor={color} />
                  ) : (
                    <DefaultCover imageUrl={profile.cover_image_url} />
                  )}
                </div>
                <div className="relative h-12">
                  <div className="absolute -top-9 left-4">
                    <AvatarFrame frameKey={frame} oshiColor={color} thickness={3}>
                      <Avatar className="w-16 h-16 border-[3px] border-card bg-card">
                        <AvatarImage src={profile.avatar_url ?? undefined} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </AvatarFrame>
                  </div>
                  <p className="absolute left-[6.25rem] top-2 right-3 truncate text-sm font-bold">{displayName}</p>
                </div>
              </div>
            </div>

            {/* カバー / アイコンの縁 */}
            <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(["cover", "frame"] as Tab[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={tab === v}
                  onClick={() => setTab(v)}
                  className={cn(
                    "rounded-md py-1.5 text-xs font-medium transition-colors",
                    tab === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {v === "cover" ? t("cosmetics.tabCover") : t("cosmetics.tabFrame")}
                </button>
              ))}
            </div>

            {tab === "cover" ? (
              <div className="grid grid-cols-3 gap-2.5">
                <OptionButton
                  selected={cover === null}
                  onClick={() => setCover(null)}
                  label={t("cosmetics.defaultCover")}
                  status={equippedCover === null ? "equipped" : "free"}
                  hint={t("cosmetics.defaultCoverHint")}
                >
                  <div className="relative aspect-[16/10] overflow-hidden rounded-lg">
                    <DefaultCover imageUrl={profile.cover_image_url} />
                  </div>
                </OptionButton>
                {COVER_KEYS.map((k) => (
                  <OptionButton
                    key={k}
                    selected={cover === k}
                    onClick={() => setCover(k)}
                    label={name(k)}
                    status={equippedCover === k ? "equipped" : owned.has(k) ? "owned" : "locked"}
                    cost={byKey.get(k)?.points_cost}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden rounded-lg">
                      <CoverArt coverKey={k} oshiColor={color} />
                    </div>
                  </OptionButton>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                <OptionButton
                  selected={frame === null}
                  onClick={() => setFrame(null)}
                  label={t("cosmetics.defaultFrame")}
                  status={equippedFrame === null ? "equipped" : "free"}
                >
                  <FrameSample frameKey={null} color={color} />
                </OptionButton>
                {FRAME_KEYS.map((k) => (
                  <OptionButton
                    key={k}
                    selected={frame === k}
                    onClick={() => setFrame(k)}
                    label={name(k)}
                    status={equippedFrame === k ? "equipped" : owned.has(k) ? "owned" : "locked"}
                    cost={byKey.get(k)?.points_cost}
                  >
                    <FrameSample frameKey={k} color={color} />
                  </OptionButton>
                ))}
              </div>
            )}

            {/* 推し色を使う柄を選んでいるときだけ、色を選べる */}
            {usesOshi && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t("cosmetics.oshiColorLabel")}</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("cosmetics.oshiColorLabel")}>
                  {OSHI_COLOR_KEYS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={color === c}
                      aria-label={t(`cosmetics.oshiColor.${c}`)}
                      title={t(`cosmetics.oshiColor.${c}`)}
                      onClick={() => setColor(c)}
                      className={cn(
                        "h-9 w-9 rounded-full ring-1 ring-inset ring-foreground/10 flex items-center justify-center transition-transform",
                        color === c && "ring-2 ring-offset-2 ring-offset-background ring-foreground/70 scale-105"
                      )}
                      style={{ backgroundColor: OSHI_COLORS[c].base }}
                    >
                      {color === c && (
                        <Check className={cn("h-4 w-4", OSHI_COLORS[c].light ? "text-foreground" : "text-white")} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <Button
              className="w-full h-11 gap-1.5 rounded-full"
              disabled={isCurrent || equip.isPending}
              variant={isCurrent ? "secondary" : "default"}
              onClick={handlePrimary}
            >
              {isCurrent ? (
                <>
                  <Check className="h-4 w-4" />
                  {t("cosmetics.equipped")}
                </>
              ) : !selectedOwned && selectedItem ? (
                <>
                  <PointIcon size={16} />
                  {t("cosmetics.unlockFor", { cost: selectedItem.points_cost })}
                </>
              ) : (
                t("cosmetics.equip")
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <UnlockConfirmDialog
        item={unlocking ? byKey.get(unlocking) ?? null : null}
        title={unlocking ? t(`cosmetics.kind.${unlocking.split(":")[0]}`, { name: name(unlocking) }) : ""}
        onOpenChange={(o) => !o && setUnlocking(null)}
        onUnlocked={(key) => {
          // 解放したら、そのまま付ける
          doEquip(key, isCoverKey(key) ? "cover" : "frame").catch(() => {});
        }}
      />
    </>
  );
}

function OptionButton({
  selected,
  onClick,
  label,
  status,
  cost,
  hint,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  status: "equipped" | "owned" | "locked" | "free";
  cost?: number;
  hint?: string;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex flex-col gap-1.5 rounded-xl p-1.5 text-left transition-colors",
        selected ? "bg-primary/10 ring-2 ring-primary" : "ring-1 ring-border hover:bg-muted/60"
      )}
    >
      {children}
      <span className="px-0.5 min-w-0">
        <span className="block truncate text-xs font-semibold">{label}</span>
        <span className="flex items-center gap-1 text-3xs text-muted-foreground">
          {status === "equipped" ? (
            <>
              <Check className="h-3 w-3 text-primary" />
              <span className="text-primary font-medium">{t("cosmetics.equipped")}</span>
            </>
          ) : status === "owned" ? (
            t("cosmetics.owned")
          ) : status === "locked" ? (
            <>
              <Lock className="h-3 w-3" />
              <PointIcon size={11} />
              <span className="tabular-nums">{cost ?? "—"}pt</span>
            </>
          ) : (
            hint ?? ""
          )}
        </span>
      </span>
    </button>
  );
}

function FrameSample({ frameKey, color }: { frameKey: FrameKey | null; color: OshiColor }) {
  return (
    <div className="flex aspect-[16/10] items-center justify-center rounded-lg bg-muted/60">
      <AvatarFrame frameKey={frameKey} oshiColor={color} thickness={3}>
        <span className="block h-9 w-9 rounded-full border-2 border-card bg-muted" />
      </AvatarFrame>
    </div>
  );
}
