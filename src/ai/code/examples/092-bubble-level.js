// 092-bubble-level.js
// 水準器 — 左右タップで傾きを操作し、気泡を中央に保ち続けるバランス
// 操作: 左タップで左に傾け、右タップで右に傾ける
// 成功: 4秒気泡を中央に保つ  失敗: 気泡が外れる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'BUBBLE LEVEL';
  var HOW_TO_PLAY = 'TAP L/R TO KEEP BUBBLE CENTERED';
  var MAX_TIME = 20;
  var NEEDED_HOLD = 4;      // 修正2: 生存15s → 4s
  var TUBE_W = 820, TUBE_H = 140, TUBE_X = (W - 820) / 2, TUBE_Y = H * 0.5, BUBBLE_R = 44, CENTER_ZONE = 0.06;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var tilt, tiltVel, bubblePos, bubbleVel, timeInCenter, timeLeft, done, successFlash, dangerFlash, perturbTimer;

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

  function initGame() { tilt = 0; tiltVel = (Math.random() - 0.5) * 0.5; bubblePos = 0; bubbleVel = 0; timeInCenter = 0; timeLeft = MAX_TIME; done = false; successFlash = 0; dangerFlash = 0; perturbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 40) : Math.floor(timeInCenter * 80);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    tiltVel += (tx < W / 2 ? -1 : 1) * 0.5; game.audio.play('se_tap', 0.3);
  });

  // 世界観: 精密水準器。気泡を左右タップの傾き操作で中央の目盛に収め続ける。
  function background() {
    game.draw.clear('#0a0018');
    if (successFlash > 0) game.draw.rect(0, 0, W, H, C.b, successFlash / 0.6 * 0.3);
    if (dangerFlash > 0) game.draw.rect(0, 0, W, H, C.a, dangerFlash / 0.1 * 0.2);
    txt('SPIRIT LEVEL', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    // チューブ
    game.draw.rect(snap(TUBE_X) - 16, snap(TUBE_Y - TUBE_H / 2) - 16, TUBE_W + 32, TUBE_H + 32, '#221040');
    game.draw.rect(snap(TUBE_X), snap(TUBE_Y - TUBE_H / 2), TUBE_W, TUBE_H, '#12002a');
    game.draw.rect(snap(TUBE_X), snap(TUBE_Y - TUBE_H / 2) + 8, TUBE_W, TUBE_H - 16, C.e, 0.15);
    // 中央ゾーン
    var cw = TUBE_W * CENTER_ZONE;
    game.draw.rect(snap(W / 2 - cw) - 3, snap(TUBE_Y - TUBE_H / 2), 6, TUBE_H, C.b, 0.7);
    game.draw.rect(snap(W / 2 + cw) - 3, snap(TUBE_Y - TUBE_H / 2), 6, TUBE_H, C.b, 0.7);
    // 気泡
    var bx = W / 2 + bubblePos * (TUBE_W / 2 - BUBBLE_R - 8), inC = Math.abs(bubblePos) < CENTER_ZONE;
    drawPixelCircle(bx, TUBE_Y, BUBBLE_R, inC ? C.b : (Math.abs(bubblePos) > 0.75 ? C.a : C.g), 0.9);
    game.draw.rect(snap(bx) - 16, snap(TUBE_Y) - 16, 12, 12, C.g, 0.7);
    // 保持バー
    var hf = Math.min(1, timeInCenter / NEEDED_HOLD), bw = 600;
    game.draw.rect(snap(W / 2 - bw / 2), snap(H * 0.66), bw, 24, '#221040');
    game.draw.rect(snap(W / 2 - bw / 2), snap(H * 0.66), snap(bw * hf), 24, C.b);
    txt('HOLD ' + timeInCenter.toFixed(1) + ' / ' + NEEDED_HOLD + 's', W / 2, H * 0.62, 40, hf > 0.5 ? C.b : C.c);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (tilt === undefined) initGame();
      background();
      bubblePos = 0.5 * Math.sin(game.time.elapsed * 1.5);
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.16, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.8, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.85, 46, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.9, 40, '#888888');
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
      perturbTimer -= dt;
      if (perturbTimer <= 0) { perturbTimer = 1.5 + Math.random() * 1.5; tiltVel += (Math.random() - 0.5) * 0.8; }
      tiltVel *= 0.94; tilt += tiltVel * dt; tilt = Math.max(-1, Math.min(1, tilt));
      bubbleVel += (-tilt * 2.5) * dt; bubbleVel *= 0.96; bubblePos += bubbleVel * dt; bubblePos = Math.max(-1, Math.min(1, bubblePos));
      if (Math.abs(bubblePos) < CENTER_ZONE) { timeInCenter += dt; if (timeInCenter >= NEEDED_HOLD) { successFlash = 0.6; finish(true); return; } }
      else { timeInCenter = Math.max(0, timeInCenter - dt * 0.5); if (Math.abs(bubblePos) > 0.85) dangerFlash = 0.1; }
      if (successFlash > 0) successFlash -= dt;
      if (dangerFlash > 0) dangerFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('KEEP BUBBLE CENTERED', W / 2, 96, 42, C.c);
    txt('◄ TAP', W * 0.16, TUBE_Y, 44, C.d);
    txt('TAP ►', W * 0.84, TUBE_Y, 44, C.d);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
