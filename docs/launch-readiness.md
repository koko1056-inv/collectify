# 一般公開に向けてやること（セキュリティ・プライバシー・運用）

2026-10-10 時点の調査（Supabase の advisor と SELECT、リポジトリのコード確認）。調べきれなかった項目は「未確認」と書いてある。

現状の規模: ユーザー 37 人 / user_items 250 件 / official_items 約 5.6 万件。通報・ブロック・Stripe 購入・サブスクはまだ 0 件。

## A. 公開前に必ず直す

### A1. 認証なしで呼べる Edge Function（High）
- **post-to-twitter**: `verify_jwt=false` で認証チェックもない。誰でも運営の X アカウントから投稿できる。`imageUrl` を取得するので SSRF にもなる。→ 管理者だけに限定する。使わないなら停止。
- **generate-3d-model / generate-background / add-item-chat / search-item-prices**: 公開の anon キーだけで呼べて、課金される外部 API（Meshy、Firecrawl など）を無制限に使える。→ `getUser()` を必須にして、ユーザー単位の回数制限（またはポイント消費）を入れる。
- **scrape-images / analyze-image**: Authorization ヘッダーの有無しか見ていない（`Bearer x` で通る）。scrape-images は任意 URL を取りに行き、防御が文字列の簡易リストだけ（DNS リバインディング・リダイレクト・IPv6 などを防げない）。→ `getUser()`、接続先 IP の解決後チェック、リダイレクト禁止。
- **proxy-image**: 認証なしは意図どおりだが、誰でも使えるオープンプロキシになっている（許可ホストなし、リダイレクト可、SVG 可、POST はダウンロード後にサイズ確認）。→ カタログ画像のホストの許可リスト、`redirect: "manual"`、ストリーミング時のサイズ上限、SVG 拒否、レート制限。

### A2. 退会（アカウント削除）とデータ書き出しがない（High）
プライバシーポリシーは「アプリ内からいつでも退会でき、30 日以内に完全削除」と書いているが、実装がない。App Store 5.1.1(v)・GDPR の消去権・APPI の削除請求に反し、審査でも落ちる。
→ `delete-account` Edge Function（JWT 必須）で auth.users の削除・関連データの削除・ストレージの掃除・Stripe/RevenueCat の解約確認までやる。あわせて JSON のデータ書き出しも。

### A3. 法的ページが足りない（High）
- `src/pages/Privacy.tsx` は「プレースホルダー」のまま。実装とずれている（メールを収集と書いているが実際はダミーメール／Stripe 決済・Mixpanel・外部 AI への送信・国外移転の記載がない）。
- **特定商取引法に基づく表記**のページがない。ポイント販売・サブスクを売る以上、必須。
- 問い合わせ窓口に連絡先が書かれていない。返金・解約の案内も。
- EU 向けには、法的根拠・データ主体の権利・越境移転の記載が要る。公開前に法務（弁護士）の確認を。

### A4. 認証が「ユーザー名＋ダミーメール」（High）
`src/utils/auth.ts` が `${username}@example.com` で登録している。
- パスワード再設定のメールが example.com に飛ぶので、忘れると復旧できない。
- 運営から連絡できない（規約変更・不正対応・GDPR の通知）。メール確認も実質なし。
- 管理者が `admin@example.com`（総当たりのリスク）。
→ 実メール＋メール確認、または Apple / Google ログインを追加。パスワードの最低文字数、Leaked Password Protection の有効化、管理者の MFA。登録時の年齢確認・規約同意も。

### A5. 同意なしの解析と外部スクリプト（Medium〜High）
- `src/utils/analytics.ts` が同意バナーなしで Mixpanel を初期化し、ユーザー ID を送る（EU/UK は同意が必要）。`people.set({$email: userId})` は UUID を email として送るバグ。
- `index.html` に Lovable 由来の `cdn.gpteng.co/gptengineer.js` が残っている。サプライチェーンの危険があるので削除。

### A6. セキュリティヘッダーがない（Medium）
`vercel.json` に CSP・X-Frame-Options・HSTS・Referrer-Policy・Permissions-Policy がない。まず `frame-ancestors 'none'`・`nosniff`・HSTS、CSP は Report-Only から段階導入。

### A7. アップロード画像の EXIF/GPS と、バケットの制限（Medium）
- 圧縮を通さずに生のファイルを upload している経路がある（思い出画像、チャレンジ、ディスプレイなど）。圧縮に失敗すると元ファイル（EXIF 付き）をそのまま上げる。GIF/SVG は素通り。
- バケット（ai-rooms・item-posts・kuji_images・profile_images）がすべて公開で、サイズ上限と MIME の許可リストがない。`kuji_images` はログイン済みなら誰でも任意パスに保存できる（HTML/SVG も可）。
→ すべてのアップロードを圧縮・EXIF 除去の関数に通し、失敗したら拒否。バケットにサイズ上限（10MB 程度）と MIME 許可リスト。`kuji_images` のパスを `auth.uid()` 始まりに強制。

### A8. 通報・ブロックがトレード画面だけ（Medium〜High）
投稿・コメント・DM・プロフィールには通報もブロックもない。NG ワード・画像モデレーション・通報件数による自動非表示もない。UGC を扱うアプリは Apple 1.2 で、通報・ブロック・24 時間以内の対応・規約同意が必要。
→ 全 UGC 面に通報・ブロックを付け、`user_blocks` を RLS/クエリに反映。管理画面（`ReportsManager`）の運用担当と対応時間を決める。

## B. 公開後すぐ対応

- **user_items と wishlists が全ログインユーザーに見える**（`USING true`）。プロフィールの `privacy_level` を無視している。note・購入価格・購入日・for_trade が他人に読める。→ SELECT ポリシーで `privacy_level` と本人判定、機微カラムはビューで隠す。
- **AI 機能のポイント消費に競合状態**（残高確認と減算が別処理、残高下限チェックなし）。並列リクエストでマイナス残高・初回無料の多重取得ができる。→ `FOR UPDATE` で原子的に減算する RPC、日次・分単位の上限、プロンプトのモデレーション、実在人物の写真をアバター化することの同意・規約。
- **匿名で呼べる SECURITY DEFINER 関数が多い**（anon 44 個・authenticated 73 個）。`find_user_matches(_user_id, …)` は `auth.uid()` と照合せず他人のマッチを引ける、`increment_visit_count` は閲覧数を水増しできる、など。→ 既定で `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated`、必要なものだけ再付与。トリガー関数は全ロールから剥奪。`function_search_path_mutable` の 4 関数と、public スキーマの `pg_net` も。
- **不要な cron と、ソースのない Edge Function**: `fetch-web-content-hourly` が 1 時間ごとに `fetch-web-content`（リポジトリにソースなし・config.toml にもなし）を呼んでいる。用途を確認して、不要なら停止、必要ならソースを取り込む。
- **カタログ画像のホットリンクと著作権**: official_items の約 97% が第三者サイトの画像を直リンク（cdn.shopify.com 約 2.2 万件ほか）。リンク切れ・帯域負担・権利者からの削除要求のリスク。→ 規約に削除依頼の窓口、取り込み方針の法務確認、将来は自社ストレージ化。
- **Edge Function の共通の弱点**: CORS が全部 `*`（自社ドメインに絞る）、`post-to-twitter` が `error.message` をそのまま返す、`revenuecat-webhook` の Bearer 比較が定数時間でない、`notify-new-tag` はログイン済みなら誰でも運営宛メールを送れる。
- **デバッグ出力**: `console.log` が 133 箇所、`debug-points.ts` など。ビルド時に削除し、PII を出さない。
- **決済の本番移行**: Stripe の live/test、カスタマーポータル・領収書メール・税の設定、iOS 課金（RevenueCat の `VITE_REVENUECAT_IOS_KEY`）を確認。

## C. 継続的に

- **パフォーマンス**: `auth_rls_initplan` 205 件（`auth.uid()` を `(select auth.uid())` に）、`multiple_permissive_policies` 158 件、重複インデックス 2 組、外部キーに索引なし 43 件、未使用インデックス 33 件、主キーのないテーブル 6 件。今の規模では問題ないが、official_items は増え続けている。
- **`_bk_20261007_*` のバックアップテーブル 6 個**: RLS 有効・ポリシー 0 で安全だが、期限を決めて削除。
- **バックアップ・PITR・ステージング環境・エラー監視（Sentry など）**: 未確認。リポジトリに Sentry の導入も staging の設定もない。本番 DB だけで運用している可能性が高い。PITR の有効化、日次バックアップの確認、エラー監視の導入を。
- **シークレット**: リポジトリに秘密鍵の混入はなし（`.env` は gitignore 済み）。anon キーは公開前提だが、環境変数化すると切り替えが楽。CI の `SUPABASE_ACCESS_TOKEN` の運用と権限範囲の確認。ローテーションの棚卸し。

## 良くできている点

- 全 public テーブルで RLS が有効。`USING true` の書き込みポリシーなし。DM・通知・ポイント・サブスクは本人のみ読める。
- profiles に email・住所・誕生日・電話・プッシュトークンなどの列がなく、PII は最小限。
- `profiles.is_admin` の変更を防ぐ RESTRICTIVE ポリシー。
- ポイント付与まわりが堅牢（`add_user_points`・`grant_points_*` はクライアントから実行不可、`claim_reward` は参照の所有確認と二重防止、ショップ購入・枠拡張はサーバー側で固定価格）。
- `stripe-webhook` は署名検証と冪等処理、サブスクは Stripe から取り直して反映。`stripe-checkout` の遷移先は許可リスト検証。
- `config.toml` で全関数の `verify_jwt` を明示し、CI で記載漏れを検出。
- 自社ストレージの書き込みは `auth.uid()` のパス検証あり（`kuji_images` を除く）。一覧用の SELECT ポリシーなし。

## 未確認

- Auth の設定（メール確認・パスワード要件・OAuth・MFA・レート制限）はダッシュボードの設定で、読み取り不可。
- PITR / バックアップ、Stripe の live/test、Sentry、Vercel の環境変数と環境分離。
- `fetch-web-content` の実装、`_shared/ai.ts` の提供元と、データ送信先の契約条件。
- iOS アプリ（`ios/`）の設定と、Apple の審査要件への適合。

## 進める順番（案）

1. **まず 1 週間**: A1（Edge Function の認証）、A5 の外部スクリプト削除、A6 のヘッダー、B の `REVOKE`。コードの小さな修正で、リスクが大きく下がる。
2. **公開の前提**: A2 退会、A3 法務ページ、A4 実メール認証、A8 通報・ブロック、A7 画像まわり。
3. **公開と同時**: エラー監視・バックアップ・同意バナー・ステージング環境。
4. **公開後**: B の残り、C。
