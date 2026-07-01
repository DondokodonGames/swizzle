// 153-bubble-level.js
// バブル水準器 — 気泡が中央ゾーンに来るように動かして保持する精密ゲーム
// 操作: タップ/スワイプで気泡を動かす
// 成功: 気泡を中央に2秒間保持  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、計測器） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BUBBLE LEVEL';
  var HOW_TO_PLAY = 'TAP TO NUDGE BUBBLE TO CENTER';
  var MAX_TIME = 15;             // 修正2: 45 → 15
  var NEEDED_HOLD = 2.0;         // 修正2: 5 → 2（サバイバル短縮）
  var TUBE_R = 280, TUBE_X = snap(W / 2), TUBE_Y = snap(H * 0.48);
  var BUBBLE_R = 44, SAFE_R = 72, FRICTION = 0.88, FORCE = 200;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bx, by, bvx, bvy, holdTime, timeLeft, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) for (var px = -r; px <= r; px += step) {
      if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
    }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.12) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function drawTube() {
    ring(TUBE_X, TUBE_Y, TUBE_R + 8, C.d, 0.6);
    ring(TUBE_X, TUBE_Y, TUBE_R, C.d, 0.4);
    for (var a = 0; a < Math.PI * 2; a += Math.PI / 8) game.draw.rect(snap(TUBE_X + Math.cos(a) * (TUBE_R - 16)) - 4, snap(TUBE_Y + Math.sin(a) * (TUBE_R - 16)) - 4, 8, 8, C.d, 0.5);
  }

  function drawCenter(inC) {
    var col = inC ? C.b : C.e;
    ring(TUBE_X, TUBE_Y, SAFE_R, col, 0.6);
    game.draw.rect(TUBE_X - SAFE_R, TUBE_Y - 3, SAFE_R * 2, 6, col, 0.7);
    game.draw.rect(TUBE_X - 3, TUBE_Y - SAFE_R, 6, SAFE_R * 2, col, 0.7);
  }

  function drawBubble() {
    pc(bx, by, BUBBLE_R, C.e, 0.9);
    pc(bx, by, BUBBLE_R - 12, C.c, 0.3);
    pc(bx - 14, by - 16, 10, C.g, 0.8);
  }

  function initGame() {
    bx = TUBE_X + game.random(-160, 160); by = TUBE_Y + game.random(-160, 160);
    bvx = 0; bvy = 0; holdTime = 0; timeLeft = MAX_TIME; done = false;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (500 + Math.ceil(timeLeft) * 40) : Math.round(holdTime * 100);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var dx = x - TUBE_X, dy = y - TUBE_Y, len = Math.hypot(dx, dy);
    if (len < 10) return;
    bvx += (dx / len) * FORCE * 0.8; bvy += (dy / len) * FORCE * 0.8;
    game.audio.play('se_tap', 0.3);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'up') bvy -= FORCE; else if (dir === 'down') bvy += FORCE;
    else if (dir === 'left') bvx -= FORCE; else if (dir === 'right') bvx += FORCE;
    game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawTube(); drawCenter(false);
      bx = TUBE_X + Math.cos(game.time.elapsed) * 140; by = TUBE_Y + Math.sin(game.time.elapsed * 1.3) * 140;
      drawBubble();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.80, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'LEVEL!' : 'TIME OUT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      bvx *= Math.pow(FRICTION, dt * 60); bvy *= Math.pow(FRICTION, dt * 60);
      bx += bvx * dt; by += bvy * dt;
      var dx = bx - TUBE_X, dy = by - TUBE_Y, dist = Math.hypot(dx, dy), maxD = TUBE_R - BUBBLE_R;
      if (dist > maxD) {
        var nx = dx / dist, ny = dy / dist;
        bx = TUBE_X + nx * maxD; by = TUBE_Y + ny * maxD;
        var dot = bvx * nx + bvy * ny; bvx -= 2 * dot * nx; bvy -= 2 * dot * ny; bvx *= 0.5; bvy *= 0.5;
      }
      if (Math.hypot(bx - TUBE_X, by - TUBE_Y) < SAFE_R) {
        holdTime += dt;
        if (holdTime >= NEEDED_HOLD) { finish(true); return; }
      } else holdTime = Math.max(0, holdTime - dt * 0.5);
    }

    // ---- 描画 ----
    background(); drawTube();
    var inC = Math.hypot(bx - TUBE_X, by - TUBE_Y) < SAFE_R;
    drawCenter(inC);
    drawBubble();
    // ホールド進捗リング
    if (holdTime > 0) {
      var steps = Math.floor(holdTime / NEEDED_HOLD * 40);
      for (var s = 0; s < steps; s++) { var a = -Math.PI / 2 + (s / 40) * Math.PI * 2; game.draw.rect(snap(TUBE_X + Math.cos(a) * 120) - 5, snap(TUBE_Y + Math.sin(a) * 120) - 5, 10, 10, C.b, 0.9); }
      txt(holdTime.toFixed(1) + 's', TUBE_X, TUBE_Y + 150, 52, C.b);
    }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('HOLD ' + NEEDED_HOLD + 's IN CENTER', W / 2, 168, 40, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
