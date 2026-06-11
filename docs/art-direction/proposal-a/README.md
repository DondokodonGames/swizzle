# 案A — NEO-ARCADE（上質なダークアーケード）

> 現行アーケードテーマの「延長線上だが別物」。ネオンの安っぽさを捨て、筐体・CRT・スキャンラインの**質感**で高級感を出す、ダーク・プレミアム路線。

---

## コンセプト（約200字）

深夜のゲームセンター、最新筐体の前に立つ瞬間の高揚感。Swizzle を「手のひらの中の高級アーケード筐体」として再定義する。背景は限りなく黒に近いインク。ネオンは画面いっぱいに散らさず、**ヒーローカラー1色（エレクトリックシアン）だけ**を意図的に光らせ、スコアや金額には筐体のコインを思わせる琥珀ゴールドを添える。微細なスキャンラインと周辺減光（ヴィネット）で「ガラス越しのブラウン管」の手触りを再現。TikTok のフラットで使い捨てな質感、量産カジュアルゲームのパステルとは正反対の、**所有したくなる重厚さ**で差別化する。気分は「夜・没入・本気で上手くなりたい」。

---

## カラーパレット（ダークモード前提）

| 役割 | HEX | 用途 |
|------|-----|------|
| primary | `#00E5FF` | ヒーローネオン。CTA枠線・グロー・アクティブ状態（**多用厳禁、画面に1〜2か所**） |
| secondary | `#7C3AED` | ディープバイオレット。背景グラデ・サブ要素・アバター |
| accent | `#FFB800` | 琥珀ゴールド。スコア／コイン／ベスト記録など「価値」の表現 |
| background | `#0A0A12` | near-black ink（最下層） |
| surface | `#14141F` | 浮いたパネル・カード（+ `#1E1E2E` ボーダー） |
| text | `#ECECF5` | 主テキスト |
| text-muted | `#8A8AA0` | 補助テキスト・ラベル |
| success | `#2DD4A7` | クリア・ポジティブ |
| danger | `#FF4D6D` | いいね（ON）・残り時間わずか |

補助エフェクト: `--glow: 0 0 24px rgba(0,229,255,.45)` / スキャンライン `repeating-linear-gradient(rgba(0,0,0,.18) 0 1px, transparent 1px 3px)` / ヴィネット `radial-gradient(120% 80% at 50% 30%, transparent 55%, #000 130%)`。

---

## タイポグラフィ（Google Fonts・無料）

| 用途 | フォント | 指定 |
|------|----------|------|
| 見出し / ロゴ的表示 | **Chakra Petch** | 600–700。テクノな角ばりで筐体パネル感 |
| 本文 / UIラベル | **Inter** | 400–600。可読性で土台を締める |
| 数字（スコア・タイマー） | **Orbitron** | 700 + `font-variant-numeric: tabular-nums`。デジタルメーター感 |

読み込み: `Chakra+Petch:wght@500;600;700` / `Inter:wght@400;500;600` / `Orbitron:wght@600;700;800`

---

## UIモック

[`bridge-mock.html`](./bridge-mock.html) — スマホ幅390pxのBridgeScreen。スキャンライン・ヴィネット・ネオン枠・琥珀スコア・次ゲームプレビュー付き。

---

## ゲームアセット様式見本（WP23 art-direction.json の素材）

DALL-E プロンプトに差し込む**スタイル指定ブロック**。既存 `AssetGenerator.ts` の構造（背景は9:16・中央オープン／オブジェクトは白背景・単一）を踏襲。

**共通スタイルトークン:**
```
STYLE: "neo-arcade" — premium dark arcade cabinet aesthetic.
Bold neon-on-dark vector art, single dominant glow color (electric cyan #00E5FF),
amber-gold (#FFB800) reserved for valuable/score elements.
Crisp 2–3px outlines, subtle inner glow, deep near-black canvas (#0A0A12).
High contrast, confident, slightly futuristic. NOT pastel, NOT cute, NOT cluttered.
```

**背景（9:16・中央オープン）:**
```
Dark arcade ambiance: deep indigo-to-black gradient, faint scanline texture,
soft cyan rim-light at edges, occasional violet glow in corners.
Center MUST stay open and dark for overlaid sprites. No characters, no text.
Mood through neon glow and shadow only.
```

**オブジェクト（白背景・単一・切り抜き前提）:**
```
Single game object on pure white (#FFFFFF). Flat vector with a thin cyan
neon rim-light and crisp dark outline, as if glowing inside a dark cabinet.
Solid confident colors, minimal shading, large centered silhouette. No scene.
```

---

## 適用コスト評価

| 項目 | 評価 |
|------|------|
| DESIGN_TOKENS 変更量 | **中**。`primary` を青系→シアンネオンへ、`neutral` 系をインク基調に再マッピング。`secondary`(現グレー) をバイオレットへ。既存の階調構造は流用可 |
| 既存 `arcade-theme.css` | 流用度が最も高い（ネオン/グロー資産を磨いて再利用）。グローの「乱用」削減が主作業 |
| 実装リスク | **M**。ダーク前提なのでコントラスト確保は比較的容易だが、グロー/スキャンラインの多用はパフォーマンスと可読性に注意。`prefers-reduced-motion`/省電力での減光フォールバック必須 |
| ブランド距離 | 現行から最短。ユーザーの「ゼロベース」要求に対しては**最も保守的** |
