# AI ゲーム生成・評価プロセス

**最終更新**: 2025-12-20

---

## 1. 生成フロー概要

```
GameIdeaGenerator → ImageGenerator → SoundGenerator → LogicGenerator → ComplianceChecker → FunEvaluator → 合否判定
```

---

## 2. Step 1: GameIdeaGenerator

**ファイル**: `src/ai/generators/GameIdeaGenerator.ts`
**API**: Claude / GPT-4o-mini

### 入力
- 使用済みテーマリスト（重複回避用）
- 使用済みメカニクスリスト（重複回避用）

### プロンプト内容

```
あなたはスマホ向け10秒ゲームのゲームデザイナーです。
「遊び」を最優先に考えた、面白いゲームを設計してください。

# 🎯 最重要: 遊びの設計
1. プレイヤーに何をさせたいか？（目標）
2. プレイヤーは具体的に何をするか？（操作）
3. 成功と失敗はどう決まるか？（判定）

# 基本要件
- 制限時間: 5-15秒
- 画面: スマホ縦画面
- 操作: タッチのみ

# ❌ 絶対に作ってはいけないゲーム
1. 即成功ゲーム: 何かタップすれば即クリア
2. 操作不要ゲーム: 見てるだけでクリア
3. 目的不明ゲーム: 何すればいいかわからない
4. 失敗不可能ゲーム: どうやっても成功する
5. 運だけゲーム: スキルが関係ない
```

### 出力（GameIdea）

| フィールド | 説明 |
|-----------|------|
| title | ゲーム名（日本語、8文字以内） |
| titleEn | 英語タイトル |
| description | 何をするゲームか（20文字以内） |
| theme | 世界観 |
| visualStyle | minimal/cute/retro/neon/nature/space/underwater/abstract/geometric/pixel |
| mainMechanic | tap-target/tap-avoid/catch-falling など19種類 |
| playerGoal | プレイヤーが画面を見て思うこと |
| playerAction | プレイヤーが実際にする操作 |
| winCondition | 具体的な成功条件（数値を含む） |
| loseCondition | 具体的な失敗条件（数値を含む） |
| duration | 制限時間（5-15秒） |
| funScore | 自己評価（1-10） |

### チェック
- `funScore >= 7` でなければ再生成（最大3回）
- 重複テーマ/メカニクスは避ける

---

## 3. Step 2: ImageGenerator

**ファイル**: `src/ai/ImprovedMasterOrchestrator.ts` → `generateImagePrompts()`
**API**: DALL-E 3

### 入力
- idea.theme
- idea.titleEn
- idea.visualStyle
- idea.objectCount

### プロンプト生成（動的）

```typescript
// 背景
`${theme} themed game background, ${titleEn} style, mobile game asset, high quality illustration`

// オブジェクト
`game object for ${theme}, ${titleEn}, object ${i}, game sprite, transparent background, simple icon style`
```

### 出力
- 背景画像 1枚
- オブジェクト画像 N枚（objectCount分）

### コスト
- $0.04/枚 × (1 + objectCount)
- 例: 5オブジェクト → $0.24

---

## 4. Step 3: SoundGenerator

**ファイル**: `src/ai/generators/ImprovedSoundGenerator.ts`
**API**: Web Audio API（ローカル生成）

### 出力
- BGM 1曲
- 効果音（tap, success, failure, collect）

---

## 5. Step 4: ImprovedLogicGenerator

**ファイル**: `src/ai/generators/ImprovedLogicGenerator.ts`
**API**: Claude (claude-3-5-haiku)

### 入力
- GameIdea
- AssetReferences（オブジェクトID、効果音IDなど）

### システムプロンプト内容

**技術仕様**:
- 座標系: 正規化座標 0.0〜1.0
- 速度: 遅い(1-2) / 普通(2-4) / 速い(4-8) px/frame

**利用可能な条件タイプ**:
- touch, time, counter, collision, flag, random

**利用可能なアクションタイプ**:
- success, failure, hide, show, move, counter, addScore, effect, playSound, setFlag

**ルール設計の原則（プロンプトに記載）**:
- ルール数: 5-10個
- 条件数: 1ルールあたり1-2個
- アクション数: 1ルールあたり2-4個

### ユーザープロンプト内容

```
## ❌ 絶対に避けるべきパターン
1. 即成功: ゲーム開始時点でクリア条件を満たしている
2. 操作不要: プレイヤーが何もしなくてもクリアできる
3. 失敗不可能: loseConditionがない
4. 目標が不明瞭: 何をすればいいかわからない

## ✅ 必須チェックリスト
- クリア条件の数値は複数回操作で達成される
- 失敗条件が実際に発動しうる
- 初期状態ではクリア条件を満たしていない
```

### 出力（GameScript）
- layout（オブジェクト配置）
- counters（スコア、ミスなど）
- flags
- rules（ゲームロジック）

### コスト
- 約$0.006/ゲーム（Haiku使用時）

---

## 6. Step 5: SpecificationComplianceChecker

**ファイル**: `src/ai/checkers/SpecificationComplianceChecker.ts`
**現在の役割**: アドバイザリーのみ（合否に影響しない）

### チェック内容（100点満点）

| 項目 | 点数 | 内容 |
|------|------|------|
| メカニクス適合 | 0-30 | メカニクスに必須の条件/アクションがあるか |
| 勝利条件一致 | 0-25 | successアクションがあるか |
| 敗北条件一致 | 0-15 | failureアクションがあるか |
| 時間設定一致 | 0-10 | duration ±50%以内か |
| オブジェクト数一致 | 0-10 | objectCount ±3個以内か |
| ルール数一致 | 0-10 | estimatedRuleCount ±5個以内か |

### 合格条件（参考）
- score >= 60 かつ critical違反なし

---

## 7. Step 6: FunEvaluator【★ 合否判定 ★】

**ファイル**: `src/ai/checkers/FunEvaluator.ts`

### A. Playability Check（致命的問題検出）

| チェック | 検出内容 | 判定方法 |
|----------|----------|----------|
| hasInstantWin | 即成功 | counter初期値 >= 目標値、または条件なしでsuccess |
| requiresAction | 操作必須 | 成功パスにtouch条件があるか |
| canFail | 失敗可能 | failureアクションが発動しうるか |
| hasClearGoal | 明確なゴール | counter条件でのsuccessがあるか |

→ **1つでも問題あれば `isPlayable = false`**

### B. Fun Score（100点満点）

| 項目 | 点数 | 評価内容 |
|------|------|----------|
| dynamicElements | 0-20 | move/time/randomアクションの有無 |
| interactionQuality | 0-20 | タッチ条件の多様性、ターゲットの種類 |
| feedbackRichness | 0-20 | effect/playSoundの有無と数 |
| challengeBalance | 0-20 | duration設定の有無 |
| progressionClarity | 0-20 | counter/success/failureの有無 |

### スコア計算

```typescript
let funScore = dynamicElements + interactionQuality + feedbackRichness + challengeBalance + progressionClarity;

// 致命的問題がある場合
if (!playabilityCheck.isPlayable) {
  funScore = Math.min(funScore, 30); // 最大30点に制限
}
```

### 合格条件

```typescript
passed = funScore >= 50 && playabilityCheck.isPlayable
```

---

## 8. Step 7: 合格判定

**ファイル**: `src/ai/ImprovedMasterOrchestrator.ts:278`

```typescript
const passed = funResult.funScore >= 50;
```

### 合格時
- Supabaseにアップロード
- privateMode = true の場合は `is_published = false`

### 不合格時
- ログ出力のみ
- ゲームは破棄

---

## 9. コスト内訳（1ゲームあたり）

| ステップ | API | コスト |
|----------|-----|--------|
| GameIdeaGenerator | Claude/GPT-4o-mini | ~$0.002 |
| ImageGenerator | DALL-E 3 (5枚) | ~$0.20 |
| LogicGenerator | Claude Haiku | ~$0.006 |
| **合計** | | **~$0.21** |

---

## 10. 現在の問題点と改善提案

### 問題点

| 箇所 | 問題 |
|------|------|
| LogicGenerator | 「ルール5-10個」「条件1-2個」の制限が不要 |
| ComplianceChecker | オブジェクト数/ルール数/duration一致チェックが無意味 |
| FunEvaluator | dynamicElements/feedbackRichnessが静的ゲームに不利 |
| FunEvaluator | hasClearGoalがcounter条件のみを評価 |

### 改善提案

**合否判定のシンプル化**:

```typescript
const passed =
  hasSuccessAction &&      // 成功条件がある
  hasFailureAction &&      // 失敗条件がある
  !hasInstantWin &&        // 即成功しない
  requiresPlayerAction;    // 操作が必要
```

Fun Scoreは参考情報として残すが、合否には影響させない。
