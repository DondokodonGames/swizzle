// 412-bridge-build.js
// 橋を架ける — 足場の端から棒を伸ばし、ちょうど届く長さで倒して次の足場へ渡っていく
// 操作: タップで棒を伸ばし始め、もう一度タップで止めて倒す
// 成功: 3つ 渡る  失敗: 3回 落ちる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、夜の谷） ──
  var C = { bg:'#04080f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BRIDGE BUILD';
  var HOW_TO_PLAY = 'TAP TO GROW THE STICK · TAP AGAIN TO DROP IT · CROSS OVER';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_FELL = 3;
  var PLAT_H = 80, PLAT_Y = snap(H * 0.68), PSIZE = 34;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var platforms, nextPlatX, curIdx, playerX, playerY, stickLen, stickAng, phase, walkTimer, scrollOff, completed, fell, timeLeft, done, particles, fallFlash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1420');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, PLAT_Y, '#0c1828', 0.9); game.draw.rect(0, PLAT_Y, W, H - PLAT_Y, '#020408', 0.9); }

  function addPlatform() { var prevX = platforms.length > 0 ? platforms[platforms.length - 1].x + platforms[platforms.length - 1].w : W * 0.1; var gap = 180 + Math.random() * 200, w = 100 + Math.random() * 110; platforms.push({ x: prevX + gap, y: PLAT_Y, w: w }); }

  function initGame() { platforms = [{ x: 0, y: PLAT_Y, w: 200 }]; for (var i = 0; i < 5; i++) addPlatform(); curIdx = 0; playerX = 100; playerY = PLAT_Y - PSIZE; stickLen = 0; stickAng = -Math.PI / 2; phase = 'wait'; walkTimer = 0; scrollOff = 0; completed = 0; fell = 0; timeLeft = MAX_TIME; done = false; particles = []; fallFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (completed * 700 + Math.ceil(timeLeft) * 100) : completed * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function resetToCurrent() { if (done) return; stickLen = 0; stickAng = -Math.PI / 2; playerX = platforms[curIdx].x - scrollOff + 50; playerY = PLAT_Y - PSIZE; phase = 'wait'; }

  function drawScene() {
    for (var pi = 0; pi < platforms.length; pi++) { var plt = platforms[pi], px = plt.x - scrollOff; if (px > W + 200 || px + plt.w < -200) continue; game.draw.rect(snap(px), PLAT_Y, snap(plt.w), PLAT_H, C.d, 0.9); game.draw.rect(snap(px), PLAT_Y, snap(plt.w), 16, C.e, 0.6); }
    if (phase !== 'wait' && phase !== 'fell') { var cur = platforms[curIdx], bx = cur.x + cur.w - scrollOff, ex = bx + Math.cos(stickAng) * stickLen, ey = PLAT_Y + Math.sin(stickAng) * stickLen; pline(bx, PLAT_Y, ex, ey, phase === 'walk' ? C.b : C.g, 0.95, 8); }
    pc(playerX, playerY, PSIZE, C.f, 0.9); pc(playerX - 8, playerY - 8, PSIZE * 0.35, C.g, 0.7);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (phase === 'wait') { phase = 'grow'; game.audio.play('se_tap', 0.2); }
    else if (phase === 'grow') phase = 'fall';
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!platforms) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CROSSED!' : 'FELL', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fallFlash > 0) fallFlash -= dt * 2;
      var cur = platforms[curIdx], nxt = platforms[curIdx + 1];
      if (phase === 'grow') { stickLen += 400 * dt; if (stickLen > 800) stickLen = 800; }
      else if (phase === 'fall') {
        stickAng = Math.min(0, stickAng + dt * 4);
        if (stickAng >= 0) {
          stickAng = 0; var endX = (cur.x + cur.w - scrollOff) + stickLen, nl = nxt.x - scrollOff, nr = nxt.x + nxt.w - scrollOff;
          if (endX >= nl && endX <= nr) { phase = 'walk'; walkTimer = 0; game.audio.play('se_success', 0.5); if (Math.abs(endX - (nl + nr) / 2) < 30) for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: endX, y: PLAT_Y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.6, col: C.c }); } }
          else { phase = 'fell'; fell++; fallFlash = 0.6; game.audio.play('se_failure', 0.5); for (var k2 = 0; k2 < 10; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: playerX, y: playerY, vx: Math.cos(a2) * 150, vy: Math.sin(a2) * 200, life: 0.7, col: C.f }); } if (fell >= MAX_FELL) { finish(false); return; } setTimeout(function() { resetToCurrent(); }, 900); }
        }
      } else if (phase === 'walk') {
        walkTimer += dt; var nl2 = nxt.x - scrollOff; playerX = (cur.x + cur.w - scrollOff) + walkTimer * 280;
        if (playerX >= nl2 + 40) { completed++; curIdx++; scrollOff = (platforms[curIdx].x + platforms[curIdx].w / 2) - W * 0.3; stickLen = 0; stickAng = -Math.PI / 2; playerX = platforms[curIdx].x - scrollOff + 40; playerY = PLAT_Y - PSIZE; phase = 'wait'; addPlatform(); game.audio.play('se_tap', 0.3); if (completed >= NEEDED) { finish(true); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fallFlash > 0) game.draw.rect(0, 0, W, H, C.a, fallFlash * 0.15);
    if (phase === 'wait') txt('TAP TO EXTEND', W / 2, snap(H * 0.82), 40, C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(completed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FELL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FELL - 1) / 2) * 56) - 10, 224, 20, 20, fi < fell ? C.a : '#0a1420');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
