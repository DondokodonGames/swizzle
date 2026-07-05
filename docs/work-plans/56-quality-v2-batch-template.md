# WP56: 品質基準v2 バッチ書き換え指示書(穴埋めテンプレート)

**担当**: Sonnet / Codex(1セッション = 1バッチ) / **依存**: WP50〜54(API v2・スコアラーv2・スモークハーネス、実装済み) / **想定規模**: 1セッションで10〜15本

> このファイルを丸ごと新しいセッションに貼り、`<<...>>` を埋めて実行させる。
> Wave 0(パイロット12〜16本、メカニクス族横断+bird_jump移植#801)→人間レビューで基準確定→Wave 1..N(全800本、55〜70セッション)の順で回す。

---

## あなたのタスク

Swizzle のコードゲーム(`src/ai/code/examples/*.js`)を品質基準v2に引き上げる。
**遊び(メカニクス・成功失敗条件・難易度1/10)は維持し、提示を刷新する**:
縦画面レイアウト / キャラと世界観 / 行動フィードバック / 音 / アーケード演出。

### 担当ファイル(このバッチ)

```
<<例: 004-shooting-star.js, 005-balance-tilt.js, ... 10〜15本を列挙>>
```

### 必読(この順で)

1. `docs/specifications/GAME_QUALITY_STANDARD_V2.md` — 合格基準とチェックリスト
2. `docs/specifications/SANDBOX_API_V2.md` — 使えるAPI全部とレシピ(**ここに無いAPIは使わない**)
3. `docs/specifications/ARCADE_ART_DIRECTION.md` — スタイルパックと演出規定
4. 参考実装: `src/services/code-game/__tests__/fixtures/api-v2-fixture.js`(全API見本) + `<<ゴールドスタンダード例: 801-bird-jump.js 等、確定後に記入>>`

### 各ゲームで必ずやること

1. **行動フィードバック**: 全入力ハンドラを結果分岐にし、`game.feedback.good/bad` を配線。無反応な入力を根絶
2. **縦レイアウト再配置**: HUD上部12% / プレイフィールド12-75%(縦に遊びを展開) / 親指ゾーン下部25%
3. **キャラ化**: 主役を `game.draw.sprite`(文字列ビットマップ、顔つき、2〜4フレーム)に置換。裸の rect/circle 主役は禁止
4. **背景**: `game.draw.gradient` + テーマの遠景。スタイルパックを1つ選び `// スタイル: <名前>` を宣言
5. **音**: `game.audio.melody` でゲーム固有BGM(最低でも bgm_* プリセット) + イベント別SE
6. **ATTRACT刷新**: ピクセルロゴ+遊びの実演/一枚絵+ `game.best` のHI-SCORE + 点滅投入誘導
7. **RESULT刷新**: CLEAR/GAME OVER演出差 + stats + BEST + ニアミス表示(「あと◯◯!」) + `game.end.success(score, stats)`
8. **走行中演出**: マイルストーン `fx.popup` + 難易度カーブ(後半加速)
9. ヘッダー更新: 1〜4行目の規約(ファイル名/タイトル—説明/操作/成功失敗)を維持し、
   `// @mechanic: <MECHANICS_CATALOG_V2のID>` と `// @theme: <テーマ1語>` を追記(価格tierは人間が後で付ける)

### 守ること

- ファイル構造は IIFE `(function(game){...})(game);` を維持。1ファイル完結、外部参照なし
- 禁止: `window.*` / `document.*` / `AudioContext` / `localStorage` / `fetch` / 無限ループ(バリデーターで落ちる)
- 遊びの内容・成功失敗条件・制限時間・難易度パラメータは**変えない**(明らかなバグ修正のみ可)
- `src/services/code-game/` や `src/ai/code/*.ts` 等のエンジン側は**触らない**

### 1ゲームごとのゲート(全部通ってから次へ)

```bash
# 1) 静的検査+採点(80点以上が合格)
npx tsx -e "
import { CodeGameValidator } from './src/ai/code/CodeGameValidator.js';
import { CodeQualityScorer } from './src/ai/code/CodeQualityScorer.js';
import * as fs from 'fs';
const code = fs.readFileSync('src/ai/code/examples/<<file>>', 'utf-8');
const v = new CodeGameValidator().validate(code);
const s = new CodeQualityScorer().score(code, null, v);
new CodeGameValidator().report(v); new CodeQualityScorer().report(s);
if (!v.valid || s.total < 80) process.exit(1);
"
# 2) 実行時スモーク(エラーなし+GAME_END到達+スクショ)
npm run games:smoke -- --files <<file1>> <<file2>> <<file3>>
```

### コミット規約

- **3本 = 1コミット**(このブランチの実績パターン)
- メッセージ: `Upgrade games #NNN-#NNN to quality standard v2: <一言>`
- ブランチ: `<<例: claude/quality-v2-wave1-batch03>>`

### 完了報告(セッション末尾に出力)

- 各ゲームのスコア(before → after)と選択スタイルパックの表
- `npm run games:smoke -- --files <担当全部>` の PASS/FAIL
- 判断に迷った点・基準の曖昧箇所(基準書へのフィードバック)

---

## 運用メモ(人間向け)

- **Wave 0 の担当選定**: メカニクス族を横断する12〜16本 + `801-bird-jump.js`(bird_jump移植、ゴールドスタンダード)。
  完了後にコンタクトシート(`smoke-output/contact-sheet.html`)と実機で審査し、基準書を確定してから Wave 1 を開始
- 波ごとの公開: `OVERWRITE=true npm run ai:upload:examples`(play_count/like_count は保持される)。
  価格連動は `PRICE_SYNC=true`(@tier ヘッダーがあるゲームのみ、S=100/A=50/B=30/C=10円)
- 多様性監視: `npm run ai:status` の多様性レポートで mechanic 分布を確認
- 新規ネタ(801〜2000)は `MECHANICS_CATALOG_V2.md` の未使用動詞を優先割当(同カタログの「実装優先度ガイド」参照)
