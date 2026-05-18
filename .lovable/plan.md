# 読み込み最適化プラン

## 現状の問題

コンソールログとコードを調査した結果、以下の「重複読み込み」「過剰な再レンダリング」が確認されました。

1. **`useOfficialItems` が `staleTime: 0` + `refetchOnMount: 'always'`** — 公式グッズ146件を毎回フルフェッチしている
2. **`UserCollection` の `user-items` クエリが `refetchOnMount: "always"`** — ページ遷移毎に再フェッチ
3. **`useItemPosts` / `useSimpleTagManage` / `useTagSelect` も同様に always 再フェッチ**
4. **`OfficialItemsList` の過剰再レンダー** — ログに `フィルタリング後のアイテム数: 0 / 0` が10回以上連続出力、`Sorting items by: newest` も同様。`filteredByTagsItems` が `useMemo` 化されておらず、毎レンダーで新配列を生成 → `useSortedItems` が走り続ける
5. **`Index.tsx` で `useProfile` を2回呼び出し** (自分用 + 閲覧中ユーザー用) — `userId` が無いケースでも両方マウントされる
6. **`AuthContext` のログインボーナス処理が二重発火** — ログに `Starting login bonus process` が連続2回出ている

## 修正方針

### A. React Query の再フェッチ設定を統一

App.tsx のグローバル設定（`staleTime: 10分`, `refetchOnMount: false`）に揃え、個別フックの `staleTime: 0` / `refetchOnMount: 'always'` を削除する。データ変更時は既存の `queryClient.invalidateQueries` で十分。

対象:
- `src/hooks/useOfficialItems.ts` — `staleTime: 5分`、`refetchOnMount: false`
- `src/components/UserCollection.tsx` — `refetchOnMount: false`（追加・削除は invalidate 済み）
- `src/hooks/useItemPosts.ts` — `refetchOnMount: false`
- `src/hooks/useSimpleTagManage.ts` — `staleTime: 1分`、`refetchOnMount: false`
- `src/hooks/useTagSelect.ts` — 同上

### B. `OfficialItemsList` の再レンダー削減

- `filteredByTagsItems` を `useMemo` 化（依存: `items`, `selectedTags`）
- 開発デバッグ用の `console.log` を削除（本番でも垂れ流しになっている）
- `useSortedItems` も入力が同一参照なら結果を再利用できるように依存を見直す

### C. `Index.tsx` の `useProfile` 重複呼び出しを整理

`userId` が無いときは閲覧中ユーザー用の `useProfile(userId)` は `enabled: false` で自然にスキップされるが、コンポーネント分割で意図を明確化。少なくとも `userId` パスでないときは追加クエリが走らないことを確認。

### D. ログインボーナスの二重発火を防止

`AuthContext` 内のログインボーナス処理を `useRef` でガードし、同セッション中は1回だけ実行する。

### E. デバッグログの整理

本番でノイズになっている `console.log`（フィルター件数、Sorting items by、Owner counts dump など）を削除または `import.meta.env.DEV` でガード。

## 期待される効果

- 公式グッズ・コレクションページの体感速度向上（キャッシュヒット時は即表示）
- 同一ページ内での重複ネットワークリクエスト解消
- レンダリングコスト低減（モバイルでのスクロールがスムーズに）

## 触らない範囲

- UI レイアウト・デザイン
- ビジネスロジック（フィルタ条件・ソート結果は同一）
- Supabase スキーマ・RLS

承認いただければ A → E の順で実装します。
