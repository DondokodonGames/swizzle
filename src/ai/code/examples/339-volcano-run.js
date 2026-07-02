// 339-volcano-run.js
// ボルケーノラン — 噴火する火山から走って逃げ、降ってくる岩をタップジャンプで避けて目標距離へ
// 操作: タップでジャンプ（岩を飛び越える）
// 成功: 600m逃げ切る  失敗: 岩に3回当たる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、噴火の山） ──
  var C = { bg:'#1a0500', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', ground:'#3a1808', rock:'#555' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'VOLCANO RUN';
  var HOW_TO_PLAY = 'TAP TO JUMP OVER FALLING ROCKS · ESCAPE';
  var MAX_TIME = 15;
  var GOAL = 600;            // 修正2: 1500m → 600m
  var MAX_HITS = 3;
  var GROUND_Y = snap(H * 0.80), RX = snap(W * 0.25), GRAV = 1500, JUMP = -720;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ry, rvy, onGround, rocks, scroll, dist, hits, timeLeft, done, particles, eruptions, invin, groundOff;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function distBar() {
    var t = Math.ceil(Math.min(1, dist / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#3a1808');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, 0, W, snap(H * 0.7), '#3b0a00', 0.6);
    // 火山
    game.draw.rect(snap(W * 0.72), snap(H * 0.14), 200, snap(H * 0.66), '#150800', 0.9); pc(snap(W * 0.84), snap(H * 0.17), 50, C.f, 0.8); pc(snap(W * 0.84), snap(H * 0.16), 30, C.c, 0.7);
    game.draw.rect(0, GROUND_Y, W, H, C.ground, 0.9); game.draw.rect(0, GROUND_Y, W, 12, C.f, 0.4);
    for (var gx = -groundOff; gx < W; gx += 200) game.draw.rect(snap(gx), GROUND_Y + 12, 80, 4, C.f, 0.3);
  }

  function spawnRock() { var sz = 30 + Math.random() * 30; rocks.push({ x: W + sz + Math.random() * 200, y: GROUND_Y - sz, vx: -scroll + (Math.random() - 0.5) * 60, vy: -260 - Math.random() * 160, r: sz, roll: false }); }

  function initGame() { ry = GROUND_Y - 30; rvy = 0; onGround = true; rocks = []; scroll = 240; dist = 0; hits = 0; timeLeft = MAX_TIME; done = false; particles = []; eruptions = []; invin = 0; groundOff = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(dist) * 20 + (MAX_HITS - hits) * 500 + Math.ceil(timeLeft) * 100) : Math.round(dist) * 20;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawRunner() {
    var al = invin > 0 ? (Math.floor(game.time.elapsed * 16) % 2 ? 0.4 : 0.9) : 0.9, leg = onGround ? (Math.floor(game.time.elapsed * 12) % 2 ? 12 : -12) : 0;
    pc(RX, ry - 14, 18, C.c, al); game.draw.rect(snap(RX) - 6, snap(ry), 12, 30, C.c, al);
    game.draw.rect(snap(RX) - 12 + leg, snap(ry + 26), 8, 22, C.c, al); game.draw.rect(snap(RX) + 4 - leg, snap(ry + 26), 8, 22, C.c, al);
  }

  function drawRock(r) { pc(r.x, r.y, r.r, C.rock, 0.9); pc(r.x - r.r * 0.3, r.y - r.r * 0.3, r.r * 0.3, '#888', 0.5); }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (onGround) { rvy = JUMP; onGround = false; game.audio.play('se_tap', 0.25); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawRunner();
      txt(GAME_TITLE, W / 2, H * 0.32, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.38, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.50, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.56, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ESCAPED!' : 'CRUSHED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('DIST ' + Math.round(dist) + 'm', W / 2, H * 0.45, 52, C.c);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.54, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.66, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; scroll = 240 + (MAX_TIME - timeLeft) * 12; dist += scroll * dt / 3; groundOff = (groundOff + dt * 60) % 200;
      if (timeLeft <= 0) { finish(false); return; }
      if (invin > 0) invin -= dt;
      rvy += GRAV * dt; ry += rvy * dt; if (ry >= GROUND_Y - 30) { ry = GROUND_Y - 30; rvy = 0; onGround = true; }
      if (Math.random() < dt * 3) { var ea = -Math.PI / 2 + (Math.random() - 0.5) * 0.8; eruptions.push({ x: W * 0.84, y: H * 0.16, vx: Math.cos(ea) * (100 + Math.random() * 100), vy: Math.sin(ea) * (200 + Math.random() * 150), life: 1.0, col: Math.random() < 0.5 ? C.f : C.a }); }
      var st = 0; for (var s = 0; s < rocks.length; s++) if (rocks[s].x > W - 200) st = 1;
      if (!st && Math.random() < dt * 1.5) spawnRock();
      for (var ri = rocks.length - 1; ri >= 0; ri--) {
        var r = rocks[ri]; r.vy += 800 * dt; r.x += r.vx * dt; r.y += r.vy * dt;
        if (r.y >= GROUND_Y - r.r) { r.y = GROUND_Y - r.r; r.vy = -Math.abs(r.vy) * 0.4; if (Math.abs(r.vy) < 20) r.vy = 0; }
        if (invin <= 0 && Math.hypot(RX - r.x, ry - r.y) < r.r + 22) { hits++; invin = 1.5; game.audio.play('se_failure', 0.5); for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: RX, y: ry, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.f }); } if (hits >= MAX_HITS) { finish(false); return; } }
        if (r.x < -200) rocks.splice(ri, 1);
      }
      if (dist >= GOAL) { finish(true); return; }
      for (var ei = eruptions.length - 1; ei >= 0; ei--) { var e = eruptions[ei]; e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 400 * dt; e.life -= dt; if (e.life <= 0) eruptions.splice(ei, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ei2 = 0; ei2 < eruptions.length; ei2++) game.draw.rect(snap(eruptions[ei2].x) - 6, snap(eruptions[ei2].y) - 6, 12, 12, eruptions[ei2].col, eruptions[ei2].life);
    for (var ri2 = 0; ri2 < rocks.length; ri2++) drawRock(rocks[ri2]);
    drawRunner();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    distBar();
    txt(Math.round(dist) + 'm', W / 2, 96, 44, C.c);
    txt(Math.round(dist) + ' / ' + GOAL + 'm   ' + Math.ceil(timeLeft) + 's', W / 2, 168, 44, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#3a1808');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
