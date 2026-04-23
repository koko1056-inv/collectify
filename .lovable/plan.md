

# バイラル成長のための全体設計プラン

## 現状評価サマリー

**すでに実装済み**
- 招待コード機能（`invite_codes` テーブル、30日有効、招待ボーナスあり）
- シェア機能（X / Web Share API、複数箇所）
- 公開ページ：`/user/:userId`、`/room/:roomId`、`/rooms/explore`（未ログインでも閲覧可）
- 静的OGPメタタグ

**バイラル阻害要因（優先度順）**
1. **動的OGPが無い**（全ページ同じ `/og-image.png`）← SNS拡散の最大ボトルネック
2. 招待はコード式で、ワンクリック招待リンクが無い
3. シェア文言が画一的で煽り要素・数値が無い
4. 達成ハイモーメント（AI生成完了、アイテム100個到達等）でのシェア誘導が弱い
5. 公開コンテンツの SEO流入設計が無い（sitemap、構造化データ）

---

## 設計方針

**バイラル係数 K = i × c を上げる**
- **i（1人あたりの招待数）**: シェアボタンの露出増・ハイモーメント誘導・招待リンク化
- **c（コンバージョン率）**: 動的OGPで魅力的プレビュー・公開ページのLP化・ワンクリック登録

全フェーズ合計で約 5〜7日の作業量。**Phase 1 だけで効果の約 6〜7 割**を回収できる設計。

---

## Phase 1: 動的OGP基盤【最優先・即効性大】(約2日)

### 1-1. Edge Function `generate-og-image` の新規作成

- `/functions/v1/generate-og-image?type=room&id=xxx` のような形式
- `type`: `room` | `user` | `post` | `display`
- SVG テンプレート → PNG 変換（Deno の `@resvg/resvg-js` または Cloudinary 的手法）で 1200×630 生成
- 内容例（room）: 部屋の画像サムネ + オーナー名 + 「◯個のグッズ展示中」+ Collectifyロゴ
- 生成結果は `og-cache` ストレージバケットに24hキャッシュ（URL に `updated_at` を含めて invalidate）

### 1-2. Edge Function `og-meta` でのHTML書き換え

- SNSクローラー（User-Agent に `bot|facebook|twitter|discord|slack|line` を含む）からのアクセスのみ、動的な meta タグ入り HTML を返す
- それ以外は通常の SPA を返す（Cloudflare Workers 的な手法を Supabase Edge Function で代替）
- 対象ルート: `/room/:roomId`、`/user/:userId`、`/post/:postId`、`/display/:displayId`
- ※Vite SPA なので、デプロイ後の URL でクローラーUA判定のプロキシを設置する必要あり。実現可能性として**「Supabase Edge Function 経由のシェア専用URL（例: `/s/room/:id`）を発行し、そこから通常ページへリダイレクト」方式**を採用（実装コスト低・確実）

### 1-3. シェア用URL体系の導入

```text
通常URL:        /room/abc123        (人間用・SPA)
シェアURL:      /s/r/abc123         (クローラー用・Edge Function が動的meta返却→302でSPAへ)
```
- シェアボタンから貼り付けるURLを `/s/r/:id` に統一
- クローラー以外はEdge FunctionがSPAへ即リダイレクト、人間のUX影響なし

---

## Phase 2: 招待リンク・インセンティブ強化 (約1.5日)

### 2-1. 招待コード → 招待リンク化
- `https://collectify.lovable.app/invite/ABC12345` でアクセスすると
  - 未ログイン: 登録画面へ。コードを URL から自動適用（クエリ/localStorage）
  - ログイン済み: 「あなたは既に登録済みです」
- 既存の `invite_codes` テーブルをそのまま利用。新規ルート `/invite/:code` を追加

### 2-2. 招待導線の強化
- プロフィール画面にある招待UIを、**ホーム画面・達成通知・ポイント不足ダイアログ**の3箇所にも追加
- 招待ボーナスを**段階報酬化**:
  - 1人目: 50pt / 3人目: 200pt / 10人目: 1000pt + 限定バッジ
- リーダーボード（招待数ランキング）を公開ページに設置

### 2-3. シェア文言の最適化（共通ユーティリティ化）
- `src/utils/shareText.ts` を新設
- テンプレート例:
  - Room: `「{username}の推し部屋」グッズ{count}個展示中🌟 #Collectify #推し活 {url}`
  - Achievement: `コレクション{count}個達成！#Collectify で推し活中 {url}`
- ハッシュタグを `#Collectify #推し活 #{コンテンツ名}` にルール化

---

## Phase 3: ハイモーメント・シェアフック (約1日)

### 3-1. シェア報酬インセンティブ
- AIルーム生成完了 / グッズ展示場生成完了 / 100アイテム達成 等で**「シェアで +5pt」モーダル**
- `share_rewards` テーブルを新設（1日1回/モーメントあたり、abuse防止）

### 3-2. フロー改善
- 既存のシェア完了箇所（AiRoomCreateWizard, GeneratedResultView など）に統一 `useShareReward()` フックを導入
- 成功時に自動でポイント付与 + トースト

---

## Phase 4: 公開ページのLP化・SEO流入 (約1.5日)

### 4-1. 公開ページへのCTA追加
- `/user/:userId`、`/room/:roomId` の未ログイン閲覧時に
  - ページ下部固定の「あなたも推し部屋を作ろう！無料で始める」CTA
  - 登録後、元の部屋/プロフィールへ自動復帰

### 4-2. SEO対応
- `sitemap.xml` を Edge Function で動的生成（公開部屋・公開プロフィール）
- 構造化データ（JSON-LD）を `/user/:userId` `/room/:roomId` に注入（`Person` / `CreativeWork`）
- `robots.txt` の整備

### 4-3. 公開ランキング
- `/trending` ルート新規（未ログイン可）
  - 今週のいいねTOPルーム / 今週のTOPコレクション / 今週のTOP投稿
  - SEO流入口として機能

---

## 技術詳細

### 新規追加するファイル
```text
supabase/functions/generate-og-image/index.ts     (OGP画像生成)
supabase/functions/share-meta/index.ts            (クローラー向けHTML返却)
supabase/functions/sitemap/index.ts               (sitemap.xml生成)
src/pages/InviteRedirect.tsx                      (/invite/:code)
src/pages/Trending.tsx                            (/trending)
src/utils/shareText.ts                            (共通シェアテキスト)
src/hooks/useShareReward.ts                       (シェア報酬フック)
src/components/share/ShareRewardDialog.tsx
src/components/public/PublicCtaBanner.tsx         (公開ページ用CTA)
```

### DB マイグレーション
```sql
-- シェア報酬の重複防止
CREATE TABLE public.share_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  moment_type text NOT NULL,   -- 'ai_room_complete', 'display_complete', etc.
  reference_id uuid,
  rewarded_at timestamptz DEFAULT now(),
  UNIQUE(user_id, moment_type, reference_id)
);
ALTER TABLE public.share_rewards ENABLE ROW LEVEL SECURITY;
-- 自分の履歴のみ閲覧

-- 段階招待報酬の管理（既存 invite_codes + user_points で概ね表現可能）
ALTER TABLE public.user_points ADD COLUMN referral_count integer DEFAULT 0;
```

### Storage
- 新規バケット `og-cache` (public)

### ストレージキャッシュ戦略
- OGP画像URL形式: `/og-cache/room/{roomId}-{updated_at_epoch}.png`
- `updated_at` が変わる＝URLが変わるので SNS側キャッシュも自動invalidate

---

## 実装順序の推奨

```text
Phase 1 (動的OGP)          ← ここだけで拡散力が数倍に
  └─ Phase 2 (招待リンク)   ← 流入→定着のループが閉じる
       └─ Phase 3 (シェア報酬)  ← 既存ユーザーの発信頻度UP
            └─ Phase 4 (SEO/LP)  ← 中長期の非SNS流入
```

---

## 成果予測

| 指標 | 現状 | Phase 1後 | 全Phase後 |
|---|---|---|---|
| SNSシェアのクリック率 | 低（汎用OGP） | 3〜5倍 | 3〜5倍 |
| 招待→登録転換率 | コード入力が面倒 | - | 2〜4倍 |
| 1ユーザーあたり月間シェア数 | 低 | 微増 | 2〜3倍 |
| バイラル係数K | <0.1（推定） | 0.2〜0.3 | **0.5〜0.8**（持続成長可能域） |

---

## 選択肢

このプランをベースに、どこから着手するか選んでください：

- **A) Phase 1 のみ先行**（2日、効果最大）
- **B) Phase 1 + 2**（3.5日、ループ完成）
- **C) Phase 1〜3**（4.5日、既存ユーザー活性化まで）
- **D) フル実装**（6〜7日、SEO流入まで）
- **E) プラン修正**（特定の部分を追加・削除・変更）

