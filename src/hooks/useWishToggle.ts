import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { pockeCheer } from "@/components/pocke/pockeCheer";
import {
  addOfficialItemToWishlist,
  fetchWishedOfficialIds,
  removeOfficialItemFromWishlist,
  wishedOfficialIdsKey,
} from "@/utils/wishlist-actions";
import { withWish } from "@/utils/characterPage";

/**
 * 自分の「ほしいもの」に入っている公式グッズの id（Set）。
 * 追加シート・コンプの「あと1個」と同じキー（wishedOfficialIdsKey）なので、どこで入れても同じ表示になる。
 * カードごとに問い合わせない（一覧の全カードでこの 1 つを共有する）。ゲストは null。
 */
export function useWishedOfficialIds() {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const query = useQuery({
    queryKey: wishedOfficialIdsKey(uid),
    enabled: !!uid,
    staleTime: 1000 * 60,
    queryFn: () => fetchWishedOfficialIds(uid!),
  });
  return { wishedIds: uid ? query.data ?? null : null, isGuest: !uid };
}

/** 押している途中のグッズ（同じカードを連打しても 1 回だけ送る）。カードをまたいで共有する */
const pending = new Set<string>();

/**
 * カタログカードの「ほしい」ボタン。押した瞬間に見た目を切り替え（楽観的更新）、失敗したら元に戻す。
 * うまくいっても失敗してもポッケが一言（トーストは出さない）。
 * ほしいものは本人だけのもの: 自分の行だけを足す・消す。他人のほしいものは読まない。
 */
export function useWishToggle() {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const queryClient = useQueryClient();
  const { wishedIds, isGuest } = useWishedOfficialIds();
  const [, rerender] = useState(0);

  const toggle = useCallback(
    async (officialItemId: string) => {
      if (!uid || pending.has(officialItemId)) return;
      const key = wishedOfficialIdsKey(uid);
      const before = queryClient.getQueryData<Set<string>>(key);
      const on = !(before?.has(officialItemId) ?? false);
      pending.add(officialItemId);
      rerender((n) => n + 1);
      // 先に見た目を変える。読み込み中の結果で上書きされないよう、走っている取得は止める
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<Set<string>>(key, (prev) => withWish(prev ?? before, officialItemId, on));
      try {
        if (on) await addOfficialItemToWishlist(queryClient, uid, officialItemId);
        else await removeOfficialItemFromWishlist(queryClient, uid, officialItemId);
        pockeCheer(on ? "wished" : "unwished");
      } catch (error) {
        console.error("wish toggle failed:", error);
        queryClient.setQueryData<Set<string>>(key, (prev) => withWish(prev, officialItemId, !on));
        // 失敗もトーストではなくポッケが一言で伝える
        pockeCheer(on ? "wishFailed" : "unwishFailed");
      } finally {
        pending.delete(officialItemId);
        rerender((n) => n + 1);
      }
    },
    [uid, queryClient]
  );

  return { wishedIds, isGuest, toggle, isPending: (id: string) => pending.has(id) };
}
