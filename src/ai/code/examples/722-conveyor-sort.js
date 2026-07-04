// 722-conveyor-sort.js
// コンベアソート — ベルトで流れる荷物を色で見分けて上下のレーンへ振り分ける
// 操作: 青(A)は画面上、橙(B)は画面下をタップ。上下スワイプでも仕分けできる
// 成功: 12個 正確に仕分ける  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、荷物色は保持） ──
  var C = { bg:'#060408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BOX_A = '#00cfff', BOX_B = '#ff6600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CONVEYOR SORT';
  var HOW_TO_PLAY = 'BLUE (A) TO THE TOP · ORANGE (B) TO THE BOTTOM · TAP OR SWIPE';
  var MAX_TIME = 22;
  var NEEDED   = 12;         // 修正2: 35 → 12
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var LANE_A_Y = snap(H * 0.30), LANE_B_Y = snap(H * 0.60), BELT_Y = snap(H * 0.45), BOX_W = 110, BOX_H = 90, BOX_SPEED = 300;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var currentBox, spawnTimer, sentAnim, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); var st = 8; for (var i = 0; i < size; i += st) { var w = size - i; if (dir === 'up') game.draw.rect(cx - w / 2, cy - i + size / 2 - st, w, st, color, 0.6); else game.draw.rect(cx - w / 2, cy + i - size / 2, w, st, color, 0.6); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0608');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBox() { currentBox = { type: Math.random() < 0.5 ? 'A' : 'B', x: -BOX_W / 2, y: BELT_Y, sent: false }; }

  function initGame() { currentBox = null; spawnTimer = 0.4; sentAnim = null; score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnBox(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 100) : score * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function sendBox(dir) {
    if (!currentBox || currentBox.sent) return;
    currentBox.sent = true;
    var correct = (dir === 'up' && currentBox.type === 'A') || (dir === 'down' && currentBox.type === 'B');
    sentAnim = { x: currentBox.x, y: currentBox.y, vy: dir === 'up' ? -700 : 700, type: currentBox.type, correct: correct, life: 0.4 };
    if (correct) {
      score++; flash = 0.2; flashCol = C.b; game.audio.play('se_tap', 0.1);
      if (score >= NEEDED) { currentBox = null; finish(true); return; }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.4; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { currentBox = null; finish(false); return; }
    }
    currentBox = null; spawnTimer = 0.3;
  }

  function drawScene() {
    game.draw.rect(0, LANE_A_Y - 60, W, 120, '#0c4a6e', 0.7); pc(80, LANE_A_Y, 40, BOX_A, 0.85); txt('A', 80, LANE_A_Y + 16, 48, C.g); arrow(W * 0.5 - 90, LANE_A_Y, 44, 'up', BOX_A); txt('BLUE', W * 0.5 + 40, LANE_A_Y + 14, 40, '#00cfff88');
    game.draw.rect(0, LANE_B_Y - 60, W, 120, '#7c2d12', 0.7); pc(80, LANE_B_Y, 40, BOX_B, 0.85); txt('B', 80, LANE_B_Y + 16, 48, C.g); arrow(W * 0.5 - 90, LANE_B_Y, 44, 'down', BOX_B); txt('ORANGE', W * 0.5 + 60, LANE_B_Y + 14, 40, '#ff660088');
    game.draw.rect(0, BELT_Y - 28, W, 56, '#1c1917', 0.9);
    for (var bs = 0; bs < 12; bs++) { var bsx = (bs * 100 - (elapsed * 320) % 100 + 100) % (W + 100) - 50; game.draw.line(bsx, BELT_Y - 28, bsx - 30, BELT_Y + 28, '#2d2825', 8); }
    if (sentAnim) { var sa = sentAnim; game.draw.rect(snap(sa.x - BOX_W / 2), snap(sa.y - BOX_H / 2), BOX_W, BOX_H, sa.correct ? C.b : C.a, sa.life * 2); }
    if (currentBox && !currentBox.sent) {
      var bCol = currentBox.type === 'A' ? BOX_A : BOX_B;
      game.draw.rect(snap(currentBox.x - BOX_W / 2), snap(currentBox.y - BOX_H / 2), BOX_W, BOX_H, bCol, 0.92);
      game.draw.rect(snap(currentBox.x - BOX_W / 2), snap(currentBox.y - BOX_H / 2), BOX_W, 12, C.g, 0.22);
      txt(currentBox.type, currentBox.x, currentBox.y + 20, 64, C.g);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !currentBox || currentBox.sent) return;
    sendBox(ty < H / 2 ? 'up' : 'down');
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || !currentBox || currentBox.sent) return;
    if (dir === 'up') sendBox('up'); else if (dir === 'down') sendBox('down');
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!currentBox) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.14, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.88, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHIPPED CLEAN!' : 'WRONG BIN', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
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
      if (currentBox && !currentBox.sent) {
        currentBox.x += BOX_SPEED * dt;
        if (currentBox.x > W + BOX_W / 2) {
          errors++; flash = 0.3; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.4; game.audio.play('se_failure', 0.3); currentBox = null; spawnTimer = 0.3;
          if (errors >= MAX_ERR) { finish(false); return; }
        }
      }
      if (spawnTimer > 0) { spawnTimer -= dt; if (spawnTimer <= 0 && !currentBox) spawnBox(); }
      if (!currentBox && spawnTimer <= 0) spawnBox();
      if (sentAnim) { sentAnim.y += sentAnim.vy * dt; sentAnim.life -= dt * 2.5; if (sentAnim.life <= 0) sentAnim = null; }
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.75), 56, C.a);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0a0608');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
