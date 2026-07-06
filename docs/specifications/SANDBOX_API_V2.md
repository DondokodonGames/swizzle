# SANDBOX API v2 — コードゲーム用チートシート

コードゲーム(`src/ai/code/examples/*.js`)が使える `game.*` API の全リファレンスとレシピ集。
実装の正は `src/services/code-game/iframeTemplate.ts`、型は `src/types/code-game/SwizzleGameAPI.ts`。
**ここに無いAPIは存在しない**(`window`/`document`/`localStorage`/`fetch`/`AudioContext` 直接使用は禁止・バリデーターで検出)。

キャンバスは **1080 x 1920 縦固定**。ゲームは `(function(game){ ... })(game);` のIIFE形式で書く。

## 基本(v1から不変)

```js
game.canvas.width / game.canvas.height   // 1080 / 1920
game.time.elapsed / game.time.delta      // 経過秒 / フレーム間秒
game.random(min, max)
game.onStart(fn)                         // 開始時1回
game.onUpdate(function(dt){...})         // 毎フレーム(描画もここで)
game.onTap(function(x, y){...})
game.onSwipe(function(dir){...})         // 'up'|'down'|'left'|'right'
game.onHold(function(x, y, duration){...}) // 400ms押しで1回発火
game.draw.clear(color)                   // 毎フレーム最初に呼ぶ
game.draw.rect(x, y, w, h, color, alpha?)
game.draw.circle(x, y, r, color, alpha?)
game.draw.text(str, x, y, {size, color, align, bold, font})
game.draw.line(x1, y1, x2, y2, color, width?)
game.draw.image(id, x, y, w, h, rotation?)  // アセット登録時のみ
game.end.success(score, stats?)          // stats は {goods: 5, ...} 任意
game.end.failure(stats?)
```

## 音 — WebAudioチップチューン合成(v2)

音声ファイル不要。全て実行時合成される。

```js
// 標準SE(プリセット、アセット不要で必ず鳴る)
game.audio.play('se_tap');        // 汎用タップ音
game.audio.play('se_good');      // 正解・有効な行動(上昇2音) ※se_correct も同じ
game.audio.play('se_bad');       // 不正解・悪手(下降ブザー)  ※se_wrong/se_miss も同じ
game.audio.play('se_success');   // クリア(上昇アルペジオ)
game.audio.play('se_failure');   // ゲームオーバー(下降)
game.audio.play('se_coin');      // コイン投入・獲得
game.audio.play('se_jump');      // ジャンプ(ピッチスライド)
game.audio.play('se_milestone'); // 中間目標達成
game.audio.play('se_powerup');   // 強化
game.audio.play('se_break');     // 破壊
// 第2引数は音量倍率: game.audio.play('se_good', 0.6)

// 単音合成(独自SE用)
game.audio.tone(660, 0.08, { wave: 'square', volume: 0.15 });
game.audio.tone('C5', 0.1, { wave: 'triangle', slide: 200 }); // 音名も可、slideはピッチ変化Hz

// プリセットBGM(ループ)
game.audio.bgm('bgm_main');   // 明るい(既定。未知IDもこれになる)
game.audio.bgm('bgm_tense');  // 緊迫
game.audio.bgm('bgm_cute');   // かわいい
game.audio.bgm('bgm_dark');   // 不穏
game.audio.stopBgm();

// ★推奨: ゲーム固有メロディ(世界観の音を作る)
// 音符 = [音名orHz, 拍数] / 'R' = 休符 / bass で2声
game.audio.melody([
  ['E5', 0.5], ['R', 0.5], ['G5', 0.5], ['E5', 0.5],
  ['C5', 1], ['D5', 1], ['E5', 2],
], {
  tempo: 140, wave: 'square', volume: 0.1, loop: true,
  bass: [['C3', 1], ['G2', 1], ['A2', 1], ['G2', 1]],
});
// loop:true で BGM として登録され stopBgm() で止まる
```

## 行動フィードバック(v2・最重要)

**プレイヤーの操作1回ごとに、その行動の結果を必ず返す。** 標準文法:

```js
game.onTap(function(x, y) {
  if (hitTarget(x, y)) {
    score++;
    game.feedback.good(x, y, { text: '+100' });     // 音+バースト+ポップアップ
  } else {
    misses++;
    game.feedback.bad(x, y);                          // ブザー+赤フラッシュ+シェイク+MISS
  }
});
```

オプション: `{ text, color, size, count, sound, volume, flashColor, shake }`。`text: null` でポップアップ非表示。
きめ細かく制御したいときは個別FX:

```js
game.fx.burst(x, y, { color: '#ffe600', count: 12, speed: 420 }); // パーティクル
game.fx.popup('1000m!!', 540, 400, { color: '#ffe600', size: 64 }); // 浮遊テキスト(マイルストーン等)
game.fx.flash('#ff0044', 0.2);   // 画面フラッシュ
game.fx.shake(14, 0.3);          // 画面シェイク(描画は自動で揺れる)
```

FXはエンジンが onUpdate の後に自動描画する(ゲーム側で描く必要なし)。

## 入力v2 — 押しっぱなし・ドラッグ・マルチタッチ

```js
game.input.pressing / game.input.x / game.input.y  // 主タッチの現在状態
game.onPress(function(x, y, id){...})    // 指が触れた
game.onMove(function(x, y, id){...})     // 動いた(ドラッグ・なぞり)
game.onRelease(function(x, y, id){...})  // 離れた
game.touches                              // [{id,x,y}] 全タッチ(2人対戦用)
```

## 描画v2 — スプライトとグラデーション

```js
// ピクセルアート(文字列ビットマップ+パレット)。'.' と ' ' は透明。キャッシュされ高速
var HERO = [
  '.YY.',
  'YYYY',
  '.BB.',
];
var PAL = { Y: '#ffe600', B: '#00cfff' };
game.draw.sprite(HERO, PAL, x, y, 16, { anchor: 'center', flipX: facingLeft });
// px=1ドットの描画サイズ。opts: {flipX, flipY, alpha, anchor:'center'|'topleft'}

// 縦グラデーション背景(黒一色禁止の受け皿)
game.draw.gradient(0, H, ['#182848', '#080810']);          // 等間隔
game.draw.gradient(0, H, [[0,'#301040'], [0.7,'#100818'], [1,'#000008']]); // 位置指定
```

## その他v2

```js
game.hit.circle(x1,y1,r1, x2,y2,r2)          // 円同士の当たり判定
game.hit.rect(x1,y1,w1,h1, x2,y2,w2,h2)      // 矩形同士
game.best                                     // このゲームの過去ベストスコア(数値、無ければ0)
```

`game.best` はATTRACT画面の HI-SCORE 表示に必ず使う(偽のハードコード値は禁止)。

---

# レシピ集

## 1. ATTRACT画面のピクセルロゴ + HI-SCORE

```js
var LOGO_FONT = { /* 5x7ビットマップをspriteの行として定義 */ };
// 簡易には draw.text の重ね打ちで縁取りロゴ:
function logoText(str, x, y, sz, col, shadow) {
  game.draw.text(str, x + 4, y + 4, { size: sz, color: shadow || '#000', bold: true });
  game.draw.text(str, x, y, { size: sz, color: col, bold: true });
}
// ATTRACT内:
logoText(GAME_TITLE, W/2, H*0.10, 84, '#ffe600', '#b88000');
game.draw.text('HI-SCORE ' + game.best, W/2, H*0.16, { size: 36, color: '#00ff9f' });
if (Math.floor(game.time.elapsed * 2) % 2 === 0)
  game.draw.text('► 100円 投入 ◄ TAP TO START', W/2, H*0.30, { size: 40, color: '#ff2079' });
```

## 2. カメラ縦スクロール(登る/落ちる系)

カメラ専用APIはない。**ワールド座標 - カメラY** の1行で描く:

```js
var cameraY = 0;
// 追従: プレイヤーが画面上部38%より上に行ったらカメラを上げる
if (player.y - cameraY < H * 0.38) cameraY = player.y - H * 0.38;
// 描画: すべてのワールドオブジェクトは
var screenY = obj.y - cameraY;
if (screenY > -50 && screenY < H + 50) game.draw.circle(obj.x, screenY, obj.r, col);
// 高度 = Math.round(-cameraY / 8) など。マイルストーンは fx.popup + se_milestone
```

## 3. 歩行/羽ばたきアニメ(2〜4フレーム)

```js
var FRAMES = [SPRITE_A, SPRITE_B, SPRITE_C, SPRITE_B]; // 文字列ビットマップの配列
var f = Math.floor(game.time.elapsed * 8) % FRAMES.length;
game.draw.sprite(FRAMES[f], PAL, x, y, 12, { anchor: 'center', flipX: vx < 0 });
```

## 4. 押しっぱなし移動(bird_jump型 左右ホールド)

```js
game.onUpdate(function(dt) {
  if (game.input.pressing) {
    var dir = game.input.x < W / 2 ? -1 : 1;
    player.x += dir * 900 * dt;
  }
});
```

## 5. スリングショット(引いて離す)

```js
var drag = null;
game.onPress(function(x, y) { drag = { x0: x, y0: y, x: x, y: y }; });
game.onMove(function(x, y) { if (drag) { drag.x = x; drag.y = y; } });
game.onRelease(function(x, y) {
  if (!drag) return;
  var vx = (drag.x0 - x) * 4, vy = (drag.y0 - y) * 4; // 引いた逆方向へ発射
  launch(vx, vy);
  game.audio.play('se_jump');
  drag = null;
});
// 描画: drag中はゴムひもを game.draw.line で見せる(操作の結果予告=フィードバック)
```

## 6. なぞる/切る(trace / slice)

```js
var trail = [];
game.onMove(function(x, y) {
  trail.push({ x: x, y: y, t: game.time.elapsed });
  // 直近の移動線分と対象の当たり判定 → 切れたら feedback.good
});
game.onUpdate(function(dt) {
  trail = trail.filter(function(p){ return game.time.elapsed - p.t < 0.25; });
  for (var i = 1; i < trail.length; i++)
    game.draw.line(trail[i-1].x, trail[i-1].y, trail[i].x, trail[i].y, '#ffffff', 6);
});
```

## 7. 2人対戦(1台・上下分割/マリオパーティ型)

```js
// 上半分=P2(上下逆に配置)、下半分=P1。タッチのy座標で振り分け
game.onPress(function(x, y, id) {
  if (y > H / 2) p1Act(x, y); else p2Act(x, y);
});
// game.touches で同時押し状態も見られる(早押し・連打対戦)
```

## 8. 時代別スタイルパック(ARCADE_ART_DIRECTION.md 参照)

各ゲームは1つ選び、パレット宣言をファイル冒頭に置く:

```js
// スタイル: 80s NEON (パックマン/ギャラガ系)
var STYLE = {
  bg: ['#000010', '#000030'],                   // gradient用
  main: ['#00ffff', '#ff00ff', '#ffff00'],      // 基調3色
  accent: ['#ff8800', '#ffffff'],               // アクセント2色
};
```

## 9. 8pxグリッドドット絵ヘルパー(既存標準の継続)

```js
function snap(v) { return Math.round(v / 8) * 8; }
function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }
```

## 10. 結果画面の統計 + NEW RECORD

```js
// RESULT状態で:
game.draw.text(resultSuccess ? 'CLEAR!' : 'GAME OVER', W/2, H*0.35, { size: 72, color: resultSuccess ? '#00ff9f' : '#ff2079', bold: true });
game.draw.text('SCORE ' + finalScore, W/2, H*0.46, { size: 56, color: '#ffffff' });
game.draw.text('BEST  ' + Math.max(game.best, finalScore), W/2, H*0.52, { size: 36, color: '#ffe600' });
if (finalScore > game.best && game.best > 0) game.fx.popup('NEW RECORD!', W/2, H*0.28, { color: '#ffe600', size: 72 });
// 終了時に統計を渡す(BridgeScreenやランキングの材料):
game.end.success(finalScore, { hits: hits, misses: misses, maxCombo: maxCombo });
```
