# WP64: 新規ゲーム生成パイプラインの v3 整合(均質化の根絶)

**担当**: Sonnet / Opus(1セッション) / **依存**: WP62・WP63 + **Wave 0 のゴールドスタンダード凍結後**
**対象**: `src/ai/code/CodeGameGenerator.ts` / `src/ai/code/CodeOrchestrator.ts`(既存800本と ledger は触らない)

## 背景(監査で判明した新作側の一括均質化ポイント)

800本の書き換え(WP56)が終わっても、**新規生成される801本目以降が旧来の型で生まれてくる**構造が残っている:

1. **固定 few-shot**: `CodeGameGenerator.ts:52-53` が全ての生成プロンプトに同じ2本
   (`tap-target.js` / `swipe-direction.js` — v1時代の原型)を埋め込む。
   `CodeOrchestrator.ts:157` も `tap-target.js` を参照。**どんなネタでも同じ2本を手本に書かれる**
   ため、新作は生まれた瞬間から同型になる
2. **プロンプト内のAPI仕様がv1のみ**: sprite / gradient / melody / tone / feedback / fx /
   hand / input / touches / hit / best が仕様文に無く、生成LLMは存在を知らされない
3. **v3ルール(テキストレス/実演デモ/telegraph/変化軸)がプロンプトに無い**

## 作業項目

1. **few-shot のメカニクス連動ローテーション**:
   - 固定2本をやめ、生成対象ネタの `@mechanic`(または族)に応じて
     **書き換え済み(status=done かつ score≥80)のゲームから決定的に選ぶ**:
     同族から2本 + 対照的な族から1本(ネタIDをシードに巡回、毎回同じ組にならないこと)
   - 選定元は `docs/work-plans/ledger/game-assignments.csv`(status=done)。done が少ない初期は
     Wave 0 ゴールドスタンダード群を既定プールにする
   - few-shot 原型3本(`tap-target.js` 等)は生成参照から**引退**させる(ファイル自体は残す)
2. **プロンプトのAPI仕様を v2 全量に更新**: `SANDBOX_API_V2.md` と同期(乖離防止のため、
   可能なら仕様文をファイルから読み込む構成に)
3. **v3ルールの注入**: PLAY_GRAMMAR_V3 の要点(テキストレスのホワイトリスト / ATTRACTゴースト実演 /
   telegraph / 失敗hit-stop / SEマッピング / 変化軸)をシステムプロンプトに追加。
   ネタ側に variation / spice が未指定なら生成時にランダム割当(シード付き)して
   ヘッダーコメントに記録する
4. **生成ゲート**: 生成後に validator(v3) + scorer ≥80 + smoke を必須化
   (既存のオーケストレーター内ゲートを v3 基準に更新)

## 守ること

- `src/ai/code/examples/*.js`(既存800本)と ledger には書き込まない
- few-shot 選定は決定的(同じネタ+同じ done 集合 → 同じ選定)にして再現性を保つ

## マージ前ゲート

```bash
npx tsc --noEmit --skipLibCheck && npm run test
DRY_RUN=true npm run ai:v2:1     # プロンプト組み立てが新構成で通ること
SKIP_UPLOAD=true npm run ai:v2:1 # 1本生成し、validator(v3)+scorer+smoke が通ること
```

- 生成された1本を目視: 固定few-shotの面影(TAP THE TARGET等)が無いこと、v2 APIを使っていること

## 完了報告

- few-shot 選定ロジックの説明と選定例3件(ネタ→選ばれた手本)
- 生成1本の スコア内訳 + smoke 結果
