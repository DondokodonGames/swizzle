/**
 * Step 4: SpecificationGenerator (強化版)
 *
 * ゲームデザインから詳細仕様を生成
 * エディターの機能を意識しつつ、実装の詳細は次ステップに委ねる
 *
 * 入力: GameConcept + GameDesign + AssetPlan
 * 出力: GameSpecification（強化版：UI/視認性、フィードバック、終了演出、priority含む）
 */

import Anthropic from '@anthropic-ai/sdk';
import { GameConcept } from './types';
import { GameDesign } from './GameDesignGenerator';
import { EnhancedAssetPlan } from './AssetPlanner';
import { GenerationLogger } from './GenerationLogger';

/**
 * ゲーム仕様（詳細な動作定義）- 強化版
 */
export interface GameSpecification {
  // オブジェクト仕様
  objects: ObjectSpecification[];

  // 状態管理（カウンター、フラグなど）
  stateManagement: StateManagement;

  // ルール仕様
  rules: RuleSpecification[];

  // 音声仕様
  audio: AudioSpecification;

  // ★NEW: UI/視認性仕様
  uiVisibility: UIVisibilitySpec;

  // ★NEW: フィードバック仕様
  feedbackSpec: FeedbackSpec;

  // ★NEW: 終了演出仕様
  endingSpec: EndingSpec;

  // ★NEW: Priority設計
  priorityDesign: PriorityDesign;

  // 成功パス（プレイヤーが勝利に至る道筋）
  successPath: {
    steps: string[];
    verification: string;
  };

  // 仕様決定の記録
  specDecisions: SpecDecision[];
}

// ★NEW: UI/視認性仕様
export interface UIVisibilitySpec {
  touchTargetMinSize: 'small' | 'medium' | 'large';
  contrastRequirement: 'low' | 'medium' | 'high';
  layoutStrategy: 'centered' | 'distributed' | 'clustered' | 'random';
  overlapPolicy: 'allow' | 'avoid' | 'prevent';
  safeZone: {
    top: number;      // 0.0-1.0 (画面上部の安全マージン)
    bottom: number;
    left: number;
    right: number;
  };
}

// ★NEW: フィードバック仕様
export interface FeedbackSpec {
  triggers: FeedbackTrigger[];
}

export interface FeedbackTrigger {
  event: string;                    // 'tap', 'collect', 'hit', 'success', 'failure'など
  visual: {
    type: 'flash' | 'scale' | 'shake' | 'particle' | 'color' | 'none';
    intensity: 'subtle' | 'normal' | 'strong';
    duration: number;               // 秒
  };
  audio: {
    soundId: string;
    volume: 'low' | 'normal' | 'high';
  };
  haptic?: boolean;                 // バイブレーション
}

// ★NEW: 終了演出仕様
export interface EndingSpec {
  success: {
    duration: number;               // 演出の持続時間（秒）
    effects: string[];              // 'confetti', 'flash', 'zoom', 'message'など
    soundId: string;
    message?: string;
  };
  failure: {
    duration: number;
    effects: string[];
    soundId: string;
    message?: string;
  };
  transitionDelay: number;          // 終了後の遷移までの待機時間
}

// ★NEW: Priority設計
export interface PriorityDesign {
  rulePriorities: RulePrioritySpec[];
  conflictResolution: 'first' | 'last' | 'highest-priority';
  notes: string[];
}

export interface RulePrioritySpec {
  ruleId: string;
  priority: number;                 // 数値が大きいほど優先
  reason: string;
}

export interface ObjectSpecification {
  id: string;
  name: string;
  visualDescription: string;
  initialPosition: { x: number; y: number };  // 0.0-1.0正規化座標
  size: 'small' | 'medium' | 'large';
  // ★ 配置詳細情報
  displayScale?: { x: number; y: number };  // 表示スケール（0.1-3.0）、省略時は1.0
  aspectRatio?: '1:1' | '2:1' | '1:2' | '3:2' | '2:3';  // アスペクト比
  zIndex?: number;  // 描画順（大きいほど手前）
  initiallyVisible: boolean;
  physicsEnabled: boolean;
  touchable: boolean;
}

export interface StateManagement {
  counters: CounterSpec[];
  flags: FlagSpec[];
}

export interface CounterSpec {
  id: string;
  name: string;
  initialValue: number;
  purpose: string;           // なぜこのカウンターが必要か
  modifiedBy: string[];      // どのルールが変更するか
  checkedBy: string[];       // どのルールがチェックするか
}

export interface FlagSpec {
  id: string;
  name: string;
  initialValue: boolean;
  purpose: string;
}

export interface RuleSpecification {
  id: string;
  name: string;
  description: string;       // 何をするルールか（自然言語）
  targetObject?: string;     // 対象オブジェクト（あれば）

  // トリガー条件
  trigger: {
    type: 'touch' | 'time' | 'counter' | 'collision' | 'flag' | 'position' | 'animation' | 'gameState' | 'random' | 'objectState' | 'always';
    description: string;     // 条件の説明
    parameters: Record<string, unknown>;  // 詳細パラメータ
  };

  // アクション
  actions: {
    type: string;
    description: string;
    parameters: Record<string, unknown>;
  }[];

  // このルールの目的
  purpose: 'core-mechanic' | 'win-condition' | 'lose-condition' | 'feedback' | 'state-update';
}

export interface AudioSpecification {
  sounds: {
    id: string;
    trigger: string;
    type: 'tap' | 'success' | 'failure' | 'collect' | 'pop' | 'whoosh' | 'bounce' | 'ding' | 'buzz' | 'splash';
  }[];
  bgm?: {
    id: string;
    description: string;
    mood: 'upbeat' | 'calm' | 'tense' | 'happy' | 'mysterious' | 'energetic';
  };
}

export interface SpecDecision {
  aspect: string;
  decision: string;
  reasoning: string;
}

const SPEC_PROMPT = `あなたはゲームの仕様書を作成するエンジニアです。
ゲームデザインを、実装可能な詳細仕様に変換してください。

# ⚠️⚠️⚠️ 緊急警告: カウンター使用禁止 ⚠️⚠️⚠️

**カウンター未定義エラーが全エラーの80%を占めています！**
**カウンターを使わないでください！！！**

## 禁止パターン（絶対にやらない）
❌ stateManagement.counters が空なのに rules で counter を使う
❌ counterName を参照しているが counters に定義がない
❌ 複雑なカウンターロジック

## 推奨パターン（必ずこれを使う）
✅ タップ → 即座に success/failure（カウンター不要）
✅ 衝突 → 即座に success/failure（カウンター不要）
✅ 時間経過 → time条件で success/failure（カウンター不要）

**95%のゲームはカウンターなしで実装可能です！**
**迷ったら「正解タップで成功、不正解タップで失敗」パターンを使ってください！**

---

# ★★★ 最重要: 「核心体験」を実現するルールを作る ★★★

デザインの coreExperience.keyMechanic を必ずルールとして実装してください。

## 核心メカニクスの実装例

**例1: 「回転操作で位置を合わせる」**
→ ルールに必要なもの:
- オブジェクトの回転状態を管理
- ドラッグ/スワイプで回転角度を変更するルール
- 正しい角度で成功判定するルール

**例2: 「ポイで金魚をすくい上げる」**
→ ルールに必要なもの:
- ドラッグでポイを移動するルール
- 金魚との接触判定ルール
- すくい上げ動作（上方向へのドラッグ）で成功判定

**例3: 「星座の形を見出す」**
→ ルールに必要なもの:
- 星をタップして選択状態にするルール
- 選択した星の組み合わせが正解パターンかチェック
- 正しい組み合わせで成功判定

## 核心メカニクス実装チェック ★必須
仕様を出力する前に、以下を確認してください:
1. coreExperience.keyMechanic に対応するルールが存在するか？
2. そのルールは「その操作」を受け付けているか？（回転なら回転、ドラッグならドラッグ）
3. 成功時のフィードバックは「核心体験」を強化しているか？

## よくある間違い ❌
- 「回転させる」コンセプトなのにタップだけのルールになっている
- 「すくう」動作なのに単なる接触判定になっている
- 核心メカニクスが実装されていない（ただタップして消すだけ）

## 正しい仕様作成 ✅
- 核心メカニクスを実現する操作タイプを正しく選択（rotation, drag, swipe等）
- その操作に対する適切な条件とアクションを設計
- 成功時に「気持ちいい瞬間」を演出するフィードバック

## ⚠️⚠️⚠️ 緊急警告: CONFLICTING_TERMINATION エラー防止 ⚠️⚠️⚠️

**Run 19-20で計11件発生した最頻発エラー！ゲームが即座に無効になる致命的問題！**

### 問題1: touch条件で success と failure が同時に発火可能
\`\`\`
// ❌ NG: 両方のルールで target が同じ（または "self"）
{ "id": "tap_correct", "trigger": { "type": "touch", "parameters": { "target": "self" } }, "actions": [{ "type": "success" }] }
{ "id": "tap_wrong", "trigger": { "type": "touch", "parameters": { "target": "self" } }, "actions": [{ "type": "failure" }] }
// → 両方 "self" なので「同一条件」と判定されCONFLICTエラー！
\`\`\`

### 問題2: counter/flag条件で「勝利判定」「敗北判定」を分けようとする ★Run20で多発！
\`\`\`
// ❌ NG: counter条件で勝敗を分けようとする
{ "id": "check_win", "trigger": { "type": "counter", "parameters": { "counterName": "score", "comparison": "greaterOrEqual", "value": 3 } }, "actions": [{ "type": "success" }] }
{ "id": "check_lose", "trigger": { "type": "counter", "parameters": { "counterName": "score", "comparison": "lessOrEqual", "value": 0 } }, "actions": [{ "type": "failure" }] }
// → 両方ともcounter条件で同じカウンターを参照しているためCONFLICTの可能性！
\`\`\`

### 問題3: position条件で「勝利エリア」「敗北エリア」を分けようとする
\`\`\`
// ❌ NG: position条件で勝敗を分ける
{ "id": "reach_goal", "trigger": { "type": "position", "parameters": { "target": "player", "region": {...} } }, "actions": [{ "type": "success" }] }
{ "id": "fall_off", "trigger": { "type": "position", "parameters": { "target": "player", "region": {...} } }, "actions": [{ "type": "failure" }] }
// → 同じオブジェクト(player)のposition条件なのでCONFLICTの可能性！
\`\`\`

### ★★★ 解決策: シンプルなパターンを使う ★★★

**カウンター・フラグ・ポジション条件で勝敗を分けるのは避ける！**
**代わりに「タップで即座に勝敗が決まる」シンプルなパターンを使う：**

\`\`\`
// ✅ OK: 各ルールで異なるオブジェクトIDを touch の target に指定
{ "id": "tap_correct", "trigger": { "type": "touch", "parameters": { "target": "card_correct" } }, "actions": [{ "type": "success" }] }
{ "id": "tap_wrong_1", "trigger": { "type": "touch", "parameters": { "target": "card_wrong_1" } }, "actions": [{ "type": "failure" }] }
{ "id": "tap_wrong_2", "trigger": { "type": "touch", "parameters": { "target": "card_wrong_2" } }, "actions": [{ "type": "failure" }] }
// → それぞれ異なるオブジェクトIDなのでCONFLICTしない！
\`\`\`

### ★★★ 絶対禁止パターン ★★★
1. **「勝利条件の確認」「敗北条件の確認」という名前のルール** → シンプルにタップで決める！
2. **counter/flag条件でsuccess/failureを発火** → タップで直接success/failureを発火！
3. **position条件で「ゴールエリア」「落下エリア」を分ける** → collision条件で異なるオブジェクトに衝突したら判定！

### ★★★ 推奨パターン ★★★
1. **正解オブジェクトをタップ → success**
2. **不正解オブジェクトをタップ → failure**
3. **時間切れ → failure**（time条件）

---

## ⚠️⚠️⚠️ 必須: 成功ルールとプレイヤー操作 ⚠️⚠️⚠️

### NO_SUCCESS エラー防止 ★必須
ゲームには必ず1つ以上の success アクションを含むルールが必要です。
❌ rulesにsuccessアクションがない → ゲームがクリアできない（致命的エラー）

### NO_PLAYER_ACTION エラー防止 ★必須
successアクションを発火させる条件には、必ずプレイヤー操作を含めてください：
✅ touch条件 → success: プレイヤーがタップして成功
✅ collision条件 → success: ドラッグしたオブジェクトが衝突して成功
✅ position条件 → success: ドラッグしたオブジェクトが特定位置に到達して成功
❌ time条件のみ → success: プレイヤー操作なしで成功（禁止！）
❌ 条件なし → success: ゲーム開始直後に成功（禁止！）

### 最終チェック（必ず確認）
1. rulesにsuccessアクションを含むルールがあるか？
2. そのルールのtrigger.typeがtouch/collision/positionのいずれかか？

---

## ★★★ 推奨: シンプルゲームパターン集（50種類） ★★★

**カウンターはエラーの原因！使わないこと！以下のパターンを参考に：**

---
### 【タップ系】正解をタップするだけ

#### パターン1: 正解を選ぶ（クイズ・間違い探し・神経衰弱・ルート選択）
- target_correct タップ → success
- target_wrong_1, target_wrong_2, target_wrong_3 それぞれタップ → failure
- **カウンター不要！**

**重要: 複数の選択肢がある場合の正しいルール設計**
\`\`\`json
// 正解ルート
{ "id": "tap_correct", "trigger": { "type": "touch", "parameters": { "target": "route_correct" } }, "actions": [{ "type": "success" }] }
// 不正解ルート1
{ "id": "tap_wrong_1", "trigger": { "type": "touch", "parameters": { "target": "route_wrong_1" } }, "actions": [{ "type": "failure" }] }
// 不正解ルート2
{ "id": "tap_wrong_2", "trigger": { "type": "touch", "parameters": { "target": "route_wrong_2" } }, "actions": [{ "type": "failure" }] }
\`\`\`
**各ルールのtargetは必ず異なるオブジェクトIDを使う！**

#### パターン2: モグラ叩き・反射神経
- target 表示(time条件) → show
- target タップ → success
- time 3秒経過 → failure
- **カウンター不要！**

#### パターン3: 爆弾回避タップ（地雷除去）
- safe_zone タップ → success
- bomb タップ → failure
- **カウンター不要！**

#### パターン4: じゃんけん・選択肢
- choice_rock/paper/scissors のうち正解をタップ → success
- 不正解をタップ → failure
- **カウンター不要！**

#### パターン5: カード選択（ブラックジャック風）
- card_good タップ → success
- card_bad タップ → failure
- **カウンター不要！**

---
### 【ドラッグ系】ドラッグで移動・配置

#### パターン6: ゴールに運ぶ（パズル・迷路・サッカー）
- player ドラッグ → followDrag
- player と goal 衝突 → success
- **カウンター不要！**

#### パターン7: パズルピースをはめる
- piece ドラッグ → followDrag
- piece と slot 衝突 → success
- **カウンター不要！**

#### パターン8: クレーンゲーム
- claw ドラッグ(横方向のみ) → followDrag
- button タップ → claw下降
- claw と prize 衝突 → success
- **カウンター不要！**

#### パターン9: バスケットボール（シュート）
- ball ドラッグ → followDrag
- ball リリース → 物理演算で飛ぶ
- ball と hoop 衝突 → success
- **カウンター不要！**

#### パターン10: 料理・盛り付け
- ingredient ドラッグ → followDrag
- ingredient と dish 衝突 → success
- **カウンター不要！**

#### パターン11: 洗濯物干し・片付け
- item ドラッグ → followDrag
- item と target_area 衝突 → success
- **カウンター不要！**

---
### 【スワイプ・フリック系】方向入力

#### パターン12: 正しい方向にスワイプ（フルーツ斬り風）
- fruit スワイプ → success（どの方向でもOK）
- bomb スワイプ → failure
- **カウンター不要！**

#### パターン13: 方向指示（道案内・信号）
- stage スワイプ(direction: 正解方向) → success
- stage スワイプ(direction: 不正解方向) → failure
- **カウンター不要！**

#### パターン14: カードをめくる・スワイプ選択
- card スワイプ(right) → 選択、success判定
- card スワイプ(left) → スキップ
- **カウンター不要！**

#### パターン15: 虫を払う・ほこりを払う
- dust スワイプ → hide + success
- **カウンター不要！**

---
### 【フリック発射系】物を投げる・打つ

#### パターン16: ボウリング
- ball フリック(上方向) → 物理演算で転がる
- ball と pins 衝突 → success
- **カウンター不要！**

#### パターン17: ゴルフ（パット）
- ball フリック → 物理演算
- ball と hole 衝突 → success
- **カウンター不要！**

#### パターン18: 紙飛行機・ダーツ
- projectile フリック → 飛行
- projectile と target 衝突 → success
- **カウンター不要！**

#### パターン19: ビリヤード・おはじき
- ball フリック → 物理演算
- ball と pocket/target 衝突 → success
- **カウンター不要！**

#### パターン20: アングリーバード風（発射）
- slingshot ドラッグ(引っ張る) → 照準
- リリース → projectile発射
- projectile と target 衝突 → success
- **カウンター不要！**

---
### 【タイミング系】タイミングを合わせる

#### パターン21: ゴルフ（パワーゲージ）
- gauge が左右に動く
- stage タップ → gauge停止
- gauge が green_zone 内なら → success
- **カウンター不要！**

#### パターン22: 釣り（タイミング）
- float が沈む → アニメーション
- stage タップ(タイミング良く) → success
- **カウンター不要！**

#### パターン23: ジャンプ台・スキー
- stage タップ(ジャンプポイントで) → success
- タイミング外れ → failure
- **カウンター不要！**

#### パターン24: リズムゲーム（単発）
- note が判定ラインに到達
- stage タップ(タイミング一致) → success
- **カウンター不要！**

#### パターン25: 信号待ち（青でGO）
- light が green になる
- stage タップ(green時) → success
- stage タップ(red時) → failure
- **カウンター不要！**

---
### 【長押し系】ホールド・チャージ

#### パターン26: 風船を膨らませる
- balloon 長押し → 膨張アニメーション
- 適切なサイズでリリース → success
- 膨らませすぎ → failure（破裂）
- **カウンター不要！**

#### パターン27: ロケット発射（チャージ）
- button 長押し → パワーゲージ上昇
- リリース → 発射、target到達で success
- **カウンター不要！**

#### パターン28: 写真撮影（ピント合わせ）
- camera 長押し → フォーカス
- ピント合った瞬間にリリース → success
- **カウンター不要！**

#### パターン29: 爆弾解除（長押しカット）
- wire 長押し(3秒) → success（解除完了）
- **カウンター不要！**

---
### 【回転系】回す・ひねる

#### パターン30: 鍵を開ける（ダイヤル錠）
- dial ドラッグ(回転) → 回転
- 正しい角度で → success
- **カウンター不要！**

#### パターン31: 蛇口・バルブを回す
- valve ドラッグ(回転) → 回転
- 規定回転で → success
- **カウンター不要！**

#### パターン32: ルーレット（止める）
- wheel 自動回転
- stage タップ → 停止
- 当たりゾーンで停止 → success
- **カウンター不要！**

#### パターン33: 向きを揃える（パズル）
- tile タップ → 90度回転
- 正しい向き → success
- **カウンター不要！**

---
### 【物理・シミュレーション系】

#### パターン34: ピンボール
- flipper タップ → 回転
- ball と target 衝突 → success
- **カウンター不要！**

#### パターン35: バランスゲーム（積み木）
- block ドラッグ → 配置
- 3秒間倒れない → success
- 倒れる → failure
- **カウンター不要！**

#### パターン36: 水を流す（パイプパズル）
- pipe タップ → 回転
- water が goal に到達 → success
- **カウンター不要！**

#### パターン37: ドミノ倒し
- first_domino タップ → 倒れ始める
- last_domino 倒れる → success
- **カウンター不要！**

---
### 【レース・競争系】

#### パターン38: 連打レース
- button 連打 → player前進
- player が goal 到達 → success
- ※連打はカウンター使用
- カウンター: { id: "taps", initialValue: 0 }
- button タップ → counter increment
- counter >= 10 → success

#### パターン39: 障害物レース（左右移動）
- player ドラッグ(左右) → 移動
- player と obstacle 衝突 → failure
- player と goal 衝突 → success
- **カウンター不要！**

#### パターン40: 競馬・選択ベット
- horse_1/2/3 から正解を選んでタップ → success
- **カウンター不要！**

---
### 【避ける・守る系】

#### パターン41: シューティング（敵を撃つ）
- stage タップ → bullet発射
- bullet と enemy 衝突 → success
- **カウンター不要！**

#### パターン42: 隕石避け・弾幕
- player ドラッグ → 移動
- time 5秒経過 → success（生存）
- player と meteor 衝突 → failure
- **カウンター不要！**

#### パターン43: 盾で守る
- shield ドラッグ → 移動
- attack と shield 衝突 → ブロック成功
- attack と player 衝突 → failure
- time 経過 → success
- **カウンター不要！**

---
### 【収集・キャッチ系】

#### パターン44: 落ちてくるものをキャッチ
- basket ドラッグ(左右) → 移動
- item と basket 衝突 → success
- item が画面外 → failure
- **カウンター不要！**

#### パターン45: UFOキャッチャー（単体）
- catcher ドラッグ → 移動
- button タップ → 下降
- catcher と prize 衝突 → success
- **カウンター不要！**

---
### 【描画・なぞる系】

#### パターン46: 線を引いて繋ぐ
- start から end までドラッグで線を引く
- ゴールに到達 → success
- **カウンター不要！**

#### パターン47: 図形をなぞる
- template 上をドラッグ
- 正確になぞれた → success
- **カウンター不要！**

#### パターン48: 迷路を指でなぞる
- start から goal までドラッグ
- wall に触れず goal 到達 → success
- wall 衝突 → failure
- **カウンター不要！**

---
### 【特殊メカニクス】

#### パターン49: スロットマシン（止める）
- reel_1/2/3 が回転
- button_1/2/3 タップ → 対応リール停止
- 全リール同じ絵柄 → success
- **カウンター不要！**

#### パターン50: テトリス風（1ピース配置）
- block 自動落下
- stage スワイプ(left/right) → 移動
- stage タップ → 即落下
- 隙間なく配置 → success
- **カウンター不要！**

---
### 【カウンター使用の正しい例】

**複数タップで完了（カウンター必須の場合のみ）:**
- カウンター: { id: "done", initialValue: 0, modifiedBy: ["tap_1", "tap_2"], checkedBy: ["check_win"] }
- target_1 タップ → hide + counter "done" increment
- target_2 タップ → hide + counter "done" increment
- counter "done" >= 2 → success

---
**重要: 複雑なタイマーや複数カウンターは避ける！**
**上記パターンの95%はカウンター不要で実装可能！**

# 入力
- コンセプト: ゲームの概要（★これがゲームの「正解」）
- デザイン: ゲームの設計
- アセットプラン: 利用可能なアセット（★オブジェクトIDはこれに合わせる）

# 絶対に守るべき制約

## 座標の制約 ★必須（INVALID_REGION エラー対策）

**すべての座標・位置・領域は 0.0〜1.0 の範囲内！**

### 対象となるフィールド:
- position.x / position.y（オブジェクト位置）
- initialPosition.x / initialPosition.y（初期位置）
- region.x / region.y / region.width / region.height（position条件の領域）
- move.targetPosition.x / move.targetPosition.y（移動先）

### ルール:
- 負の値は禁止（-0.1 などは NG）
- 1.0を超える値も禁止（1.2, 5, 4.9 などは NG）
- 中央 = (0.5, 0.5)、左上 = (0.0, 0.0)、右下 = (1.0, 1.0)

### よくある間違い ❌ ★Run20で発生！
\`\`\`json
// NG: region.yが-1.5（負の値）★Run20で発生したエラー！
{ "type": "position", "parameters": { "region": { "x": 0.5, "y": -1.5, "width": 0.2, "height": 0.2 } } }

// NG: region.yが-0.5（負の値）★Run20で発生したエラー！
{ "type": "position", "parameters": { "region": { "x": 0.3, "y": -0.5, "width": 0.4, "height": 0.1 } } }

// NG: region.yが5（1.0を超えている）
{ "type": "position", "parameters": { "region": { "x": 0.5, "y": 5, "width": 0.2, "height": 0.2 } } }

// NG: region.yが4.9（1.0を超えている）
{ "type": "position", "parameters": { "region": { "x": 0.3, "y": 4.9, "width": 0.4, "height": 0.1 } } }
\`\`\`

### 正しい例 ✅
\`\`\`json
// OK: すべて0.0-1.0の範囲内
{ "type": "position", "parameters": { "region": { "x": 0.3, "y": 0.7, "width": 0.4, "height": 0.2 } } }

// OK: 画面上部 (y=0.0〜0.2)
{ "type": "position", "parameters": { "region": { "x": 0.0, "y": 0.0, "width": 1.0, "height": 0.2 } } }

// OK: 画面下部 (y=0.8〜1.0)
{ "type": "position", "parameters": { "region": { "x": 0.0, "y": 0.8, "width": 1.0, "height": 0.2 } } }
\`\`\`

## ⚠️ カウンターは使用禁止 ⚠️ ★Run20でもエラー多発！

**Run 20でカウンター未定義エラーが4件発生！**
**カウンターを使うとほぼ確実にエラーになります！**

### ★★★ 99%のゲームはカウンター不要 ★★★

カウンターを使わずに実装する方法:
- 「正解をタップしたら成功」→ touch条件で直接success（カウンター不要）
- 「ゴールに到達したら成功」→ collision条件で直接success（カウンター不要）
- 「5秒生き残ったら成功」→ time条件で直接success（カウンター不要）
- 「3回タップしたら成功」→ 3つのオブジェクトを用意し、すべてタップでsuccess（カウンター不要）

### stateManagement.counters は空配列にする
\`\`\`json
"stateManagement": {
  "counters": [],  // ★空配列！カウンターは使わない！
  "flags": []
}
\`\`\`

#### まず検討: カウンターなしで実装できないか？
- 「正解をタップしたら成功」→ touch + success（カウンター不要）
- 「ゴールに到達したら成功」→ collision + success（カウンター不要）
- 「5秒生き残ったら成功」→ time + success（カウンター不要）

#### どうしてもカウンターが必要な場合のみ:
**必ずこの順序で出力:**
1. **先に** stateManagement.counters にカウンターを定義
2. **後から** rules でそのカウンターを参照

#### 絶対にやってはいけない ❌
\`\`\`
// counters に何も定義していないのに...
rules: [{
  actions: [{ type: "counter", counterName: "tapped_count", operation: "increment" }]  // エラー！
}]
\`\`\`

#### 正しい例 ✅
\`\`\`
stateManagement: {
  counters: [
    { id: "tapped_count", name: "タップ数", initialValue: 0, ... }  // ★先に定義
  ]
},
rules: [{
  actions: [{ type: "counter", counterName: "tapped_count", operation: "increment" }]  // OK
}]
\`\`\`

#### 出力前の最終チェック（必須）:
1. rulesで使う全counterNameがcountersに定義されているか？
2. countersが空なら、rulesにcounter条件/アクションがないか？
3. カウンターなしで実装できないか再検討したか？

**迷ったらカウンターを使わない！シンプルなパターンを選ぶ！**

## 成功・失敗条件の排他制御 ★必須
成功と失敗が同時に発動する可能性を防ぐ:

**危険パターン ❌**
- 扉A〜Dがあり、Aタップで成功、B〜Dタップで失敗
  → 条件が同じ「タッチ」なので問題はないが、同一フレームの発火順に依存

**安全パターン ✅**
- 正解オブジェクトと不正解オブジェクトを明確に分離
- 正解: target_correct をタップ → success
- 不正解: target_wrong_1〜3 をタップ → failure
- 各ルールのtargetObjectを正しく設定して区別

**カウンター条件の排他制御 ✅**
- 失敗: score < 3 かつ time == 0
- 成功: score >= 3
→ 条件値で明確に分離

## タイマー設定の注意点 ★必須

### timeType は以下のみ有効 ★★★
✅ 有効: 'exact', 'range', 'interval'
❌ 無効: 'after', 'countdown', 'countup'

例:
- { "timeType": "exact", "seconds": 5 }  // 5秒経過で発火
- { "timeType": "interval", "interval": 1 }  // 1秒ごとに発火

タイマー用カウンターを作る場合:
1. initialValue は失敗閾値より大きく設定
   - ✅ initialValue: 500, 失敗条件: <= 0
   - ❌ initialValue: 0, 失敗条件: <= 0 → 即失敗
2. decrementルールを必ず作成（time条件で毎フレーム減算）

## 必須サウンド ★必須
以下の3つは必ず含める:
- se_tap: タップ時の効果音
- se_success: 成功時の効果音
- se_failure: 失敗時の効果音

## ★★★ 有効なタイプ一覧（これ以外は使用禁止）★★★

### 条件タイプ（trigger.type）
✅ 有効: 'touch', 'time', 'counter', 'collision', 'flag', 'gameState', 'position', 'animation', 'random', 'objectState'
❌ 無効: 'state', 'deviceTilt', 'sensor', 'gesture', 'custom'（customは使えない！）

### animation条件の必須パラメータ ★★★
animation条件を使う場合は必ず frameNumber を指定:
✅ 正しい: { type: "animation", parameters: { condition: "frame", frameNumber: 5 } }
❌ 間違い: { type: "animation", parameters: { condition: "frame" } }（frameNumberがない！）

**⚠️⚠️⚠️ animation条件での success は禁止！⚠️⚠️⚠️**
animation条件だけで成功を発火させるのはプレイヤー操作がないためNG:
❌ 禁止: { "trigger": { "type": "animation", ... }, "actions": [{ "type": "success" }] }
→ これは AUTO_SUCCESS エラーになる！
→ animation条件は「アニメーション後にエフェクトを出す」などの補助的な用途のみ！

### アクションタイプ（actions[].type）
✅ 有効: 'success', 'failure', 'hide', 'show', 'move', 'counter', 'addScore', 'effect', 'setFlag', 'toggleFlag', 'playSound', 'stopSound', 'playBGM', 'stopBGM', 'switchAnimation', 'playAnimation', 'followDrag', 'applyForce', 'applyImpulse', 'randomAction', 'pause', 'restart'
❌ 無効: 'changeState', 'adjustAngle', 'updateCounter', 'rotate', 'scale', 'fade', 'spawn', 'destroy', 'conditional'

### 移動タイプ（movement.type）★NEW
✅ 有効: 'straight', 'teleport', 'wander', 'stop'
❌ 無効: 'bounce', 'linear', 'jump', 'lerp', 'bezier', 'arc', 'zigzag'

### 比較演算子（comparison）
✅ 有効: 'equals', 'greaterOrEqual', 'greater', 'less', 'lessOrEqual'
❌ 無効: 'lessThan'（'less'を使う）, 'greaterThan'（'greater'を使う）, '==', '<', '>'

### エフェクトタイプ（effect.type）
✅ 有効: 'flash', 'shake', 'scale', 'rotate', 'particles'
❌ 無効: 'particle'（複数形の'particles'を使う）, 'glow', 'pulse', 'fade', 'blur'

### collision条件のtarget ★★★
collision条件のtargetには具体的なオブジェクトIDを指定:
✅ 正しい: { type: "collision", target: "goal", ... }
✅ 正しい: { type: "collision", target: "enemy_1", ... }
❌ 間違い: { type: "collision", target: "any" }（"any"は無効！）
❌ 間違い: { type: "collision", target: "all" }（"all"は無効！）

### applyImpulse/applyForceの必須パラメータ ★★★
applyImpulse/applyForce を使う場合は必ず impulse/force を指定:
✅ 正しい: { type: "applyImpulse", parameters: { targetId: "ball", impulse: { x: 0, y: -5 } } }
✅ 正しい: { type: "applyForce", parameters: { targetId: "player", force: { x: 1, y: 0 } } }
❌ 間違い: { type: "applyImpulse", parameters: { targetId: "ball" } }（impulseがない！）

### playSoundアクションの必須パラメータ
playSound を使う場合は必ず soundId を指定:
✅ 正しい: { type: "playSound", parameters: { soundId: "se_tap" } }
❌ 間違い: { type: "playSound", parameters: {} }

### ★★★ "self" と "screen" は使用禁止 ★★★

**INVALID_OBJECT_ID エラーの主な原因！**
**"self" と "screen" はオブジェクトIDではありません！**

#### 使用禁止の場所:
❌ targetObject: "self" - 無効
❌ targetId: "self" - 無効
❌ targetId: "screen" - 無効
❌ collision target: "self" - 無効
❌ effect targetId: "self" - 無効
❌ effect targetId: "screen" - 無効

#### 正しい使い方:
✅ targetObject: "player"（実際のオブジェクトID）
✅ targetId: "ball"（実際のオブジェクトID）
✅ collision target: "goal"（実際のオブジェクトID）
✅ effect targetId: "target_correct"（実際のオブジェクトID）

#### 例：
\`\`\`json
// ❌ NG: "self"を使用
{ "type": "followDrag", "parameters": { "targetId": "self" } }
{ "type": "effect", "parameters": { "targetId": "screen", "effect": { "type": "flash" } } }

// ✅ OK: 実際のオブジェクトIDを使用
{ "type": "followDrag", "parameters": { "targetId": "note" } }
{ "type": "effect", "parameters": { "targetId": "target_correct", "effect": { "type": "flash" } } }
\`\`\`

**重要: すべてのIDは objects 配列で定義したものだけを使う！**

### touch条件の target について ★★★
touch条件の target も基本的にオブジェクトIDを使う:
✅ 推奨: { "target": "button_1" }（具体的なオブジェクトID）
⚠️ 注意: { "target": "stage" }（画面全体）- 使えるが、複数ルールで使うとCONFLICT発生
❌ 禁止: { "target": "self" }（複数ルールで使うと必ずCONFLICT）

## ★★★ 必須: success と failure アクション ★★★
すべてのゲームには必ず以下の両方が必要:
1. **successアクション**: プレイヤーが勝利する条件
2. **failureアクション**: プレイヤーが敗北する条件

### よくある間違い ❌
- successアクションがない → ゲームをクリアできない
- failureアクションがない → ゲームが終わらない
- 両方を同じ条件で発火させる → コンフリクト

### 正しい設計 ✅
少なくとも1つのルールで type: "success" を使う
少なくとも1つのルールで type: "failure" を使う（または時間切れで失敗）

## ★★★ 最重要: 成功にはプレイヤー操作が必須 ★★★

**NO_PLAYER_ACTION エラーが最頻発！**
**成功条件には必ずプレイヤーの操作が関係していなければならない！**

### プレイヤー操作とは？
✅ touch条件（タップ、ドラッグ、スワイプ、長押し）
✅ collision条件（プレイヤーが操作するオブジェクトとの衝突）
✅ position条件（プレイヤーが移動させたオブジェクトの位置）

### 絶対にやってはいけない ❌
\`\`\`
// NG: プレイヤー操作なしで成功
{
  "id": "check_success",
  "trigger": { "type": "time", "parameters": { "timeType": "exact", "seconds": 5 } },
  "actions": [{ "type": "success" }]  // NG! プレイヤーは何もしていない！
}
\`\`\`

\`\`\`
// NG: animation条件だけで成功
{
  "id": "check_success",
  "trigger": { "type": "animation", "parameters": { "condition": "frame", "frameNumber": 10 } },
  "actions": [{ "type": "success" }]  // NG! プレイヤーは何もしていない！
}
\`\`\`

### 正しい設計 ✅
\`\`\`
// OK: タップで成功
{
  "id": "tap_correct",
  "trigger": { "type": "touch", "parameters": { "target": "correct_object", "touchType": "down" } },
  "actions": [{ "type": "success" }]  // OK! プレイヤーがタップした！
}
\`\`\`

\`\`\`
// OK: 衝突で成功（ドラッグで移動したオブジェクト）
{
  "id": "reach_goal",
  "trigger": { "type": "collision", "parameters": { "target": "goal" } },
  "actions": [{ "type": "success" }]  // OK! プレイヤーがオブジェクトを移動させた！
}
\`\`\`

### 成功条件の設計原則
1. **タップ系**: 正解オブジェクトをタップ → success
2. **移動系**: ドラッグでゴールに到達 → success
3. **衝突系**: プレイヤー操作のオブジェクトが目標に衝突 → success
4. **時間系**: ❌ 時間経過だけで成功はNG！（生存ゲームは例外だがプレイヤーは「避ける」操作をしている）

**迷ったら「タップで成功」パターンを使う！**

## SUCCESS_FAILURE_CONFLICT 防止 ★★★最頻発エラー★★★
同一条件で成功と失敗が発火するのは致命的エラー！
**Run 12-13で計16件発生した最重要問題！**

### ★★★ 衝突を防ぐ唯一の方法: target に異なるオブジェクトIDを使う ★★★

**重要: バリデータは trigger.parameters.target の値で衝突を判定します！**
**targetObject ではなく、target フィールドが重要！**

\`\`\`json
// ✅ 正しい例：target に異なるオブジェクトIDを指定
{
  "id": "tap_correct",
  "targetObject": "correct_note",
  "trigger": {
    "type": "touch",
    "parameters": {
      "target": "correct_note",  // ★ オブジェクトIDを直接指定！
      "touchType": "down"
    }
  },
  "actions": [{ "type": "success" }]
},
{
  "id": "tap_wrong",
  "targetObject": "wrong_note",
  "trigger": {
    "type": "touch",
    "parameters": {
      "target": "wrong_note",  // ★ 別のオブジェクトID！
      "touchType": "down"
    }
  },
  "actions": [{ "type": "failure" }]
}
// シグネチャ: "touch_target:correct_note" vs "touch_target:wrong_note" → 衝突しない！
\`\`\`

\`\`\`json
// ❌ 間違い例：両方とも target: "self" なので衝突する！
{
  "id": "tap_correct",
  "targetObject": "correct_note",  // targetObjectは異なるが...
  "trigger": { "type": "touch", "parameters": { "target": "self" } }  // NG: 両方"self"！
},
{
  "id": "tap_wrong",
  "targetObject": "wrong_note",  // targetObjectは異なるが...
  "trigger": { "type": "touch", "parameters": { "target": "self" } }  // NG: 両方"self"！
}
// シグネチャ: "touch_target:self" vs "touch_target:self" → 衝突！
\`\`\`

### 絶対ルール ⚠️
1. **複数オブジェクトで success/failure を分ける場合:**
   - target には "self" を使わない
   - target には実際のオブジェクトIDを使う

2. **単一オブジェクトの場合のみ target: "self" が使える**

### 絶対にやってはいけない ❌

**パターン1: 同じルール内で success と failure 両方**
\`\`\`
// NG: 1つのルールで両方発火
actions: [
  { type: "success" },
  { type: "failure" }  // エラー！
]
\`\`\`

**パターン2: 両方とも target: "self" または target: "stage"**
- tap_correct: target: "self" → success
- tap_wrong: target: "self" → failure
  → 両方とも「self」なので衝突！

**パターン3: スワイプ方向が同じで success/failure**
\`\`\`
// NG: 両方とも stage への right スワイプ
// ルール1: target: "stage", direction: "right" → success
// ルール2: target: "stage", direction: "right" → failure
\`\`\`

**パターン4: タイミングベースの成功/失敗 ★頻発エラー★**
\`\`\`
// NG: 同じオブジェクトを「正しいタイミング」と「間違ったタイミング」で区別しようとする
// ルール1: tap_knife_correct: target: "knife" → success（正確なタイミング）
// ルール2: tap_knife_wrong: target: "knife" → failure（不正確なタイミング）
// → 両方とも「knife」をタップなので衝突！タイミングは判定できない！
\`\`\`

**パターン5: 範囲ベースの成功/失敗**
\`\`\`
// NG: 同じエリア内の「正しい位置」と「間違った位置」で区別しようとする
// ルール1: tap_correct_range: target: "stage" → success
// ルール2: tap_outside_range: target: "stage" → failure
// → 両方とも「stage」をタップなので衝突！
\`\`\`

### ⚠️ 実装できないパターン（避ける）
以下のパターンは技術的に実装困難なので**使わない**:
- 同じオブジェクトを「タイミング」で成功/失敗を分ける
- 同じエリアを「位置」で成功/失敗を分ける
- 同じオブジェクトを「アニメーションフレーム」で成功/失敗を分ける

代わりに**シンプルなパターン**を使う:
- 正解オブジェクトと不正解オブジェクトを**別々に**用意
- タップ → 即座に success または failure

### 正しい設計 ✅

**方法1: target に異なるオブジェクトIDを指定（推奨！）**
\`\`\`json
{ "trigger": { "parameters": { "target": "correct_object" } }, "actions": [{ "type": "success" }] }
{ "trigger": { "parameters": { "target": "wrong_object" } }, "actions": [{ "type": "failure" }] }
\`\`\`

**方法2: スワイプ方向で区別**
\`\`\`json
{ "trigger": { "parameters": { "target": "stage", "direction": "right" } }, "actions": [{ "type": "success" }] }
{ "trigger": { "parameters": { "target": "stage", "direction": "left" } }, "actions": [{ "type": "failure" }] }
\`\`\`

## アクションで参照するオブジェクトIDの制約 ★★★
アクションの targetId は必ずアセット計画に存在するオブジェクトを指定:
✅ 正しい: targetId: "player"（アセット計画に定義済み）
❌ 間違い: targetId: "effect_success"（存在しないオブジェクト）
❌ 間違い: targetId: "particle_1"（エフェクト用の架空オブジェクト）
❌ 間違い: targetId: "stage"（stageはアクションのtargetIdに使えない）

**エフェクトは effect アクションで実現:**
✅ 正しい: { type: "effect", targetId: "player", effect: { type: "particles" } }
❌ 間違い: { type: "show", targetId: "effect_success" }（存在しないオブジェクト）
❌ 間違い: { type: "effect", targetId: "stage" }（stageは不可）

## SHOW_HIDE_CONFLICT 防止 ★★★
同じルール内で同じオブジェクトに show と hide を両方実行してはいけない:

### 絶対にやってはいけない ❌
\`\`\`
// NG: 1つのルールで同じオブジェクトにshow/hide
actions: [
  { type: "show", targetId: "object_1" },
  { type: "hide", targetId: "object_1" }  // エラー！
]
\`\`\`

### 正しい設計 ✅
異なるルールで制御するか、片方だけ使う

## 即成功・即失敗の防止 ★★★
カウンターの初期値が条件を最初から満たしていると、ゲーム開始直後に終了:

### 即成功を防ぐ ❌
- initialValue: 10, 成功条件: >= 5 → ゲーム開始で即成功
✅ 正しい: initialValue: 0, 成功条件: >= 5

### 即失敗を防ぐ ❌
- initialValue: 0, 失敗条件: <= 0 → ゲーム開始で即失敗
✅ 正しい: initialValue: 100, 失敗条件: <= 0

# 出力する仕様

## 1. オブジェクト仕様（配置パターン含む）
各オブジェクトの詳細を定義:
- ID（英数字、スネークケース）
- 位置（0.0-1.0の正規化座標、中央=(0.5, 0.5)）★範囲外禁止
- サイズ（small/medium/large）
- 初期表示状態
- タッチ可能かどうか

### ★ 配置パターンの設計 ★
オブジェクトの画面上での見え方を具体的に指定:
- **displayScale**: 表示スケール（x: 横方向, y: 縦方向、0.1-3.0）
  - 縦長オブジェクト: { x: 0.8, y: 1.5 }
  - 横長オブジェクト: { x: 1.5, y: 0.8 }
  - 正方形: { x: 1.0, y: 1.0 }（省略可）
- **aspectRatio**: アスペクト比（'1:1', '2:1', '1:2', '3:2', '2:3'）
- **zIndex**: 描画順（大きいほど手前、10刻み推奨）

**配置の例:**
\`\`\`json
{
  "id": "street_lamp",
  "name": "街灯",
  "initialPosition": { "x": 0.2, "y": 0.5 },
  "size": "large",
  "displayScale": { "x": 0.6, "y": 1.8 },
  "aspectRatio": "1:2",
  "zIndex": 20
}
\`\`\`
**注意: 街灯のような縦長オブジェクトは displayScale.y を大きく設定！**

## 2. 状態管理
カウンターとフラグを定義:
- **カウンターを使う判断基準**: 「何かを数える必要があるか？」
- 各カウンターには「変更するルール」と「チェックするルール」の両方が必要
- modifiedBy と checkedBy フィールドに具体的なルールIDを記載

## 3. ルール仕様
各インタラクションをルールとして定義

### タッチ条件の書き方 ★重要
タッチ条件では必ず target と touchType を指定:
- target: タッチ対象
  - オブジェクトID: 特定のオブジェクトをタッチしたとき **★推奨！**
  - "stage": 画面全体（どこをタッチしても発火）
  - "self": このルールがtargetObjectに設定されたオブジェクト自身 **⚠️注意！**
- touchType: タッチの種類
  - "down": タップ開始
  - "up": タップ終了
  - "drag": ドラッグ中
  - "hold": 長押し

**⚠️ "self" の使用制限:**
- 複数のルールで success/failure を分ける場合 → target: "self" は使用禁止！
- 単一オブジェクトのみの場合 → target: "self" OK

**例（推奨パターン）:**
{
  "trigger": {
    "type": "touch",
    "parameters": {
      "target": "button_start",  // ★オブジェクトIDを直接指定
      "touchType": "down"
    }
  }
}

## 4. 音声仕様

### 必須サウンド（3つ必ず含める）
- se_tap: タップ時の効果音 (type: "tap")
- se_success: 成功時の効果音 (type: "success")
- se_failure: 失敗時の効果音 (type: "failure")

### サウンドタイプ ★★★
sound.type は以下のみ使用可能（英語のみ）:
✅ 有効: tap, success, failure, collect, pop, whoosh, bounce, ding, buzz, splash
❌ 無効: effect, bgm, se, hit, countdown, warning, calm（calmはmoodには使えるがsound.typeには使えない！）

### BGM mood ★★★
bgm.mood は以下の英語のみ使用可能:
✅ 有効: upbeat, calm, tense, happy, mysterious, energetic
❌ 無効: 日本語（「緊張感」等）, undefined, その他の英語

### BGM必須フィールド ★★★
BGMを定義する場合は必ず id と mood の両方を指定:
✅ 正しい: { "id": "bgm_main", "description": "楽しいBGM", "mood": "upbeat" }
❌ 間違い: { "description": "BGM" }（idとmoodがない！）
❌ 間違い: { "id": "bgm_main" }（moodがない！）

### playSound必須フィールド（再確認）★★★
playSoundアクションには必ずsoundIdを指定！これが抜けるとエラー:
✅ 正しい: { "type": "playSound", "parameters": { "soundId": "se_tap" } }
❌ 間違い: { "type": "playSound", "parameters": {} }（soundIdがない！）
❌ 間違い: { "type": "playSound", "description": "効果音" }（parametersがない！）

## 5. UI/視認性仕様 ★重要
操作対象が一目で分かるようにする:
- タッチ対象の最小サイズ
- コントラスト要件
- レイアウト戦略
- 安全マージン

## 6. フィードバック仕様 ★重要
主要トリガーごとに視覚＋聴覚のセットを必ず定義:
- tap: タップ時の反応
- collect/hit: 獲得/被弾時
- success/failure: 終了時
各フィードバックには duration（秒）を明示

## 7. 終了演出仕様 ★重要
- success: 成功演出の持続時間と効果
- failure: 失敗演出の持続時間と効果
- transitionDelay: 次画面への遷移待機

## 8. Priority設計 ★重要
ルール発火順で問題が起きないように:
- 各ルールの優先度（数値大=優先）
- win-conditionが永遠に発火しない構造を防ぐ

## 9. 成功パス
プレイヤーが勝利に至る道筋と検証

# コンセプト
{{CONCEPT}}

# ゲームデザイン
{{DESIGN}}

# アセットプラン（参考）
{{ASSET_PLAN}}

# ★★★ 出力前の最終チェックリスト ★★★

**必ず以下を確認してから出力:**

□ **オブジェクトID チェック（最重要！）**
  - すべての targetObject, targetId, collision target は objects 配列で定義したIDか？
  - "self", "screen", "stage" を targetObject/targetId に使っていないか？
  - → 必ず objects で定義した実際のIDのみ使う！

□ **プレイヤー操作チェック（最重要！）**
  - successアクションを持つルールは、プレイヤー操作（touch/collision/position）で発火するか？
  - time条件やanimation条件だけで成功するルールはないか？
  - → 必ずプレイヤーが何か操作して成功するようにする！

□ **座標範囲チェック**
  - すべての position, region の x, y, width, height は 0.0〜1.0 の範囲内か？
  - 5, 4.9, 1.2 などの範囲外の値がないか？

□ **SUCCESS_FAILURE_CONFLICT チェック（重要！）**
  - 複数オブジェクトで success/failure を分ける場合、各ルールの target が異なるか？
  - target: "self" を複数ルールで使っていないか？
  - → 各ルールで target: "オブジェクトID" を使う！

□ **successアクション存在チェック**
  - 少なくとも1つのルールに { "type": "success" } があるか？
  - ない場合、ゲームがクリアできない！

□ rulesにcounter条件があるか？ → あればcountersに定義があるか確認
□ rulesにcounterアクションがあるか？ → あればcountersに定義があるか確認
□ countersが空[]なら、rulesにcounter関連は一切ないはず

**「プレイヤー操作 → success」が最も重要！**

# 出力形式（JSON）- ★カウンター不使用の推奨パターン★
{
  "objects": [
    {
      "id": "target_correct",
      "name": "正解ターゲット",
      "visualDescription": "タップすべき正しいオブジェクト",
      "initialPosition": { "x": 0.5, "y": 0.4 },
      "size": "medium",
      "displayScale": { "x": 1.0, "y": 1.0 },
      "aspectRatio": "1:1",
      "zIndex": 20,
      "initiallyVisible": true,
      "physicsEnabled": false,
      "touchable": true
    },
    {
      "id": "target_wrong",
      "name": "不正解ターゲット",
      "visualDescription": "タップしてはいけないオブジェクト",
      "initialPosition": { "x": 0.3, "y": 0.6 },
      "size": "medium",
      "displayScale": { "x": 1.0, "y": 1.0 },
      "aspectRatio": "1:1",
      "zIndex": 10,
      "initiallyVisible": true,
      "physicsEnabled": false,
      "touchable": true
    }
  ],
  "stateManagement": {
    "counters": [],
    "flags": []
  },
  "rules": [
    {
      "id": "tap_correct",
      "name": "正解タップ",
      "description": "正解をタップしたら成功",
      "targetObject": "target_correct",
      "trigger": {
        "type": "touch",
        "description": "正解をタップ",
        "parameters": {
          "target": "target_correct",
          "touchType": "down"
        }
      },
      "actions": [
        { "type": "playSound", "description": "効果音", "parameters": { "soundId": "se_tap" } },
        { "type": "effect", "description": "エフェクト", "parameters": { "targetId": "target_correct", "effect": { "type": "scale", "duration": 0.2 } } },
        { "type": "success", "description": "ゲームクリア", "parameters": {} },
        { "type": "playSound", "description": "成功音", "parameters": { "soundId": "se_success" } }
      ],
      "purpose": "win-condition"
    },
    {
      "id": "tap_wrong",
      "name": "不正解タップ",
      "description": "不正解をタップしたら失敗",
      "targetObject": "target_wrong",
      "trigger": {
        "type": "touch",
        "description": "不正解をタップ",
        "parameters": {
          "target": "target_wrong",
          "touchType": "down"
        }
      },
      "actions": [
        { "type": "playSound", "description": "効果音", "parameters": { "soundId": "se_tap" } },
        { "type": "effect", "description": "エフェクト", "parameters": { "targetId": "target_wrong", "effect": { "type": "shake", "duration": 0.3 } } },
        { "type": "failure", "description": "ゲームオーバー", "parameters": {} },
        { "type": "playSound", "description": "失敗音", "parameters": { "soundId": "se_failure" } }
      ],
      "purpose": "lose-condition"
    },
    {
      "id": "timeout",
      "name": "タイムアウト",
      "description": "時間切れで失敗",
      "trigger": {
        "type": "time",
        "description": "5秒経過",
        "parameters": {
          "timeType": "exact",
          "seconds": 5
        }
      },
      "actions": [
        { "type": "failure", "description": "時間切れ", "parameters": {} },
        { "type": "playSound", "description": "失敗音", "parameters": { "soundId": "se_failure" } }
      ],
      "purpose": "lose-condition"
    }
  ],
  "audio": {
    "sounds": [
      { "id": "se_tap", "trigger": "タップ時", "type": "tap" },       // ★必須
      { "id": "se_success", "trigger": "成功時", "type": "success" }, // ★必須
      { "id": "se_failure", "trigger": "失敗時", "type": "failure" }  // ★必須
    ],
    "bgm": { "id": "bgm_main", "description": "...", "mood": "upbeat" }
  },
  "uiVisibility": {
    "touchTargetMinSize": "medium",
    "contrastRequirement": "high",
    "layoutStrategy": "distributed",
    "overlapPolicy": "prevent",
    "safeZone": { "top": 0.1, "bottom": 0.1, "left": 0.05, "right": 0.05 }
  },
  "feedbackSpec": {
    "triggers": [
      {
        "event": "tap",
        "visual": { "type": "scale", "intensity": "normal", "duration": 0.15 },
        "audio": { "soundId": "se_tap", "volume": "normal" }
      },
      {
        "event": "success",
        "visual": { "type": "particle", "intensity": "strong", "duration": 1.5 },
        "audio": { "soundId": "se_success", "volume": "high" }
      },
      {
        "event": "failure",
        "visual": { "type": "shake", "intensity": "normal", "duration": 0.5 },
        "audio": { "soundId": "se_failure", "volume": "normal" }
      }
    ]
  },
  "endingSpec": {
    "success": { "duration": 1.5, "effects": ["confetti", "flash"], "soundId": "se_success" },
    "failure": { "duration": 1.0, "effects": ["shake"], "soundId": "se_failure" },
    "transitionDelay": 2.0
  },
  "priorityDesign": {
    "rulePriorities": [
      { "ruleId": "check_win", "priority": 100, "reason": "勝利判定は最優先" },
      { "ruleId": "tap_target", "priority": 50, "reason": "基本操作" }
    ],
    "conflictResolution": "highest-priority",
    "notes": ["成功判定はカウンター増加後に評価される"]
  },
  "successPath": { "steps": [...], "verification": "..." },
  "specDecisions": [...]
}`;

export interface SpecificationGeneratorConfig {
  model?: string;
  dryRun?: boolean;
  apiKey?: string;
}

export class SpecificationGenerator {
  private client: Anthropic;
  private config: Required<Omit<SpecificationGeneratorConfig, 'apiKey'>>;
  private logger?: GenerationLogger;
  private tokensUsed: number = 0;

  constructor(config?: SpecificationGeneratorConfig, logger?: GenerationLogger) {
    this.client = new Anthropic({
      apiKey: config?.apiKey || process.env.ANTHROPIC_API_KEY
    });
    this.config = {
      model: config?.model || 'claude-sonnet-4-20250514',
      dryRun: config?.dryRun || false
    };
    this.logger = logger;
  }

  /**
   * ゲームデザインから仕様を生成
   */
  async generate(
    concept: GameConcept,
    design: GameDesign,
    assetPlan?: EnhancedAssetPlan
  ): Promise<GameSpecification> {
    this.logger?.logInput('SpecificationGenerator', 'design', {
      coreLoop: design.coreLoop?.description || 'unknown',
      objectCount: design.objects?.length || 0,
      interactionCount: design.interactions?.length || 0,
      hasAssetPlan: !!assetPlan
    });

    if (this.config.dryRun) {
      return this.generateMockSpec(concept, design, assetPlan);
    }

    const prompt = SPEC_PROMPT
      .replace('{{CONCEPT}}', JSON.stringify(concept, null, 2))
      .replace('{{DESIGN}}', JSON.stringify(design, null, 2))
      .replace('{{ASSET_PLAN}}', assetPlan ? JSON.stringify(assetPlan, null, 2) : 'なし');

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }]
    });

    this.tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const spec = this.extractAndParseJSON(content.text);

    // ログに記録（nullチェック付き）
    this.logger?.logSpecificationGeneration({
      objects: (spec.objects || []).map(o => ({ id: o.id, behavior: o.touchable ? 'interactive' : 'static' })),
      rules: (spec.rules || []).map(r => ({ trigger: r.trigger?.description || 'unknown', action: (r.actions || []).map(a => a.type).join(', ') })),
      successPath: (spec.successPath?.steps || []).join(' → '),
      decisions: (spec.specDecisions || []).map(d => `${d.aspect}: ${d.decision}`)
    });

    return spec;
  }

  /**
   * モック仕様生成（ドライラン用）
   */
  private generateMockSpec(
    concept: GameConcept,
    design: GameDesign,
    _assetPlan?: EnhancedAssetPlan
  ): GameSpecification {
    const designObjects = design.objects || [];
    const objects: ObjectSpecification[] = designObjects.map((obj, i) => ({
      id: obj.id,
      name: obj.name,
      visualDescription: obj.appearance,
      initialPosition: {
        x: 0.2 + (i % 3) * 0.3,
        y: 0.3 + Math.floor(i / 3) * 0.3
      },
      size: 'medium' as const,
      initiallyVisible: true,
      physicsEnabled: false,
      touchable: obj.role === 'target' || obj.role === 'collectible'
    }));

    const counters: CounterSpec[] = [];
    const targetObjects = objects.filter(o => o.touchable);
    if (targetObjects.length > 1) {
      counters.push({
        id: 'progress',
        name: '進捗',
        initialValue: 0,
        purpose: `タップした${targetObjects[0].name}の数を数える`,
        modifiedBy: targetObjects.map(o => `tap_${o.id}`),
        checkedBy: ['check_win']
      });
    }

    const rules: RuleSpecification[] = [];

    // タップルール
    targetObjects.forEach((obj, idx) => {
      rules.push({
        id: `tap_${obj.id}`,
        name: `${obj.name}タップ`,
        description: `${obj.name}をタップしたら消える`,
        targetObject: obj.id,
        trigger: {
          type: 'touch',
          description: `${obj.name}をタップ`,
          parameters: { target: 'self', touchType: 'down' }
        },
        actions: [
          { type: 'hide', description: 'オブジェクトを消す', parameters: { targetId: obj.id } },
          { type: 'playSound', description: '効果音', parameters: { soundId: 'se_tap' } },
          { type: 'effect', description: '拡大縮小エフェクト', parameters: { targetId: obj.id, effect: { type: 'scale', duration: 0.15 } } },
          ...(counters.length > 0 ? [{
            type: 'counter',
            description: 'カウンター+1',
            parameters: { counterName: 'progress', operation: 'increment' }
          }] : [])
        ],
        purpose: 'core-mechanic' as const
      });
    });

    // 勝利判定
    rules.push({
      id: 'check_win',
      name: '勝利判定',
      description: design.winCondition.description,
      trigger: counters.length > 0
        ? { type: 'counter', description: `カウンターが${targetObjects.length}に達した`, parameters: { counterName: 'progress', comparison: 'greaterOrEqual', value: targetObjects.length } }
        : { type: 'always', description: '常時チェック', parameters: {} },
      actions: [
        { type: 'success', description: 'ゲームクリア', parameters: {} },
        { type: 'playSound', description: '成功音', parameters: { soundId: 'se_success' } }
      ],
      purpose: 'win-condition' as const
    });

    // Priority設計を生成
    const rulePriorities: RulePrioritySpec[] = rules.map((rule, idx) => ({
      ruleId: rule.id,
      priority: rule.purpose === 'win-condition' ? 100 : rule.purpose === 'lose-condition' ? 90 : 50 - idx,
      reason: rule.purpose === 'win-condition' ? '勝利判定は最優先' :
              rule.purpose === 'lose-condition' ? '敗北判定は高優先' : '基本操作'
    }));

    return {
      objects,
      stateManagement: {
        counters,
        flags: []
      },
      rules,
      audio: {
        sounds: [
          { id: 'se_tap', trigger: 'タップ時', type: 'tap' },
          { id: 'se_success', trigger: '成功時', type: 'success' },
          { id: 'se_failure', trigger: '失敗時', type: 'failure' }
        ],
        bgm: {
          id: 'bgm_main',
          description: `${concept.theme}に合ったBGM`,
          mood: 'upbeat' as const
        }
      },
      // ★NEW: UI/視認性仕様
      uiVisibility: {
        touchTargetMinSize: 'medium',
        contrastRequirement: 'high',
        layoutStrategy: 'distributed',
        overlapPolicy: 'prevent',
        safeZone: { top: 0.1, bottom: 0.1, left: 0.05, right: 0.05 }
      },
      // ★NEW: フィードバック仕様
      feedbackSpec: {
        triggers: [
          {
            event: 'tap',
            visual: { type: 'scale', intensity: 'normal', duration: 0.15 },
            audio: { soundId: 'se_tap', volume: 'normal' }
          },
          {
            event: 'success',
            visual: { type: 'particle', intensity: 'strong', duration: 1.5 },
            audio: { soundId: 'se_success', volume: 'high' }
          },
          {
            event: 'failure',
            visual: { type: 'shake', intensity: 'normal', duration: 0.5 },
            audio: { soundId: 'se_failure', volume: 'normal' }
          }
        ]
      },
      // ★NEW: 終了演出仕様
      endingSpec: {
        success: {
          duration: 1.5,
          effects: ['confetti', 'flash'],
          soundId: 'se_success',
          message: 'クリア！'
        },
        failure: {
          duration: 1.0,
          effects: ['shake'],
          soundId: 'se_failure',
          message: '残念...'
        },
        transitionDelay: 2.0
      },
      // ★NEW: Priority設計
      priorityDesign: {
        rulePriorities,
        conflictResolution: 'highest-priority',
        notes: [
          '勝利判定はカウンター増加後に評価される',
          'タップルールは同時発火を許可'
        ]
      },
      successPath: {
        steps: [
          `プレイヤーが${targetObjects[0]?.name || 'オブジェクト'}をタップ`,
          ...(counters.length > 0 ? ['カウンターが増加'] : []),
          `全て消すと勝利`
        ],
        verification: 'タップ→非表示→カウンター→判定の流れが実現可能'
      },
      specDecisions: [
        {
          aspect: 'カウンター使用',
          decision: counters.length > 0 ? '使用する' : '使用しない',
          reasoning: counters.length > 0
            ? `${targetObjects.length}個のオブジェクトを数える必要があるため`
            : '数える必要がないため直接判定'
        },
        {
          aspect: 'フィードバック設計',
          decision: 'タップ時scale、成功時particle、失敗時shake',
          reasoning: '視覚的フィードバックで操作感を向上'
        }
      ]
    };
  }

  /**
   * JSONを抽出してパース
   */
  private extractAndParseJSON(text: string): GameSpecification {
    let jsonStr = text;

    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    } else {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
    }

    if (!jsonStr || !jsonStr.startsWith('{')) {
      throw new Error('No JSON found in response');
    }

    try {
      return JSON.parse(jsonStr) as GameSpecification;
    } catch (error) {
      let repaired = jsonStr;
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
      repaired = repaired.replace(/\/\/[^\n]*/g, '');

      try {
        return JSON.parse(repaired) as GameSpecification;
      } catch {
        this.logger?.logError('SpecificationGenerator', `JSON parse failed: ${error}`);
        throw new Error(`JSON parse failed: ${error}`);
      }
    }
  }

  /**
   * トークン使用量を取得
   */
  getTokensUsed(): number {
    return this.tokensUsed;
  }

  /**
   * デバッグ情報
   */
  getDebugInfo(): object {
    return {
      config: this.config,
      tokensUsed: this.tokensUsed
    };
  }
}

export default SpecificationGenerator;
