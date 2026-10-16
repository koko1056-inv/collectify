# 本番にまだ適用していないマイグレーション

2026年10月15〜16日の作業で、Supabase のコネクタが別の組織につながっていて本番（`dmgrgzysrzzgsajwqyrh`）に書き込めなかったため、ここに置いている。アプリはどれが無くても動く（無ければ従来の動きに戻る）。

`supabase/migrations/` に入れていないのは、適用していない番号がリポジトリに入ると本番の履歴とずれるため。

## 適用のしかた

1. Supabase MCP が `dmgrgzysrzzgsajwqyrh` に入れることを確かめる（`list_projects` に出るか）。
2. 番号の順に `apply_migration` で適用する。名前（version）は適用する日に合わせて振り直す。DROP 文は使っていない。
3. 適用したファイルを `supabase/migrations/<適用した version>_<名前>.sql` に移し、このフォルダから消す。

## 中身

| ファイル | 何をするか | 適用すると |
|---|---|---|
| `01_catalog_thumbs_catch_up.sql` | cron `catalog-thumbs-recent` を「登録からの時間で区切らず、サムネの無いものがあれば10分ごとに3本並列」に変える | 一度に大量登録したグッズ（10/13 の雑誌など88件）のサムネが作られずに残る問題がなくなる |
| `02_collection_goals.sql` | `collection_goals` テーブル（「集めるもの」の目標、1人6個まで、本人だけ） | 目標が端末をまたいで残る。アプリは `useCollectionGoals` の中身を DB 版に差し替える（今は localStorage） |
| `03_get_collection_targets.sql` | `get_collection_targets(_user_id)` と索引。02 の後に適用 | コンプの「小さな的」の集計が十数回の問い合わせから1回になる。アプリは自動でこちらを使う |
| `04_oshi_new_items_digest.sql` | 新商品の行ごとの通知を止め、`notify_oshi_new_items()` を毎朝 8:12（JST）に実行して推しの新商品を1人1日1通にまとめる。索引2つ | 自動取り込みの新商品が利用者に届くようになり、手動追加時の2重通知・タグごとの大量通知がなくなる |
| `05_popular_goods_for_contents.sql` | `get_popular_goods_for_contents(_contents, _limit)` | 「この作品で人気のグッズ」が大きな作品でも取りこぼさない。アプリは自動でこちらを使う |
| `06_onboarding_core_loop.sql` | はじめてガイドの報酬を5項目の流れに合わせる。`onboarding_reward_steps` に `is_active` を足し、画面から外した6項目（profile・wishlist・ai-room・avatar・follow・bookmark）を止める。`interests`（推しの作品を選ぶ）+10pt を足し、`onboarding_step_done` に判定を入れる。`claim_completed_onboarding_rewards` / `claim_onboarding_reward` は有効な項目だけ付与する | 外した項目（AI ルーム・アバターなど）で今後ポイントが出なくなり、ガイドの「推しの作品を選ぶ」に +10pt が付く。受け取り済みの記録とポイントはそのまま（行は消さない）。アプリは表を読んで額を出すので変更不要 |
| `07_core_loop_points.sql` | ポイントを本題に寄せる。`user_items` への INSERT のあと（文ごと）に、グッズの登録 +2pt（同じ公式グッズは一生1回・1日10件まで）とコンプ +30pt（作品・シリーズを分母3以上で全部持った。同じものは一生1回・1日3回まで）を付与。交換の成立を +10 → +30pt にし、同じ相手とは7日に1回まで | 登録・コンプ・交換で遊ぶほどポイントが貯まる。アプリの「ポイントのもらい方」（/point-shop/earn）に、適用した時点で登録・コンプの行が出る（表に行が無い間は出さない作り） |

### 06・07 の適用順の注意

- 06 と 07 は互いに関係なく、01〜05 とも関係しない。どちらから適用してもよい。
- 06 の「集めるもの」（goal）には報酬を付けていない。目標はまだ端末内（localStorage）にあり、サーバーで確かめられないため。
  02 を適用し、アプリの `useCollectionGoals` を DB 版に差し替えたあとで、`onboarding_step_done` に `goal`（`collection_goals` に1行以上）を足し、`onboarding_reward_steps` に行を入れる。
- 07 は本番の `award_social_points`（20261010200000）を使う。1日の上限の文言はアプリの `src/pages/PointsEarn.tsx`（`RULES`）にもあるので、上限を変えたらそろえる。
- どちらも手元の PGlite で、2回流しても同じ結果になること・受け取り済みの記録が残ること・登録→削除→登録で増えないこと・上限で止まることを確かめてある。

