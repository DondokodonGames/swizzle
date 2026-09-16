# 制作リストの元データ（sources/）

`npm run games:list` が `raw/` と貼り込みファイルを読んで
`docs/work-plans/ledger/production-list.csv` を生成する。再実行は冪等。

## raw/ — 機械取得した実データ（手編集しない）

| ファイル | 棚 | 出どころ |
|---|---|---|
| `E-<機種>.txt` | E ハード別 | No-Intro / Redump（libretro-database）。Japan/USA/World/Europe、Demo・Beta・Proto・BIOS 除外、リージョン違いを名寄せ |
| `F-arcade.txt` | F アーケード | MAME + FBNeo、クローン・bootleg を名寄せ |
| `GH-simple.txt` | G/H SIMPLE題材 | E から `Simple ...` を抽出（`機種<TAB>タイトル`） |
| `L-existing-797.txt` | L 既存 | `src/ai/code/examples/*.js` のヘッダー（`L-NNN タイトル / slug — フック`） |

取得経路はこのセッションで唯一通った `raw.githubusercontent.com/libretro/libretro-database` のみ。

## 貼り込みファイル — 機械で取れない棚（ここに貼る）

| ファイル | 棚 | 貼るもの |
|---|---|---|
| `warioware.txt` | I | メイドインワリオ各作のプチゲーム名 |
| `marioparty.txt` | J | マリオパーティ各作のミニゲーム名 |
| `rhythm.txt` | K | リズム天国各作のリズムゲーム名、ほか音で遊ぶゲーム |
| `mobile.txt` | D | スマホゲームのタイトル |
| `switch.txt` | E | Switch / Switch2 のタイトル（No-Intro に無い） |
| `arcade-archives.txt` | F | アーケードアーカイブスの配信タイトル。貼ると `F-arcade` 側の該当行に `source=mame+aca` の印が付く |

書式:

```
# GBA メイド イン ワリオ        ← # で始まる行は区分（機種や作品名）。以降の行に付く
はしれ！
よけろ！
                                 ← 空行は無視
# GBA まわるメイド イン ワリオ
...
```

1行1件。行頭の `#` 以外は全部タイトルとして読む。順番は保たれ、末尾に足せば ID は変わらない。

先頭に `#! source=memory` と書くと、そのファイルの行は `source=memory`（記憶ベース・未検証）になる。
検証済みの一覧を貼ったらこの行を消す（`source=paste` に戻る）。

## production-list.csv の列

| 列 | 意味 |
|---|---|
| `id` | `<棚>-<機種>-<連番>`。入力順で振るので、貼り込みの末尾追記では既存IDが動かない |
| `shelf` | A〜L |
| `platform` | 機種タグ（`E-FC` の `FC` 等）／`ARCADE`／貼り込みの `#` 区分 |
| `title` | 元タイトル（固有名詞を含む。**生成入力ではなく台帳**。`games:ip` の対象外） |
| `source` | no-intro / redump / mame / mame+aca / repo / paste |
| `play` | 固有名詞を含まない遊びの一文。**空で始めて、ここを埋めるのが制作の本体** |
| `status` | todo / play-written / built / measured。L は existing |
