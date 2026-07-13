# GAME QUALITY STANDARD v2.1 — 1プレイ10〜100円に値するコードゲームの基準

対象: `src/ai/code/examples/*.js` の全ゲームと今後の新規ゲーム。
目的: **プレイヤーが選択した行動に手応えがあり、コインを入れたくなる見た目と、もう1回押したくなる結末**を全ゲームに保証する。
採点: `CodeQualityScorer`(静的) + `npm run games:smoke`(実行時+スクショ)。**合格ライン: スコア80以上 + スモークPASS**
(v3ゲート導入後(WP63)は validator v3 PASS + WARN 0 + attract_motion も必須)。

> **v2.1**: テキストレス原則を導入。「説明文を読まなくても見れば遊べる」の正典は
> [PLAY_GRAMMAR_V3.md](./PLAY_GRAMMAR_V3.md) — テキスト/尺/難易度について本書と差異があれば **PLAY_GRAMMAR_V3 が優先**。

関連文書: [PLAY_GRAMMAR_V3.md](./PLAY_GRAMMAR_V3.md)(遊びの文法・正典) / [SANDBOX_API_V2.md](./SANDBOX_API_V2.md)(API・レシピ) / [MECHANICS_CATALOG_V2.md](./MECHANICS_CATALOG_V2.md)(メカニクス) / [ARCADE_ART_DIRECTION.md](./ARCADE_ART_DIRECTION.md)(見た目)

---

## 1. 行動フィードバック原則(最重要・MUST)

「正解/不正解」とはクイズのことではない。**プレイヤーが選択した行動に対して、ゲームが即座に結果を返すこと。**

- **全ての入力**(タップ/スワイプ/ホールド/ドラッグ/リリース)は **~100ms以内**に「視覚+音+状態変化」の3点で応答する
- 行動の結果は3値で提示する:
  - **有効(良い選択)** → `game.feedback.good(x, y)` 相当: 上昇音+バースト+加点表示
  - **無効/悪手** → `game.feedback.bad(x, y)` 相当: ブザー+赤フラッシュ+シェイク
  - **中立**(空振りだが害なし) → 最低限 `se_tap` + 触った場所の視覚反応
- **無反応な入力は禁止**。「押したのに何も起きない」瞬間を1つも作らない
- 失敗は**プレイヤーの選択に帰属**できること(理不尽な初見殺し・操作不能時間での失敗は禁止)
- ドラッグ/チャージ等の継続操作は**進行中も**予告を返す(ゴムひも表示、チャージゲージ、照準線)

## 2. 縦画面レイアウト基準(MUST)

1080x1920縦。**横画面の移植のような「上半分だけ」「下に情報密集」を禁止。**

| ゾーン | 縦位置 | 用途 |
|--------|--------|------|
| HUD | 0〜12% (y < 230) | スコア・残時間バー・進捗。プレイ中常時可視 |
| プレイフィールド | 12〜75% | 遊びの主役。**縦方向に遊びを展開する**(落ちる/登る/並ぶ) |
| 親指ゾーン | 75〜100% (y > 1440) | 操作UI・プレイヤーキャラの定位置。片手の親指が届く |

- プレイ要素は3ゾーンにまたがって配置する(スモークのインク被覆率で監査: 各1/3で非背景率が極端に偏らないこと)
- テキストは重ねず、1画面の同時表示テキストは4要素以内
- タップ対象は最小 **120px**(指の幅)

## 3. キャラクター/世界観(MUST)

- **裸の幾何学図形だけのゲームは禁止**。テーマに応じた名前付きキャラ or モチーフを `game.draw.sprite`(文字列ビットマップ)で描く
- 動くキャラは **2〜4フレーム**のアニメ(歩行/羽ばたき/点滅)+移動方向で `flipX`
- 背景はテーマを反映する: `game.draw.gradient` + 遠景要素(山/星/街並み/小物)。**黒一色背景は宇宙・洞窟等テーマが要求する場合のみ**
- ゲームごとに固有パレットを宣言(基調3色+アクセント2色、ARCADE_ART_DIRECTION の時代別スタイルパックから選択)
- 世界観は**文章ではなく絵と実演で**示す(v2.1: 説明文の掲示は禁止 — PLAY_GRAMMAR_V3 §3)

## 4. アーケード演出(MUST — ARCADE_ART_DIRECTION.md 準拠)

- ATTRACT = 3秒で遊びを売る: ピクセルロゴ + **ゴースト実演デモ**(手カーソル+実ロジック。静止一枚絵は不可 — PLAY_GRAMMAR_V3 §2.1) + **`game.best` の実値による HI-SCORE** + 点滅する「100円投入/TAP TO START」
- 成功時は音と光を飽和させる CELEBRATION(se_success + burst連発 + 点滅)
- **ニアミスの可視化**: 惜しい失敗は「あと1個!」「99%」など悔しさを言語化(もう1回動機)
- HI-SCORE 更新時は祭り演出(NEW RECORD 表示 + se_milestone)
- スキャンライン(8px)+コイン投入演出は既存標準を維持

## 5. 音(MUST)

- BGMは ATTRACT から鳴らす。**`game.audio.melody` によるゲーム固有メロディを推奨**(最低でもプリセット `bgm_*`)
- 全イベントに SE: 入力(se_tap/good/bad)、中間目標(se_milestone)、結末(se_success/se_failure は別ジングル)
- 音声ファイルは不要(全て合成)。`AudioContext` 直接使用は禁止

## 6. ゲーム構造(MUST)

- 状態機械 **ATTRACT → PLAYING → RESULT** を維持。PLAYING 冒頭に READY?→GO! のカウントイン(PLAY_GRAMMAR_V3 §2.7)
- **ゴールは開始時に見える**: 残りN個のアイコン列・ゴール旗・満タンになるゲージ等、**非言語の可視化**で(文章での明示は禁止)
- 進捗を常時表示: 残時間バー + 達成カウンタ(`3 / 12`)or 高度メーター
- **走行内難易度カーブ**: 後半ほど速く/多く/狭く(スコア連動の速度上昇など)。最初の5秒は操作を体得できる易しさ
- 走行中に最低1つの**マイルストーン演出**(fx.popup + se_milestone)
- RESULT: CLEAR と GAME OVER で色・文言・音を明確に変える。統計(スコア+プレイ固有値)と BEST を表示し、`game.end.success(score, stats)` で統計を渡す
- 尺と難易度は台帳(`docs/work-plans/ledger/game-assignments.csv`)の指定に従う。帯域はメカニクス族ごとに 8〜30 秒
  (PLAY_GRAMMAR_V3 §4)。v2の「1/10難易度」は**過剰ナーフだったため撤回** — NEEDED=1 の原則禁止と再調整は §5 参照

## 7. 禁止事項

- 無反応な入力 / ハードコードの偽 HI-SCORE / 黒一色背景(テーマ上の必然なし) / 幾何学図形のみのキャラ /
  上半分のみのレイアウト / 無音(BGMなし) / 成功と失敗の演出が同じ / 理不尽な失敗 /
  **指導文・操作説明テキストの掲示**(`HOW_TO_PLAY` 等 — PLAY_GRAMMAR_V3 §3のホワイトリスト以外) /
  **予告なしの即死**(telegraph必須 — 同 §2.4) /
  `window.*`・`AudioContext`・`localStorage`・`fetch`・無限ループ(バリデーターが検出)

## 8. 合格チェックリスト(書き換えセッションは提出前に自己検証)

```
[ ] 全入力ハンドラが結果分岐して feedback/fx/audio を呼んでいる
[ ] game.feedback.good と game.feedback.bad の両方を使っている
[ ] BGM(melodyまたはbgm)がATTRACTから鳴る。bgm_main の惰性使用でない
[ ] キャラ/モチーフを draw.sprite で描き、2フレーム以上動く
[ ] 背景に gradient + 遠景要素。固有パレット宣言(スタイルパック名をコメント)
[ ] HUD上部/プレイ中央/操作下部の3ゾーンを使っている
[ ] ゴールが非言語で見える(アイコン列/旗/ゲージ)。進捗表示が常時ある
[ ] マイルストーン演出が走行中に出る
[ ] CLEAR/GAME OVERの演出が別物。statsとBESTを表示
[ ] ATTRACTのHI-SCOREは game.best の実値
[ ] ニアミス時の悔しさ演出がある
[ ] PLAY_GRAMMAR_V3 §8 のv3チェック(テキストレス/実演/telegraph/hit-stop等)を通過
[ ] CodeQualityScorer 80点以上 / games:smoke PASS
```

## 9. 採点との対応(WP63 で v3 検査を追加。配点合計は不変)

| 基準 | スコアラー軸 | 配点 | v3 追加検査(`CodeQualityScorer`) |
|------|-------------|------|-----------------------------------|
| §1 行動フィードバック | actionFeedback | 25 | — |
| §3,4,5 見た目と音 | audioVisual | 20 | distinct `se_*` **3種以上**で満点(§6.1) |
| §2 縦レイアウト | layout | 15 | — |
| §4,6 ゴール・結末 | goalEndings | 15 | 偽HI-SCORE(`game.best`不使用+ハードコード数値)で −3 |
| §6,7 構造・禁止事項 | structure | 15 | テキストレス: 指導文リテラル1件 −5(最大 −10、§3) |
| 実行時(smoke) | runtime | 10 | — |

尺・NEEDED は減点せず **hint のみ**(帯域 §4 / ONE_SHOT_OK §5)。合否は台帳 `game-assignments.csv` との照合で判定する。

### v3 合格ゲート(3点セット)

書き換え済みゲームは以下すべてを満たすこと(`validate(code, { v3:true })` を指定):

1. **validator v3 PASS** — `@mechanic`(40+ID)/`@theme` ヘッダーあり、`HOW_TO_PLAY` 全廃、未定義 `se_*`/`bgm_*` なし
2. **CodeQualityScorer 合計 ≥ 80**
3. **games:smoke PASS** = ERROR 0 + GAME_END 到達 + **WARN 0** + **attract_motion**(ATTRACTゴースト実演が実行時に動く)

検査定数(メカ族/尺帯域/ONE_SHOT_OK/SE・BGM許可ID)は `src/ai/code/mechanics-v3.ts` に集約。
