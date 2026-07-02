// 192-sprint-dash.js
// スプリントダッシュ — 左右交互に素早くタップしてランナーを加速させる
// 操作: 左半分/右半分を交互にタップ
// 成功: 100mを完走  失敗: 15秒以内に完走できない

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ナイター陸上） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPRINT DASH';
  var HOW_TO_PLAY = 'TAP LEFT / RIGHT ALTERNATELY TO RUN';
  var TIME_LIMIT = 15;
  var RUNNER_Y = snap(H * 0.6);
  var MAX_SPEED = 1.0, DECAY = 0.5, TAP_BOOST = 0.4, COMBO_BONUS = 0.05;   // 修正2: 加速を強く

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var progress, speed, lastSide, combo, elapsed, done, particles, legPhase, leftFlash, rightFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil((TIME_LIMIT - elapsed) / TIME_LIMIT * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, RUNNER_Y + 68, W, H - RUNNER_Y - 68, C.d, 0.4);
    var scroll = progress * W * 3;
    for (var lx = 0; lx < W + 200; lx += 100) { var tx = ((lx - scroll) % (W + 200) + (W + 200)) % (W + 200) - 100; game.draw.rect(tx, RUNNER_Y + 84, 60, 12, C.a, 0.5); }
  }

  function drawRunner() {
    var x = snap(W / 2), leg = Math.sin(legPhase) * 24;
    pc(x, RUNNER_Y - 50, 22, C.c, 1);            // 頭
    game.draw.rect(x - 16, RUNNER_Y - 24, 32, 52, C.c);   // 胴
    game.draw.rect(snap(x - 12), RUNNER_Y + 28, 10, snap(40 + leg), C.f);   // 脚
    game.draw.rect(snap(x + 4), RUNNER_Y + 28, 10, snap(40 - leg), C.f);
    game.draw.rect(x + 12, RUNNER_Y - 16, snap(28 + Math.abs(leg)), 10, C.c); // 腕
  }

  function initGame() { progress = 0; speed = 0; lastSide = null; combo = 0; elapsed = 0; done = false; particles = []; legPhase = 0; leftFlash = 0; rightFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.max(0, Math.ceil((TIME_LIMIT - elapsed) * 100)) + combo * 20 + 300) : Math.round(progress * 300);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var side = x < W / 2 ? 'left' : 'right';
    if (side === lastSide) { combo = 0; speed = Math.max(0, speed - 0.04); game.audio.play('se_failure', 0.2); }
    else {
      combo++; speed = Math.min(MAX_SPEED, speed + TAP_BOOST + combo * COMBO_BONUS); lastSide = side;
      game.audio.play('se_tap', 0.5);
      if (side === 'left') leftFlash = 0.2; else rightFlash = 0.2;
      for (var pi = 0; pi < 3; pi++) particles.push({ x: W / 2 + game.random(-20, 20), y: RUNNER_Y + 70, vx: -game.random(80, 160), vy: -game.random(60, 120), life: 0.3 });
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      progress = (game.time.elapsed * 0.2) % 1; legPhase += dt * 10;
      background(); drawRunner();
      txt(GAME_TITLE, W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.88, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawRunner();
      txt(resultSuccess ? 'FINISH!' : 'TOO SLOW', W / 2, H * 0.30, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.44, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.58, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      elapsed += dt;
      speed = Math.max(0, speed - DECAY * dt);
      progress = Math.min(1, progress + speed * dt);
      legPhase += speed * dt * 8;
      if (leftFlash > 0) leftFlash -= dt; if (rightFlash > 0) rightFlash -= dt;
      if (progress >= 1) { finish(true); return; }
      if (elapsed >= TIME_LIMIT) { finish(false); return; }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 400 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });

    // ---- 描画 ----
    background();
    // ゴール
    var fx = W * 0.9 + (1 - progress) * W * 3;
    if (fx < W + 100) { var f = Math.min(W + 20, fx); for (var fy = RUNNER_Y - 60; fy < RUNNER_Y + 80; fy += 20) game.draw.rect(f - 8, fy, 16, 10, fy % 40 === 0 ? C.g : C.b, 0.8); }
    drawRunner();
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 4, snap(particles[pp].y) - 4, 8, 8, C.d, particles[pp].life * 3);
    // L/R ゾーン
    game.draw.rect(0, H * 0.78, W / 2, H * 0.18, C.a, leftFlash > 0 ? 0.4 : 0.1);
    game.draw.rect(W / 2, H * 0.78, W / 2, H * 0.18, C.e, rightFlash > 0 ? 0.4 : 0.1);
    txt('L', W * 0.25, H * 0.87, 72, C.a); txt('R', W * 0.75, H * 0.87, 72, C.e);

    // 距離
    game.draw.rect(snap(W * 0.1), 168, snap(W * 0.8), 24, '#2a0a3a');
    game.draw.rect(snap(W * 0.1), 168, snap(W * 0.8 * progress), 24, speed > 0.5 ? C.c : C.b);
    txt(Math.round(progress * 100) + 'm', W / 2, 220, 44, C.g);
    if (combo > 2) txt('x' + combo, W / 2, H * 0.30, 52, C.c);

    timeBar();
    txt((TIME_LIMIT - elapsed).toFixed(1) + '', W / 2, 96, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
