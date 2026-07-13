# WP61: 800ゲーム個票台帳(ledger) — 列辞書と運用

**目的**: 遊びの文法v3リファクタ(WP56)の作業割当・進捗追跡・検収の基盤。
**生成**: `npm run games:ledger`(実装: `scripts/build-game-ledger.ts`)
**場所**: `docs/work-plans/ledger/`

## ファイル構成と編集ルール

| ファイル | 生成 | 編集 |
|---|---|---|
| `game-ledger.csv` | 毎回再生成 | **手編集禁止**(計測値。検収時に再生成してbefore/after差分を取る) |
| `game-ledger-summary.md` | 毎回再生成 | 手編集禁止(集計+既知事実との突合) |
| `game-assignments.csv` | **初回のみ**(`--reassign` で再生成=進捗破棄) | **台帳本体**。人間とバッチセッションが編集する |
| `mechanic-overrides.json` | 手動管理 | slug→mechanic の人間確定表。スクリプトが常に適用 |

計測(再生成可)と割当・進捗(手動編集)の分離が設計の要点。バッチはassignmentsの
自分の行だけを更新するため、バッチ間でコンフリクトしない。

## メカニクス分類の確定状況

- 3系統ヒューリスティック(slug語彙/ヘッダー日本語/API)の推定を土台に、
  **全568 distinct slug を人間(本セッション)がヘッダー精読で確定**し
  `mechanic-overrides.json` に固定済み(2026-07)。ledger上の confidence は全行 high
- 同一slugは同一メカニクス(slug単位確定→全ファイルに伝播)
- 分類の原則(迷ったときの判定基準):
  - プレイヤーの**指の動詞**で分類する(見た目のテーマではない)
  - 「動く的をタップ」=aim_shoot / 「瞬間を狙って1回タップ」=timing_one_shot /
    「ゾーン内でタップ」=timing_window / 「受け皿を動かして受ける」=drag_follow /
    「go/no-goや選択」=judge / 「順番に探してタップ」=spot(記憶不要) /
    「覚えて再現」=memory_sequence / 「値をゾーンに保つ」=balance /
    「盤面パズルのトグル」=judge / 「光学/配管の経路づくり」=connect /
    「押しっぱなしで我慢・溜め」=hold_charge / 「N回ぴったり・止め時の自制」=count_exact
- **発見**: 真の2人対戦(G族 duel_2p/coop_2zone/turn_attack)は**0本**。
  マリオパーティ的な1台対戦は新規ネタ(801〜)の未開拓領域(MECHANICS_CATALOG §優先度ガイドと整合)

## game-assignments.csv 列辞書

| 列 | 意味 | 編集者 |
|---|---|---|
| id / filename / slug | 識別(リネーム禁止) | — |
| title / hook | 元ヘッダー2行目のタイトルと固有の面白さ。**hookの保全・増幅はバッチの最優先義務**(PLAY_GRAMMAR_V3 §2.8 — メカニクスの教科書形に均すの禁止) | — |
| mechanic / family | 確定メカニクス(40ID)と族(A〜H)。**管理用の分類ラベルであって「この形に均せ」ではない** | 変更は overrides 経由 |
| theme / theme_jp / theme_source | 割当テーマ。`existing`=既存の世界観コメント尊重(notes参照)、`assigned`=決定的巡回割当 | 人間(変更可) |
| style_pack | ARCADE_ART_DIRECTION の時代パック。テーマ親和リストを巡回割当 | 人間(変更可) |
| bgm_direction | BGM方針(melody固有化が第一候補/代替プリセット) | — |
| variation / spice | 同メカニクス内の差別化軸: プレッシャー型5種×スパイス6種を巡回割当(§2.8)。遊びと矛盾する場合のみ同リスト内で変更可(notesに理由) | バッチ(条件付き) |
| duration_current / duration_target | 現MAX_TIMEと目標値。帯域(PLAY_GRAMMAR_V3 §4)内の候補値をメカニクスごとに巡回して**意図的に散らしてある**(15秒一極集中の解消)。`目視(…)`=MAX_TIME検出不能、バッチが判断 | — |
| needed_current / needed_action | 現NEEDEDと再調整指示。`維持`以外は必ず変更 | — |
| priority | P1=NEEDED=1(非ワンショット族)/スコア<50/重複slug、P2=スコア50〜70、P3=残り | — |
| wave / batch | Wave 0=パイロット、1..8=本番(P1比率順)。batch=族+連番(例 A03)、1バッチ10本 | — |
| fix_items | 修正項目コード(下記凡例) | — |
| keep_items | 変更禁止部分 | — |
| status | `todo` → `wip` → `done`。**バッチが3本コミットと同時に更新** | バッチ |
| score_before / score_after | scorer合計(afterはバッチが記入) | バッチ |
| style_actual | 実際に使ったスタイルパック(バッチが記入) | バッチ |
| notes | 既存世界観の原文など | 人間 |

### fix_items 凡例

| コード | 内容(詳細は PLAY_GRAMMAR_V3) |
|---|---|
| TEXTLESS | HOW_TO_PLAY・指導文の全廃(ホワイトリスト§3以外のテキスト禁止) |
| DEMO | ATTRACTゴースト実演(手カーソル+実ロジック1サイクル) |
| TAGS | `// @mechanic:` `// @theme:` ヘッダー付与 |
| SE(現N種) | SE語彙拡充(distinct 3種以上、§6.1マッピング準拠) |
| BGM | bgm_main脱却(melody固有化 or bgm_direction のプリセット) |
| SPRITE | 主役の `game.draw.sprite` 化(顔+2〜4フレーム) |
| GRAD | `game.draw.gradient` 背景+遠景 |
| FEEDBACK | `game.feedback.good/bad` 配線 |
| BEST(偽HI-SCORE) | ハードコードHI-SCORE→`game.best` 実値 |
| THEME | 世界観の新規注入(assigned テーマで) |
| DUR(a→bs) | MAX_TIME 変更 |
| NEEDED(n) | 難易度再調整(§5) |

telegraph / hit-stop / READY-GO / ニアミス演出は**全ゲーム共通の必須作業**のため
fix_items には出さない(WP56の「必ずやること」参照)。

## 割当アルゴリズム(決定的・再現可能)

1. **バッチ(メカニクス混成)**: 各メカニクス内を優先度順に並べ、j番目に `(j+0.5)/N` の
   キーを与えて全体ソート(fraction-spread)→ 10本刻み(B01..B80)。これにより**どのバッチも
   約9種のメカニクス混成**になり、同メカニクスを固めた場合に起きる「書き換えクローンの量産」を
   構造的に防ぐ。同slugが同バッチに入った場合は後続バッチと決定的に入れ替えて解消。
   summaryの「バッチ多様性検査」で監視(同メカ最大≤3 / 同slug最大1 / テーマ重複0)
2. **テーマ**: 世界観コメントあり91本は尊重(キーワード一致すればプールのテーマ、なければ `custom`。
   バッチ内では既存世界観のゲームを先に処理して衝突を回避)。残りは24テーマプールを巡回し、
   **同一slug内・同一バッチ内でテーマが重複しないようスキップ**(gravity-flip×12 → 12通りの見た目に分岐)
3. **スタイルパック**: テーマの親和パックリスト(スクリプト内 `THEMES`)をテーマごとに巡回。
   70s MONO は意図的に最少(峻厳なパックのため)。分布はsummaryで監視
4. **尺・変化軸**: メカニクスごとのカウンタで、帯域内の尺候補(例 8/10/13/15)と
   プレッシャー型5種・スパイス6種(5×6=30通り)を巡回割当 — 同メカニクス内の均質化を防ぐ
5. **Wave**: バッチをP1本数(降順)→平均スコア(昇順)でソートし、10バッチ=1 Wave。
   Wave 0 はA〜F各2本+制約(重複slug/NEEDED=1/長尺を含む)の13本(G族は0本のため対戦枠なし)

## 検証結果(生成時に自動突合)

- 既知事実との一致: NEEDED=1(79本)/世界観コメント(91本)/distinct slug(565+原型3)/
  scanlines(797本)= 完全一致。MAX_TIME=15 は 259本(既知値258は `MAX_TIME` のみのgrep。
  `TIME_LIMIT=15` の 192-sprint-dash を含むため+1 — 計測は正)
- メカニクスは全slug人間確定(上記)。テーマ/スタイル/Wave分布は summary 参照

## 再生成の運用

```bash
npm run games:ledger              # ledger+summary更新(assignmentsは保持)
npm run games:ledger -- --review  # メカニクス監査用 mechanic-review.md も出力(コミット不要)
npm run games:ledger -- --reassign # assignments再生成(進捗が消える。Wave開始後は原則禁止)
```

- Wave末の検収: `games:ledger` 再生成 → git diff で ledger.csv の計測列
  (distinct_se / uses_sprite / how_to_play / score_total 等)が改善方向に動いたことを確認。
  **世界観カバレッジ**(summary「世界観コメントあり」: 開始時91 → 全数797が目標)は
  「テンプレのスタンプでなく1本ずつ作った」ことの代理指標(WP56の世界観1行義務)
- 尺帯域(`DURATION_BAND`)を変更する場合は PLAY_GRAMMAR_V3 §4 と必ず同期

## スコープ外(この台帳が扱わないもの)

- few-shot原型3本(`dodge-balls.js` / `swipe-direction.js` / `tap-target.js`): ledgerには
  計測行があるが assignments からは除外(全Wave不変。生成パイプラインの挙動維持)
- アプリUI/アップロードパイプラインの改修(@mechanic/@theme は既存アップローダが読取済み)
- エンジン修正はWP62、スコアラー/smoke v3はWP63、バッチ実行はWP56
