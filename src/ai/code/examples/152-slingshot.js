// 152-slingshot.js
// パチンコ — ゴムの張力を感じながら狙いを定めて放つ爽快感
// 操作: 的の方向をタップして発射（引く強さは距離で決まる）
// 成功: 1個の的を割る  失敗: 8発撃ち尽くす or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、射的場） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SLINGSHOT';
  var HOW_TO_PLAY = 'TAP TOWARD A TARGET TO FIRE';
  var MAX_TIME = 15;             // 修正2: 45 → 15
  var NEEDED   = 1;              // 修正2: 10 → 1
  var MAX_AMMO = 8;              // 修正2: 15 → 8
  var TOP    = 220;
  var FORK_X = snap(W / 2), FORK_Y = snap(H * 0.72), FORK_ARM = 88;
  var BALL_R = 26, TARGET_R = 44, GRAVITY = 600;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ball, targets, particles, ammo, score, timeLeft, done, feedback, feedbackOk;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) for (var px = -r; px <= r; px += step) {
      if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
    }
  }

  function pl(x1, y1, x2, y2, color, w) {
    var steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8);
    for (var i = 0; i <= steps; i++) { var t = i / steps; game.draw.rect(snap(x1 + (x2 - x1) * t) - w / 2, snap(y1 + (y2 - y1) * t) - w / 2, w, w, color, 1); }
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

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, FORK_Y + 140, W, H - FORK_Y - 140, C.d, 0.3);
  }

  // ── スプライト（多矩形でキャラクター性） ──
  function drawFork(flying) {
    pl(FORK_X, FORK_Y, FORK_X - FORK_ARM, FORK_Y - FORK_ARM, C.f, 20);
    pl(FORK_X, FORK_Y, FORK_X + FORK_ARM, FORK_Y - FORK_ARM, C.f, 20);
    game.draw.rect(FORK_X - 12, FORK_Y, 24, 140, C.f);
    game.draw.rect(FORK_X - 12, FORK_Y, 24, 8, C.c);
    if (!flying) {
      pl(FORK_X - FORK_ARM, FORK_Y - FORK_ARM, FORK_X, FORK_Y, C.a, 6);
      pl(FORK_X + FORK_ARM, FORK_Y - FORK_ARM, FORK_X, FORK_Y, C.a, 6);
      pc(FORK_X, FORK_Y, BALL_R, C.c, 1);
    }
  }

  function drawTarget(t) {
    if (!t.alive) { if (t.hitTimer > 0) { pc(t.x, t.y, TARGET_R, '#333333', t.hitTimer); txt('X', t.x, t.y - 8, 40, C.e); } return; }
    pc(t.x, t.y, TARGET_R, C.b, 1);
    pc(t.x, t.y, TARGET_R - 12, C.g, 0.9);
    pc(t.x, t.y, 12, C.a, 1);
  }

  function makeTargets() {
    targets = [];
    for (var i = 0; i < 5; i++) targets.push({ x: snap(game.random(120, W - 120)), y: snap(TOP + 40 + game.random(0, H * 0.32)), alive: true, hitTimer: 0 });
  }

  function initGame() {
    ball = { x: FORK_X, y: FORK_Y, vx: 0, vy: 0, flying: false };
    particles = []; ammo = MAX_AMMO; score = 0;
    timeLeft = MAX_TIME; done = false; feedback = 0;
    makeTargets();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + ammo * 40 + Math.ceil(timeLeft) * 20) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ball.flying) return;
    var dx = x - FORK_X, dy = y - FORK_Y, len = Math.hypot(dx, dy);
    if (len < 10) return;
    var power = Math.min(len, 200);
    ball.vx = (dx / len) * power * 4.5; ball.vy = (dy / len) * power * 4.5;
    ball.x = FORK_X; ball.y = FORK_Y; ball.flying = true; ammo--;
    game.audio.play('se_tap', 0.8);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawTarget({ x: W * 0.3, y: H * 0.35, alive: true }); drawTarget({ x: W * 0.7, y: H * 0.3, alive: true });
      drawFork(false);
      txt(GAME_TITLE, W / 2, H * 0.14, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BULLSEYE!' : 'OUT OF AMMO', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (ball.flying) {
        ball.vy += GRAVITY * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        for (var ti = 0; ti < targets.length; ti++) {
          var t = targets[ti];
          if (!t.alive) continue;
          if (Math.hypot(ball.x - t.x, ball.y - t.y) < BALL_R + TARGET_R) {
            t.alive = false; t.hitTimer = 0.6; score++;
            feedbackOk = true; feedback = 0.4;
            game.audio.play('se_success', 0.7);
            for (var pi = 0; pi < 10; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: t.x, y: t.y, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220 - 100, life: 0.5 }); }
            ball.flying = false; ball.x = FORK_X; ball.y = FORK_Y;
            if (score >= NEEDED) { finish(true); return; }
            break;
          }
        }
        if (ball.flying && (ball.x < -80 || ball.x > W + 80 || ball.y > H + 80)) {
          ball.flying = false; ball.x = FORK_X; ball.y = FORK_Y; feedbackOk = false; feedback = 0.3;
          if (ammo <= 0) { finish(false); return; }
        }
      }
      for (var ti2 = 0; ti2 < targets.length; ti2++) if (targets[ti2].hitTimer > 0) targets[ti2].hitTimer -= dt;
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 600 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    background();
    for (var ti3 = 0; ti3 < targets.length; ti3++) drawTarget(targets[ti3]);
    drawFork(ball.flying);
    if (ball.flying) pc(ball.x, ball.y, BALL_R, C.c, 1);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 4, snap(particles[pp].y) - 4, 8, 8, C.b, particles[pp].life * 2.5);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    txt('AMMO ' + ammo, W / 2, H - 120, 44, ammo < 3 ? C.a : C.e);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
