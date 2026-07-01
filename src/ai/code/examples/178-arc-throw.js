// 178-arc-throw.js
// 放物線投石 — 変化する発射角度を見極めてタップ、的に石を当てる爽快感
// 操作: タップで発射
// 成功: 1発命中  失敗: 8発外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、投擲場） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ARC THROW';
  var HOW_TO_PLAY = 'TAP TO FLING THE STONE AT ●';
  var MAX_TIME = 15;             // 修正2: 45 → 15
  var NEEDED   = 1;              // 修正2: 10 → 1
  var MAX_MISS = 8;
  var LX = snap(W * 0.14), LY = snap(H * 0.72), TX = snap(W * 0.82), TY = snap(H * 0.66), TARGET_R = 60, STONE_R = 22;
  var STONE_SPEED = 880, GRAVITY = 1800, AIM_SPEED = 1.1, MIN_A = -Math.PI * 0.85, MAX_A = -Math.PI * 0.12;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var aimAngle, aimDir, stone, arc, score, misses, timeLeft, done, feedback, feedbackOk, particles;

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
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, snap(H * 0.86), W, H, C.d, 0.4);
    game.draw.rect(0, snap(H * 0.86), W, 8, C.b);
  }

  function computeArc(angle) {
    var pts = [], vx = Math.cos(angle) * STONE_SPEED, vy = Math.sin(angle) * STONE_SPEED;
    for (var t = 0; t < 1.8; t += 0.05) { var x = LX + vx * t, y = LY + vy * t + 0.5 * GRAVITY * t * t; pts.push({ x: x, y: y }); if (y > H + 50) break; }
    return pts;
  }

  function drawTarget() {
    var on = Math.floor(game.time.elapsed * 8) % 2 === 0;
    pc(TX, TY, TARGET_R, C.a, on ? 0.95 : 0.8);
    pc(TX, TY, TARGET_R * 0.6, C.g, 0.9);
    pc(TX, TY, 12, C.a, 1);
  }

  function drawLauncher() {
    game.draw.rect(LX - 60, LY + STONE_R, 120, 60, C.d, 0.9);
    game.draw.rect(LX - 60, LY + STONE_R, 120, 8, C.e);
  }

  function initGame() {
    aimAngle = -Math.PI * 0.6; aimDir = 1; stone = null; arc = [];
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; particles = [];
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 30) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || stone) return;
    stone = { x: LX, y: LY, vx: Math.cos(aimAngle) * STONE_SPEED, vy: Math.sin(aimAngle) * STONE_SPEED };
    game.audio.play('se_tap', 0.7);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawTarget(); drawLauncher();
      aimAngle += AIM_SPEED * aimDir * dt; if (aimAngle > MAX_A) { aimAngle = MAX_A; aimDir = -1; } if (aimAngle < MIN_A) { aimAngle = MIN_A; aimDir = 1; }
      arc = computeArc(aimAngle);
      for (var ai = 0; ai < arc.length; ai++) { if (arc[ai].y > H * 0.86) break; game.draw.rect(snap(arc[ai].x) - 4, snap(arc[ai].y) - 4, 8, 8, C.c, (1 - ai / arc.length) * 0.5); }
      pc(LX, LY, STONE_R, C.g, 1);
      txt(GAME_TITLE, W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ON TARGET!' : 'MISSED OUT', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      aimAngle += AIM_SPEED * aimDir * dt; if (aimAngle > MAX_A) { aimAngle = MAX_A; aimDir = -1; } if (aimAngle < MIN_A) { aimAngle = MIN_A; aimDir = 1; }
      arc = computeArc(aimAngle);
      if (stone) {
        stone.vy += GRAVITY * dt; stone.x += stone.vx * dt; stone.y += stone.vy * dt;
        if (Math.hypot(stone.x - TX, stone.y - TY) < STONE_R + TARGET_R) {
          score++; feedbackOk = true; feedback = 0.4;
          game.audio.play('se_success', 0.9);
          for (var pi = 0; pi < 10; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: TX, y: TY, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, life: 0.5 }); }
          stone = null;
          if (score >= NEEDED) { finish(true); return; }
        } else if (stone && (stone.y > H + 50 || stone.x > W + 50)) {
          misses++; feedbackOk = false; feedback = 0.35; stone = null;
          game.audio.play('se_failure', 0.4);
          if (misses >= MAX_MISS) { finish(false); return; }
        }
      }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 400 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    background();
    for (var ai2 = 0; ai2 < arc.length; ai2++) { if (arc[ai2].y > H * 0.86) break; game.draw.rect(snap(arc[ai2].x) - 4, snap(arc[ai2].y) - 4, 8, 8, C.c, (1 - ai2 / arc.length) * 0.5); }
    drawTarget(); drawLauncher();
    if (!stone) pc(LX, LY, STONE_R, C.g, 1); else pc(stone.x, stone.y, STONE_R, C.g, 1);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 44);
      game.draw.rect(mx - 8, 208, 16, 16, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
