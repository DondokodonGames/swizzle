// 258-whack-ghost.js
// ゴーストたたき — 穴から現れる幽霊のうち、実体（濃い）だけを叩き、偽物（薄い）は見逃す判別モグラ叩き
// 操作: 濃い本物の幽霊をタップ（薄い偽物は叩かない）
// 成功: 3体叩く  失敗: 偽物を3回叩く or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、幽霊屋敷） ──
  var C = { bg:'#06040f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WHACK GHOST';
  var HOW_TO_PLAY = 'HIT SOLID GHOSTS · IGNORE THE FAINT FAKES';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 20 → 3
  var MAX_FAKE = 3;          // 修正2: 5 → 3
  var COLS = 3, ROWS = 3, TOP = 320;
  var CW = W / COLS, CH = snap((H * 0.5) / ROWS);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var holes, ghostTimer, hits, fakeHits, timeLeft, done, particles, fbText, fbCol, fbTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, TOP - 20, W, ROWS * CH + 40, C.d, 0.2); }

  function initHoles() { holes = []; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) holes.push({ cx: c * CW + CW / 2, cy: TOP + r * CH + CH * 0.6, ghost: null }); }

  function drawHole(h) { pc(h.cx, h.cy, 54, '#05030f', 0.9); }

  function drawGhost(h) {
    var g = h.ghost; if (!g) return;
    var prog = g.phase === 'rise' ? g.t / g.dur : g.phase === 'stay' ? 1 : 1 - g.t / g.dur;
    var gy = h.cy - prog * 70, col = g.hitFlash > 0 ? C.a : (g.fake ? C.e : C.d), alpha = g.hitFlash > 0 ? 0.9 : (g.fake ? 0.35 : 0.95);
    pc(h.cx, gy - 24, 40 * prog, col, alpha);
    game.draw.rect(snap(h.cx) - 14, snap(gy - 34), 8, 8, C.g, 0.8 * alpha); game.draw.rect(snap(h.cx) + 6, snap(gy - 34), 8, 8, C.g, 0.8 * alpha);
  }

  function spawnGhost() {
    var empty = []; for (var i = 0; i < holes.length; i++) if (!holes[i].ghost) empty.push(i);
    if (!empty.length) return;
    var idx = empty[Math.floor(Math.random() * empty.length)], fake = Math.random() < 0.35;
    holes[idx].ghost = { phase: 'rise', t: 0, dur: 0.25, stayDur: fake ? 1.0 : 0.8, sinkDur: 0.2, fake: fake, hitFlash: 0 };
  }

  function initGame() { initHoles(); ghostTimer = 0.8; hits = 0; fakeHits = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 400 + Math.ceil(timeLeft) * 60) : hits * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < holes.length; i++) {
      var h = holes[i]; if (!h.ghost || h.ghost.phase === 'sink') continue;
      if ((x - h.cx) * (x - h.cx) + (y - h.cy) * (y - h.cy) < 70 * 70) {
        var g = h.ghost;
        if (g.fake) { fakeHits++; fbText = 'FAKE!'; fbCol = C.a; fbTimer = 0.5; g.hitFlash = 0.3; game.audio.play('se_failure', 0.5); if (fakeHits >= MAX_FAKE) { finish(false); return; } }
        else { hits++; fbText = 'GOT IT!'; fbCol = C.b; fbTimer = 0.5; game.audio.play('se_success', 0.6); for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: h.cx, y: h.cy, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130 - 50, life: 0.5 }); } h.ghost = null; if (hits >= NEEDED) { finish(true); return; } }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!holes) initGame(); background(); for (var i = 0; i < holes.length; i++) drawHole(holes[i]);
      pc(W * 0.35, H * 0.5, 40, C.d, 0.95); txt('REAL', W * 0.35, H * 0.58, 30, C.d);
      pc(W * 0.65, H * 0.5, 40, C.e, 0.35); txt('FAKE', W * 0.65, H * 0.58, 30, C.e);
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BUSTED!' : 'FOOLED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      ghostTimer -= dt; if (ghostTimer <= 0) { spawnGhost(); ghostTimer = 0.6 * (0.7 + Math.random() * 0.6); }
      for (var i = 0; i < holes.length; i++) { var g = holes[i].ghost; if (!g) continue; if (g.hitFlash > 0) g.hitFlash -= dt; g.t += dt; if (g.phase === 'rise' && g.t >= g.dur) { g.phase = 'stay'; g.t = 0; } else if (g.phase === 'stay' && g.t >= g.stayDur) { g.phase = 'sink'; g.t = 0; } else if (g.phase === 'sink' && g.t >= g.sinkDur) holes[i].ghost = null; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var i2 = 0; i2 < holes.length; i2++) drawHole(holes[i2]);
    for (var i3 = 0; i3 < holes.length; i3++) drawGhost(holes[i3]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, C.b, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.88, 48, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_FAKE; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_FAKE - 1) / 2) * 56) - 10, 224, 20, 20, mm < fakeHits ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
