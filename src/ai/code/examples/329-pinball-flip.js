// 329-pinball-flip.js
// ピンボールフリップ — 左右フリッパーでボールを弾き、バンパーに当てて目標スコアを稼ぐ
// 操作: 画面左タップ=左フリッパー、右タップ=右フリッパー
// 成功: 600点に到達  失敗: ボールを3回落とす

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ピンボール台） ──
  var C = { bg:'#0a0414', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', wall:'#241a4a' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PINBALL FLIP';
  var HOW_TO_PLAY = 'TAP LEFT / RIGHT FOR THE FLIPPERS · HIT 600';
  var TARGET = 600;          // 修正2: 2000 → 600
  var BALL_R = 20, FL_Y = snap(H * 0.82), FL_LEN = 150;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bx, by, bvx, bvy, flipL, flipR, flLon, flRon, bumpers, score, balls, done, particles, fbText, fbTimer;
  var TL = 0.5, TR = Math.PI - 0.5, UL = -0.3, UR = Math.PI + 0.3;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function scoreBar() {
    var t = Math.ceil(Math.min(1, score / TARGET) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#241a4a');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, 40, snap(H * 0.85), C.wall, 0.9); game.draw.rect(W - 40, 0, 40, snap(H * 0.85), C.wall, 0.9); pline(40, snap(H * 0.85), snap(W * 0.28), FL_Y, C.wall, 0.9, 16); pline(W - 40, snap(H * 0.85), snap(W * 0.72), FL_Y, C.wall, 0.9, 16); }

  function resetBall() { bx = W / 2; by = snap(H * 0.35); bvx = (Math.random() - 0.5) * 200; bvy = 100; }

  function initGame() { resetBall(); flipL = TL; flipR = TR; flLon = false; flRon = false; score = 0; balls = 3; done = false; particles = []; fbText = ''; fbTimer = 0;
    bumpers = [{ x: snap(W * 0.25), y: snap(H * 0.32), r: 44, lit: 0, pts: 50 }, { x: snap(W * 0.75), y: snap(H * 0.32), r: 44, lit: 0, pts: 50 }, { x: snap(W * 0.5), y: snap(H * 0.24), r: 44, lit: 0, pts: 100 }, { x: snap(W * 0.35), y: snap(H * 0.46), r: 36, lit: 0, pts: 75 }, { x: snap(W * 0.65), y: snap(H * 0.46), r: 36, lit: 0, pts: 75 }];
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score + balls * 200) : score;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawTable() {
    for (var bi = 0; bi < bumpers.length; bi++) { var b = bumpers[bi], lit = b.lit > 0; ring(b.x, b.y, b.r + (lit ? 8 : 0), lit ? C.c : C.f, lit ? 0.9 : 0.5); pc(b.x, b.y, b.r, lit ? C.c : C.f, lit ? 0.9 : 0.7); pc(b.x, b.y, b.r * 0.35, C.g, 0.5); }
    pline(snap(W * 0.28), FL_Y, snap(W * 0.28) + Math.cos(flipL) * FL_LEN, FL_Y + Math.sin(flipL) * FL_LEN, C.d, 0.95, 22);
    pline(snap(W * 0.72), FL_Y, snap(W * 0.72) + Math.cos(flipR) * FL_LEN, FL_Y + Math.sin(flipR) * FL_LEN, C.d, 0.95, 22);
    pc(bx, by, BALL_R, C.g, 0.95); pc(bx - 6, by - 6, 6, C.e, 0.7);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (x < W / 2) { flLon = true; setTimeout(function() { flLon = false; }, 180); } else { flRon = true; setTimeout(function() { flRon = false; }, 180); }
    game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bumpers) initGame(); background(); drawTable();
      txt(GAME_TITLE, W / 2, H * 0.58, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.64, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'HIGH SCORE!' : 'TILT!', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      if (fbTimer > 0) fbTimer -= dt;
      flipL += ((flLon ? UL : TL) - flipL) * Math.min(1, dt * 14);
      flipR += ((flRon ? UR : TR) - flipR) * Math.min(1, dt * 14);
      bvy += 700 * dt; bx += bvx * dt; by += bvy * dt;
      if (bx < BALL_R + 40) { bx = BALL_R + 40; bvx = Math.abs(bvx) * 0.9; }
      if (bx > W - BALL_R - 40) { bx = W - BALL_R - 40; bvx = -Math.abs(bvx) * 0.9; }
      if (by < BALL_R + 80) { by = BALL_R + 80; bvy = Math.abs(bvy) * 0.8; }
      for (var bi = 0; bi < bumpers.length; bi++) {
        var bp = bumpers[bi], dx = bx - bp.x, dy = by - bp.y, dist = Math.max(1, Math.hypot(dx, dy));
        if (dist < BALL_R + bp.r) { var nx = dx / dist, ny = dy / dist, dot = bvx * nx + bvy * ny; bvx = (bvx - 2 * dot * nx) * 1.1; bvy = (bvy - 2 * dot * ny) * 1.1; var spd = Math.hypot(bvx, bvy); if (spd > 900) { bvx = bvx / spd * 900; bvy = bvy / spd * 900; } bx = bp.x + nx * (BALL_R + bp.r + 2); by = bp.y + ny * (BALL_R + bp.r + 2); score += bp.pts; bp.lit = 0.6; fbText = '+' + bp.pts; fbTimer = 0.7; game.audio.play('se_tap', 0.4); for (var k = 0; k < 5; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: bx, y: by, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.4, col: C.c }); } if (score >= TARGET) { finish(true); return; } }
        if (bp.lit > 0) bp.lit -= dt * 1.5;
      }
      // フリッパー衝突
      var fs = [[snap(W * 0.28), flipL, flLon, 150], [snap(W * 0.72), flipR, flRon, -150]];
      for (var fi = 0; fi < 2; fi++) {
        var fx = fs[fi][0], fa = fs[fi][1], tx = fx + Math.cos(fa) * FL_LEN, ty = FL_Y + Math.sin(fa) * FL_LEN;
        var t = Math.max(0, Math.min(1, ((bx - fx) * (tx - fx) + (by - FL_Y) * (ty - FL_Y)) / (FL_LEN * FL_LEN)));
        var cpx = fx + t * (tx - fx), cpy = FL_Y + t * (ty - FL_Y);
        if (Math.hypot(bx - cpx, by - cpy) < BALL_R + 10 && bvy > 0) { bvy = -(Math.abs(bvy) * 0.9 + 300); bvx += fs[fi][2] ? fs[fi][3] : -fs[fi][3] * 0.2; game.audio.play('se_tap', 0.35); }
      }
      if (by > H + 50) { balls--; if (balls <= 0) { finish(false); return; } game.audio.play('se_failure', 0.3); resetBall(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawTable();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, bx, by - 56, 44, C.c);

    scoreBar();
    txt(String(score).padStart(5, '0'), W / 2, 96, 44, C.c);
    txt(score + ' / ' + TARGET, W / 2, 168, 44, C.b);
    for (var li = 0; li < 3; li++) game.draw.rect(snap(W / 2 + (li - 1) * 56) - 10, 224, 20, 20, li < balls ? C.g : '#241a4a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
