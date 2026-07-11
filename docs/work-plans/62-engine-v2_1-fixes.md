# WP62: エンジン v2.1 修正指示書(遊びの文法v3の前提)

**担当**: Sonnet / Opus(1セッションで完結) / **依存**: なし / **後続**: WP63(スコアラー/smoke v3)→ WP56 Wave 0
**対象ファイル**: `src/services/code-game/iframeTemplate.ts` のみ(+ テスト・ドキュメント追記)

> このファイルを丸ごと新しいセッションに貼って実行させる。
> **警告**: iframeTemplate.ts はアプリバンドルに同梱され、**変更は既存800ゲーム全てに即時適用される**。
> マージ前ゲート(§5)を必ず全部通すこと。ゲームコード(`src/ai/code/examples/*.js`)は本WPでは触らない。

## 背景

800本の書き換え(WP56 v3)が依存するエンジン修正4件。現状の問題は:

1. **watchdogがATTRACT待機中も計時する**: `iframeTemplate.ts:865-867` で START 受信時(=ATTRACT表示開始時)に
   `setTimeout(→ game.end.failure(), maxDurationMs)` を arm している。プレイヤーがATTRACTを眺めて放置すると
   既定33秒(`CodeGameRunner.ts:55-60` の `duration+3s` or 33s)で強制failureになる。
   v3ではATTRACTのゴースト実演をじっくり見せたいので、この罠を先に除去する必要がある
2. **黙殺フォールバック**: 未知のSE ID → `se_tap`(584行)、未知のBGM ID → `bgm_main`(779行)、
   存在しない画像ID → 無視(626行)。タイポや欠損が検出されず品質劣化が非可視化される
3. **初回フレームが黒**: RAFループの初回は `lastTimestamp===null` のため update/描画をスキップ(893行)
4. **ATTRACT実演用の手カーソルがない**: 各ゲームに30行ずつ自作させると scanlines と同じ複製地獄になる

## 作業項目

### 1. watchdog を「初回ユーザー入力から計時」に変更

- START 受信時には arm せず、**最初の pointerdown**(既存の `addTouch` 経路)で一度だけ
  `setTimeout(→ isRunning なら game.end.failure(), maxDurationMs)` を arm する
- 全797本が「初タップ = ATTRACT→PLAYING遷移」なので、これは「PLAYING開始から計時」と等価(後方互換)
- **安全弁**: START から **120秒** の絶対上限タイマーは別途 arm する(入力ゼロのまま放置された
  iframe が永久に生きるのを防ぐ。ATTRACTデモは何周でも見られるが、2分で店じまい)
- `game.start()` のような通知APIの新設は**しない**(797本の改修が必要になり利得がない)
- 確認事項(実装前に必ず検証):
  - `CodeGameRunner.ts` が GAME_END 前提で組んでいる箇所に、タイマー起点変更の影響がないこと
  - 初回入力より前に自走で `game.end.*` を呼ぶゲームが存在しないこと
    (`onStart` 内・ATTRACT中の自動 finish を grep で確認。存在したらこのWPを止めて報告)

### 2. 黙殺フォールバックの可視化(WARN postMessage)

- 未知SE ID / 未知BGM ID / 存在しない画像ID を検出したら
  `parent.postMessage({ type: 'WARN', code: 'UNKNOWN_SE'|'UNKNOWN_BGM'|'UNKNOWN_IMAGE', id: <渡されたID> }, '*')`
  を送る。**同一IDにつき1回だけ**(毎フレーム呼ばれる draw.image でのスパム防止)
- **本番挙動(フォールバック再生・無視)は変えない**。あくまで可視化。親側(CodeGameRunner)での処理追加は不要
  (WP63 の smoke がこの WARN を収集して FAIL 判定に使う)
- アセット読み込み失敗(824行 `img.onerror` → silent resolve)にも同様の WARN(`ASSET_LOAD_FAILED`)を追加

### 3. 黒1フレームの解消

- 初回RAFフレーム(893行)で描画をスキップせず、`delta=0` として update + FX 描画を実行する
- 各ゲームの `onUpdate(dt)` は `dt=0` を受けても安全か懸念があるため、`dt=0` ではなく
  `dt=1/60` 相当の最小値を渡す実装でもよい(ゼロ除算リスク回避。判断して1行コメントを残す)

### 4. `game.draw.hand(x, y, opts)` の追加(ATTRACTゴースト実演の共通部品)

- 8pxグリッドのドット絵「手カーソル」を内蔵スプライトとして描画する
- シグネチャ: `game.draw.hand(x, y, { press?: boolean, scale?: number, alpha?: number })`
  - `press: true` で押下ポーズ(指を倒す)+ タップリング(拡大する白リング)を描く
  - 実装は既存の `sprite` 描画パス(`buildSpriteCanvas` / LRUキャッシュ)を流用する
- `KNOWN_API_METHODS`(`src/ai/code/CodeGameValidator.ts:13-26`)に `game.draw.hand` を追加
- `docs/specifications/SANDBOX_API_V2.md` にAPI仕様と「レシピ: ATTRACTゴースト実演」を追記
  (PLAY_GRAMMAR_V3 §2.1 が参照している。レシピは実ゲームロジックを流用したデモループの最小例)
- `src/services/code-game/__tests__/fixtures/api-v2-fixture.js` に hand の使用例を追加

## 守ること

- エンジンの ATTRACT/RESULT 画面の共通化は**しない**(筐体演出はゲーム側実装のまま。既存797本を壊さない)
- HI-SCORE 偽装の除去はゲーム側の作業(WP56)。エンジンでは触らない
- 既存 API のシグネチャ変更・削除は禁止

## 5. マージ前ゲート(全部必須)

```bash
npx tsc --noEmit --skipLibCheck
npm run test                        # 既存ユニットテスト(iframeTemplate関連含む)
npm run games:smoke -- --all        # 全800本 + fixture。回帰0(PASS数が現状維持以上)
```

- コンタクトシート(`smoke-output/contact-sheet.html`)を目視: 黒スクショが消えていること
- 手動確認(Playwright かブラウザ): 任意のゲームで ATTRACT を40秒放置 → 強制failureしないこと。
  タップして放置 → 従来通り watchdog で GAME_END すること
- WARN 動作確認: 存在しない `se_xxx` を鳴らすテストコードで WARN が1回だけ届くこと

## 完了報告

- 変更差分の要約(4項目それぞれ)
- smoke --all の PASS/FAIL 数(before → after)
- 発見した想定外(初回入力前に自走終了するゲーム等)があれば列挙
