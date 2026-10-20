import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DAILY_LOGIN_OPEN_EVENT, useDailyLoginStatus } from "@/hooks/useDailyLoginReward";
import { DailyLoginRewardSheet } from "./DailyLoginRewardSheet";

const shownKey = (uid: string, day: string) => `pocke_daily_login_shown_${uid}_${day}`;

/**
 * 今日のログイン報酬の係（App に1つ）。
 * - アプリを開いたとき、今日まだ受け取っていなければ自動で1回だけ出す（1日1回・端末に記録）
 * - どこからでも openDailyLoginReward() で開ける（今日のポッケリング・ポイントのもらい方から）
 */
export function DailyLoginRewardHost() {
  const { user } = useAuth();
  const { data: status } = useDailyLoginStatus();
  const [open, setOpen] = useState(false);
  const autoShown = useRef<string>("");

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(DAILY_LOGIN_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(DAILY_LOGIN_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!user?.id || !status || status.claimed_today) return;
    const key = shownKey(user.id, status.today);
    if (autoShown.current === key) return;
    try {
      if (localStorage.getItem(key)) {
        autoShown.current = key;
        return;
      }
      localStorage.setItem(key, "1");
    } catch {
      // 端末に保存できないときは、このマウント中だけ1回にする（PockeWelcomeBack と同じ考え方）
    }
    autoShown.current = key;
    setOpen(true);
  }, [user?.id, status]);

  if (!user || !status) return null;

  return <DailyLoginRewardSheet status={status} open={open} onOpenChange={setOpen} />;
}
