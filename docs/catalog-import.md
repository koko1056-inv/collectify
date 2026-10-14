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
9. **表紙の雑誌**（推しが表紙の号）— タイプ `雑誌`。下の「表紙の雑誌」を参照。

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
- 通常のグッズ・アーティスト以外の書籍・コミック・ゲーム・チケット・デジタル配信などは入れない。ただし**推しが表紙の雑誌は入れる**（下の「表紙の雑誌」）。
- 既に入っている商品（同題・同画像）は入れない。

## 表紙の雑誌

推しが表紙を飾った雑誌は、ファンにとって集める対象なので入れる（2026年10月に方針を変更。最初の取り込みで157件）。

- **入れるのは、ページ上で「表紙」と明記されている号だけ**（「表紙」「表紙巻頭」「表紙版」「cover」など）。中のページに載っているだけの号、裏表紙、別冊付録のみの登場は入れない。写真が本人に見えても明記がなければ見送る。
- 1号＝1件。同じ号の表紙違い（通常版・特別版など）は別の行にする。
- タイトルは「アーティスト名 表紙 雑誌『誌名』YYYY年M月号」。メンバー個人の表紙は「メンバー名（グループ名） 表紙 雑誌『…』」。
- タイプタグ `雑誌`。表紙の人物・キャラは、既存のキャラクタータグがあるときだけ付ける。
- `description` に、表紙の書かれ方（例「表紙巻頭：〇〇」）と出典URLを残す。
- 価格は数字だけ。分からなければ空文字。画像は表紙そのものであることを目で確かめる（告知用の別画像を入れない）。
- 表紙は決まっているが表紙画像がまだ出ていない号は、画像が出てから入れる。
- 取得元の例（どれも robots.txt を確認済み・2026年10月時点）: アーティスト公式サイトのメディア情報、音楽と人（`ongakutohito.com`、WP REST API）、MUSICA（`musica-net.jp`）、ニュータイプ（`webnewtype.com`）、タワーレコード（`tower.jp` の `/item/`。Disallow の検索パスは使わない）、ROCKIN'ON（`rockinon.com`、Crawl-delay 120 を守る）。
- 使わない取得元: Amazon、Fujisan（規約で私的利用を超える利用を禁止）、GQ JAPAN・HMV・honto・dot.asahi（AI クローラーを名指しで禁止）。Cloudflare の確認画面が出るサイトは回避せず中止する。

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

### 定期実行の設定（ルーティン）

- 毎朝 6:47（日本時間）に、Supabase のコネクタ付きで実行される。プロンプトはこの文書が無くても完結するように書いてある（リポジトリが無い環境で動くため）。見張り先を足したら、ルーティンのプロンプトにも足すこと。
- 見張り先（Shopify の公式ストア）: BMSG SHOP（`bmsg:`）、ホロライブ `shop.hololivepro.com`（`hololivepro:`）、ちいかわ `chiikawamarket.jp`（`chiikawamarket:`）、M!LK の PLUS GOODS STORE（`plusstore:`）と旧ストア（`sdstore:`）。いずれも robots.txt は許可。`products.json` の `published_at` が直近14日のものを送る。
- 取り込みは `import_official_batch()` を使う。同じ ID に加えて、同じ作品の同じタイトル・同じ画像（`?` 以降を除く）の商品も自動で弾く（ホロライブは過去の取り込みと ID の形式が違うため。マイグレーション `20261010860000`）。結果は `catalog_import_log` に毎回1行残る（管理者だけが読める）: `select run_at, added, summary from catalog_import_log order by id desc limit 10;`
- 実行環境からは、Cloudflare の確認画面で止まるサイトがある（例: STARDUST PLUS GOODS STORE）。その場合は飛ばし、別の取得元（M!LK なら旧ストア）を使う。確認画面を突破・回避はしない。

### 報告

追加した件数（取得元・作品別）、スキップした理由（robots.txt で不可、画像が取れない、規約が不明など）、翌日に回した件数を短くまとめて返す。新商品が無い日は「新着なし」だけでよい。コードやマイグレーションは変えない。
