

# 提案1〜6 ＋ 評価制度 統合実装プラン

## 0. 全体像

「**グッズ管理を入口にしてファン同士の交流を増やす**」という目的に対し、以下を**4つの段階**に分けて実装します。各段階は独立してリリース可能で、評価制度は**全機能を貫く信頼レイヤー**として最初から組み込みます。

```text
段階1: 信頼の土台         (評価制度・スタンプ)
段階2: 同担との接点        (登録時の同担提示・グッズ詳細統合)
段階3: 出会いの主導権      (同担マッチング・コレクション差分)
段階4: 集まりの場          (グッズ別ルーム)
```

---

## 1. 評価制度の設計（全機能の信頼レイヤー）

### 1-1. 設計思想
- **3つの信頼スコア**を独立管理し、用途別に表示
  - **取引信頼度**: トレード相手としての安全性
  - **コレクター信頼度**: グッズ情報の正確性／コミュニティ貢献
  - **コミュニケーション信頼度**: メッセージ／スタンプのマナー
- **絶対値ではなく相対表示**（5段階バッジ + 件数）で、新規ユーザーが萎縮しない設計
- **悪意の評価を防ぐ**: 取引・スタンプなど**実アクションが完了した人だけ**評価可能

### 1-2. 表示UI
- プロフィール、トレード相手選択、マッチング画面、グッズ別ルームに**信頼バッジ**を常設
- 詳細はプロフィール内「評価」タブで内訳・コメントを閲覧
- 段階表示：🌱新人 / ⭐️信頼できる / 🌟ベテラン / 👑エース（全カテゴリ高評価）

### 1-3. 評価獲得経路
| 経路 | 対象スコア | 付与タイミング |
|---|---|---|
| トレード完了後の相互評価（5段階+任意コメント） | 取引信頼度 | 取引完了モーダルで両者評価 |
| グッズ情報の修正提案が承認 | コレクター信頼度 | 管理者または投票で承認時 |
| グッズ別ルームで他者から「参考になった」 | コレクター信頼度 | コメントへのリアクション |
| スタンプ受信→返信率（自動計算） | コミュニケーション信頼度 | 日次バッチ |
| 通報を受け確定 | 全スコアにペナルティ | モデレーション時 |

---

## 2. 提案1：登録完了時に同担を提示

### 体験
グッズ登録 → 完了トースト → **「このグッズを持っている人が23人います」モーダル**が自動表示
- 上位5人を信頼バッジ付きで表示
- 各カードに「フォロー」「あいさつスタンプ送る」「トレード打診」アクション
- 「もっと見る」で全員リスト

### 技術
- `useItemSubmit` 完了後に `OwnerDiscoveryModal` を発火
- 既存の `ItemOwnersModal` を拡張：信頼バッジ・3アクションボタンを追加
- 関連ユーザーのソート優先度：
  1. 同じ推し（interests 一致）
  2. 取引信頼度高
  3. 所有数多
  4. 最終ログイン新しい

---

## 3. 提案2：グッズ詳細ページのコミュニティ化

### 体験
`ItemDetailsModal` を**4タブ式**に再構成：
| タブ | 内容 |
|---|---|
| 詳細 | 既存の商品情報 |
| 持ってる人 | `ItemOwnersModal` を統合（信頼バッジ＋3アクション） |
| ほしい人 | `WishlistUsersModal` を統合（トレード打診ボタン目立つ） |
| みんなの声 | `ItemPostsSection` 統合 + **グッズコメント欄新設** |

### 技術
- 既存3モーダルを廃止、`ItemDetailsModal` 内タブに統合
- 新規テーブル `item_comments`（official_item_id 単位、ネスト2層、リアクション機能）
- グッズコメントへの「参考になった」リアクションがコレクター信頼度に加算

---

## 4. 提案3：同担マッチングページ

### 体験
新規ルート `/match`、Bottom Nav にも追加
- 上部に**Tinder風カード**（毎日3人推薦、スワイプで「興味あり」「スキップ」）
- 下部に**リスト**（フィルタ：推し一致／トレード可能性／信頼度）
- 各カード表示：
  - 信頼バッジ（3カテゴリ）
  - 「グッズ18個一致」「トレード可能5個」「同じ推し3人」
  - アクション：フォロー／あいさつスタンプ／トレード提案

### 技術
- 新規Edge Function `compute-match-score`（夜間バッチで算出、結果を `match_scores` テーブルに保存）
- スコア算式：
  ```text
  score = (推し一致数 × 10)
        + (所有グッズ重複数 × 3)
        + (トレード可能ペア数 × 5)
        + (信頼度ボーナス × 2)
  ```
- 「興味あり」が相互成立 → 自動でフォロー＋通知（マッチ成立体験）

---

## 5. 提案4：あいさつスタンプ

### 体験
- 6種の固定スタンプ（同担です／そのグッズ素敵／コンプおめでとう／トレード興味あり／参考にします／はじめまして）
- グッズ詳細・プロフィール・マッチング画面・コメント横から1タップで送信
- 受信側に通知 → 「ありがとう」または絵文字返信 → 自然にDMに昇格できる導線
- スタンプ送受信の**返信率**がコミュニケーション信頼度に反映

### 技術
- 新規テーブル `greeting_stamps`（sender_id, receiver_id, stamp_type, context_type, context_id, replied_at）
- 既存 `notifications` を流用
- 同一ペアへの重複送信を24時間制限（abuse防止）

---

## 6. 提案5：コレクション差分の可視化

### 体験
プロフィールページに常設パネル「あなたとの差分」（自分以外のプロフィール閲覧時）
- **Aさんが持っていてあなたが持っていない**: 12個（カード一覧、ウィッシュ追加可）
- **あなたのウィッシュをAさんが所有**: 3個 → 「トレード打診」目立つボタン
- **共通所有**: 18個（同担の証）

### 技術
- ホーム画面にも「**今日のオススメ**」枠を追加（フォロー中ユーザーから差分の多い人）
- Edge Function `compute-collection-diff` で算出（リアルタイムでなくても良い、リクエスト時計算でOK）

---

## 7. 提案6：グッズ別ルーム（チャットスペース）

### 体験
- 人気上位グッズ（所有者10人以上）に**自動生成チャット**
- 入室条件：そのグッズを所有 or ウィッシュ登録
- グッズ詳細ページ「みんなの声」タブから入室
- ルーム機能：
  - リアルタイムチャット
  - ピン留め話題（管理：所有者の中で信頼度上位3名）
  - 「このルームの人気投稿」自動表示
  - 通報＆ミュート

### 技術
- 新規テーブル `item_rooms`（official_item_id, member_count, last_active_at）
- 新規テーブル `item_room_messages`
- Supabase Realtime で配信
- モデレーション：信頼度低 or 通報多のユーザーは投稿制限
- **β版は所有者100人以上のグッズ限定**で開始（運用負荷を抑える）

---

## 8. データベース設計（新規追加）

```sql
-- 1. 信頼スコア（3カテゴリ独立）
CREATE TABLE user_trust_scores (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  trade_score numeric DEFAULT 0,
  trade_count integer DEFAULT 0,
  collector_score numeric DEFAULT 0,
  collector_count integer DEFAULT 0,
  communication_score numeric DEFAULT 0,
  communication_count integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- 2. トレード評価
CREATE TABLE trade_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_request_id uuid REFERENCES trade_requests(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  reviewee_id uuid NOT NULL,
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(trade_request_id, reviewer_id)
);

-- 3. グッズコメント
CREATE TABLE item_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  official_item_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES item_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE item_comment_reactions (
  comment_id uuid REFERENCES item_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction text NOT NULL,  -- 'helpful'|'love'|'agree'
  PRIMARY KEY (comment_id, user_id, reaction)
);

-- 4. あいさつスタンプ
CREATE TABLE greeting_stamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  stamp_type text NOT NULL,
  context_type text,        -- 'item'|'profile'|'match'|'comment'
  context_id uuid,
  replied_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 5. マッチスコア
CREATE TABLE match_scores (
  user_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  score numeric NOT NULL,
  shared_interests integer DEFAULT 0,
  shared_items integer DEFAULT 0,
  tradeable_items integer DEFAULT 0,
  computed_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, candidate_id)
);

CREATE TABLE match_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  action text NOT NULL,    -- 'interested'|'skip'
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, candidate_id)
);

-- 6. グッズ別ルーム
CREATE TABLE item_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  official_item_id uuid UNIQUE NOT NULL,
  member_count integer DEFAULT 0,
  last_active_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE item_room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES item_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

**全テーブルに RLS 適用**（自分が当事者のレコードのみ読み書き、評価は完了済トレードのみ書き込み可）。
**SECURITY DEFINER 関数**で信頼スコアを更新（`update_trust_score(user_id, category, delta)`）。

---

## 9. 実装ロードマップ（4週間）

```text
Week 1：信頼の土台（提案4＋評価制度）
├─ DBマイグレーション（trust_scores / reviews / stamps / comments）
├─ あいさつスタンプ機能（送信・受信・返信）
├─ トレード完了モーダルに評価UI追加
├─ プロフィールに信頼バッジ表示
└─ プロフィールに「評価」タブ新設

Week 2：同担との接点（提案1＋2）
├─ グッズ登録完了時の同担提示モーダル
├─ ItemDetailsModal の4タブ化
├─ グッズコメント機能（item_comments + リアクション）
└─ ItemOwners/Wishlist の統合廃止

Week 3：出会いの主導権（提案3＋5）
├─ コレクション差分パネル（プロフィール）
├─ ホームに「今日のオススメ」枠
├─ マッチスコア計算 Edge Function
├─ /match ページ実装（カードUI＋リスト）
└─ マッチ成立通知

Week 4：集まりの場（提案6・β版）
├─ item_rooms 自動生成（所有者100人以上）
├─ リアルタイムチャットUI
├─ ピン留め・モデレーション基本機能
└─ 信頼度低ユーザーの投稿制限
```

---

## 10. KPI 仮説

| 指標 | 現状 | Week 2後 | Week 4後 |
|---|---|---|---|
| 1グッズ登録あたりのフォロー発生 | <1% | 12-18% | 25-30% |
| 新規初日フォロー数 | ~0.5 | 2-3 | 4-6 |
| トレード完了率（依頼→成立） | 不明 | +20% | +40% |
| 月間DM・スタンプ発生数 | 低 | 5倍 | 20倍 |
| アプリの定義文 | "推し活管理" | "管理から繋がる推し活" | **"信頼できる同担と出会える推し活アプリ"** |

---

## 11. 既存資産の流用

| 提案 | 流用する既存実装 |
|---|---|
| 1 | `ItemOwnersModal`, `useItemSubmit`, `interests` |
| 2 | `ItemDetailsModal`, `WishlistUsersModal`, `ItemPostsSection` |
| 3 | `interests`, `user_items`, `wishlists`, `trade_requests` |
| 4 | `notifications`, `messages` |
| 5 | `useUserStats`, `useTradeRequests` |
| 6 | `messages`（モデル参考） |
| 評価 | `trade_requests` (status='completed' トリガー), `notifications` |

ほぼ既存DBの上に**評価・コメント・マッチ・スタンプ・ルーム**の5テーブル群を追加するだけで実現可能。

---

## 12. 着手順序

承認後、**Week 1（評価制度＋スタンプ）から着手**します。これにより以降の全機能（マッチング、ルーム、トレード）に信頼レイヤーが効く土台ができます。

