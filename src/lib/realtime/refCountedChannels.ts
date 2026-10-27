/**
 * 同じ購読を画面のあちこちから使うときに、Realtime のチャンネルを1本にまとめるための入れ物。
 *
 * realtime-js は channel() を呼ぶたびに新しいチャンネルを作り、そのたびに DB 側で
 * 購読（realtime.list_changes が変更ごとに RLS を確かめる相手）が1つ増える。
 * 「取引」のように Navbar・Footer・ポッケの3か所から同じ購読をしたいものは、
 * キー（例: ユーザー id）ごとに数を数えて、最初の1人で開き、最後の1人が離れたら閉じる。
 *
 * Supabase に依存しない作りにしてあるので、scripts/test-realtime-subscriptions.mjs から直接試せる。
 */
export interface RefCountedRegistry<T> {
  /** key のチャンネルを借りる。まだ無ければ open() で開く。戻り値を呼ぶと返す（2回呼んでも1回分） */
  acquire(key: string, open: () => T, close: (handle: T) => void): () => void;
  /** いま開いているキーの数（テスト・開発時の確認用） */
  size(): number;
  /** key を借りている数（テスト・開発時の確認用） */
  refCount(key: string): number;
}

export function createRefCountedRegistry<T>(): RefCountedRegistry<T> {
  const entries = new Map<string, { handle: T; count: number; close: (handle: T) => void }>();

  return {
    acquire(key, open, close) {
      let entry = entries.get(key);
      if (entry) {
        entry.count += 1;
      } else {
        entry = { handle: open(), count: 1, close };
        entries.set(key, entry);
      }
      const acquired = entry;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        acquired.count -= 1;
        // 同じキーで開き直されていたら、古い入れ物を消さない
        if (acquired.count <= 0 && entries.get(key) === acquired) {
          entries.delete(key);
          acquired.close(acquired.handle);
        }
      };
    },
    size() {
      return entries.size;
    },
    refCount(key) {
      return entries.get(key)?.count ?? 0;
    },
  };
}
