## 概要
1. マイタグタブを選んだときにフィルタが効かない問題を修正
2. 複数アイテムを選択して一括でマイタグを付けられる機能を追加

---

## 1. フィルタが効かない原因と修正

### 原因
`CollectionViewToggle.tsx` が内部に `activeView` state を持っており、props の `selectedPersonalTag` と二重管理になっています。タブをクリックした際にローカル state は更新されるものの、親 (`UserCollection`) 側の `selectedPersonalTag` がうまく同期せず、結果として `personalTagItemIds` のフィルタリング処理が走らないケースがあります。

### 修正
- **`src/components/collection/CollectionViewToggle.tsx`**
  - 内部 state `activeView` を削除し、props の `selectedPersonalTag` を単一の真実とする
  - 「通常表示 / 欲しい物リスト」は別 state (`viewType: "grid" | "wishlist"`) として残す
  - タブクリック時は `onPersonalTagChange` をそのまま呼ぶ
- **`src/components/UserCollection.tsx`**
  - `filteredItems` 内で `selectedPersonalTag` がある場合のロジックを整理し、ロード完了後は `personalTagItemIds` に基づいて確実に絞り込む

---

## 2. マイタグ一括付け機能

### UX フロー
1. コレクション画面に「選択モード」ボタンを追加
2. 選択モード中、各カードにチェックボックスを表示してタップで選択
3. 下部にフローティングアクションバーを表示し「マイタグを付ける」ボタンを配置
4. ボタン押下でダイアログを開き、既存タグから選ぶ or 新規タグ名を入力
5. 確定で選択中の全アイテムに対して一括 insert

### 実装内容

- **`src/hooks/usePersonalTags.ts`**
  - `addTagBulk` mutation を追加
    - 入力: `{ userItemIds: string[]; tagName: string }`
    - `user_personal_tags` に複数行を一括 insert(既存重複は `onConflict` で無視)
    - 成功時に関連クエリを invalidate

- **`src/components/UserCollection.tsx`**
  - `isSelectionMode` / `selectedItemIds: Set<string>` を追加
  - ツールバーに「選択」ボタンを追加(既存のソートボタン横)
  - 選択モード時はフローティングアクションバーを表示(選択数、全選択、マイタグ付与、キャンセル)
  - `CollectionGrid` に選択モード関連 props を渡す

- **`src/components/collection/CollectionGrid.tsx`**
  - 既に `isSelectionMode` / `selectedItems` / `onSelectItem` のインターフェースを持っているため、カード側でクリック時に `onSelectItem` を呼ぶようにし、選択中は枠線などで視覚的に強調
  - 選択モード中は DnD 並べ替えを無効化(誤操作防止)

- **`src/components/collection/BulkPersonalTagDialog.tsx`(新規)**
  - 既存タグのチップ一覧 + 新規入力欄
  - 「○件のグッズに『タグ名』を追加」ボタンで実行
  - 完了後に選択モードを終了

---

## 変更ファイル
- `src/components/collection/CollectionViewToggle.tsx`(state 整理)
- `src/components/UserCollection.tsx`(選択モード・アクションバー追加)
- `src/components/collection/CollectionGrid.tsx`(選択 UI 強化)
- `src/hooks/usePersonalTags.ts`(`addTagBulk` 追加)
- `src/components/collection/BulkPersonalTagDialog.tsx`(新規作成)

DB スキーマ変更は不要です(既存の `user_personal_tags` テーブルをそのまま利用)。
