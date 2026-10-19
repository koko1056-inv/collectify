import { useNavigate } from "react-router-dom";
import { DoorOpen, Heart } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useMyOshiRoomLikers } from "@/hooks/useOshiRoomSocial";
import { getInitial } from "@/utils/initial";
import { SampleAccountBadge } from "@/components/SampleAccountBadge";

/**
 * 自分の推しの部屋に、誰がいいねしたか（新しい順）。/oshi の「いいね n」と、いいねの通知から開く。
 * 名前を押すとその人のプロフィールへ（お返しに部屋を見に行けるように）
 */
export function RoomLikersSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { formatRelative } = useDateFormat();
  const likers = useMyOshiRoomLikers(open);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[80vh] max-w-lg overflow-y-auto rounded-t-3xl p-4">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-1.5">
            <Heart className="h-4 w-4 fill-primary text-primary" />
            {t("oshiRoom.social.likers.title")}
          </SheetTitle>
          <SheetDescription>{t("oshiRoom.social.likers.desc")}</SheetDescription>
        </SheetHeader>
        <div className="mt-3">
          {likers.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : likers.isError ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("oshiRoom.social.likers.loadFailed")}</p>
          ) : (likers.data ?? []).length === 0 ? (
            <div className="space-y-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">{t("oshiRoom.social.likers.empty")}</p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-full"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/explore?tab=oshi-rooms");
                }}
              >
                <DoorOpen className="h-4 w-4" />
                {t("oshiRoom.social.likers.seeOthers")}
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border" data-testid="oshi-likers">
              {likers.data!.map((u) => (
                <li key={u.userId}>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/user/${u.userId}`);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarImage src={u.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">{getInitial(u.displayName, u.username)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-sm font-bold">
                        <span className="truncate">{u.displayName || u.username}</span>
                        <SampleAccountBadge isSample={u.isSample} />
                      </span>
                      <span className="block truncate text-2xs text-muted-foreground">@{u.username}</span>
                    </span>
                    <span className="shrink-0 text-2xs text-muted-foreground">{formatRelative(u.likedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
