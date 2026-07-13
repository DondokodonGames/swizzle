# WP65: 800本 v3書き換え — Codex 向けハンドオフ(Swizzleの仕組み + 指針)

**目的**: `src/ai/code/examples/*.js`(800本)を「遊びの文法v3 + MOTHER3級アート」へ書き換える作業を **Codex に委ねる**。
本書は **「Swizzle上でどう動くかの仕組み(§2)」と「書き換えの指針(§3〜§4)」だけを渡す**もの。
**あとの実装(ロジック・アート・尺・難易度・演出のすべて)は Codex が1本ずつ自由に行う。**

> 本セッションの結論: MOTHER3級のドット絵アートは手続き描画/Claude Code 環境では出せない。
> よって Claude Code が個別ゲームを作り込むのではなく、**仕組みと指針を渡して Codex に自由に修正させる**。

---

## 0. 分担

| 担当 | 責務 |
|---|---|
| **本リポジトリ(Swizzle)が提供** | ① プラットフォーム(エンジン/`game.*` API/確認ツール §2・§5) ② 指針(本書 + 正典 §1) ③ per-game 台帳(§6) |
| **Codex** | 800本を1本ずつ**自由に全修正**(設計・ロジック・アート・尺・難易度・演出)。§3〜§4 の指針に沿い、§2 の仕組みの上で動くようにし、§5 のツールで自己確認する |

- **Claude Code は個別ゲームのロジック/アートブリーフを作らない**。機械ゲート(validator/scorer/smoke)は**リポジトリにある確認ツール**であって、Codex が自分の成果を検証するために `npm run …` で回すもの。

---

## 1. 正典・参照ドキュメント(Codex 必読)

- [`docs/specifications/PLAY_GRAMMAR_V3.md`](../specifications/PLAY_GRAMMAR_V3.md) — v3正典(テキストレス・ATTRACT実演・telegraph・hit-stop・SE語彙・尺帯域・難易度)
- [`docs/specifications/SANDBOX_API_V2.md`](../specifications/SANDBOX_API_V2.md) — 使える `game.*` API 全リファレンス(**ここに無いAPIは使えない**)
- [`docs/specifications/GAME_QUALITY_STANDARD_V2.md`](../specifications/GAME_QUALITY_STANDARD_V2.md) — 合格基準・採点対応
- [`docs/specifications/MECHANICS_CATALOG_V2.md`](../specifications/MECHANICS_CATALOG_V2.md) / [`ARCADE_ART_DIRECTION.md`](../specifications/ARCADE_ART_DIRECTION.md)
- 台帳の列辞書: [`docs/work-plans/61-800-games-ledger.md`](61-800-games-ledger.md)
- 本書 §3〜§4 は、実レビューで鋭くなった追加指針。**矛盾したら正典 + 本書が優先**。

---

## 2. Swizzle の仕組み(Codex が前提として知るべき動作)

- **ファイル形式**: 各ゲームは `src/ai/code/examples/NNN-slug.js` の1ファイルで完結。`(function(game){ ... })(game);` の IIFE。外部参照・import 不可。ファイル名/slug/番号はリネーム禁止(DBと統計に紐づく)。
- **実行環境**: `src/services/code-game/iframeTemplate.ts` が各コードを **iframe サンドボックス**で実行(アプリに同梱、エンジン変更は全ゲームに即時適用)。キャンバスは **1080×1920 縦固定**、Canvas 2D。
- **ライフサイクル**: 状態機械 **ATTRACT → PLAYING → RESULT**。`game.onStart / onUpdate(dt) / onTap / onSwipe / onHold / onPress / onRelease / onMove` を登録。`game.end.success(score, stats?) / game.end.failure()` で終了。ウォッチドッグは**初回ユーザー入力から**計時(ATTRACT放置では強制終了しない=実演をじっくり見せられる)。
- **API**: 描画 `game.draw.*`(clear/rect/circle/line/text/image/sprite/gradient/**hand**)、音 `game.audio.*`(play/bgm/stopBgm/tone/melody)、演出 `game.fx.*` と `game.feedback.good/bad`、入力 `game.input/touches`、当たり `game.hit.*`、`game.best`、`game.random`。詳細は SANDBOX_API_V2.md。
- **アセットと WARN**: 画像/音は `assets`(background/objects/audio)経由で `game.draw.image(id,...)` / `game.audio.play(id)`。**未定義の `se_*`/`bgm_*`/画像 id は WARN**(smoke では WARN 1件で FAIL)。プリセットSE/BGMは iframeTemplate の一覧参照(mechanics-v3.ts に許可IDを集約)。
- **禁止**: `window.*` / `document.*` / `AudioContext` 直接 / `localStorage` / `fetch` / 無限ループ(validator が落とす)。
- **ヘッダー規約**: 1行目ファイル名 / 2行目 タイトル—説明 / 3行目 操作 / 4行目 成功・失敗 / `// @mechanic:` / `// @theme:` / `// 世界観:`。

---

## 3. 書き換え指針(設計 — 全ゲーム共通・最重要)

機械ゲートは**通っても品質を保証しない**(本セッションで、ゲート全通過の13本が「ほぼ0点」評価)。以下の5原則を**ゲーム全体で**満たすのが本丸:

1. **世界とメカニクスの一致(最重要)** — その世界で「自然にやりたくなる行動」＝勝ち筋。✗爆弾解除なのに「1で待つ」/ ✓駅に電車をちょうど停める(早すぎ・遅すぎ両方まずいのが直感的)。
2. **画でルールと因果を伝える** — 何をする/成功/失敗を、抽象数字やコード規則でなく**背景・設置物・状態変化**(あふれる/ぶつかる/通り過ぎる)で一瞬で。**失敗の"まずさ"は必ず画で起こす**。
3. **操作の可視化** — 何をタップ→何が起きるかを、**見た目のアフォーダンス + ATTRACT実演**で(例: 見えるブレーキレバー→引くと電車が減速)。
4. **遊びの中の判断** — ただ待つを禁止。変化を読んで**先読み・判断**する余地を**直感的に**(抽象UIの読解はダメ)。
5. **テーマ = 見れば何をすべきか分かるもの** — 舞台名でなく、テーマから行動が分かる。**文字での説明は厳禁**(§3ホワイトリスト以外のテキスト禁止)。

**良設計例 017「ぴたっと駅停め」**: 駅に電車を停める(世界一致)/ 行き過ぎ・手前が画で分かる(因果)/ ブレーキレバー(操作可視化)/ 速度可変で先読み(判断)。

---

## 4. 書き換え指針(アート品質)

- **目標: MOTHER3(GBA)級のドット絵**。実際にドット絵である必要はないが「**ドット絵らしく・面白そうに**」見えることを優先。
- **判断はゲーム全体(合成された動く画面)で**。単体スプライトの巧拙では判断しない。
- **主役(操作対象)は大きく前面に**。小さすぎると対象として成立しない。
- **記号感(一目で分かる)と高品質を両立**。装飾物の**量**でなく**必要要素の質**を上げる。
- **成功/失敗は思いっきり差をつける**(表情・演出・結果が画で激変)。
- **アート方針はゲーム内容ごと**に最適化(スタイルパックは出発点)。

---

## 5. プラットフォームの現状能力と制約(アートの実現手段)

Codex がアートをどう実装するかの前提。**現状**:
- 手続き描画(`draw.rect/circle/line/sprite/gradient/text`)+ 画像アセット(`draw.image` は**画像1枚を丸ごと描画**、回転可)。
- **スプライトシートのコマ切り出し(source rect)は未対応** / **smoke はゲームのアセットを読み込まない**(`assets:[]`)。
- ⇒ **MOTHER3級を実アセットで載せるにはプラットフォーム拡張が要る**(`draw.image` のコマ描画+反転、smoke/ランナーのアセット読込、アセット・マニフェスト)。これは**任意・別作業**。Codex は「現能力内で最善を尽くす」か「拡張を提案・実施する」かを選べる。

---

## 6. 修正内容(per-game)

- **`docs/work-plans/ledger/game-assignments.csv`**(798行)= 各ゲームの `mechanic / family / theme / style_pack / bgm_direction / variation / spice / duration_target / needed_action / fix_items / keep_items`。これが「何を直すか」。
- **Codex の1本サイクル**: assignments 行を読む → §3の5原則で設計を作り直す → §4の品質でアート化 → §5の能力内で実装 → §7ツールで確認 → 次へ(前ゲームのコード使い回し禁止)。

---

## 7. 確認ツール(Codex が自分の成果を検証する)

```bash
npx tsc --noEmit --skipLibCheck && npm run test
npm run games:smoke -- --files <担当ファイル>    # ERROR0 + GAME_END + WARN0 + attract_motion
npm run games:ledger                             # 計測ledger再生成(before/after diff)
```
- 静的: `CodeGameValidator.validate(code,{v3:true})`(ヘッダー/テキストレス/SE)+ `CodeQualityScorer`(≥80)。
- **機械ゲートは必要条件。本丸は人間の全体レビュー**(§4のMOTHER3級 / スクショ2枚で遊びが分かる / §3の5原則)。

---

## 8. このセッションの実測知見(やってはいけないこと)

1. 手続き描画の陰影付き矩形/低解像度スプライトは**品質不足**。
2. **装飾物を増やしても品質は上がらない**(必要要素の質を上げる)。
3. **抽象UI(予測マーカー等)は判断として伝わらない**。
4. **主役が小さい**と対象として成立しない。
5. **単体アートでは品質判断不可**。必ず全体(動く画面)で。
6. **文字でゲーム名/ルールを説明しない**。

---

## 9. 現状(このブランチ)

- WP62(エンジンv2.1)/ WP63(validator・scorer・smoke v3)完了・push済み。§7の確認ツールは稼働中。
- Wave 0 の13本(`017,118,183,190,221,298,361,410,420,421,572,608,722`)は v3 を試作し commit 済みだが**アート品質は基準未達**。設計の一部(017駅停め)は §3参考として記載。**Codex が §3〜§4 で作り直してよい**。
- 残り約784本は未着手。**本書 §2〜§4 + §6台帳 で Codex が1本ずつ自由に実行**する。
