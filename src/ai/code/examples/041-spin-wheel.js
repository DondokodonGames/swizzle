// 041-spin-wheel.js
// スピンホイール — 回転するルーレットを狙った色で止める賭けの緊張感
// 操作: タップで回転を止める（目標セクターに止まれば成功）
// 成功: 1回目標セクターに止める  失敗: 3回外す or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var WHEEL_COLORS = [C.a, C.f, C.c, C.b, C.e, C.d];

  var GAME_TITLE  = 'SPIN WHEEL';
  var HOW_TO_PLAY = 'TAP TO STOP ON TARGET';
  var MAX_TIME = 20;
  var NEEDED = 1;            // 修正2: 5 → 1
  var MAX_MISS = 3;
  var WHEEL_R = 340, cx = W / 2, cy = H * 0.46;   // 修正1: 大きく縦中央寄り
  var SECTORS = WHEEL_COLORS.length, SECTOR_ANGLE = (Math.PI * 2) / SECTORS;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var angle, angVel, spinning, targetSector, score, misses, timeLeft, done, feedback, feedbackOk, waitTimer;

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

  function newRound() { targetSector = Math.floor(Math.random() * SECTORS); angVel = 5.0 + Math.random() * 3.0 + score * 0.4; spinning = true; waitTimer = 0; }
  function initGame() { angle = 0; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; newRound(); }
  function getTopSector() { var topAngle = (-Math.PI / 2 - angle + Math.PI * 100) % (Math.PI * 2); return Math.floor(topAngle / SECTOR_ANGLE) % SECTORS; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || !spinning || waitTimer > 0) return;
    spinning = false; feedback = 0.5;
    if (getTopSector() === targetSector) {
      score++; feedbackOk = true;
      game.audio.play('se_tap', 1.0);
      if (score >= NEEDED) { finish(true); return; }
    } else {
      misses++; feedbackOk = false;
      game.audio.play('se_failure', 0.6);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
    waitTimer = 0.6;
  });

  // 世界観: カジノのルーレット台。狙った色で止める賭け。
  function background() {
    game.draw.clear('#0a0018');
    // フェルト台（放射状の装飾）
    for (var d = 0; d < 24; d++) {
      var a = d / 24 * Math.PI * 2;
      game.draw.rect(snap(cx + Math.cos(a) * (WHEEL_R + 80)) - 4, snap(cy + Math.sin(a) * (WHEEL_R + 80)) - 4, 8, 8, C.d, 0.4);
    }
    txt('CASINO', W / 2, H * 0.1, 40, C.c);
  }

  function drawWheel() {
    // セクター（各色をドット扇形で塗る）
    for (var s = 0; s < SECTORS; s++) {
      var sAngle = angle + s * SECTOR_ANGLE;
      for (var rr = 40; rr <= WHEEL_R; rr += 24) {
        var arcSteps = Math.max(3, Math.floor(rr / 20));
        for (var st = 0; st <= arcSteps; st++) {
          var aa = sAngle + (st / arcSteps) * SECTOR_ANGLE;
          game.draw.rect(snap(cx + Math.cos(aa) * rr) - 8, snap(cy + Math.sin(aa) * rr) - 8, 16, 16, WHEEL_COLORS[s]);
        }
      }
      game.draw.line(cx, cy, cx + Math.cos(sAngle) * WHEEL_R, cy + Math.sin(sAngle) * WHEEL_R, '#000000', 5);
    }
    drawPixelCircle(cx, cy, 40, '#333355', 1);
    drawPixelCircle(cx, cy, 16, C.g, 1);
    // ポインタ（上部の針）
    game.draw.rect(snap(cx) - 8, snap(cy - WHEEL_R - 48), 16, 56, C.c);
    game.draw.rect(snap(cx) - 24, snap(cy - WHEEL_R - 16), 48, 20, C.c);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (angle === undefined) initGame();
      background();
      angle = game.time.elapsed * 2;
      drawWheel();
      txt(GAME_TITLE,  W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.88, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.94, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newRound(); }
      if (spinning) { angVel *= (1 - 0.01 * dt * 60); angle += angVel * dt; }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    // 目標色の提示（読みやすさ）
    game.draw.rect(snap(W * 0.12), snap(H * 0.2), 100, 100, WHEEL_COLORS[targetSector]);
    txt('TARGET', W * 0.12 + 50, H * 0.2 - 40, 32, C.g, 'center');
    drawWheel();
    if (feedback > 0) {
      if (feedbackOk) txt('WIN!', W / 2, cy - WHEEL_R - 110, 88, C.b);
      else txt('MISS!', W / 2, cy - WHEEL_R - 110, 80, C.a);
    }
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 44, C.g);
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.a : '#330011');
    txt(spinning ? 'TAP TO STOP!' : '...', W / 2, H - 100, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
