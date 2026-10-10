import { useSearchParams } from "react-router-dom";
import { Home, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MyAiRoomsView } from "@/components/ai-room/MyAiRoomsView";
import { AvatarCenterHome } from "@/components/home/AvatarCenterHome";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Profile } from "@/types";

/**
 * マイページの「AI作品」タブ。自分の AI ルームとアバター（以前はマイルームの「AIスタジオ」タブ）。
 * ルーム / アバターは ?view= で切り替える（共有・戻る操作で復元できるように）。
 */
export function MyStudioPanel({ profile }: { profile: Profile | undefined }) {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") === "avatar" ? "avatar" : "room";

  const setView = (v: "room" | "avatar") => {
    const next = new URLSearchParams(searchParams);
    next.set("view", v);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 px-4" role="group" aria-label={t("profileScreen.tabs.ai")}>
        {(["room", "avatar"] as const).map((v) => (
          <Button
            key={v}
            size="sm"
            variant={view === v ? "default" : "outline"}
            className="rounded-full"
            aria-pressed={view === v}
            onClick={() => setView(v)}
          >
            {v === "room" ? <Home className="mr-1 h-4 w-4" /> : <Shirt className="mr-1 h-4 w-4" />}
            {v === "room" ? t("homeScreen.tabs.room") : t("homeScreen.tabs.avatar")}
          </Button>
        ))}
      </div>
      {view === "room" ? (
        <MyAiRoomsView />
      ) : (
        <div className="px-4">
          <AvatarCenterHome profile={profile} />
        </div>
      )}
    </div>
  );
}
