// 353-ghost-chase.js
// ゴーストチェイス — 暗闇を横切るゴーストを、タップで動かす懐中電灯の光で照らし退治する
// 操作: タップで光を向けてゴーストを照らす（照らし切ると退治）
// 成功: 5体退治  失敗: 3体に通り抜けられる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、心霊の夜） ──
  var C = { bg:'#000508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GHOST CHASE';
  var HOW_TO_PLAY = 'TAP TO AIM THE LIGHT · BURN THE GHOSTS AWAY';
  var MAX_TIME = 15;
  var NEEDED   = 5;          // 修正2: 15 → 5
  var MAX_PASS = 3;          // 修正2: 5 → 3
  var TORCH_R = 200;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var torchX, torchY, ghosts, killed, passed, timeLeft, done, spawnTimer, particles, hitAnims;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a0a14');
  }

  function background() { game.draw.clear(C.bg); ring(torchX, torchY, TORCH_R, C.c, 0.12); ring(torchX, torchY, TORCH_R * 0.6, C.c, 0.18); pc(torchX, torchY, 24, C.c, 0.6); }

  function spawnGhost() { var side = Math.random() < 0.5 ? 0 : 1, spd = 70 + Math.random() * 70; ghosts.push({ x: side === 0 ? -60 : W + 60, y: snap(H * 0.22 + Math.random() * H * 0.5), vx: side === 0 ? spd : -spd, r: 44, wob: Math.random() * Math.PI * 2, lit: 0, dying: false, dt: 0 }); }

  function initGame() { torchX = W / 2; torchY = H * 0.5; ghosts = []; killed = 0; passed = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.3; particles = []; hitAnims = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (killed * 500 + Math.ceil(timeLeft) * 100) : killed * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGhost(g) {
    var col = g.dying ? C.e : g.lit > 0.3 ? C.e : C.d, al = 0.25 + g.lit * 0.7, wy = Math.sin(g.wob) * 10;
    pc(g.x, g.y + wy - 8, g.r, col, al);
    for (var ti = -2; ti <= 2; ti++) pc(g.x + ti * 18, g.y + wy + 36, 14, col, al * 0.8);
    if (g.lit > 0.2) { game.draw.rect(snap(g.x - 16), snap(g.y + wy - 18), 12, 12, C.g, al); game.draw.rect(snap(g.x + 6), snap(g.y + wy - 18), 12, 12, C.g, al); if (g.lit > 0.5) txt('!', g.x, g.y + wy - 56, 34, C.c); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    torchX = x; torchY = y; game.audio.play('se_tap', 0.15);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!ghosts) initGame(); background(); drawGhost({ x: W * 0.5, y: H * 0.5, r: 44, wob: game.time.elapsed * 2, lit: 0.4, dying: false });
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      game.draw.clear(C.bg);
      txt(resultSuccess ? 'EXORCISED!' : 'HAUNTED', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnGhost(); spawnTimer = 1.1 - Math.min(0.6, (MAX_TIME - timeLeft) * 0.04); }
      for (var gi = ghosts.length - 1; gi >= 0; gi--) {
        var g = ghosts[gi];
        if (g.dying) { g.dt += dt; for (var pk = 0; pk < 2; pk++) { var a = Math.random() * Math.PI * 2; particles.push({ x: g.x, y: g.y, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100 - 50, life: 0.4, col: C.e }); } if (g.dt > 0.4) ghosts.splice(gi, 1); continue; }
        g.wob += dt * 2; g.x += g.vx * dt; g.y += Math.sin(g.wob) * 20 * dt;
        var dist = Math.hypot(g.x - torchX, g.y - torchY); g.lit = dist < TORCH_R ? 1 - dist / TORCH_R : 0;
        if (g.lit > 0.3) g.vx *= (1 - 2 * dt);
        if (g.lit > 0.7) { g.dying = true; killed++; hitAnims.push({ x: g.x, y: g.y, life: 0.6 }); game.audio.play('se_success', 0.4); if (killed >= NEEDED) { finish(true); return; } continue; }
        if (g.x < -120 || g.x > W + 120) { ghosts.splice(gi, 1); passed++; game.audio.play('se_failure', 0.3); if (passed >= MAX_PASS) { finish(false); return; } }
      }
      for (var ha = hitAnims.length - 1; ha >= 0; ha--) { hitAnims[ha].life -= dt * 2; if (hitAnims[ha].life <= 0) hitAnims.splice(ha, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var gi2 = 0; gi2 < ghosts.length; gi2++) drawGhost(ghosts[gi2]);
    for (var ha2 = 0; ha2 < hitAnims.length; ha2++) { ring(hitAnims[ha2].x, hitAnims[ha2].y, 80 * (1 - hitAnims[ha2].life), C.b, hitAnims[ha2].life); txt('POOF!', hitAnims[ha2].x, hitAnims[ha2].y, 40, C.b); }
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(killed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var pi = 0; pi < MAX_PASS; pi++) game.draw.rect(snap(W / 2 + (pi - (MAX_PASS - 1) / 2) * 56) - 10, 224, 20, 20, pi < passed ? C.a : '#0a0a14');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
