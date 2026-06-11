# WP11: プロンプトダイエット — 量産の多様性回復

**担当**: Opus / **依存**: なし / **想定規模**: M（1セッション）

---

以下をそのまま新しいOpusセッションに貼って実行する。

## 背景

Swizzle のAIゲーム量産パイプライン（src/ai/v2/）は、モデルが弱かった時代に「失敗させないための細かい指定」を積み上げた結果、プロンプトが肥大化し、**強くなった現行モデルの発想を縛って似たようなゲームばかり生まれる**状態になっている。

- `src/ai/v2/SpecificationGenerator.ts` の SPEC_PROMPT は**2,300行超**。「絶対禁止パターン」「正規4パターン（タップ判定/ドラッグ配置/スワイプ方向/長押しチャージ）への誘導」「counter目標値の細かい規定」などが大量に並ぶ
- `src/ai/v2/GameConceptGenerator.ts` の CONCEPT_PROMPT には「使いすぎ禁止パターン5種」「テーマ例の長大なリスト」「アーキタイプ7種のローテーション強制」がある
- 一方で品質の守りは既にプロンプト外に存在する: **類似度ゲート**（70%超類似を自動リジェクト）、**フェーズ層**（PhaseCompiler+グラフ検証）、**DryRunSimulator**（プレイ可能性ゲート）、**LogicValidator/LogicRepairer**、**公開ゲート**（スコア70未満は審査キュー）、**テスト354件**

つまり「プロンプトで縛らなくても、壊れたゲームは検証層が落とす」構造ができている。プロンプトは発想を広げる方向に振り直せる。

## やること

1. **制約の3分類を行う**。SPEC_PROMPT と CONCEPT_PROMPT の全セクションを次に分類した一覧表を最初に作り、作業ログとして `docs/work-plans/logs/11-classification.md` に残す:
   - **ハード制約（残す・簡潔に）**: エンジン上不可能なこと（物理演算なし・NPC AI移動なし・シングルタッチのみ）、自動検証で必ず落ちるもの（AUTO_SUCCESS等のエラーコード対応）、人間の操作限界（3タップ/秒）
   - **ソフト指針（短い例示に圧縮）**: 正規4パターン、duration目安、難易度チューニング → 「推奨」と明示し、強制表現（絶対/必ず/禁止）をやめる
   - **削除候補（モデルを信頼して削る）**: 使いすぎ禁止リストの羅列、長大なテーマ例リスト（themes.jsonからのコード側ランダム選択は維持）、冗長な重複警告
2. **lean版プロンプトを実装する**: `PROMPT_STYLE` 環境変数（`lean` | `classic`、デフォルト `classic` で後方互換）で切り替え。lean版は:
   - ハード制約: 箇条書き10項目以内に圧縮
   - フェーズ層の積極利用を促す（「多段階のアイデアは phases で自由に設計してよい。グラフ検証が守る」）
   - メカニクスカタログの**強制**を**インスピレーション提示**に変更（lean時のみ: 「カタログ外の新しいメカニクスも歓迎。ただし操作はタップ/スワイプ/ドラッグ/長押しの組み合わせで」）
   - 4つの明確性（目標/操作/判定/納得感）は維持（これはゲームの定義であり制約ではない）
3. **アーキタイプ強制の緩和**（lean時のみ）: GameConceptGenerator の `selectNextArchetype` 強制をやめ、「最近生成したゲームの操作タイプ分布」を提示して「偏りを避けて自由に発想せよ」に変える（GamePatternAnalyzer.generatePromptContext の既存出力を活用）
4. **A/B検証手順を README コメントに記載**: `PROMPT_STYLE=lean npm run ai:v2:1` ×5本 vs classic×5本 を実行し、ai:status とログで「総合スコア」「類似度ゲートのリジェクト率」「メカニクス/テーマの分布」を比較する手順

## やらないこと

- classic版プロンプトの削除（A/B比較が終わるまで両立させる）
- 類似度ゲート・フェーズ層・バリデータ・公開ゲートの変更（守りは触らない）
- mechanics-catalog.json の内容変更（選択方法のみ変更）
- contract.ts / rule-engine の変更

## 受け入れ基準

- `PROMPT_STYLE` 未設定時の動作が完全に従来通り（classic）
- `DRY_RUN=true PROMPT_STYLE=lean npm run ai:v2:1` が1試行で通過する
- lean版の SPEC_PROMPT 本文が classic 比で**50%以上短い**
- `npx tsc --noEmit --skipLibCheck` クリーン、`npm run test` 全件green
- 分類表（11-classification.md）がコミットされている

## 検証方法

1. `npm run test` / `npx tsc --noEmit --skipLibCheck`
2. `DRY_RUN=true PROMPT_STYLE=lean npm run ai:v2:1` → 正常終了
3. （APIキーがあれば）lean×3本を `SKIP_UPLOAD=true` で生成し、スコアと生成されたメカニクスの多様性を目視確認
4. 完了時: 成果サマリ5行+変更ファイル一覧を出力
