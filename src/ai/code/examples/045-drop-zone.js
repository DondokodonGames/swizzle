// 045-drop-zone.js
// ドロップゾーン — 落下するアイテムを正しい容器に振り分ける仕分け師の判断力
// 操作: スワイプ左右で容器を選ぶ、タップで受け取り確定
// 成功: 1個正しく分類  失敗: 3回誤分類 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'DROP ZONE';
  var HOW_TO_PLAY = 'SWIPE L/R, TAP TO SORT';
  var MAX_TIME = 20;
  var NEEDED = 1;            // 修正2: 10 → 1
  var MAX_MISS = 3;
  var BIN_W = 340, BIN_H = 220, BIN_Y = H * 0.76;   // 修正1: 容器は下部
  var BIN_A_X = W * 0.2 - BIN_W / 2, BIN_B_X = W * 0.8 - BIN_W / 2;
  var ITEM_R = 68, DROP_SPEED = 440;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var item, activeBin, score, misses, timeLeft, done, feedback, feedbackOk, feedbackX;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function initGame() { score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; feedbackX = W / 2; spawnItem(); }
  function spawnItem() { item = { x: W * 0.3 + Math.random() * W * 0.4, y: -ITEM_R * 2, vy: DROP_SPEED, type: Math.random() < 0.5 ? 'A' : 'B' }; activeBin = 0; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function registerMiss() { misses++; feedback = 0.4; feedbackOk = false; feedbackX = item ? item.x : W / 2; game.audio.play('se_failure', 0.6); item = null; if (misses >= MAX_MISS) finish(false); else setTimeout(spawnItem, 400); }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || !item) return;
    if (dir === 'left') activeBin = 0; if (dir === 'right') activeBin = 1;
    game.audio.play('se_tap', 0.35);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || !item) return;
    var correct = (item.type === 'A' ? 0 : 1) === activeBin;
    feedback = 0.4; feedbackOk = correct; feedbackX = item.x;
    if (correct) { score++; game.audio.play('se_tap', 0.8); if (score >= NEEDED) { finish(true); return; } item = null; setTimeout(spawnItem, 400); }
    else registerMiss();
  });

  // 世界観: 仕分け工場のコンベア。●は左箱(A)、■は右箱(B)へ振り分ける。
  function background() {
    game.draw.clear('#000011');
    // コンベアの支柱
    for (var gx = 0; gx < W; gx += 120) game.draw.rect(gx, BIN_Y - 40, 8, 40, '#333355');
    game.draw.rect(0, BIN_Y - 8, W, 8, C.d, 0.3);
    txt('SORTING PLANT', W / 2, H * 0.1, 36, C.b);
  }

  function drawBin(x, isActive, col, sym, label) {
    game.draw.rect(snap(x), snap(BIN_Y), BIN_W, BIN_H, col, isActive ? 0.9 : 0.4);
    game.draw.rect(snap(x), snap(BIN_Y), BIN_W, 12, C.g, isActive ? 1 : 0.4);
    txt(sym, x + BIN_W / 2, BIN_Y + BIN_H / 2, 90, C.g);
    txt(label, x + BIN_W / 2, BIN_Y + BIN_H - 40, 44, C.g);
    if (isActive) game.draw.rect(snap(x), snap(BIN_Y) - 16, BIN_W, 12, C.c);
  }

  function drawItem() {
    if (!item) return;
    if (item.type === 'A') { drawPixelCircle(item.x, item.y, ITEM_R, C.e, 1); drawPixelCircle(item.x - 20, item.y - 20, 12, C.g, 0.6); }
    else { game.draw.rect(snap(item.x - ITEM_R), snap(item.y - ITEM_R), ITEM_R * 2, ITEM_R * 2, C.f); game.draw.rect(snap(item.x - ITEM_R) + 12, snap(item.y - ITEM_R) + 12, 16, 16, C.g, 0.6); }
    var binCX = activeBin === 0 ? W * 0.2 : W * 0.8;
    game.draw.line(item.x, item.y + ITEM_R, binCX, BIN_Y, activeBin === 0 ? C.a : C.f, 3);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!item) initGame();
      background();
      drawBin(BIN_A_X, true, C.a, '●', 'A'); drawBin(BIN_B_X, false, C.f, '■', 'B');
      txt(GAME_TITLE,  W / 2, H * 0.18, 80, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.26, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.58, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.66, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (item) { item.vy += 200 * dt; item.y += item.vy * dt; if (item.y > BIN_Y + BIN_H) registerMiss(); }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawBin(BIN_A_X, activeBin === 0, C.a, '●', 'A');
    drawBin(BIN_B_X, activeBin === 1, C.f, '■', 'B');
    drawItem();
    if (feedback > 0) txt(feedbackOk ? 'OK' : 'NG', feedbackX, H * 0.6, 100, feedbackOk ? C.b : C.e);
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 44, C.c);
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.e : '#330000');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
