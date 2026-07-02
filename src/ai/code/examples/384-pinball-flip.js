// 384-pinball-flip.js
// ピンボールフリップ — 左右のフリッパーでボールを弾き、的とバンパーを叩いて得点を稼ぐ
// 操作: 画面左タップで左フリッパー、右タップで右フリッパー
// 成功: 8点 獲得  失敗: 3回 ボールアウト or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ピンボール台） ──
  var C = { bg:'#040018', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PINBALL FLIP';
  var HOW_TO_PLAY = 'TAP LEFT / RIGHT FOR THE FLIPPERS · HIT THE TARGETS';
  var MAX_TIME = 20;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_OUTS = 3;
  var BALL_R = 22, GRAVITY = 700, FLIP_LEN = 150;
  var FLX = snap(W * 0.30), FLY = snap(H * 0.86), FRX = snap(W * 0.70), FRY = snap(H * 0.86);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bx, by, bvx, bvy, laL, laR, angL, angR, score, outs, timeLeft, done, particles, targets, bumpers;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#160828');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, 48, H, C.d, 0.7); game.draw.rect(W - 48, 0, 48, H, C.d, 0.7); game.draw.rect(0, 0, W, 48, C.d, 0.7); }

  function resetBall() { bx = W / 2; by = snap(H * 0.36); bvx = (Math.random() - 0.5) * 300; bvy = -200; }

  function tip(cx, cy, ang) { var r = ang * Math.PI / 180; return { x: cx + Math.cos(r) * FLIP_LEN, y: cy + Math.sin(r) * FLIP_LEN }; }

  function reflect(nx, ny) { var dot = bvx * nx + bvy * ny; bvx -= 2 * dot * nx; bvy -= 2 * dot * ny; var sp = Math.hypot(bvx, bvy); if (sp > 1400) { bvx = bvx / sp * 1400; bvy = bvy / sp * 1400; } if (sp < 200) { var f = 200 / sp; bvx *= f; bvy *= f; } }

  function initGame() {
    resetBall(); laL = false; laR = false; angL = 30; angR = 150; score = 0; outs = 0; timeLeft = MAX_TIME; done = false; particles = [];
    targets = [ { x: W * 0.25, y: H * 0.22, r: 46, lit: false, pts: 2 }, { x: W * 0.5, y: H * 0.16, r: 46, lit: false, pts: 3 }, { x: W * 0.75, y: H * 0.22, r: 46, lit: false, pts: 2 }, { x: W * 0.18, y: H * 0.36, r: 36, lit: false, pts: 1 }, { x: W * 0.82, y: H * 0.36, r: 36, lit: false, pts: 1 } ];
    bumpers = [ { x: W * 0.38, y: H * 0.30, r: 34 }, { x: W * 0.62, y: H * 0.30, r: 34 }, { x: W * 0.5, y: H * 0.42, r: 28 } ];
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawTable() {
    for (var bi = 0; bi < bumpers.length; bi++) { var bm = bumpers[bi]; pc(bm.x, bm.y, bm.r, C.e, 0.9); pc(bm.x, bm.y, bm.r * 0.55, C.g, 0.8); }
    for (var ti = 0; ti < targets.length; ti++) { var tg = targets[ti]; pc(tg.x, tg.y, tg.r, tg.lit ? C.b : C.a, 0.9); pc(tg.x, tg.y, tg.r * 0.55, C.g, 0.6); txt(tg.pts + '', tg.x, tg.y + 10, 28, '#000'); }
    var tl = tip(FLX, FLY, angL), tr = tip(FRX, FRY, angR);
    pline(FLX, FLY, tl.x, tl.y, laL ? C.c : C.d, 0.95, 26); pline(FRX, FRY, tr.x, tr.y, laR ? C.c : C.d, 0.95, 26);
    pc(FLX, FLY, 16, C.g, 0.9); pc(FRX, FRY, 16, C.g, 0.9);
    pc(bx, by, BALL_R, C.c, 0.95); pc(bx - 6, by - 6, BALL_R * 0.35, C.g, 0.8);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (x < W / 2) { laL = true; setTimeout(function() { laL = false; }, 180); } else { laR = true; setTimeout(function() { laR = false; }, 180); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!targets) initGame(); background(); drawTable();
      txt(GAME_TITLE, W / 2, H * 0.52, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.58, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.66, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.71, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'JACKPOT!' : 'GAME OVER', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      angL += ((laL ? -30 : 30) - angL) * 15 * dt; angR += ((laR ? 210 : 150) - angR) * 15 * dt;
      bvy += GRAVITY * dt; bx += bvx * dt; by += bvy * dt;
      if (bx - BALL_R < 48) { bx = 48 + BALL_R; bvx = Math.abs(bvx) * 0.85; }
      if (bx + BALL_R > W - 48) { bx = W - 48 - BALL_R; bvx = -Math.abs(bvx) * 0.85; }
      if (by - BALL_R < 48) { by = 48 + BALL_R; bvy = Math.abs(bvy) * 0.85; }
      var flips = [ { cx: FLX, cy: FLY, ang: angL, act: laL }, { cx: FRX, cy: FRY, ang: angR, act: laR } ];
      for (var fi = 0; fi < 2; fi++) { var f = flips[fi], tp = tip(f.cx, f.cy, f.ang), fdx = tp.x - f.cx, fdy = tp.y - f.cy, fl = Math.hypot(fdx, fdy), t = Math.max(0, Math.min(1, ((bx - f.cx) * fdx + (by - f.cy) * fdy) / (fl * fl))), cxp = f.cx + t * fdx, cyp = f.cy + t * fdy, dd = Math.hypot(bx - cxp, by - cyp); if (dd < BALL_R + 14 && bvy > 0) { var nx = (bx - cxp) / dd, ny = (by - cyp) / dd; by = cyp + ny * (BALL_R + 15); if (f.act) bvy -= 600; reflect(nx, ny); game.audio.play('se_tap', 0.4); } }
      for (var bi = 0; bi < bumpers.length; bi++) { var bm = bumpers[bi], d = Math.hypot(bx - bm.x, by - bm.y); if (d < BALL_R + bm.r) { var bnx = (bx - bm.x) / d, bny = (by - bm.y) / d; bx = bm.x + bnx * (BALL_R + bm.r + 2); by = bm.y + bny * (BALL_R + bm.r + 2); reflect(bnx, bny); bvx += bnx * 200; bvy += bny * 200; score++; game.audio.play('se_tap', 0.2); for (var k = 0; k < 4; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: bm.x, y: bm.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.3, col: C.e }); } if (score >= NEEDED) { finish(true); return; } } }
      for (var ti = 0; ti < targets.length; ti++) { var tg = targets[ti], td = Math.hypot(bx - tg.x, by - tg.y); if (td < BALL_R + tg.r && !tg.lit) { tg.lit = true; score += tg.pts; game.audio.play('se_success', 0.5); for (var k2 = 0; k2 < 8; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: tg.x, y: tg.y, vx: Math.cos(a2) * 160, vy: Math.sin(a2) * 160, life: 0.5, col: C.b }); } var tnx = (bx - tg.x) / td, tny = (by - tg.y) / td; bx = tg.x + tnx * (BALL_R + tg.r + 2); by = tg.y + tny * (BALL_R + tg.r + 2); reflect(tnx, tny); if (score >= NEEDED) { finish(true); return; } } }
      var allLit = true; for (var t2 = 0; t2 < targets.length; t2++) if (!targets[t2].lit) allLit = false; if (allLit) for (var t3 = 0; t3 < targets.length; t3++) targets[t3].lit = false;
      if (by > H + 40) { outs++; game.audio.play('se_failure', 0.4); resetBall(); if (outs >= MAX_OUTS) { finish(false); return; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawTable();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.8);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var oi = 0; oi < MAX_OUTS; oi++) game.draw.rect(snap(W / 2 + (oi - (MAX_OUTS - 1) / 2) * 56) - 10, 224, 20, 20, oi < outs ? C.a : '#160828');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
