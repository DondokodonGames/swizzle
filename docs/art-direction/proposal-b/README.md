# 案B — JELLY POP（ライト&ポップ）

> 明るい・丸い・ジューシー。Royal Match / Duolingo 系の量産カジュアルアプリの「気持ちよさ」を Swizzle に。指で押したくなる、ぷるぷるしたUI。

---

## コンセプト（約200字）

おやつの時間、信号待ちの30秒。気軽につまんで、笑って、もう一回。Swizzle を「ポケットの中の駄菓子屋」として再定義する。背景はやわらかいピーチクリーム、カードは真っ白でふっくら、影は濃いめに落として**立体的なグミ**のような厚みを出す。ボタンは押すと沈む3Dプッシュ。色はバブルガムピンク・ミント・サニーイエローの三原色キャンディ。スコアは大きく丸く、紙吹雪と一緒に「ジューシー」に弾ける。ダークで尖ったゲーマー像とは逆を行き、**誰でも・明るく・かわいい**を最大化。TikTok の無機質さに対し「触り心地」で、量産カジュアルに対しては「作って共有できる」独自性で戦う。気分は「昼・軽い・また遊びたい」。

---

## カラーパレット（ライトモード前提）

| 役割 | HEX | 用途 |
|------|-----|------|
| primary | `#FF5A8A` | バブルガムピンク。メインCTA・いいね |
| secondary | `#3DD6C4` | ミントターコイズ。サブアクション・次ゲーム |
| accent | `#FFC93C` | サニーイエロー。スコア・スター・ハイライト |
| background | `#FFF4EC` | ピーチクリーム（最下層） |
| surface | `#FFFFFF` | 白カード（濃いソフトシャドウで浮かせる） |
| text | `#2B2D42` | やわらかいダークネイビー主テキスト |
| text-muted | `#9094A6` | 補助テキスト |
| success | `#2BC275` | クリア |
| shadow | `rgba(43,45,66,.14)` | 立体感のキー（厚めに使う） |

質感の鍵: **太く濃いソフトシャドウ + 内側ハイライト + 大きい角丸（20–28px）**。ボタンは下辺に濃い影色のフチ（`box-shadow: 0 4px 0 #E0457A`）を付け、押下で `translateY` させる“3Dプッシュ”。

---

## タイポグラフィ（Google Fonts・無料）

| 用途 | フォント | 指定 |
|------|----------|------|
| 見出し | **Fredoka** | 600–700。丸ゴシックでフレンドリー |
| 本文 / UIラベル | **Nunito** | 400–700。丸みのある高可読サンセリフ |
| 数字（スコア） | **Baloo 2** | 700–800。ぷっくり太い数字で“ジューシー”さ最大化 |

読み込み: `Fredoka:wght@500;600;700` / `Nunito:wght@400;600;700;800` / `Baloo+2:wght@600;700;800`

---

## UIモック

[`bridge-mock.html`](./bridge-mock.html) — スマホ幅390pxのBridgeScreen。紙吹雪・3Dプッシュボタン・ぷっくりスコア・次ゲームプレビュー付き。

---

## ゲームアセット様式見本（WP23 art-direction.json の素材）

**共通スタイルトークン:**
```
STYLE: "jelly-pop" — bright, rounded, juicy casual mobile game art.
Glossy candy colors (bubblegum pink #FF5A8A, mint #3DD6C4, sunny yellow #FFC93C),
chunky rounded shapes, soft inner highlight (gummy/3D candy look),
thick soft drop shadow, friendly and cute. Light, cheerful, high saturation.
NOT dark, NOT neon, NOT realistic, NOT edgy.
```

**背景（9:16・中央オープン）:**
```
Bright cheerful background: soft peach-cream to pastel gradient,
playful confetti / polka-dots / rounded blobs only at the corners,
gentle bokeh sparkles. Center MUST stay open and light for sprites.
No characters, no text. Sweet, airy, candy-shop mood.
```

**オブジェクト（白背景・単一・切り抜き前提）:**
```
Single game object on pure white (#FFFFFF). Chunky rounded vector with a
glossy gummy highlight on top, thick soft drop shadow below, candy-bright
solid colors, cute proportions, no outline or very soft outline.
Large centered, single object, no scene.
```

---

## 適用コスト評価

| 項目 | 評価 |
|------|------|
| DESIGN_TOKENS 変更量 | **大**。ダーク基調の現行から**ライトモードへ全面転換**。`primary`(青)→ピンク、角丸を全体的に増（md=6px→12px級へ）、シャドウを厚いソフト影に差し替え。タイポも総入れ替え |
| 既存 `arcade-theme.css` | ほぼ破棄（ネオン/グロー資産は不適合） |
| 実装リスク | **M〜L**。ライト基調はゲーム画面（暗い/派手なPixiJSキャンバス）との明暗コントラストが課題。BridgeはUI主役なので相性良いが、GameSequence全画面との往復で“眩しさのギャップ”をどう設計するか要検証。3Dプッシュの当たり判定・アクセシビリティ配慮も必要 |
| ブランド距離 | 現行から最も遠い。集客力（万人受け・かわいさ）は最大 |
