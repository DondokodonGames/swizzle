# WP63: スコアラー/バリデータ/smoke v3 対応指示書

**担当**: Sonnet / Opus(1セッションで完結) / **依存**: WP62(エンジンv2.1 — WARN と draw.hand が前提) / **後続**: WP56 Wave 0
**対象ファイル**: `src/ai/code/CodeGameValidator.ts` / `src/ai/code/CodeQualityScorer.ts` / `scripts/smoke-code-games.ts`(+ テスト)

> このファイルを丸ごと新しいセッションに貼って実行させる。
> 目的: PLAY_GRAMMAR_V3(テキストレス・実演デモ・SE語彙・尺/難易度)を**機械ゲートで担保**する。
> ゲームコード(`src/ai/code/examples/*.js`)とエンジン(`iframeTemplate.ts`)は本WPでは触らない。

## 必読

1. `docs/specifications/PLAY_GRAMMAR_V3.md`(§3 ホワイトリスト・§4 尺帯域・§6 SEマッピングが検査仕様)
2. `docs/specifications/GAME_QUALITY_STANDARD_V2.md` §9(採点対応表 — 本WP完了後に数値を同期させる)
3. `docs/work-plans/ledger/game-assignments.csv`(尺・NEEDEDの台帳。ゲートはこの値との一致を見る)

## 作業項目

### 1. CodeGameValidator(エラー追加)

**注意**: 現状 v3 未対応の800本が存在するため、新規チェックは**フラグ付き**で導入する:
`validate(code, { v3?: boolean })` — `v3: true` のときのみ以下をエラーにする(既存呼び出しは非v3のまま動く。
WP56 のゲートスニペットと `run-upload-examples.ts` は書き換え済みゲームに v3 を指定する)。

- `@mechanic` ヘッダー欠落、または `MECHANICS_CATALOG_V2.md` の40 IDに無い値 → error
- `@theme` ヘッダー欠落 → error
- **`se_*` / `bgm_*` トークンがプリセット+エイリアス一覧に無い** → error
  (一覧は `iframeTemplate.ts` の `SE_PRESETS` / `BGM_PRESETS` / エイリアスと同期。
  ハードコードせず iframeTemplate から export するか、コメントで同期義務を明記)
- `HOW_TO_PLAY` 識別子が残っている → error(v3では全廃。PLAY_GRAMMAR_V3 §3)

### 2. CodeQualityScorer(6軸は維持、内部を更新)

配点合計は現行のまま(actionFeedback 25 / audioVisual 20 / layout 15 / goalEndings 15 / structure 15 / runtime 10)。

- **テキストレス検査**(structure 軸に組み込み): `draw.text` に渡される文字列リテラル
  (直接呼び出しと、`txt(` 等のローカルヘルパー第1引数の両方)を抽出し、
  PLAY_GRAMMAR_V3 §3 のホワイトリスト(数字/カウンタ/判定語/進行語/筐体定型/タイトル/「あと◯◯」)に
  一致しないリテラルのうち **14文字超 or 空白区切り3語以上**を「指導文」とみなし、
  1件につき −5(最大 −10)+ hint を出す
- audioVisual: distinct `se_*` **3種以上**を満点条件に変更(現行は最大4種で加点)。melody 加点は現行通り
- goalEndings: `game.best` を加点(+3)から**事実上の必須**へ — best 不使用かつ `HI-?SCORE` 文字列＋数値リテラルの
  組み合わせ(偽HI-SCORE)を検出したら −3 + hint
- 尺/NEEDED(hint のみ、減点しない — メカニクス依存の例外があるため合否は台帳照合で判定):
  - `@mechanic` から族を引き、PLAY_GRAMMAR_V3 §4 の帯域外の `MAX_TIME` → hint
  - `NEEDED <= 2` かつ `MAX_TIME >= 10` かつ mechanic が ONE_SHOT_OK 群
    (`scripts/build-game-ledger.ts` の定義と同期)に無い → hint

### 3. smoke(scripts/smoke-code-games.ts)

- **WARN 収集**: WP62 が追加した `{type:'WARN'}` postMessage を `__smokeEvents` キャプチャに追加し、
  report.json の各結果に `warns: [{code,id}]` を記録。**WARN が1件でもあれば FAIL**
- **attract_motion 判定**: 現行の ATTRACT スクショ1枚(t≈0.9s)を **2枚(t≈1.2s / t≈2.8s)** に変更し、
  2枚の pixel-diff(サンプリング比較で十分)が **0.5%以上**なら `attract_motion: true`。
  false は FAIL(ゴースト実演が動いていない = PLAY_GRAMMAR_V3 §2.1 違反。静的検査では検出できないため実行時で担保)
  - 点滅テキスト(TAP TO START)だけでも diff は出るため、閾値 0.5% は「点滅のみ」を落とせるか
    パイロット実測で調整すること(fixture と書き換え済みゲームで実測して決める。調整結果をコメントに残す)
- **実測尺の記録**: START→GAME_END の実測ms を report.json に記録(台帳の尺検収に使う)
- report.json スキーマ拡張に合わせ、コンタクトシートに ATTRACT 2枚目と WARN 表示を追加
- 既存の `--quick` / `--files` / `--sample` / `--workers` の挙動は維持

### 4. ゲート定義の更新(ドキュメント)

- `docs/specifications/GAME_QUALITY_STANDARD_V2.md` §9 の採点対応表を実装と同期
- 合格ゲートv3 = **validator PASS(v3フラグ) + score ≥ 80 + smoke PASS(エラー0 + GAME_END + WARN 0 + attract_motion)**
  を GAME_QUALITY_STANDARD_V2 冒頭の合格ライン記述に追記

## 守ること

- 既存の非v3ゲームがスコア計算でクラッシュしないこと(800本に対して scorer が例外なく走ること)
- `scripts/build-game-ledger.ts` は scorer を import している — 互換を維持(score() の既存シグネチャを壊さない)

## マージ前ゲート

```bash
npx tsc --noEmit --skipLibCheck
npm run test
npm run games:ledger                 # 800本でスコアラーが例外なく完走すること
npm run games:smoke -- --sample 30   # 新スキーマで完走。既存ゲームのPASS/FAILが説明可能であること
```

- fixture(`api-v2-fixture.js`)が v3 ゲートを通ることを確認(通らない場合は fixture を更新)

## 完了報告

- 変更差分の要約と、新旧ゲートでの800本のスコア分布比較(ledger 再生成の diff)
- attract_motion 閾値の実測調整結果
