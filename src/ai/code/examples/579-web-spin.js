// 579-web-spin.js
// ウェブスピン — クモの巣に捕まった虫を、スワイプで弾いて巣の外へ逃がす。時間切れ前に助ける
// 操作: 虫の上からスワイプした方向へ弾き飛ばす（巣の外に出れば救出、放置で奥へ逃げる）
// 操作補助: タップで虫を少し揺らせる
// 成功: 虫 6匹 救出  失敗: 3匹 逃がす or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、蜘蛛の巣） ──
  var C = { bg:'#08040c', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CX = W / 2, CY = snap(H * 0.42), WEB_R = 340, RINGS = 5, SPOKES = 8;

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WEB SPIN';
  var HOW_TO_PLAY = 'SWIPE A TRAPPED BUG OUTWARD TO FLING IT FREE OF THE WEB';
  var MAX_TIME = 18;
  var NEEDED   = 6;          // 修正2: 15 → 6
  var MAX_ESCAPE = 3;        // 修正2: 8 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bugs, freed, escaped, timeLeft, done, particles, nextBug, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#180a1a');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var ri = 1; ri <= RINGS; ri++) { var r = WEB_R * ri / RINGS; for (var si2 = 0; si2 < SPOKES; si2++) { var a1 = si2 / SPOKES * Math.PI * 2, a2 = (si2 + 1) / SPOKES * Math.PI * 2; game.draw.line(CX + Math.cos(a1) * r, CY + Math.sin(a1) * r, CX + Math.cos(a2) * r, CY + Math.sin(a2) * r, '#886688', 0.4); } }
    for (var si = 0; si < SPOKES; si++) { var sa = si / SPOKES * Math.PI * 2; game.draw.line(CX, CY, CX + Math.cos(sa) * WEB_R, CY + Math.sin(sa) * WEB_R, '#ccaacc', 2); }
    pc(CX, CY, 30, C.d, 0.95); pc(CX, CY, 18, '#221122', 0.95);
    for (var li = 0; li < 8; li++) { var la = li / 8 * Math.PI * 2 + game.time.elapsed * 0.5; game.draw.line(CX + Math.cos(la) * 22, CY + Math.sin(la) * 22, CX + Math.cos(la) * 50, CY + Math.sin(la) * 50, C.d, 4); }
  }

  function spawnBug() { var ring = 1 + Math.floor(Math.random() * (RINGS - 1)), spoke = Math.floor(Math.random() * SPOKES), r = WEB_R * ring / RINGS, ang = spoke / SPOKES * Math.PI * 2, ml = 3 + Math.random() * 2.5; bugs.push({ x: CX + Math.cos(ang) * r, y: CY + Math.sin(ang) * r, r: 24 + Math.random() * 10, type: Math.random() < 0.6 ? 0 : 1, life: ml, maxLife: ml, vx: 0, vy: 0, flying: false }); }

  function initGame() { bugs = []; freed = 0; escaped = 0; timeLeft = MAX_TIME; done = false; particles = []; nextBug = 0.8; flash = 0; flashCol = C.b; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (freed * 700 + Math.ceil(timeLeft) * 100) : freed * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var bi = 0; bi < bugs.length; bi++) {
      var b = bugs[bi], bc = b.type === 0 ? C.b : C.c, lr = b.life / b.maxLife, pulse = 1 + Math.sin(game.time.elapsed * 6 + bi) * 0.1;
      if (!b.flying) pc(b.x, b.y, b.r + (1 - lr) * 6, '#886688', 0.15);
      pc(b.x, b.y, b.r * pulse, bc, b.flying ? 0.95 : lr * 0.85 + 0.1); pc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, C.g, 0.5);
      if (!b.flying && lr < 0.4) pc(b.x, b.y, b.r + 16, C.a, (0.4 - lr) * 0.5 + Math.sin(game.time.elapsed * 10) * 0.1);
    }
  }

  // ── 入力 ──
  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    var best = null, bd = 110; for (var bi = 0; bi < bugs.length; bi++) { if (bugs[bi].flying) continue; var d = Math.hypot(x1 - bugs[bi].x, y1 - bugs[bi].y); if (d < bd) { bd = d; best = bugs[bi]; } }
    if (!best) return;
    var sdx = x2 - x1, sdy = y2 - y1, slen = Math.hypot(sdx, sdy); if (slen < 30) return;
    var sp = Math.min(slen * 4, 1600); best.vx = sdx / slen * sp; best.vy = sdy / slen * sp; best.flying = true; game.audio.play('se_tap', 0.3);
  });

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var bi = 0; bi < bugs.length; bi++) { if (bugs[bi].flying) continue; if (Math.hypot(tx - bugs[bi].x, ty - bugs[bi].y) < bugs[bi].r + 20) { bugs[bi].vx += (Math.random() - 0.5) * 100; bugs[bi].vy += (Math.random() - 0.5) * 100; game.audio.play('se_tap', 0.15); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bugs) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL FREED!' : 'TOO MANY LOST', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
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
      nextBug -= dt; if (nextBug <= 0) { spawnBug(); nextBug = Math.max(0.6, 1.2 - freed * 0.05); }
      for (var bi = bugs.length - 1; bi >= 0; bi--) {
        var b = bugs[bi];
        if (b.flying) {
          b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= Math.pow(0.4, dt); b.vy *= Math.pow(0.4, dt);
          if (Math.hypot(b.x - CX, b.y - CY) > WEB_R + b.r) { freed++; flash = 0.3; flashCol = C.b; game.audio.play('se_success', 0.6); for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4, col: b.type === 0 ? C.b : C.c }); } bugs.splice(bi, 1); if (freed >= NEEDED) { finish(true); return; } continue; }
          if (Math.abs(b.vx) < 20 && Math.abs(b.vy) < 20) { b.flying = false; b.vx = 0; b.vy = 0; }
        } else { b.life -= dt; if (b.life <= 0) { escaped++; flash = 0.25; flashCol = C.a; game.audio.play('se_failure', 0.3); bugs.splice(bi, 1); if (escaped >= MAX_ESCAPE) { finish(false); return; } } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(freed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ESCAPE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ESCAPE - 1) / 2) * 56) - 10, 224, 20, 20, ei < escaped ? C.a : '#180a1a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
