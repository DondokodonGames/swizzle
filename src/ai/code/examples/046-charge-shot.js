// 046-charge-shot.js
// チャージショット — 溜めて放つ一撃の快感、過充電に注意
// 操作: 長押し（または連打）でチャージ、スワイプ上で発射
// 成功: 1回ベストゾーン(60-90%)でヒット  失敗: 過充電3回 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'CHARGE SHOT';
  var HOW_TO_PLAY = 'HOLD TO CHARGE, SWIPE UP TO FIRE';
  var MAX_TIME = 15;
  var NEEDED = 1;            // 修正2: 5 → 1
  var MAX_OVER = 3;
  var CHARGE_RATE = 0.7, DRAIN_RATE = 0.2, BEST_MIN = 0.60, BEST_MAX = 0.90;
  var TARGET_Y = H * 0.3, TARGET_R = 80;
  var GAUGE_X = W * 0.1, GAUGE_Y = H * 0.32, GAUGE_W = 72, GAUGE_H = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var charge, isCharging, targetX, targetVx, score, overcharges, timeLeft, done, shotAnim, chargeFlash;

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

  function initGame() { charge = 0; isCharging = false; targetX = W / 2; targetVx = 300; score = 0; overcharges = 0; timeLeft = MAX_TIME; done = false; shotAnim = 0; chargeFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onHold(function(x, y) { if (state === S.PLAYING && !done) isCharging = true; });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    isCharging = !isCharging;  // PLAYING: 連打/トグルでチャージ
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || dir !== 'up') return;
    isCharging = false;
    var lvl = charge; charge = 0;
    if (lvl >= 1.0) { overcharges++; chargeFlash = 0.5; game.audio.play('se_failure', 0.7); if (overcharges >= MAX_OVER) finish(false); return; }
    shotAnim = 0.4;
    var inBest = lvl >= BEST_MIN && lvl <= BEST_MAX, hit = Math.abs(targetX - W / 2) < TARGET_R + 40;
    if (inBest && hit) { score++; game.audio.play('se_tap', 1.0); if (score >= NEEDED) finish(true); }
    else game.audio.play('se_failure', 0.4);
  });

  // 世界観: 対空砲台。チャージを最適域で放ち、上空を横切る標的を撃つ。
  function background() {
    game.draw.clear('#0a0018');
    for (var gy = 120; gy < H; gy += 96) game.draw.rect(0, gy, W, 2, C.d, 0.2);
    // 砲台（下部中央）
    game.draw.rect(snap(W / 2 - 60), H - 220, 120, 120, '#333355');
    game.draw.rect(snap(W / 2 - 20), H - 320, 40, 120, '#555577');  // 砲身
  }

  function drawTarget() {
    var col = Math.abs(targetX - W / 2) < TARGET_R + 40 ? C.f : C.a;
    drawPixelCircle(targetX, TARGET_Y, TARGET_R, col, 1);
    drawPixelCircle(targetX, TARGET_Y, TARGET_R * 0.5, C.g, 0.6);
    game.draw.rect(snap(targetX) - TARGET_R, snap(TARGET_Y) - 2, TARGET_R * 2, 4, C.c, 0.6);
    game.draw.rect(snap(targetX) - 2, snap(TARGET_Y) - TARGET_R, 4, TARGET_R * 2, C.c, 0.6);
  }

  function drawGauge() {
    game.draw.rect(snap(GAUGE_X) - 6, snap(GAUGE_Y) - 6, GAUGE_W + 12, GAUGE_H + 12, '#333355');
    game.draw.rect(snap(GAUGE_X), snap(GAUGE_Y), GAUGE_W, GAUGE_H, '#0a0018');
    var by1 = GAUGE_Y + GAUGE_H * (1 - BEST_MAX), by2 = GAUGE_Y + GAUGE_H * (1 - BEST_MIN);
    game.draw.rect(snap(GAUGE_X), snap(by1), GAUGE_W, snap(by2 - by1), C.b, 0.3);
    game.draw.rect(snap(GAUGE_X), snap(by1), GAUGE_W, 6, C.b);
    game.draw.rect(snap(GAUGE_X), snap(by2) - 6, GAUGE_W, 6, C.b);
    txt('OK', GAUGE_X - 44, (by1 + by2) / 2, 32, C.b);
    var fillH = GAUGE_H * charge, fillY = GAUGE_Y + GAUGE_H - fillH;
    var col = charge >= 1.0 ? C.a : (charge >= BEST_MIN ? C.b : C.e);
    game.draw.rect(snap(GAUGE_X), snap(fillY), GAUGE_W, snap(fillH), col);
    if (charge >= 0.95 && Math.floor(game.time.elapsed * 10) % 2 === 0) game.draw.rect(snap(GAUGE_X), snap(GAUGE_Y), GAUGE_W, GAUGE_H * 0.12, C.a);
    txt(Math.floor(charge * 100) + '%', GAUGE_X + GAUGE_W / 2, GAUGE_Y + GAUGE_H + 44, 40, col);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (charge === undefined) initGame();
      background();
      targetX = W / 2 + Math.sin(game.time.elapsed) * 300; charge = 0.5 + 0.4 * Math.sin(game.time.elapsed * 2);
      drawTarget(); drawGauge();
      txt(GAME_TITLE,  W / 2, H * 0.12, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.19, 34, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.62, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.7, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.78, 42, '#888888');
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
      targetX += targetVx * dt;
      if (targetX + TARGET_R > W - 40) { targetX = W - 40 - TARGET_R; targetVx = -Math.abs(targetVx); }
      if (targetX - TARGET_R < 40) { targetX = 40 + TARGET_R; targetVx = Math.abs(targetVx); }
      if (isCharging) { charge += CHARGE_RATE * dt; if (charge > 1.0) charge = 1.0; }
      else { charge -= DRAIN_RATE * dt; if (charge < 0) charge = 0; }
      if (shotAnim > 0) shotAnim -= dt;
      if (chargeFlash > 0) chargeFlash -= dt;
    }

    // ---- draw ----
    background();
    if (isCharging) game.draw.rect(snap(W / 2) - 6, snap(TARGET_Y), 12, snap(H - 320 - TARGET_Y), C.e, charge * 0.5);
    if (shotAnim > 0) { var sa = shotAnim / 0.4; game.draw.rect(snap(W / 2) - 8, snap(TARGET_Y), 16, snap(H - 320 - TARGET_Y), C.c, sa); }
    drawTarget();
    drawGauge();
    if (chargeFlash > 0) game.draw.rect(0, 0, W, H, C.a, chargeFlash * 0.3);
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 44, C.g);
    for (var oc = 0; oc < MAX_OVER; oc++)
      game.draw.rect(W / 2 + (oc - 1) * 64 - 20, 150, 40, 40, oc < overcharges ? C.a : '#330011');
    txt('SWIPE UP TO FIRE!', W / 2, H - 90, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
