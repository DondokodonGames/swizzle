// 227-spin-duel.js
// スピンデュエル — 円形リングの上でコマを弾き合い、相手を先に場外へ落とすベイ対決
// 操作: タップした方向へ自コマを突進させる（時間で溜まる勢い）
// 成功: 相手を1回場外に  失敗: 自分が3回落ちる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、闘技リング） ──
  var C = { bg:'#0a0a10', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPIN DUEL';
  var HOW_TO_PLAY = 'TAP A DIRECTION TO CHARGE AND RAM';
  var MAX_TIME = 15;
  var NEEDED   = 1;           // 修正2: 3 → 1
  var MAX_LOSS = 3;
  var CX = snap(W / 2), CY = snap(H * 0.46), ARENA_R = 380, TOP_R = 36, FRICTION = 0.985, CHARGE = 1200;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var px, py, pvx, pvy, pCharge, pSpin, pWins, pLoss, ex, ey, evx, evy, eSpin, eTimer, timeLeft, done, respawn, feedback, feedbackOk;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.1) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1a2a');
  }

  function background() { game.draw.clear(C.bg); pc(CX, CY, ARENA_R, C.d, 0.25); ring(CX, CY, ARENA_R - TOP_R, C.a, 0.4); }

  function drawTop(x, y, spin, col) { pc(x, y, TOP_R, col, 0.9); game.draw.rect(snap(x + Math.cos(spin) * TOP_R * 0.6) - 4, snap(y + Math.sin(spin) * TOP_R * 0.6) - 4, 8, 8, C.g); }

  function respawnP() { var a = Math.random() * Math.PI * 2; px = CX + Math.cos(a) * ARENA_R * 0.4; py = CY + Math.sin(a) * ARENA_R * 0.4; pvx = 0; pvy = 0; pCharge = 0; }
  function respawnE() { var a = Math.random() * Math.PI * 2; ex = CX + Math.cos(a) * ARENA_R * 0.4; ey = CY + Math.sin(a) * ARENA_R * 0.4; evx = 0; evy = 0; }

  function initGame() { px = CX - 120; py = CY + 60; pvx = 0; pvy = 0; pCharge = 0; pSpin = 0; pWins = 0; pLoss = 0; ex = CX + 120; ey = CY - 60; evx = 0; evy = 0; eSpin = 0; eTimer = 1; timeLeft = MAX_TIME; done = false; respawn = 0; feedback = 0; feedbackOk = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(timeLeft) * 100) : pWins * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || respawn > 0) return;
    var dx = x - px, dy = y - py, dist = Math.hypot(dx, dy); if (dist < 10) return;
    var sp = CHARGE * (0.5 + pCharge * 0.8); pvx = dx / dist * sp; pvy = dy / dist * sp; pCharge = 0; game.audio.play('se_tap', 0.5);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawTop(CX - 120, CY + 60, game.time.elapsed * 5, C.b); drawTop(CX + 120, CY - 60, -game.time.elapsed * 5, C.a);
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.86, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.91, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'RING OUT!' : 'DEFEATED', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (feedback > 0) feedback -= dt;
      if (respawn > 0) { respawn -= dt; }
      else {
        pCharge = Math.min(1, pCharge + dt * 0.5); pSpin += 5 * dt;
        px += pvx * dt; py += pvy * dt; pvx *= FRICTION; pvy *= FRICTION;
        if (Math.hypot(px - CX, py - CY) > ARENA_R - TOP_R) { pLoss++; feedbackOk = false; feedback = 0.4; game.audio.play('se_failure', 0.5); if (pLoss >= MAX_LOSS) { finish(false); return; } respawnP(); respawn = 0.8; }
        eTimer -= dt;
        if (eTimer <= 0) { var edx = px - ex, edy = py - ey, ed = Math.hypot(edx, edy) || 1, es = 450 + (MAX_TIME - timeLeft) * 15; evx = edx / ed * es + game.random(-200, 200); evy = edy / ed * es + game.random(-200, 200); eTimer = 0.6 + Math.random() * 0.7; }
        ex += evx * dt; ey += evy * dt; evx *= FRICTION; evy *= FRICTION; eSpin += 4 * dt;
        if (Math.hypot(ex - CX, ey - CY) > ARENA_R - TOP_R) { pWins++; feedbackOk = true; feedback = 0.4; game.audio.play('se_success', 0.6); if (pWins >= NEEDED) { finish(true); return; } respawnE(); }
        var cdx = ex - px, cdy = ey - py, cd = Math.hypot(cdx, cdy) || 1;
        if (cd < TOP_R * 2) { var nx = cdx / cd, ny = cdy / cd, imp = 600; pvx -= nx * imp; pvy -= ny * imp; evx += nx * imp; evy += ny * imp; game.audio.play('se_tap', 0.7); }
      }
    }

    // ---- 描画 ----
    background();
    if (pCharge > 0.1) ring(px, py, TOP_R + 12 * pCharge, C.c, pCharge * 0.5);
    drawTop(px, py, pSpin, C.b); drawTop(ex, ey, eSpin, C.a);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('KO ' + pWins + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_LOSS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_LOSS - 1) / 2) * 56) - 10, 224, 20, 20, mm < pLoss ? C.a : '#1a1a2a');
    txt('TAP TO RAM', W / 2, H - 100, 40, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
