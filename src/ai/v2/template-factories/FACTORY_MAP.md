# ファクトリー定義書

> 参照: `neta-all.json`（792件）の mechanic 分布から確定したファクトリー一覧  
> 設計仕様参照ゲーム: `templates/neta_001_reference.json`（CounterTap）

---

## mechanic 分布（neta-all.json より）

| mechanic | 件数 | ファクトリー |
|----------|------|------------|
| timing_window | 374 | TimingWindowFactory |
| reveal | 175 | MultiChoiceFactory |
| tap | 98 | CounterTapFactory |
| drag | 64 | DragDropFactory |
| multi_choice | 34 | MultiChoiceFactory（共通） |
| swipe | 29 | ScrollDodgeFactory |
| flick | 8 | ProjectileFactory |
| tap_counter | 5 | CounterTapFactory（共通） |
| two_step | 4 | TimingWindowFactory（共通） |
| hold | 1 | HoldFactory |
| **合計** | **792** | |

---

## ファクトリー一覧

### 1. CounterTapFactory
**対象 mechanic**: `tap`, `tap_counter`  
**対象件数**: ~103件（tap:98 + tap_counter:5）  
**パターン**: N回タップして目標達成  
**成功条件**: `tapCount >= targetCount`  
**失敗条件**: 時間切れ  
**パラメータ**:
- `targetCount` (number): 必要タップ数（デフォルト30）
- `duration` (number): 制限時間秒数（デフォルト10）
- `targetObjectDescription` (string): タップ対象の見た目説明
- `backgroundDescription` (string): 背景の説明
- `successMessage` (string): 成功メッセージ
- `failureMessage` (string): 失敗メッセージ

---

### 2. TimingWindowFactory
**対象 mechanic**: `timing_window`, `two_step`  
**対象件数**: ~378件（timing_window:374 + two_step:4）  
**パターン**: 動く/変化するターゲットのタイミングでタップ  
**成功条件**: `hitCount >= requiredHits`  
**失敗条件**: 時間切れ または missCount 超過  
**パラメータ**:
- `requiredHits` (number): 必要成功回数（デフォルト3）
- `duration` (number): 制限時間秒数（デフォルト10）
- `allowedMisses` (number): 許容ミス数（デフォルト3、0=無制限）
- `movingSpeed` (number): ターゲット移動速度 px/sec（デフォルト300）
- `targetObjectDescription` (string): ターゲットの見た目説明
- `backgroundDescription` (string): 背景の説明
- `successMessage` (string): 成功メッセージ
- `failureMessage` (string): 失敗メッセージ

---

### 3. MultiChoiceFactory
**対象 mechanic**: `multi_choice`, `reveal`  
**対象件数**: ~209件（multi_choice:34 + reveal:175）  
**パターン**: 選択肢から正解を選ぶ / 物を捲って正解を当てる  
**成功条件**: 正解タップ  
**失敗条件**: 不正解タップ または 時間切れ  
**パラメータ**:
- `choiceCount` (number): 選択肢数（2〜4、デフォルト3）
- `duration` (number): 制限時間秒数（デフォルト5）
- `questionDescription` (string): 問題/状況の説明
- `correctDescription` (string): 正解の見た目説明
- `wrongDescription` (string): 不正解の見た目説明
- `backgroundDescription` (string): 背景の説明
- `successMessage` (string): 成功メッセージ
- `failureMessage` (string): 失敗メッセージ

---

### 4. DragDropFactory
**対象 mechanic**: `drag`  
**対象件数**: ~64件  
**パターン**: オブジェクトをドラッグして正しい場所に置く  
**成功条件**: ドラッグしたオブジェクトが目標ゾーンに入った  
**失敗条件**: 時間切れ  
**パラメータ**:
- `itemCount` (number): ドラッグするアイテム数（デフォルト1）
- `duration` (number): 制限時間秒数（デフォルト10）
- `dragObjectDescription` (string): ドラッグするオブジェクトの説明
- `targetZoneDescription` (string): 目標ゾーンの説明
- `backgroundDescription` (string): 背景の説明
- `successMessage` (string): 成功メッセージ
- `failureMessage` (string): 失敗メッセージ

---

### 5. ScrollDodgeFactory
**対象 mechanic**: `swipe`  
**対象件数**: ~29件  
**パターン**: スワイプして障害物を避ける/アイテムを取る  
**成功条件**: 指定秒数生存 または collectCount 達成  
**失敗条件**: 障害物との衝突 または 時間切れ  
**パラメータ**:
- `mode` (`'dodge'` | `'collect'`): 避ける or 取る（デフォルト'dodge'）
- `duration` (number): 制限時間秒数（デフォルト15）
- `targetCount` (number): collectモードの目標収集数（デフォルト10）
- `playerDescription` (string): プレイヤーキャラの説明
- `obstacleDescription` (string): 障害物/アイテムの説明
- `backgroundDescription` (string): 背景の説明
- `successMessage` (string): 成功メッセージ
- `failureMessage` (string): 失敗メッセージ

---

### 6. ProjectileFactory
**対象 mechanic**: `flick`  
**対象件数**: ~8件  
**パターン**: フリックして飛ばし、的に当てる  
**成功条件**: hitCount >= requiredHits  
**失敗条件**: 時間切れ  
**パラメータ**:
- `requiredHits` (number): 必要命中数（デフォルト3）
- `duration` (number): 制限時間秒数（デフォルト10）
- `projectileDescription` (string): 飛ばすものの説明
- `targetDescription` (string): 的の説明
- `backgroundDescription` (string): 背景の説明
- `successMessage` (string): 成功メッセージ
- `failureMessage` (string): 失敗メッセージ

---

### 7. HoldFactory
**対象 mechanic**: `hold`  
**対象件数**: ~1件（最小ファクトリー）  
**パターン**: 長押しを指定時間維持する  
**成功条件**: `holdDuration` 秒間ホールド完了  
**失敗条件**: 離した / 時間切れ  
**パラメータ**:
- `holdDuration` (number): 必要ホールド時間 ms（デフォルト2000）
- `duration` (number): 制限時間秒数（デフォルト5）
- `holdObjectDescription` (string): 押すオブジェクトの説明
- `backgroundDescription` (string): 背景の説明
- `successMessage` (string): 成功メッセージ
- `failureMessage` (string): 失敗メッセージ

---

## 実装予定外（エンジン非対応）

以下のパターンはエンジン制限のため実装対象外:

| パターン | 理由 |
|---------|------|
| NPC追跡AI（パックマン等） | wander のみ、追跡不可 |
| 物理衝突応答（ブロック崩し） | オブジェクト間物理応答なし |
| マルチタッチゲーム | touches[0]のみ |
| スクロール型STG（縦横スクロール） | 背景スクロール機能なし |

---

## ファイル構成

```
src/ai/v2/template-factories/
  FACTORY_MAP.md          ← このファイル
  types.ts                ← 共通パラメータ型
  CounterTapFactory.ts
  TimingWindowFactory.ts
  MultiChoiceFactory.ts
  DragDropFactory.ts
  ScrollDodgeFactory.ts
  ProjectileFactory.ts
  HoldFactory.ts
  index.ts                ← 全ファクトリーのエクスポート
```
