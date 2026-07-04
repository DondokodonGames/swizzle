// 664-slalom.js
// スラローム — 迫る旗門の開いたレーンへ、左右タップでスキーヤーを寄せてくぐり抜ける
// 操作: 画面左半分タップで左レーン、右半分で右レーンへ移動。開いた列を通過する
// 成功: 15門 通過  失敗: 3回 ミス or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、雪山） ──
  var C = { bg:'#040a0e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var GATE_COLORS = ['#ff2079', '#3355ff', '#ffe600'];
  var LANE_X = [W * 0.25, W * 0.5, W * 0.75];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SLALOM';
  var HOW_TO_PLAY = 'TAP LEFT / RIGHT TO SHIFT LANES · SKI THROUGH THE OPEN GATE COLUMN';
  var MAX_TIME = 18;
  var NEEDED   = 15;         // 修正2: 30 → 15
  var MAX_MISS = 3;          // 修正2: 6 → 3
  var SKIER_Y = snap(H * 0.70), SKIER_R = 52, GATE_SPEED = 700, SPAWN_RATE = 1.3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var skierLane, skierX, gates, passed, misses, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, spawnTimer, lastGateColorIdx, gameElapsed;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#050a07');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, H, '#0d1a10', 0.5); for (var si = 0; si < 12; si++) { var sy = ((gameElapsed * 400 + si * 160) % H); game.draw.rect(0, snap(sy), W, 2, '#1a3320', 0.6); } }

  function spawnGate() {
    var colorIdx; do { colorIdx = Math.floor(Math.random() * GATE_COLORS.length); } while (colorIdx === lastGateColorIdx);
    lastGateColorIdx = colorIdx; gates.push({ y: -80, colorIdx: colorIdx, openLane: Math.floor(Math.random() * 3), scored: false });
  }

  function initGame() { skierLane = 1; skierX = LANE_X[1]; gates = []; passed = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnTimer = 0; lastGateColorIdx = -1; gameElapsed = 0; spawnGate(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (passed * 500 + Math.ceil(timeLeft) * 100) : passed * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var li = 0; li < 3; li++) game.draw.rect(snap(LANE_X[li]) - 1, 0, 2, H, C.g, 0.08);
    for (var gi = 0; gi < gates.length; gi++) {
      var gate = gates[gi], col = GATE_COLORS[gate.colorIdx];
      for (var lane = 0; lane < 3; lane++) { if (lane !== gate.openLane) { pc(LANE_X[lane], gate.y, 24, col, 0.9); game.draw.rect(snap(LANE_X[lane]) - 3, gate.y - 60, 6, 120, col, 0.9); } else pc(LANE_X[lane], gate.y, 10, C.g, 0.3); }
      game.draw.rect(0, snap(gate.y) - 1, W, 3, col, 0.35);
    }
    pc(skierX, SKIER_Y, SKIER_R, C.g, 0.9); pc(skierX - SKIER_R * 0.35, SKIER_Y - SKIER_R * 0.35, SKIER_R * 0.28, C.e, 0.5);
    game.draw.rect(snap(skierX - 40) - 4, SKIER_Y + SKIER_R - 10, 8, 50, C.d, 0.9); game.draw.rect(snap(skierX + 40) - 4, SKIER_Y + SKIER_R - 10, 8, 50, C.d, 0.9);
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var dir = tx < W / 2 ? -1 : 1, nl = Math.max(0, Math.min(2, skierLane + dir));
    if (nl !== skierLane) { skierLane = nl; game.audio.play('se_tap', 0.1); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!gates) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(gameElapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      gameElapsed += dt;
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GOLD MEDAL!' : 'WIPED OUT', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(gameElapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      gameElapsed += dt;
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; gameElapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      skierX += (LANE_X[skierLane] - skierX) * Math.min(1, dt * 14);
      spawnTimer += dt; var rate = Math.max(0.7, SPAWN_RATE - (MAX_TIME - timeLeft) * 0.02); if (spawnTimer >= rate) { spawnTimer = 0; spawnGate(); }
      var spd = GATE_SPEED * (1 + (MAX_TIME - timeLeft) * 0.02);
      for (var i = gates.length - 1; i >= 0; i--) {
        var g = gates[i]; g.y += spd * dt;
        if (!g.scored && g.y >= SKIER_Y - 60 && g.y <= SKIER_Y + 60) {
          g.scored = true;
          if (skierLane === g.openLane) {
            passed++; flash = 0.25; flashCol = C.b; resultText = 'THROUGH!'; resultTimer = 0.4; game.audio.play('se_success', 0.45);
            for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: skierX, y: SKIER_Y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.35, col: GATE_COLORS[g.colorIdx] }); }
            if (passed >= NEEDED) { finish(true); return; }
          } else { misses++; flash = 0.4; flashCol = C.a; resultText = 'CRASH!'; resultTimer = 0.5; game.audio.play('se_failure', 0.35); if (misses >= MAX_MISS) { finish(false); return; } }
        }
        if (g.y > H + 100) gates.splice(i, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.82), 60, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(passed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#050a07');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
