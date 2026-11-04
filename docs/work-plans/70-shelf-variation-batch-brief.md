# WP70: 棚バリエーション実装ブリーフ(I/J/K の v2・v3)

**用途**: 在庫を使い切った棚(I・J・K)に、同じ元ネタから別の遊びを積み増すコードゲーム制作の指示書。
並列バッチの実装エージェントにこのファイルを丸ごと読ませる。行の割り当ては `docs/work-plans/ledger/sources/plays/<棚>-var.tsv`
(列の意味は `ledger/sources/README.md` の「plays/<棚>-var.tsv」節)。目標: I=400 / J=350 / K=400 本。

**禁止**: git commit / push、`npm run ai:upload:games`、`scripts/dup-plays.ts` の実行(共有CSVを上書きするため。重複検査は統括側)、
自分が新規作成するゲームファイル以外の編集(ledger・plays/*.tsv・package.json 等は触らない)。

---

## 1. 担当行と出力

- 担当は渡された id の一覧。各行は `<棚>-var.tsv` の `id / play / mechanic / world`(K棚はさらに `beat`)。
- 出力パス: `src/ai/code/games/<family>/<id>-<slug>.js`(例 `src/ai/code/games/sim/I-GBA-0001v2-toy-arrow-graze.js`)。
  family は既存フォルダ(adv/board/fight/fish/luck/puzzle/quiz/race/rhythm/run/shoot/sim/sports)からメカニクスに合うもの。
- **@mechanic は TSV の mechanic 列どおり**(変更禁止)。
- ヘッダーコメント(先頭9行、厳守):
```
// <id>-<slug>.js
// <日本語タイトル> — <一言体験説明>
// 操作: <操作の説明(社内メモ。画面には出さない)>
// 終わり: <成功/失敗条件>
// @mechanic: <割り当てID>
// @theme: <english_snake_case>
// 世界観: <舞台・主役・目的を1行で。型(メカニクス)の言い換え>
// 残るもの: <正誤(CLEAR/GAME OVER) + 何のスコア/統計か>
// スタイル: <スタイルパック名>
```
- 本体は `(function(game){ ... })(game);` のIIFE。状態機械 `ATTRACT → PLAYING → RESULT`。
- 構造の参考(**コード流用禁止**): `src/ai/code/games/puzzle/GH-PS-0081-maze-trace.js`、
  `src/ai/code/games/fight/GH-PS2-0022-shoulder-read.js`、`src/ai/code/games/puzzle/D-20132016-0058-transit-loop-relay.js`

## 2. バリエーション固有のルール

1. **元ゲームを必ず読む**: 元id(`v2`/`v3` を除いた id)のファイルは `ls src/ai/code/games/*/<元id>-*.js`。
   同じ元ネタの v2/v3 が既にあればそれも読む。**操作・画面構成・ATTRACTデモ・難易度カーブ・スタイルパックを元ゲームと別物にする**。
2. **同じ @mechanic の既存ファイルを読む**: `grep -l "@mechanic: <mech>" src/ai/code/games/*/<棚>-*.js`。
   入力・配置・プレッシャー型・スパイスで形を変える(色と絵を変えただけは不可)。
3. **世界観の重複チェック**: TSV の world 列を種にし、書く前に
   `grep -h "^// 世界観:" src/ai/code/games/*/<棚>-*.js | grep -E "<舞台のキーワード>"` で
   「舞台+主役の役割」が既存と重ならないか確認する。重なったら舞台を変える。
4. **I棚(プチゲーム集風)**: 数秒の即決課題を、1プレイ内で難度を上げながら複数回繰り返す構成を基本にする。
   元ネタ作品の意匠(下端で燃えていく導火線の爆弾タイマー、ステージ間の「ボス課題」演出、課題ごとに一語の命令文を大きく出す演出)は使わない。
5. **J棚(ボードパーティのミニゲーム集風)**: 単独プレイ。相手は演出付きAIのみ(turn_attack は自分の番を遊び、AIの番は見せる)。
   樽と鉄骨・緑の土管・?ブロック・4マス7種の落ちもの一式・格子迷路と十字の爆風などの意匠は使わない。
6. **K棚(リズムゲーム集風)— 拍に乗ること(MUST)**:
   - 一定のBPMの拍クロックを1つ持ち(例 `beatT += dt; if (beatT >= SPB) {...}`)、判定は拍の頭からのずれで行う。PERFECT/GOOD/MISS の窓を持つ。
   - `game.audio.melody` / `tone` で拍を刻む伴奏を自作し(実在曲のメロディ禁止)、画面にも拍を見せる。
   - TSV の `beat` 列を実装する: `straight` 表拍 / `offbeat` 裏拍 / `call_response` お手本1小節→同じ型を返す1小節 /
     `waltz` 3拍子 / `swing` 跳ねる8分 / `syncopation` 食い / `tempo_ramp` 段階的に加速 /
     `break` 伴奏が抜ける間も拍を保つ / `medley` 途中で拍型が切り替わる(音と画面で予告)。
   - 尺は小節数で決める(例 120BPM・8小節=16秒)。ATTRACTデモも拍に乗って実演する。
7. 運任せの結果禁止(観察・技能で決まる)、賭博演出禁止(賭け・コイン・スロット)、危害表現禁止(爆弾→花火玉・水風船、武器→玩具)。
   傾き・加速度計・マイクは使えない(画面タッチのみ)。

## 3. 必ず守る実装パターン(過去に実際に出たバグ)

- **`game.onUpdate(` は1ファイル1回だけ**。エンジンは最後に登録したハンドラだけを保持する(2回呼ぶと1回目が無言で消える)。
- **RESULT→ATTRACT のタップで必ず初期化関数を呼ぶ**: `if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }`
- **デモ周期の頭の判定**: `if (cyc < dt || demo.t <= dt) { /* 配列の再構築 */ }`(`cyc < dt` 単体だと初回で抜ける)
- **ラウンド全体の TIME_LIMIT**: 正解しないと永遠に終わらない形を作らない。ジェスチャー待ちには2〜3秒のtimeout。
- **ATTRACT は常に動いている**(bob+sway+ambient pulse)。ゴーストハンドは `game.draw.hand(x, y, {press})`(揺らぎはエンジン側で自動)。
- 過度な速度減衰をしない。smoke を通すためだけに設計上の尺を削らない。

## 4. 品質基準(v2.1 + 遊びの文法v3)

1. **行動フィードバック**: 全入力に~100ms以内で視覚+音+状態変化。`game.feedback.good` と `game.feedback.bad` を両方使う。
2. **縦画面3ゾーン**(1080x1920): HUD(y<230)/ プレイフィールド(12〜75%)/ 親指ゾーン(y>1440)。
3. **キャラ必須**: `game.draw.sprite` の文字列ビットマップで名前をつけられるモチーフを描き、2〜4フレームでアニメ。背景は `gradient`+遠景。
4. **テキストレス(最重要)**: `draw.text` で出してよいのは 数字・カウンタ・スコア、`SCORE`/`BEST`/`HI-SCORE`、
   `PERFECT`/`GOOD`/`MISS`/`NICE`/`NEW RECORD`、`READY?`/`GO!`/`CLEAR`/`GAME OVER`/`TIME UP`/`FINISH`、
   `INSERT COIN`/`► 100円 投入 ◄`/`TAP TO START`/`TAP TO CONTINUE`、タイトルロゴ、「あと+数値+単位」のみ。操作説明文は禁止(`docs/specifications/PLAY_GRAMMAR_V3.md` §3)。
5. **ATTRACTゴースト実演**: 実ロジックで1サイクル遊んで見せる(成功例+危険があれば失敗例)。
6. **telegraph**: 危険は0.5〜0.8秒前に予告(点滅・影・警告線+予告音)。予告なしの即死禁止。
7. **hit-stop**: 失敗の瞬間に0.3〜0.6秒止め、当たった物を白フラッシュ+拡大してから `feedback.bad`。
8. **READY?→GO!** の0.8秒カウントイン。**SE 3種以上**を意味で使い分け。BGMは `game.audio.melody` の固有メロディか世界観に合うプリセット(`bgm_main` の惰性使用禁止)。
9. **尺の帯域**: A timing系 8〜15s / B 照準・発射 10〜20s / C 回避・追従 15〜25s / D ジェスチャー 8〜15s /
   E 配置・整理 15〜25s / F 観察・判断 8〜15s(memory_sequence・pair_match は10〜20s)/ G 対戦系 15〜30s。
10. マイルストーン演出(`fx.popup`+`se_milestone`)を最低1回、RESULTにニアミス演出、統計+BEST、`game.end.success(score, stats)`。
11. ATTRACTの HI-SCORE/BEST は `game.best` の実値(偽ハードコード禁止)。
12. スタイルパックをヘッダー直後に宣言(`var STYLE = { bg: [...], main: [...], accent: [...] };`)。描画は rect/circle/line/sprite/gradient/text のみ。
    詳細は `docs/specifications/ARCADE_ART_DIRECTION.md`。

API の全体は `docs/specifications/SANDBOX_API_V2.md`、メカニクスの意味は `docs/specifications/MECHANICS_CATALOG_V2.md`、
権利ルールは `docs/specifications/IP_SAFETY_RULES.md`(実在タイトル名・キャラ名・権利者名をコメント・世界観・描画文字列・ファイル名に一切書かない)。

## 5. 検証(必須)

1本書くごとに `npx tsx scripts/check-game.ts <path>` で `valid: true` かつ `score>=80` を確認してから次へ
(途中で止まっても完成品が残るように)。全件揃ったら
`npx tsx scripts/smoke-code-games.ts --files <全ファイル> --out <自分専用のscratchディレクトリ>` を2回連続でPASSさせる。

## 6. 完了報告

各ファイル: パス、@mechanic(K棚は beat も)、世界観1行、check-game スコア、smoke 結果。簡潔に。
