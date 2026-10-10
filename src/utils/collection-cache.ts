import type { QueryClient } from "@tanstack/react-query";

interface CollectionChangedOptions {
  /** 追加・削除した本人（＝自分）。自分の数字だけを引き直すために使う */
  userId?: string | null;
  /** 追加・削除したグッズの公式グッズID。分かれば「このグッズを持っているか」系も引き直す */
  officialItemId?: string | null;
}

/**
 * 自分のコレクションにグッズを追加・削除したあとに呼ぶ、キャッシュの引き直しの共通処理。
 *
 * コレクションの中身から計算している数字（コンプ進捗・登録数・持っている印など）は
 * それぞれ別のクエリで持っているので、どれか一つでも漏れると画面に古い数字が残る。
 * 以前は追加・削除の各所で invalidate するキーがばらばらで、特に削除側は
 * ["user-items"] しか引き直しておらず、「一度登録して削除してもコンプ進捗が変わらない」状態だった。
 *
 * アプリ全体の既定が refetchOnMount: false なので、いま画面に出ていないクエリも
 * refetchType: "all" で引き直す（stale にするだけだと、次に開いたときも古いまま）。
 */
export async function invalidateCollectionChanged(
  queryClient: QueryClient,
  { userId, officialItemId }: CollectionChangedOptions = {}
): Promise<void> {
  const keys: unknown[][] = [
    // 一覧（["user-items", ...] で始まるキーはすべて。推し宇宙・コンプ進捗もここに含まれる）
    ["user-items"],
    // 枠の使用数
    ["collectionCount"],
    // 「みんな」のグッズ検索の「持ってる」「◯人が持ってる」
    ["explore-item-search"],
  ];

  if (userId) {
    keys.push(
      // プロフィールの「グッズ◯個」
      ["profile-hero-stats", userId],
      ["hero-stats", userId],
      ["collection-stats", userId],
      // 追加シートの「持ってる」印
      ["owned-official-item-ids", userId],
      ["onboarding-checklist", userId],
      ["duplicate-user-items", userId],
      // 交換のマッチングは手持ちから計算している
      ["trade-matches", userId],
      ["trade-readiness", userId],
      // グッズ公開ページの「持ってる」状態（キーは [_, userId, officialItemId]）
      ["public-item-state", userId]
    );
  }

  if (officialItemId) {
    keys.push(
      ["item-owners-count", officialItemId],
      ["user-item-exists", officialItemId],
      ["is-in-collection", officialItemId],
      ["already-owned", officialItemId]
    );
  }

  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey, refetchType: "all" })));
}
