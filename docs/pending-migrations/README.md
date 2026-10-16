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
