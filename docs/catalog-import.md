# 公式グッズカタログの取り込み方針

`official_items` に作品のグッズを入れるときの決まりごと。取り込みは Supabase の SQL で行い、アプリのコードは変えない。

## 新しい作品を足すときは、最初からこのセットで取り込む

1. **通常グッズ**（AMNIBUS などの通販・公式ストア）
2. **ガチャ**（ガシャポンなどのカプセルトイ）— 入手方法タグ `ガチャ`
3. **一番くじ**（賞ごとに1件）— `一番くじ`
4. **プライズ**（ゲームセンター景品）— `プライズ`
5. **コラボカフェ** — `コラボカフェ`
6. **キャンペーン特典**（コンビニ・店舗・飲食コラボのノベルティ、購入特典、ポップアップ限定品）— `キャンペーン特典`
7. **カード**（トレーディングカード・カードゲーム・ウエハース・フォトカード）— タイプ `カード`。**1枚ずつの一覧が取れるサイト（ヴァイスシュヴァルツ、UNION ARENA、hololive OFFICIAL CARD GAME など）があれば、1枚＝1件**で入れる。無ければパック／BOX 単位。タイトルは「作品名 カード名 [カード番号 レアリティ]」。
8. **アーティスト系は音源・映像も**（CD・アルバム・シングル・アナログ盤・ライブ映像）— タイプ `CD` / `レコード` / `映像`。初回限定盤・通常盤などの形態違いは別商品。取得元は公式のディスコグラフィ、または MusicBrainz（API）＋ Cover Art Archive（ジャケット）。

既存の作品にも同じものを足す。ガチャやくじは通常グッズより見つけにくいので、後回しにしない。

## 一括取り込みの関数

`public.import_official_batch(j jsonb, cname text, pre text)`（マイグレーション `20261010800000`）に、下の「データの形」の行（JSON）・作品名・画像URLの共通の前置きを渡すと、通知トリガーの停止/復帰・作品・タグ・商品・タグ付けまでを1回でやる。クライアントからは呼べない（`execute_sql` から使う）。`docs/catalog-import-template.sql` と同じ処理で、貼る量が少ない。1回は60件ほどにすると安全。

行の形: `{"i":"安定ID","t":"タイトル","im":"画像のパス","p":"価格","d":"日付","ty":"タイプ","s":"シリーズ","sr":["入手方法"],"c":["キャラ"]}`（`s` `sr` `c` は省略可）。

## データの形

- `content_names`（`type='anime'`）に作品を作り、同名のコンテンツタグを付ける。
- 1商品＝`official_items` 1行。ID は取得元ごとの安定ID（例 `amnibus:12345`、`gachaisland:…`、`1kuji:…`）から UUID v5 で作る。再実行しても二重に入らない。
- タイトルは「作品名＋商品名」。
- 付けるタグ: コンテンツ / グッズタイプ / シリーズ / 入手方法（上の語彙）/ キャラクター（商品名に1人だけ含まれるときだけ）。
- `price` は NOT NULL。不明なら空文字 `''`（画面は空なら価格を出さない）。
- `release_date` は NOT NULL。分からなければ、掲載日・登録日などの近い日付を使い、その旨を記録しておく。
- 画像は実在（HTTP 200・`image/*`）を確かめたものだけ入れる。サムネではなく原寸を使う。
- **`curl` で 200 でも、ブラウザで表示できないことがある。** 画像の応答に `Cross-Origin-Resource-Policy: same-site` / `same-origin` が付いているサイトは、他サイトの画面に埋め込めず、ブラウザが読み込みを拒否する（例: ONE PIECE カードゲーム公式 `onepiece-cardgame.com`）。そういうホストの画像は、保存するときに Edge Function の `proxy-image` 経由の URL（`<SUPABASE_URL>/functions/v1/proxy-image?url=<元URLをエンコード>`）にしておく。取り込み後は、実際のブラウザで数件、画像が出ることを確かめる。
- 通知トリガー（新商品通知）は投入中だけ無効にして、終わったら必ず有効に戻す。

## 取得の作法

- **取得の前に、必ず `robots.txt` を読む。** AI クローラー（ClaudeBot / anthropic-ai / GPTBot など）を名指しで禁止しているサイトは、取得元に使わない。別の名前のクローラーで取って回避してはならない（実例: 一番くじ倶楽部 1kuji.com、HMV、電撃ホビーウェブ、ソニーミュージック）。
- `Disallow` されたパス（例: gacha-island.jp のサイト内検索 `/?s=`）は、同等の別経路（検索 API など）も含めて使わない。`Crawl-delay` は守る。
- 同じサイトへは 15 秒以上あけて取りに行く（もっと長い指定があればそれに従う）。
- 規約や許可が不明な取得元は使わない。データの出どころを偽って登録しない（例: 取得したものを「ユーザーが追加した」ことにしない）。
- 通常のグッズ・アーティスト以外の書籍・コミック・ゲーム・チケット・デジタル配信などは入れない。
- 既に入っている商品（同題・同画像）は入れない。

## 毎日の新商品チェック（自動実行）

毎日1回、定期実行のセッションが「見張り先」を見て、**まだ入っていない新商品だけ**を追加する。

### 見張り先（上の「取得の作法」を守ること。行き詰まったら取らずに報告する）

- 作品・アーティストの公式ストアの新着: AMNIBUS（ミセス・ちいかわ・ホロライブ・にじさんじ・Ado など、既に入っている作品）、ミセス公式 `mrsgreenapple.com`
- コラボカフェ・店舗限定: Ringo Jam Café `https://ringojam-cafe.ltr-online.com/lp/goods`（ページ内の `data-page` JSON の `siteLpContent.body` に商品が入っている。「今後公開予定」の追加分を拾う）
- ガチャ: ガシャポンオフィシャルサイト（gacha-island.jp。検索 `/?s=` は使わない）
- プライズ: タイトーのプライズ（`taito.co.jp`、20 秒あける）、BANPRESTO（`bsp-prize.jp`。原寸画像が Referer なしで取れるものだけ）
- カード: ヴァイスシュヴァルツ / UNION ARENA / hololive OFFICIAL CARD GAME などの1枚ずつ一覧
- 取り込み済みのほかの作品（アニメ・ゲーム）の新商品・新弾

### 事務所・レーベルの公式ショップ（Shopify）

- **BMSG SHOP**（`bmsg.shop`、BE:FIRST / MAZZEL / STARGLOW / Novel Core / Aile The Shota / SKY-HI / REIKO ほか）: robots.txt は `User-agent: *` で許可。`/products.json?limit=250&page=N` で全商品が取れる（3ページほど、ページ間は15秒あける）。ID は `bmsg:<product id>`。画像は `https://cdn.shopify.com/s/files/1/0614/7430/8322/` 以下（`files/` または `products/`）。チケット・ファンクラブ・配信・アーカイブ類は入れない。
- 新着は `published_at` が新しいものだけを見る。作品（content_names）には英語名と日本語の別名（例: BE:FIRST→ビーファースト）を付ける。

- **M!LK**（スターダストプロモーション、ブロマイド・グッズ。作品名 `M!LK`）。公式サイトは `sd-milk.com`、グッズの販売先は2つ:
  - **STARDUST PLUS GOODS STORE**（`stardust-plus-goods-store.plusmember.jp`、Shopify）: robots.txt は `*` で許可。`/collections/m-lk/products.json?limit=250&page=N`。現行の商品だけが載る（終了すると消える）。ID は `plusstore:<product id>`。画像は `https://cdn.shopify.com/s/files/1/0638/4798/9332/` 以下。
  - **スタダ便 ONLINE SHOP**（旧ストア `store.plusmember.jp/stardustch`）: robots.txt は無い（制限なし）。過去分を含めて M!LK が131件。カテゴリ一覧 `products/list.php?category_id=891` は **POST** でページ送りする（`mode=&pageno=N&disp_number=50&orderby=date&category_id=891`、ページ間は15秒）。ID は `sdstore:<product_id>`。画像は `https://storage-store.plusmember.jp/upload/save_image/` 以下。FC会員限定・チラシ・0円・チケット・写真集（書籍）は入れない。**発売日は載っていない**ので、画像ファイル名 `MMDDhhmm_<8桁16進>…` の16進が UNIX 時刻（アップロード日）なので、それを日本時間の日付にして使う（無ければ画像の `Last-Modified`）。
  - 新着は、PLUS GOODS STORE の商品（`published_at` が新しいもの）と、旧ストアの一覧の先頭（新着順）を見る。

### 取り込めない・見送った取得元

- **STARTO ENTERTAINMENT**（Snow Man ほか）: `starto.jp` の robots.txt が ClaudeBot / Claude-SearchBot / GPTBot を名指しで禁止しているため、取得元に使わない。
- JO1（`jo1.jp` は取得可だが、グッズの販売先 LAPONE のショップは、この実行環境のネットワーク許可に無い）: 環境のネットワーク許可に追加するか、取得元を別にする必要がある。

### 手順

1. `docs/catalog-import.md`（この文書）と `docs/catalog-import-template.sql` を読む。
2. 見張り先ごとに robots.txt を読み、今日の新着を取得する（同じサイトへは 15 秒以上あける）。
3. 既存と突き合わせる（同題・同画像・同じ安定 ID は入れない）。画像は 200・`image/*` を確かめる。
4. `docs/catalog-import-template.sql` のプレースホルダ（`@@JSON@@` `@@CNAME@@` `@@CTAG@@` `@@PRE@@`）を埋め、Supabase の `execute_sql` で実行する。通知トリガーの無効化・再有効化はテンプレート内で行われる（失敗すればまとめて巻き戻る）。
5. 件数・タグが付いたこと・通知トリガーが有効に戻っていることを確かめる。
6. 1日に入れるのは多くて 300 件まで。それを超える分は翌日に回す。

### 報告

追加した件数（取得元・作品別）、スキップした理由（robots.txt で不可、画像が取れない、規約が不明など）、翌日に回した件数を短くまとめて返す。新商品が無い日は「新着なし」だけでよい。コードやマイグレーションは変えない。
