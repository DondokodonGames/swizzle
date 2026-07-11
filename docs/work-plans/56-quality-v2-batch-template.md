# WP56: 遊びの文法v3 バッチ書き換え指示書(穴埋めテンプレート)

**担当**: Sonnet / Opus(1セッション = 1バッチ = **10本**) / **依存**: WP61(台帳)・WP62(エンジンv2.1)・WP63(スコアラー/smoke v3)
**進捗管理**: `docs/work-plans/ledger/game-assignments.csv`(このバッチの行が担当指示書のすべて)

> このファイルを丸ごと新しいセッションに貼り、`<<...>>` を埋めて実行させる。
> Wave 0(パイロット13本 = assignments の wave=0。A〜F各2+長尺枠。真の対戦ゲームが0本のためG枠なし)
> → **人間レビューで基準凍結** → Wave 1..8(P1優先、各約100本)。
> v2時代のこのテンプレの旧文面は git 履歴参照。旧「制限時間・難易度は変えない」条項は**v3で撤廃**された(下記)。

---

## あなたのタスク

Swizzle のコードゲーム(`src/ai/code/examples/*.js`)を「遊びの文法v3」に引き上げる。
**メカニクス(遊びのルール・勝敗条件・入力の意味)は変えない。変えるのは伝え方**:
テキストレス化 / テーマ・キャラ / 音 / 尺 / 難易度の再調整(過剰ナーフの是正) / 実演デモ。

### 担当ゲーム(このバッチ)

`docs/work-plans/ledger/game-assignments.csv` の batch=`<<バッチ名: 例 A03>>` の行。以下に貼り付け:

```
<<assignments該当行(10本)をCSVのまま貼る。列: id,filename,slug,mechanic,family,theme,theme_jp,
theme_source,style_pack,bgm_direction,duration_current,duration_target,needed_current,needed_action,
priority,wave,batch,fix_items,keep_items,status,score_before,...>>
```

列の読み方(詳細は `docs/work-plans/61-800-games-ledger.md` の凡例):
- **theme_jp / style_pack / bgm_direction**: このゲームに割り当てられた世界観・スタイルパック・BGM方針。従うこと(バッチ内で全員別テーマなのは意図的 — 同slugの重複ゲームを見た目で差別化するため)
- **duration_target / needed_action**: MAX_TIME と NEEDED の指定。`維持` 以外は必ず変更する
- **fix_items**: このゲームで直す項目のコード列(TEXTLESS/DEMO/TAGS/SE/BGM/SPRITE/GRAD/FEEDBACK/BEST/THEME/DUR/NEEDED)
- **keep_items**: 触ってはいけない部分

### 必読(この順で)

1. `docs/specifications/PLAY_GRAMMAR_V3.md` — **正典**。5秒の文法・テキストレス技法・ホワイトリスト・SEマッピング
2. `docs/specifications/GAME_QUALITY_STANDARD_V2.md` — 合格基準とチェックリスト
3. `docs/specifications/SANDBOX_API_V2.md` — 使えるAPI全部とレシピ(**ここに無いAPIは使わない**)
4. `docs/specifications/ARCADE_ART_DIRECTION.md` — スタイルパックと記号文法
5. 参考実装: `src/services/code-game/__tests__/fixtures/api-v2-fixture.js`(全API見本) + `<<ゴールドスタンダード例: Wave 0 確定後に記入>>`

### 各ゲームで必ずやること(PLAY_GRAMMAR_V3 §2 の技法カタログ準拠)

1. **テキストレス化**: `HOW_TO_PLAY` 変数と指導文を全廃。表示テキストはホワイトリスト(§3)のみ
2. **ATTRACTゴースト実演**: 手カーソル(`game.draw.hand`)+実ゲームロジックのデモ1サイクル(3秒ループ)。成功例1回+危険があれば失敗例1回
3. **READY?→GO! カウントイン**: PLAYING遷移直後0.8秒
4. **telegraph**: 危険は0.5〜0.8秒前に必ず予告。予告なし即死を根絶
5. **失敗の因果提示**: hit-stop 0.3〜0.6秒+当たった物のハイライト→RESULT
6. **テーマ注入**: 割当テーマ(theme_jp)で世界観を作る。主役を `game.draw.sprite`(顔つき、2〜4フレーム)に置換。背景は `gradient`+遠景。`// スタイル: <style_pack>` を宣言し、そのパレットで統一
7. **音**: SEマッピング表(§6.1)準拠で distinct 3種以上。BGMは bgm_direction 列に従う(melody固有化が第一候補)。`game.feedback.good/bad` を配線
8. **尺と難易度**: `MAX_TIME` → duration_target、`NEEDED` → needed_action の指示通り。`// 修正` ナーフ注釈は削除
9. **偽HI-SCORE除去**: ハードコードの HI-SCORE 数字を `game.best` の実値に置換
10. **縦3ゾーンレイアウト**(v2 §2)と**マイルストーン演出**(fx.popup + se_milestone)を維持・追加
11. **ヘッダー更新**: 1〜4行目の規約(ファイル名/タイトル—説明/操作/成功失敗)は維持しつつ、
    `// @mechanic: <assignments の mechanic>` と `// @theme: <assignments の theme>` を追記。
    2行目のタイトル—説明はテーマ注入後の内容に書き直す(アップロード時のDBメタデータになる)
12. **ニアミス演出**: 惜しい失敗に「あと◯◯!」(fx.popup)

### 守ること

- ファイル構造は IIFE `(function(game){...})(game);` を維持。1ファイル完結、外部参照なし
- **メカニクスと勝敗条件は変えない**(明らかなバグ修正のみ可)。MAX_TIME/NEEDED は台帳の指定通りに再調整する
  (旧テンプレの「制限時間・難易度パラメータは変えない」は撤廃 — 台帳が正)
- keep_items 列の項目(筐体骨格・slug/ファイル名・既存世界観 等)は変更禁止
- 禁止: `window.*` / `document.*` / `AudioContext` / `localStorage` / `fetch` / 無限ループ(バリデーターで落ちる)
- `src/services/code-game/` や `src/ai/code/*.ts` 等のエンジン側は**触らない**
- ファイル名・slugのリネーム禁止(DB `template_id` と統計が紐づいている)

### 1ゲームごとのゲート(全部通ってから次へ)

```bash
# 1) 静的検査+採点(v3フラグ、80点以上が合格)
npx tsx -e "
import { CodeGameValidator } from './src/ai/code/CodeGameValidator.js';
import { CodeQualityScorer } from './src/ai/code/CodeQualityScorer.js';
import * as fs from 'fs';
const code = fs.readFileSync('src/ai/code/examples/<<file>>', 'utf-8');
const v = new CodeGameValidator().validate(code, { v3: true });
const s = new CodeQualityScorer().score(code, null, v);
new CodeGameValidator().report(v); new CodeQualityScorer().report(s);
if (!v.valid || s.total < 80) process.exit(1);
"
# 2) 実行時スモーク(エラー0 + GAME_END + WARN 0 + attract_motion)
npm run games:smoke -- --files <<file1>> <<file2>> <<file3>>
# 3) 台帳照合: MAX_TIME/NEEDED が assignments の duration_target/needed_action と一致していること(目視)
```

### コミット規約と進捗反映

- **3本 = 1コミット**。メッセージ: `Upgrade games #NNN-#NNN to play grammar v3: <一言>`
- **同じコミットで** `docs/work-plans/ledger/game-assignments.csv` の該当行を更新:
  `status=done` / `score_after=<新スコア>` / `style_actual=<使ったスタイルパック>`
  (バッチ間で行が交差しないためコンフリクトしない。ledger.csv の方は触らない — 検収時に再生成される)
- ブランチ: `<<例: claude/grammar-v3-wave1-A03>>`

### 完了報告(セッション末尾に出力)

- 各ゲームの表: score before → after / テーマ / スタイルパック / 尺・NEEDED の変更
- `npm run games:smoke -- --files <担当全部>` の PASS/FAIL(attract_motion 含む)
- 判断に迷った点・基準の曖昧箇所(PLAY_GRAMMAR_V3 へのフィードバック)

---

## 運用メモ(人間向け)

- **Wave 0(パイロット)**: assignments の wave=0 の13本(A〜F各2 + 長尺枠)。完了後に
  コンタクトシート(`smoke-output/contact-sheet.html`)と実機で審査:
  「スクショ2枚で遊びが分かるか」「指導文ゼロで迷わないか」「テーマが判別できるか」。
  基準書(PLAY_GRAMMAR_V3)を微修正して**凍結**し、ゴールドスタンダード例を本テンプレに記入してから Wave 1 開始
- **Wave 1..8**: P1(NEEDED=1・低スコア・重複slug)を含むバッチから。1 Wave ≈ 10バッチ ≈ 100本
- **Wave 末の検収**: 該当分 `games:smoke -- --files ...` → `npm run games:ledger`(ledger再生成)で
  計測列の before/after diff を確認 → `OVERWRITE=true npm run ai:upload:examples` で再公開
  (`play_count`/`like_count` は保持される)。価格連動は `PRICE_SYNC=true`(@tier があるゲームのみ)
- **多様性監視**: `docs/work-plans/ledger/game-ledger-summary.md` のスタイルパック/テーマ/メカニクス分布
- few-shot原型3本(`dodge-balls.js` / `swipe-direction.js` / `tap-target.js`)は**全Wave不変**(生成パイプラインの挙動維持。v3化は別WPで判断)
