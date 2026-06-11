# 案C — GALLERY（ミニマル・エディトリアル）

> 無彩色 + アクセント1色。UIは限界まで引き、**主役はゲーム画面そのもの**。デザイン誌／作品集のような佇まいで「センスの良さ」をブランド化する。

---

## コンセプト（約200字）

美術館のキャプション、雑誌の余白。Swizzle を「クリエイターの作品が並ぶギャラリー」として再定義する。UIは黒・白・グレーの無彩色に徹し、効かせる色は**ヴァーミリオン1色のみ**。罫線、グリッド、たっぷりの余白、タイポグラフィの強弱だけで構成し、装飾は足さない。スコアや作者名は静かに、しかし大きな級数で“編集”する。派手さで殴り合う TikTok・量産カジュアルの真逆を行き、**「ここに置かれる＝選ばれた作品」という価値**を演出。作者（クリエイター）に最大の敬意を払うトーンが、UGC プラットフォームとしての本気度を伝える。気分は「静か・洗練・作り手として誇らしい」。ライト基調を主、ダーク版も用意可。

---

## カラーパレット（ライト基調・ダーク版あり）

| 役割 | HEX | 用途 |
|------|-----|------|
| primary（accent） | `#FF3B1F` | ヴァーミリオン。**画面で効かせる唯一の色**（CTA・いいねON・強調の下線） |
| secondary | `#111111` | インク。見出し・主要テキスト・実線罫 |
| accent | `#FF3B1F` | primaryと同一（“1アクセント”原則） |
| background | `#FAFAF7` | 温かみのあるオフホワイト紙 |
| surface | `#FFFFFF` | カード（影は使わず**1px罫線**で領域分け） |
| text | `#111111` | 主テキスト |
| text-muted | `#6B6B6B` | キャプション・補助 |
| line | `#E6E6E0` | 罫線・区切り |
| （dark版） | bg `#0E0E0E` / surface `#161616` / text `#F2F2EC` / accent 同 | 反転運用 |

原則: **影を使わず罫線で構造を作る**／余白を恐れない／色面でなく級数・ウェイト・罫で階層を作る。

---

## タイポグラフィ（Google Fonts・無料）

| 用途 | フォント | 指定 |
|------|----------|------|
| 見出し / 表示 | **Fraunces** | 600–900。ハイコントラストなエディトリアル・セリフ（“雑誌の表紙”感） |
| 本文 / UIラベル | **Inter** | 400–600。中立で端正なグロテスク |
| 数字（スコア） | **Space Grotesk** | 500–700 + `tabular-nums`。等幅気味で“データ”として美しく並ぶ |

読み込み: `Fraunces:opsz,wght@9..144,600;9..144,800;9..144,900` / `Inter:wght@400;500;600` / `Space+Grotesk:wght@500;600;700`

---

## UIモック

[`bridge-mock.html`](./bridge-mock.html) — スマホ幅390pxのBridgeScreen。罫線構造・大級数スコア・ヴァーミリオン1点差し・次ゲームプレビュー付き。

---

## ゲームアセット様式見本（WP23 art-direction.json の素材）

**共通スタイルトークン:**
```
STYLE: "gallery" — minimal editorial, content-first.
Restrained near-monochrome palette with a SINGLE vermilion accent (#FF3B1F).
Clean flat shapes, generous negative space, confident simple silhouettes,
no gratuitous decoration. Refined, modern, gallery-quality. The object is
the subject. NOT busy, NOT neon, NOT cute-overloaded, NOT gradient-heavy.
```

**背景（9:16・中央オープン）:**
```
Minimal editorial background: warm off-white (#FAFAF7) or deep ink field,
optional faint baseline grid or a single thin rule line, vast negative space.
Center MUST stay completely open. At most one small vermilion accent shape
in a corner. No characters, no text. Calm, premium, museum-wall mood.
```

**オブジェクト（白背景・単一・切り抜き前提）:**
```
Single game object on pure white (#FFFFFF). Bold simple flat silhouette,
near-monochrome with selective vermilion accent on ONE key detail,
clean thin or no outline, no shadow, lots of breathing room.
Large centered, single object, no scene. Iconic and confident.
```

---

## 適用コスト評価

| 項目 | 評価 |
|------|------|
| DESIGN_TOKENS 変更量 | **中**。`neutral` 階調はほぼ流用可（既存が充実）。`primary` をヴァーミリオン1色へ、`secondary`(グレー) はインク基調へ寄せる。`shadows` を**未使用化**し `border`/`line` 主体へ運用転換（トークン削除ではなく使い方の変更） |
| 既存 `arcade-theme.css` | 破棄（思想が真逆）。ただし“引き算”なので新規CSS量は最小 |
| 実装リスク | **S〜M**。色数・装飾が少なく実装が最も軽量で破綻しにくい。リスクは「地味・冷たい」と受け取られる訴求力の弱さ（クリエイター向けには強いがライト層には弱い可能性）。ゲーム画面の派手さとUIの静けさのコントラストは**むしろ武器**になり整合しやすい |
| ブランド距離 | 現行から遠い（思想は真逆）が、実装は最軽量 |
