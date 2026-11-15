# パルクリール！ フランス蚤の市

パリの蚤の市を日付ごとにまとめて見て、同じ日に回れる組み合わせを探すサイトです。はしごシリーズの番外編で、作りはほかのはしごサイトと同じです。公開先は `puces.hashigo-map.com`。

- **この日** … 選んだ日に開く常設の蚤の市（早く開く順）と、その日の単発の市
- **はしご** … 選んだ日に、近くでまとめて回れる組み合わせ（北・南・東の3エリア）
- **単発の予定** … これからのブロカント、ヴィド・グルニエの一覧
- **常設** … 毎週開く蚤の市と、曜日ごとの時間
- **★ メモ** … お気に入りに入れた市、メモを付けた市、自由に書ける「旅のメモ」

エリア（中心部／左岸／右岸・西／右岸・北／右岸・東）は、上のボタンか、パリ20区の地図を押してえらびます。同じエリアをもう一度押すと「すべて」に戻ります。

お気に入りとメモは、見ている人のブラウザ（localStorage）にだけ保存します。サーバーには送りません。

日付はすべてパリ時間です。上の帯には今日から14日ぶんが並びます。

## 仕組み

```
data/markets.csv（常設。手で書く）──────────────┐
data/events.csv（単発。import で作る）──────────┼─ scripts/build.mjs ─> public/data/puces.json ─> public/（静的サイト）
data/hashigo.csv（はしごエリアと、含める区）────┘
        ▲
scripts/import-paris.mjs ← パリ市の一覧ページ（月1回、手で実行）
```

- 「この日に開くか」は **閲覧したときにブラウザで計算** します（`public/schedule.js`）
- GitHub Actions が毎週月曜 5:20（日本時間）と、main への push のたびに作り直して Cloudflare Pages の `hashigo-puces` に公開します。**Actions はパリ市のページを取りに行きません**

## 月に1回の更新

パリ市の一覧は月のはじめごろに更新されます。

```bash
npm run import   # パリ市の一覧 → data/events.csv
npm test
npm run build
git add data && git commit -m "単発の市を更新" && git push
```

`import` が「注意:」を出したら、その行を一覧ページで見くらべます（ページ側の月の書きまちがいなど）。1件も読めないときは events.csv を書きかえずに止まります。

## 常設のデータ（data/markets.csv）

| 列 | 内容 |
|---|---|
| `id` | p001 のような固定ID（変えない） |
| `name` / `name_fr` | 日本語の呼び名とフランス語の正式名 |
| `kind` | 骨董・古道具／古着・日用品／古本 など |
| `zone` | 中心部／左岸／右岸・西／右岸・北／右岸・東 |
| `mon`〜`sun` | `07:00-14:00`。メモを付けるときは `08:00-12:00\|業者向け`。休みは空 |
| `status` | 確認済（公式・市のデータ）／推定（情報サイトから）／未確認／掲載中止 |
| `official_url` | 空なら画面は「公式をさがす」（検索リンク）になる |
| `hashigo` | はしごエリアのキー（hashigo.csv の `key`）。なければ空 |
| `source` | 確認元のURL |

## いまのデータの状態（2026-11-14）

- 常設 7件（確認済 6、推定 1）。アリーグル広場の曜日と時刻は公式で未確認
- 単発 53件（2026-11-11 〜 2027-03-29）。パリ市の一覧の 2026-11-09 版
- 緯度・経度は持っていません。各カードの「地図」は Google マップの検索リンクです
- エリアをえらぶ地図（`public/paris-map.js`）は、パリ市オープンデータ「Arrondissements」（ODbL）の区の輪郭を簡略化したもの。区が変わることはまずないので、作り直す手順は用意していません

## ローカルで動かす

```bash
npm run build        # CSV → public/data/puces.json
npm test             # 取りこみと日付のテスト
npm run serve        # http://localhost:8080
```

## 公開（Cloudflare Pages）初回の設定

1. GitHub に `hashigo-puces` リポジトリを作って push
2. Settings → Secrets and variables → Actions に `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` を登録（ほかのはしごサイトと同じもの）
3. Actions タブで「データ更新・公開」を手動実行 → `https://hashigo-puces.pages.dev`
4. `puces.hashigo-map.com` を Pages に接続し、pages.dev は Cloudflare Access（はしごシリーズ共通の設定）で自分だけに

公開前は、どのページにも `noindex` が入っています（`public/index.html`、`about.html`、`_headers`）。

## 掲載中止のご依頼があったとき

常設は `data/markets.csv` の `status` を `掲載中止` に変えて push。単発は `data/events.csv` の行を消します（次の import で戻るので、`scripts/import-paris.mjs` で除く条件も足す）。情報の集め方は `docs/terms.md`。
