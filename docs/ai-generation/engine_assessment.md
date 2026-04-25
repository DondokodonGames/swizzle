# Swizzle エンジン改修調査 — WebGL 対応 実現可能性・工数見積もり

> 調査日: 2026-04-25  
> 対象コード: 262 TypeScript ファイル、約 99,511 LOC

---

## 1. 現状の技術スタック

### レンダリング

| 項目 | 現状 |
|------|------|
| 描画 API | **HTML5 Canvas 2D** (`canvasElement.getContext('2d')`) |
| WebGL | **未使用** |
| PixiJS | package.json に記載があるが **import が 0 件**（dead dependency） |
| 解像度 | 固定 1080×1920px（9:16 縦型モバイル） |
| FPS | requestAnimationFrame による 60fps ターゲット（実測 45〜55fps） |
| 描画担当ファイル | `src/services/editor/EditorGameBridge.ts` |

### ルールエンジン

`src/services/rule-engine/` 以下、計約 3,587 LOC。描画と完全分離されている。

| ファイル | 役割 |
|----------|------|
| RuleEngine.ts (392 LOC) | ルール実行オーケストレーション |
| ConditionEvaluator.ts (707 LOC) | touch / collision / time / counter / flag / random など 8+ 条件 |
| ActionExecutor.ts (950 LOC) | move / effect / counter / flag / sound など 15+ アクション |
| PhysicsManager.ts (169 LOC) | 重力・速度・衝突応答（基本的な AABB のみ） |
| CollisionDetector.ts (294 LOC) | AABB ヒットボックス検出 |
| EffectManager.ts (323 LOC) | パーティクル・シェイク・フラッシュ等の視覚エフェクト |
| AnimationManager.ts (181 LOC) | フレームアニメーション |
| CounterManager.ts (237 LOC) | ゲーム内カウンター |
| FlagManager.ts (123 LOC) | ブールフラグ |

### 埋め込み方式

**iframe なし、sandbox なし**。React コンポーネントから直接 `<canvas>` 要素を渡して `EditorGameBridge.executeGame()` を呼び出す構造。

```
GameSequence.tsx
  └── canvasRef (HTMLCanvasElement)
        └── EditorGameBridge.executeGame(project, canvasElement)
```

### アセット形式

すべての画像が **Base64 data URL** として GameProject JSON に保存。毎フレーム `ctx.drawImage()` で描画しており、テクスチャキャッシュ・アトラス化は未実装。

---

## 2. 現在できないこと（制限リスト）

| 制限 | 詳細 |
|------|------|
| ピクセルパーフェクト衝突 | AABB のみ実装。`checkMode: 'pixel'` はスタブ |
| 多方向重力 | 常に下方向。方向変更は未実装 |
| オブジェクト間物理 | 衝突応答で押し返し・反射なし |
| マルチタッチ | `touches[0]` のみ。ピンチ等は不可 |
| pause / restart アクション | スタブのみ、実装なし |
| イージング付き移動 | 直線移動のみ（加速度なし） |
| アニメーション loopCount | カウントは未実装 |
| パーティクル上限 | CPU 描画のため実質 100 個程度で重くなる |
| 外部ゲーム（Unity 等）の埋め込み | 現構造では不可（iframe でのプラグイン機構なし） |

---

## 3. WebGL 対応にするための改修内容

### 改修の中心ファイル

`EditorGameBridge.ts` の Canvas 2D 描画部分（約 600 LOC）を WebGL レンダラーに置き換えるのがメイン作業。ルールエンジンは描画に依存していないため **ほぼ変更不要**。

### 推奨アーキテクチャ

**スタンドアロン WebGL モジュール**（既存の dead dependency を使わず新規作成）

```typescript
// src/services/renderer/WebGLRenderer.ts
export class WebGLRenderer implements IRenderer {
  private gl: WebGL2RenderingContext;
  render(state: GameState, dt: number): void { ... }
  drawSprite(tex, x, y, scale): void { ... }
  drawParticles(particles): void { ... }
}
```

同一インターフェースを Canvas 2D 版と WebGL 版で実装し、フィーチャーフラグで切り替え可能にする。

### 変更が必要なファイル（全体の 15〜20%）

| ファイル | 変更内容 | 難易度 |
|----------|----------|--------|
| `EditorGameBridge.ts` | Canvas 2D → WebGL レンダラー呼び出しに切り替え | 中 |
| `src/services/renderer/WebGLRenderer.ts` | 新規作成（スプライト・パーティクル・エフェクト） | 高 |
| `PhysicsManager.ts` | 将来的に GPU 空間ハッシュ化（Phase 2 以降） | 中 |
| `EffectManager.ts` | GPU パーティクルシステムへの移行 | 中 |
| アセット読み込みユーティリティ | Base64 → WebGL テクスチャへの変換 | 低 |

### sandbox 属性の変更で済むか

**No**。現在 iframe を使っていないため sandbox は無関係。WebGL 対応は Canvas 要素の `getContext('2d')` → `getContext('webgl2')` への変更と、それに伴うシェーダー・テクスチャ管理の新規実装が必要。

### Unity ゲームをそのまま配信できるか

**現状の構造では不可**。Unity WebGL ビルドを配信するには iframe 経由のプラグイン機構が必要で、別途「外部ゲーム埋め込み基盤」の設計が必要（今回の WebGL 改修スコープ外）。

---

## 4. 工数・コスト見積もり

### フェーズ別工数

| フェーズ | 内容 | 工数目安 |
|----------|------|----------|
| Phase 1: 設計・調査 | WebGL レンダラー設計、シェーダー設計、テクスチャ戦略 | 2 週間 |
| Phase 2: WebGL レンダラー実装 | スプライト描画、パーティクル GPU 化、エフェクト移植 | 6〜8 週間 |
| Phase 3: 物理・衝突の強化 | GPU 空間ハッシュ、衝突応答改善 | 3〜4 週間 |
| Phase 4: アセットパイプライン変換 | Base64 → テクスチャアトラス化 | 2〜3 週間 |
| Phase 5: テスト・最適化 | クロスブラウザ、モバイル、Canvas 比較 | 3〜4 週間 |
| Phase 6: ロールアウト | フィーチャーフラグ、段階リリース | 2 週間 |
| **合計** | | **4〜6 ヶ月** |

### 外注コスト概算（日本フリーランス相場）

| 想定エンジニア | 単価 | 期間 | 費用 |
|--------------|------|------|------|
| WebGL / グラフィクスエンジニア（上級） | 150〜200 万円/月 | 4〜6 ヶ月 | 600〜1,200 万円 |
| TypeScript フロントエンド（中級） | 80〜120 万円/月 | 3〜4 ヶ月 | 240〜480 万円 |
| QA エンジニア | 50〜70 万円/月 | 2〜3 ヶ月 | 100〜210 万円 |
| **合計概算** | | | **940〜1,890 万円** |

> 注: WebGL 専門エンジニアは市場で希少。確保に 1〜2 ヶ月かかる可能性あり。

### Claude Code を使って自力でやる場合

| フェーズ | 現実的な工数 |
|----------|------------|
| WebGL レンダラー実装（Claude Code 主導） | 2〜4 週間（実装は速いが GPU バグ調査に時間） |
| クロスブラウザ・モバイルデバッグ | 2〜3 週間（Claude Code では難しい部分） |
| テスト・最適化 | 2〜3 週間 |
| **合計** | **6〜10 週間（実質 2〜3 ヶ月）** |

コストは API 費用のみ。ただし WebGL の GPU バグ（モバイル Safari での精度問題、テクスチャ圧縮の互換性等）はデバッグが難しく、実際には外注より時間がかかる可能性がある。

---

## 5. クラウドゲーミングとの親和性

### ubitus 等との相性

| 項目 | 現状 | WebGL 改修後 |
|------|------|------------|
| レンダリング方式 | CPU（Canvas 2D） | GPU（WebGL） |
| クラウドゲーミング対応 | △（低い）| ○（向上するが根本解ではない） |
| 遅延 | 問題なし（ローカル実行） | 変わらず |
| スケーラビリティ | ゲームごとに独立 | 変わらず |

クラウドゲーミング（ストリーミング配信）の本質は「サーバー側でゲームを動かして映像をストリーミングする」仕組みで、WebGL 対応とは独立した取り組み。Swizzle を ubitus に乗せるには、**ゲームを単体で動作する独立バイナリ（WebGL ビルド or ネイティブ）として書き出せる**ようにする必要があり、これは今回のブラウザ内 WebGL 改修とは別軸の作業になる。

### 外部開発者（Developer）の参入しやすさ

WebGL 改修だけでは外部開発者の参入は増えない。参入しやすくするには以下が必要：

1. **ゲームプロジェクト JSON の公開仕様**（既に `docs/specifications/` にある）
2. **プレイヤー SDK の提供**（iframe で外部から `GameProject` を渡せる API）
3. **テンプレート・サンプル集の整備**

WebGL 改修後に「より表現力の高いゲームが作れる」という訴求はできるが、参入障壁の低減には仕様公開・ドキュメント整備の方が即効性が高い。

---

## 6. 推奨アクション

### A: エンジン改修（WebGL 対応）vs B: 現状でテンプレ量産

| | A: WebGL 改修 | B: テンプレ量産 |
|---|---|---|
| 着手コスト | 高（940〜1,890 万円 or 2〜3 ヶ月） | 低（AI 生成コストのみ） |
| 効果発現 | 4〜6 ヶ月後 | 即時 |
| ユーザー体験への影響 | パーティクル・物理が豊かになる | 現状のルールベースゲームが量産される |
| リスク | WebGL 専門知識が必要 | ゲーム品質のばらつきが残る |

### 推奨順序

**B → A の順序が現実的**

1. **まず B（テンプレ量産）**: 現在の AI 生成パイプラインをチューニングして、安定してゲームが生成される状態にする。ユーザーに価値を届けながら収益基盤を作る。

2. **並行してクイックウィン**: WebGL 全面移行の前に以下のみ実施すると費用対効果が高い：
   - テクスチャアトラス化（2 週間）→ 描画速度 20% 向上
   - GPU パーティクル（3 週間）→ エフェクトが 10 倍豊かに

3. **その後 A（WebGL 本格移行）**: B で収益が安定した段階で投資判断。モバイルユーザーが 40% 以上であれば ROI が出やすい。

### WebGL を先にやるべき場合

- 現在の Canvas 2D では要件を満たせない表現（多数パーティクル、3D 的演出等）が必要な場合
- ubitus 等との連携が確定している場合（その場合は独立ビルド化も同時に設計する必要あり）

---

## 7. ブラウザ対応マトリクス

| ブラウザ | WebGL 1.0 | WebGL 2.0 |
|---------|-----------|-----------|
| Chrome（デスクトップ・Android） | ✅ | ✅ |
| Firefox | ✅ | ✅ |
| Safari（macOS） | ✅ | ✅ |
| iOS Safari | ✅ | ⚠️（部分対応） |
| Edge | ✅ | ✅ |

推奨: **WebGL 2.0 をメイン、WebGL 1.0 フォールバック**（カバレッジ 95%+）

---

*本ドキュメントは `src/ai/v2/ENGINE_CAPABILITIES.md`、`docs/specifications/swizzle_engine_specification_v2.md`、および `src/services/editor/EditorGameBridge.ts` 等のソースコード直接調査に基づく。*
