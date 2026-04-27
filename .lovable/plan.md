## 背景：現状の問題点

調査の結果、現在のオンボーディングは **4つのシステムが並走** しており、内容も古いままで現在のアプリ構成と乖離しています。

| 既存システム | 場所 | 問題点 |
|---|---|---|
| `WelcomeOnboarding`（全画面・4ステップ） | 初回 `/my-room` で起動 | 「マイルーム」「トレード」など旧機能の言及あり |
| `OnboardingWalkthrough`（モーダル・6ステップ） | `/` Index で起動 | Indexはもう使われていないため**死んでいる** |
| `OnboardingGuide`（上部スティッキーバナー・2ステップ） | `/search` 上部 | Welcomeと役割重複、「グッズ追加→ウィッシュリスト」のみで狭い |
| `OnboardingChecklist`（カード・7項目） | `MyRoomHome` | 内容は概ねOKだが、AIルーム/アバター強化が必要 |

→ 重複削減と、**現フッター構成（AIスタジオ・探索・みつける・コレクション・プロフィール）** に沿った再設計が必要です。

---

## 新オンボーディング設計（2層構造）

ユーザーの希望に沿い「**4機能をバランス良く**」「**完了後は /search に着地**」する2層モデルに整理します。

### 第1層：初回ウェルカム（全画面、1回のみ）
`WelcomeOnboarding.tsx` を全面書き換え。**6ステップ・スワイプ可** の全画面フロー。

| # | ステップ | 内容 |
|---|---|---|
| 1 | **Welcome / 名前入力** | グラデーションオーブ＋「推し活ネーム」入力（既存の良い部分は流用） |
| 2 | **興味選択** | 好きな作品を選ぶ（`InitialInterestSelection` 流用） |
| 3 | **🎨 AIスタジオ紹介** | 「グッズからAIで推し部屋・アバターが作れる」短いデモGIF風アニメ |
| 4 | **🔍 探索 紹介** | 「他のコレクターの作品やコレクションを発見」 |
| 5 | **📦 コレクション 紹介** | 「持ってるグッズを記録、お気に入りTOP5でプロフを彩る」 |
| 6 | **🎁 完了セレブレーション** | 紙吹雪 + 「ようこそボーナス 50pt」付与（既存ロジック維持）→ **「グッズを探す」ボタンで `/search` へ** |

**特徴：**
- 各機能スライドに **共通レイアウト**：上に大きなビジュアル（アイコン＋アニメーション）、中央にタイトル、下に1文の価値訴求 + 1つのアクション例
- 下部に進捗ドット + 「次へ / スキップ」ボタン
- スワイプ対応（既存の touch handler を強化）
- 完了で `completeWalkthrough()` + `completeWelcome()` + `add_user_points` ボーナス付与（DB永続化済）

### 第2層：継続誘導チェックリスト（マイルームに常駐）
`OnboardingChecklist.tsx` を**現アプリに合わせて再構成**。完了済みは自動でポイント付与（既存のRPC `claim_onboarding_reward` を維持）。

新チェックリスト項目（**8項目**、機能カテゴリ別にグループ化）：

**🎯 はじめの一歩**
1. アカウント作成（自動完了）+10pt
2. プロフィール設定（アバター/自己紹介） +20pt

**📦 コレクション**
3. 最初のグッズ登録 +30pt
4. お気に入りTOP5を選ぶ +20pt
5. ウィッシュリストに追加 +10pt（**新規追加**）

**🎨 AIスタジオ**（初回無料バッジ付き）
6. AIルームを作成 +30pt
7. AIアバターを作成 +30pt

**🌐 コミュニティ**
8. 他ユーザーをフォロー / AI作品を保存 +20pt（**新規追加**）

各項目タップで該当画面へ直接遷移。完了率プログレスバー＋達成バッジ付き。

---

## 削除・整理する既存システム

| ファイル | 処置 |
|---|---|
| `src/components/onboarding/OnboardingWalkthrough.tsx` | **削除**（Indexで使われているが Index 自体が古い／フローが Welcome と重複） |
| `src/hooks/useOnboardingWalkthrough.ts` | **削除** |
| `src/pages/Index.tsx` の Walkthrough 呼び出し | 該当ブロック削除 |
| `src/components/onboarding/OnboardingGuide.tsx` | **削除**（Welcomeで /search に誘導するため不要） |
| `src/pages/Search.tsx` の `<OnboardingGuide />` | 削除 |
| `src/components/onboarding/WelcomeOnboarding.tsx` | **全面書き換え**（6ステップ構成へ） |
| `src/components/onboarding/OnboardingChecklist.tsx` | **項目刷新**（上記8項目、グループ化UI追加） |
| `src/components/onboarding/ProgressiveTooltip.tsx` | 利用箇所を確認の上、未使用なら削除 |

---

## 変更ファイル一覧

**書き換え：**
- `src/components/onboarding/WelcomeOnboarding.tsx` — 6ステップ全画面フロー
- `src/components/onboarding/OnboardingChecklist.tsx` — 8項目・3グループ構成

**削除：**
- `src/components/onboarding/OnboardingWalkthrough.tsx`
- `src/components/onboarding/OnboardingGuide.tsx`
- `src/hooks/useOnboardingWalkthrough.ts`

**修正：**
- `src/pages/Index.tsx` — Walkthrough関連 import / JSX 削除
- `src/pages/Search.tsx` — OnboardingGuide 削除
- `src/components/home/MyRoomHome.tsx` — Checklist は維持（変更なし）

**DB：**
- スキーマ変更なし（既存の `profiles.onboarded_at`、`onboarding_rewards`、`add_user_points` RPC、`claim_onboarding_reward` RPC を再利用）

---

## 期待される効果

1. **重複オンボーディングの排除** — 初回1回の全画面フロー＋ホーム常駐チェックリストの2層に整理
2. **現アプリ構成との一致** — フッター4機能（AIスタジオ/探索/コレクション/プロフィール）+ /search を全てカバー
3. **AI機能の発見性向上** — チェックリストで「初回無料」バッジ付きAI生成を強調、収益化導線も自然に
4. **行動誘発** — Welcome完了直後に /search へ着地し、即「最初のグッズ登録」へ繋がる導線

承認後、上記の通り実装を進めます。
