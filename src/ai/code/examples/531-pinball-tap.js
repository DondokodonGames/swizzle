// 531-pinball-tap.js
// ピンボールタップ — 跳ね回るボールを下部フリッパーで打ち返し、ターゲットを壊す
// 操作: 画面左タップ=左フリッパー / 右タップ=右フリッパー
// 成功: ターゲット 5個 破壊  失敗: 3回 ボール落下 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ピンボール台） ──
  var C = { bg:'#020008', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PINBALL TAP';
  var HOW_TO_PLAY = 'TAP LEFT / RIGHT TO FLIP · SMASH THE TARGETS';
  var MAX_TIME = 20;
  var NEEDED   = 5;          // 修正2: 10 → 5
  var MAX_LOST = 3;          // 修正2: 5 → 3
  var FLIPPER_Y = snap(H * 0.86), FLIPPER_L = 240, BASE_ANG = 30;
  var LEFT_X = snap(W * 0.28), RIGHT_X = snap(W * 0.72), BALL_R = 28;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ball, leftF, rightF, targets, bumpers, broken, lost, timeLeft, done, particles, flash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0e0620');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, 40, H, '#1a0a3a', 0.9); game.draw.rect(W - 40, 0, 40, H, '#1a0a3a', 0.9); game.draw.rect(0, 280, W, 8, C.d, 0.4); }

  function tip(f, baseX) { var rad = f.angle * Math.PI / 180; return { x: baseX + Math.cos(rad) * FLIPPER_L, y: FLIPPER_Y + Math.sin(rad) * FLIPPER_L }; }

  function activate(f, isLeft) { f.active = true; f.timer = 0.25; f.angle = isLeft ? -40 : 220; game.audio.play('se_tap', 0.4); }

  function initGame() {
    ball = { x: W / 2, y: snap(H * 0.4), vx: 150, vy: -200 };
    leftF = { angle: BASE_ANG, active: false, timer: 0 };
    rightF = { angle: 180 - BASE_ANG, active: false, timer: 0 };
    targets = []; for (var r = 0; r < 2; r++) for (var c = 0; c < 5; c++) targets.push({ x: snap(W * 0.14 + c * (W * 0.72 / 4)), y: snap(H * 0.30 + r * 100), r: 44, hp: 1, anim: 0 });
    bumpers = [{ x: snap(W * 0.3), y: snap(H * 0.52), r: 50 }, { x: snap(W * 0.7), y: snap(H * 0.52), r: 50 }, { x: W / 2, y: snap(H * 0.60), r: 50 }];
    broken = 0; lost = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (broken * 700 + Math.ceil(timeLeft) * 100) : broken * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var bi = 0; bi < bumpers.length; bi++) { var bm = bumpers[bi]; pc(bm.x, bm.y, bm.r + 6, C.d, 0.3); pc(bm.x, bm.y, bm.r, C.d, 0.8); pc(bm.x, bm.y, 16, C.g, 0.5); }
    for (var ti = 0; ti < targets.length; ti++) { var t = targets[ti]; if (t.hp <= 0) continue; var tc = t.anim > 0 ? C.g : C.a; game.draw.rect(t.x - t.r, t.y - 26, t.r * 2, 52, tc, 0.9); game.draw.rect(t.x - t.r, t.y - 26, t.r * 2, 8, C.g, 0.4); }
    var fs = [{ base: LEFT_X, f: leftF }, { base: RIGHT_X, f: rightF }];
    for (var fi = 0; fi < fs.length; fi++) { var tp = tip(fs[fi].f, fs[fi].base); game.draw.line(fs[fi].base, FLIPPER_Y, tp.x, tp.y, C.c, 24); game.draw.line(fs[fi].base, FLIPPER_Y, tp.x, tp.y, C.f, 14); pc(fs[fi].base, FLIPPER_Y, 16, C.c, 0.9); }
    pc(ball.x, ball.y, BALL_R + 4, '#888888', 0.3); pc(ball.x, ball.y, BALL_R, C.g, 0.95); pc(ball.x - 6, ball.y - 6, BALL_R * 0.28, C.e, 0.6);
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (tx < W / 2) activate(leftF, true); else activate(rightF, false);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!ball) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.13, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.175, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.70, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.74, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL CLEAR!' : 'TILT!', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      if (leftF.active) { leftF.timer -= dt; if (leftF.timer <= 0) { leftF.active = false; leftF.angle = BASE_ANG; } }
      if (rightF.active) { rightF.timer -= dt; if (rightF.timer <= 0) { rightF.active = false; rightF.angle = 180 - BASE_ANG; } }

      ball.vy += 900 * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x - BALL_R < 40) { ball.x = 40 + BALL_R; ball.vx = Math.abs(ball.vx) * 0.9; }
      if (ball.x + BALL_R > W - 40) { ball.x = W - 40 - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.9; }
      if (ball.y - BALL_R < 288) { ball.y = 288 + BALL_R; ball.vy = Math.abs(ball.vy) * 0.9; }

      var fs = [{ base: LEFT_X, f: leftF }, { base: RIGHT_X, f: rightF }];
      for (var fi = 0; fi < fs.length; fi++) {
        var tp = tip(fs[fi].f, fs[fi].base), dx = tp.x - fs[fi].base, dy = tp.y - FLIPPER_Y, len2 = dx * dx + dy * dy;
        var tt = Math.max(0, Math.min(1, ((ball.x - fs[fi].base) * dx + (ball.y - FLIPPER_Y) * dy) / len2));
        var cxp = fs[fi].base + tt * dx, cyp = FLIPPER_Y + tt * dy, d = Math.hypot(ball.x - cxp, ball.y - cyp);
        if (d < BALL_R + 12) {
          var nx = (ball.x - cxp) / (d || 1), ny = (ball.y - cyp) / (d || 1);
          ball.x = cxp + nx * (BALL_R + 13); ball.y = cyp + ny * (BALL_R + 13);
          var dot = ball.vx * nx + ball.vy * ny; ball.vx -= 2 * dot * nx; ball.vy -= 2 * dot * ny;
          if (fs[fi].f.active) ball.vy -= 600;
          var sp = Math.hypot(ball.vx, ball.vy); if (sp < 400) { ball.vx = ball.vx / sp * 400; ball.vy = ball.vy / sp * 400; }
          game.audio.play('se_tap', 0.3);
        }
      }
      for (var bi = 0; bi < bumpers.length; bi++) { var bm = bumpers[bi], bdx = ball.x - bm.x, bdy = ball.y - bm.y, bd = Math.hypot(bdx, bdy); if (bd < BALL_R + bm.r) { var bnx = bdx / (bd || 1), bny = bdy / (bd || 1); ball.x = bm.x + bnx * (BALL_R + bm.r + 2); ball.y = bm.y + bny * (BALL_R + bm.r + 2); ball.vx = bnx * 700; ball.vy = bny * 700; game.audio.play('se_tap', 0.2); } }
      for (var ti = 0; ti < targets.length; ti++) {
        var t = targets[ti]; if (t.hp <= 0) continue; t.anim = Math.max(0, t.anim - dt * 4);
        var tdx = ball.x - t.x, tdy = ball.y - t.y, td = Math.hypot(tdx, tdy);
        if (td < BALL_R + t.r) {
          t.hp--; t.anim = 1.0; broken++; game.audio.play('se_success', 0.5);
          for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: t.x, y: t.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: C.a }); }
          var sp = Math.hypot(ball.vx, ball.vy), tnx = tdx / (td || 1), tny = tdy / (td || 1); ball.vx = tnx * sp; ball.vy = tny * sp;
          if (broken >= NEEDED) { finish(true); return; }
        }
      }
      if (ball.y > H) { lost++; flash = 0.5; game.audio.play('se_failure', 0.5); if (lost >= MAX_LOST) { finish(false); return; } ball.x = W / 2; ball.y = snap(H * 0.4); ball.vx = (Math.random() - 0.5) * 200; ball.vy = -300; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.15);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(broken + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var li = 0; li < MAX_LOST; li++) game.draw.rect(snap(W / 2 + (li - (MAX_LOST - 1) / 2) * 56) - 10, 224, 20, 20, li < lost ? C.a : '#0e0620');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
