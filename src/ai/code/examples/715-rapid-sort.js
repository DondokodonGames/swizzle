// 715-rapid-sort.js
// ラピッドソート — 中央のアイテムを形で見分けて左右へ振り分ける
// 操作: 丸は左、四角は右。画面左右をタップ、または左右スワイプで仕分け
// 成功: 12個 正確に仕分ける  失敗: 3個 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、仕分け色は保持） ──
  var C = { bg:'#04060f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var LABEL_L = '#00cfff', LABEL_R = '#ff6600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'RAPID SORT';
  var HOW_TO_PLAY = 'ROUND GOES LEFT · SQUARE GOES RIGHT · TAP OR SWIPE TO SORT FAST';
  var MAX_TIME = 22;
  var NEEDED   = 12;         // 修正2: 40 → 12
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var ITEM_SIZE = 90, ITEM_X = W / 2, ITEM_Y = snap(H * 0.45), SPAWN_DELAY = 0.3;
  var ITEM_TYPES = ['round', 'angular'];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var currentItem, spawnTimer, score, errors, timeLeft, done, elapsed, flash, flashCol, resultText, resultTimer, slideAnim, swipeDone;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); var st = 8; for (var i = 0; i < size; i += st) { var w = size - i; if (dir === 'right') game.draw.rect(cx + i - size / 2, cy - w / 2, st, w, color, 0.5); else game.draw.rect(cx - i + size / 2 - st, cy - w / 2, st, w, color, 0.5); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#060810');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnItem() { currentItem = { type: ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)], x: ITEM_X, y: ITEM_Y, phase: Math.random() * Math.PI * 2 }; swipeDone = false; }

  function initGame() { currentItem = null; spawnTimer = 0; score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; slideAnim = null; swipeDone = false; spawnItem(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 100) : score * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function resolveSwipe(direction) {
    if (!currentItem || swipeDone || done) return;
    swipeDone = true;
    var correctDir = currentItem.type === 'round' ? 'left' : 'right', isCorrect = direction === correctDir;
    slideAnim = { x: currentItem.x, y: currentItem.y, vx: direction === 'left' ? -1200 : 1200, type: currentItem.type, life: 0.35, correct: isCorrect };
    if (isCorrect) {
      score++; flash = 0.2; flashCol = C.b; game.audio.play('se_tap', 0.1);
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = 'WRONG WAY!'; resultTimer = 0.4; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
    currentItem = null; spawnTimer = SPAWN_DELAY;
  }

  function drawScene() {
    game.draw.rect(0, H * 0.72, W * 0.42, H * 0.18, '#0f2d52', 0.8); pc(W * 0.21, H * 0.81, 50, LABEL_L, 0.7);
    arrow(W * 0.1, H * 0.24, 80, 'left', LABEL_L);
    game.draw.rect(W * 0.58, H * 0.72, W * 0.42, H * 0.18, '#2d0f14', 0.8); game.draw.rect(W * 0.7 - 40, H * 0.77, 80, 80, LABEL_R, 0.7);
    arrow(W * 0.9, H * 0.24, 80, 'right', LABEL_R);
    game.draw.line(W / 2, H * 0.2, W / 2, H * 0.72, '#ffffff0a', 2);
    if (currentItem) {
      var pulse = 0.9 + 0.1 * Math.sin(currentItem.phase * 3);
      if (currentItem.type === 'round') { pc(currentItem.x, currentItem.y, ITEM_SIZE * pulse, LABEL_L, 0.9); pc(currentItem.x - ITEM_SIZE * 0.3, currentItem.y - ITEM_SIZE * 0.3, ITEM_SIZE * 0.22, C.g, 0.3); }
      else { var sz = ITEM_SIZE * pulse; game.draw.rect(snap(currentItem.x - sz), snap(currentItem.y - sz), snap(sz * 2), snap(sz * 2), LABEL_R, 0.9); game.draw.rect(snap(currentItem.x - sz), snap(currentItem.y - sz), snap(sz * 2), 12, C.g, 0.22); }
    }
    if (slideAnim) {
      var sa = slideAnim, saAlpha = sa.life * 2;
      if (sa.type === 'round') pc(sa.x, sa.y, ITEM_SIZE, sa.correct ? C.b : C.a, saAlpha);
      else game.draw.rect(snap(sa.x - ITEM_SIZE), snap(sa.y - ITEM_SIZE), ITEM_SIZE * 2, ITEM_SIZE * 2, sa.correct ? C.b : C.a, saAlpha);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !currentItem || swipeDone) return;
    resolveSwipe(tx < W / 2 ? 'left' : 'right');
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || !currentItem || swipeDone) return;
    if (dir === 'left') resolveSwipe('left'); else if (dir === 'right') resolveSwipe('right');
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!currentItem) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.62, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SORTED CLEAN!' : 'MIXED BIN', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (spawnTimer > 0) { spawnTimer -= dt; if (spawnTimer <= 0 && !currentItem) spawnItem(); }
      if (!currentItem && spawnTimer <= 0) spawnItem();
      if (currentItem) currentItem.phase += dt * 2;
      if (slideAnim) { slideAnim.x += slideAnim.vx * dt; slideAnim.life -= dt * 3; if (slideAnim.life <= 0) slideAnim = null; }
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.64), 60, C.a);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#060810');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
