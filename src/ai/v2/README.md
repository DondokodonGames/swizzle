# AI v2 生成パイプライン — プロンプトスタイル（`PROMPT_STYLE`）

9ステップの生成パイプライン（Concept → Design → AssetPlan → Spec → EditorMapper →
LogicValidator → LogicRepairer → AssetGenerator → DryRunSimulator → QualityScorer）。

## `PROMPT_STYLE` 環境変数（WP11: プロンプトダイエット）

コンセプト生成（`GameConceptGenerator`）と仕様生成（`SpecificationGenerator`）の
プロンプトを切り替える。

| 値 | 挙動 |
|----|------|
| `classic`（既定・未設定時） | 従来の肥大プロンプト。後方互換のため挙動は一切変えない。 |
| `lean` | ハード制約だけを簡潔に提示する軽量プロンプト。使いすぎ禁止リスト・長大なテーマ例・アーキタイプ強制を外し、フェーズ層の自由活用とカタログ外メカニクスを歓迎する。 |

`lean` でも守りは不変（類似度ゲート70% / PhaseCompiler+グラフ検証 / DryRunSimulator /
LogicValidator・LogicRepairer / 公開ゲート）。「壊れたゲームは検証層が落とす」前提で、
プロンプトは発想を広げる方向に振る。設計根拠は
`docs/work-plans/logs/11-classification.md`（制約の3分類表）を参照。

lean が classic と変える点:
- コンセプト: 操作タイプ（アーキタイプ）の強制ローテーションをやめ、「最近生成したゲームの
  傾向」を提示して偏り回避を促す。メカニクスカタログは「強制」から「インスピレーション提示」へ。
  テーマの themes.json からのコード側ランダム選択は **維持**。
- 仕様: ハード制約を箇条書き10項目以内に圧縮。フェーズ層の積極利用を明示的に促す。
  出力契約（JSONスキーマ）と4つの明確性は維持。

## A/B 検証手順

lean が「多様性を回復しつつ品質を落とさない」かを classic と比較して確認する。

```bash
# classic 5本（ベースライン。アップロードしない）
SKIP_UPLOAD=true PROMPT_STYLE=classic npm run ai:v2:1   # ×5回、または
SKIP_UPLOAD=true PROMPT_STYLE=classic npm run ai:v2 5

# lean 5本
SKIP_UPLOAD=true PROMPT_STYLE=lean npm run ai:v2 5

# 進捗・品質統計を確認
npm run ai:status
```

各ランの生成ログ（`GenerationLogger` 出力）と `ai:status` を突き合わせ、以下を比較する:

1. **総合スコア（QualityScorer）**: lean の平均スコアが classic から大きく下がっていないか
   （目安: -5pt 以内）。公開ゲート（既定70未満は pending_review）通過率も見る。
2. **類似度ゲートのリジェクト率**: lean で「70%超類似」による再生成・リジェクトが
   増えていないか（多様性が回復していれば下がるはず）。
3. **メカニクス／テーマの分布**: `playerOperation` の操作タイプ分布とテーマ分布を集計し、
   lean の方が広がっている（特定パターンへの収束が緩んでいる）ことを確認する。
   `GameConceptGenerator.getDebugInfo()` の `usedMechanics` も参考になる。

DRY_RUN ではモック経路を通りプロンプトは評価されないため、A/B は実APIキー
（`ANTHROPIC_API_KEY`）を設定して実施する。配線確認だけなら:

```bash
DRY_RUN=true PROMPT_STYLE=lean npm run ai:v2:1   # 正常終了すること
```

classic 版プロンプトは A/B 比較が完了するまで削除しない（両立させる）。
