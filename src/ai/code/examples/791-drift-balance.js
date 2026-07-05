// 791-drift-balance.js
// ドリフトバランス — 左右に傾く天秤を、タップで均衡を保ち続けろ
// 操作: 左タップで左へ、右タップで右へ力を加える（安全ゾーンを維持）
// 成功: 16秒間 ゾーン内を維持  失敗: 3回 転倒 or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、天秤） ──
  var C = { bg:'#050810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BEAM = '#4a5a6a', BEAM_HI = '#8494a8', PIVOT = '#64748b', LEFT = '#00cfff', RIGHT = '#ff6600', ZONE = '#00ff41';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DRIFT BALANCE';
  var HOW_TO_PLAY = 'TAP LEFT OR RIGHT TO NUDGE THE BEAM · KEEP IT INSIDE THE SAFE ZONE';
  var MAX_TIME    = 24;
  var WIN_TIME    = 16;      // 修正2: 60 → 16
  var MAX_FALLS   = 3;       // 修正2: 4 → 3
  var CX = W / 2, CY = snap(H * 0.42), BEAM_LEN = W * 0.38, DRIFT_ACCEL = 0.18, TAP_FORCE = 0.35, SAFE_ZONE = 0.35, DANGER_GRACE = 0.8;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tilt, tiltVel, driftForce, falls, inDanger, dangerTimer, gameTimer, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer, tapSide, tapTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); var st = 12; for (var i = 0; i < size; i += st) { var w = size - i; if (dir === 'right') game.draw.rect(cx + i - size / 2, cy - w / 2, st, w, color, 0.95); else game.draw.rect(cx - i + size / 2 - st, cy - w / 2, st, w, color, 0.95); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#050810');
  }

  function background() { game.draw.clear(C.bg); }

  function updateDriftForce() { driftForce = (Math.random() - 0.5) * DRIFT_ACCEL * (1 + falls * 0.2); }

  function initGame() { tilt = 0; tiltVel = 0; falls = 0; inDanger = false; dangerTimer = 0; gameTimer = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; tapSide = 0; tapTimer = 0; updateDriftForce(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(gameTimer) * 300 + Math.ceil(timeLeft) * 200 - falls * 400) : Math.floor(gameTimer) * 150;
    if (finalScore < 0) finalScore = 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var angle = tilt * Math.PI * 0.3, cos = Math.cos(angle), sin = Math.sin(angle);
    var safeAngle = SAFE_ZONE * Math.PI * 0.3;
    for (var ai = -30; ai <= 30; ai++) { var a = (ai / 30) * Math.PI * 0.35, inSafe2 = Math.abs(a) <= safeAngle; game.draw.rect(snap(CX + Math.cos(a - Math.PI / 2) * 180) - 4, snap(CY + Math.sin(a - Math.PI / 2) * 180) - 4, 8, 8, inSafe2 ? ZONE : C.a, 0.3); }
    var lx = CX - cos * BEAM_LEN, ly = CY - sin * BEAM_LEN, rx = CX + cos * BEAM_LEN, ry = CY + sin * BEAM_LEN;
    game.draw.line(lx, ly, rx, ry, BEAM, 18); game.draw.line(lx, ly, rx, ry, BEAM_HI, 6);
    pc(CX, CY, 22, PIVOT, 0.9); pc(CX, CY, 12, C.g, 0.4);
    pc(lx, ly, 36, LEFT, 0.9); pc(rx, ry, 36, RIGHT, 0.9);
    var inSafe = Math.abs(tilt) <= SAFE_ZONE, tiltCol = inSafe ? ZONE : C.a;
    if (!inSafe) game.draw.rect(0, 0, W, H, C.a, 0.03 + (dangerTimer / DANGER_GRACE) * 0.06);
    var gameRatio = Math.min(1, gameTimer / WIN_TIME);
    game.draw.rect(snap(W * 0.08), snap(H * 0.78), snap(W * 0.84), 20, '#0a1520', 0.9); game.draw.rect(snap(W * 0.08), snap(H * 0.78), snap(W * 0.84 * gameRatio), 20, ZONE, 0.7);
    txt('HOLD  ' + Math.floor(gameTimer) + ' / ' + WIN_TIME + 's', W / 2, snap(H * 0.75), 34, C.g);
    game.draw.rect(snap(W * 0.08), snap(H * 0.68), snap(W * 0.84), 14, '#0a1520', 0.8); var normTilt = (tilt + 1) / 2; game.draw.rect(snap(W * 0.08), snap(H * 0.68), snap(W * 0.84 * normTilt), 14, tiltCol, 0.9);
    game.draw.rect(snap(W * 0.08 + W * 0.84 * (0.5 - SAFE_ZONE / 2)) - 3, snap(H * 0.68) - 4, 6, 22, ZONE, 0.8); game.draw.rect(snap(W * 0.08 + W * 0.84 * (0.5 + SAFE_ZONE / 2)) - 3, snap(H * 0.68) - 4, 6, 22, ZONE, 0.8);
    if (state === S.PLAYING) {
      if (tapTimer > 0) pc(tapSide < 0 ? W * 0.2 : W * 0.8, snap(H * 0.87), 40 + tapTimer * 30, tapSide < 0 ? LEFT : RIGHT, tapTimer * 0.4);
      arrow(W * 0.2, snap(H * 0.87), 36, 'left', LEFT); arrow(W * 0.8, snap(H * 0.87), 36, 'right', RIGHT);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (tx < W / 2) { tiltVel -= TAP_FORCE; tapSide = -1; } else { tiltVel += TAP_FORCE; tapSide = 1; }
    tapTimer = 0.15; game.audio.play('se_tap', 0.06);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (tilt === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.93, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STEADY HAND!' : 'TOPPLED', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(gameTimer >= WIN_TIME); return; }
      if (Math.random() < dt * 0.8) updateDriftForce();
      tiltVel += driftForce * dt; tilt += tiltVel * dt; tiltVel *= Math.pow(0.85, dt * 60);
      if (tilt > 1) { tilt = 1; tiltVel = 0; } if (tilt < -1) { tilt = -1; tiltVel = 0; }
      if (Math.abs(tilt) > SAFE_ZONE) {
        if (!inDanger) { inDanger = true; dangerTimer = 0; }
        dangerTimer += dt;
        if (dangerTimer >= DANGER_GRACE) { falls++; inDanger = false; dangerTimer = 0; tilt = 0; tiltVel = 0; flash = 0.4; flashCol = C.a; resultText = 'FALL!'; resultTimer = 0.5; game.audio.play('se_failure', 0.45); for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: C.a }); } if (falls >= MAX_FALLS) { finish(false); return; } }
      } else { inDanger = false; dangerTimer = 0; }
      gameTimer += dt; if (gameTimer >= WIN_TIME) { finish(true); return; }
      if (tapTimer > 0) tapTimer -= dt * 4; if (flash > 0) flash -= dt * 2.5; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.vy += 350 * dt; p2.life -= dt * 2; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p3 = particles[pp2]; game.draw.rect(snap(p3.x) - 5, snap(p3.y) - 5, 10, 10, p3.col, p3.life * 2); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.20), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(gameTimer) + ' / ' + WIN_TIME + 's', W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FALLS; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FALLS - 1) / 2) * 56) - 10, 224, 20, 20, fi < falls ? C.a : '#050810');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
