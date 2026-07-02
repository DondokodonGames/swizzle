// 386-bubble-drift.js
// バブルドリフト — 浮かび上がるシャボン玉をタップで左右に押し、落ちてくる針を避けて上空へ運ぶ
// 操作: タップした側と反対へ泡が逃げる（針に当てないよう左右に誘導）
// 成功: 高度300mに 到達  失敗: 針に3回 触れる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、上空） ──
  var C = { bg:'#010818', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BUBBLE DRIFT';
  var HOW_TO_PLAY = 'TAP TO NUDGE THE BUBBLE · DODGE THE NEEDLES · FLOAT UP';
  var MAX_TIME = 15;
  var GOAL = 300;            // 修正2: 800m → 300m
  var MAX_POPS = 3;
  var BUBBLE_R = 58, BUBBLE_Y = snap(H * 0.58), CLIMB = 20;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bx, bvx, alt, pops, needles, spawnTimer, timeLeft, done, particles, flash, bobPhase;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.14) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function altBar() {
    var t = Math.ceil(Math.min(1, alt / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1428');
  }

  function background() {
    game.draw.clear(C.bg);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.15);
    for (var ci = 0; ci < 5; ci++) { var cy = snap((H * 0.15 + ci * H * 0.2 + (alt * 3) % (H * 0.2))), cx = snap(120 + ci * (W / 4)); pc(cx, cy, 50, '#12283f', 0.5); pc(cx + 40, cy + 16, 36, '#12283f', 0.4); }
  }

  function spawnNeedle() { var lane = Math.floor(Math.random() * 5); needles.push({ x: snap(100 + lane * ((W - 200) / 4)), y: -90, speed: 260 + Math.random() * 180, len: 60 + Math.random() * 30 }); }

  function initGame() { bx = W / 2; bvx = 0; alt = 0; pops = 0; needles = []; spawnTimer = 0.6; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; bobPhase = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(alt) * 20 + (MAX_POPS - pops) * 500 + Math.ceil(timeLeft) * 100) : Math.round(alt) * 10;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBubble() {
    var by = BUBBLE_Y + Math.sin(bobPhase) * 10;
    ring(bx, by, BUBBLE_R, C.e, 0.5); pc(bx, by, BUBBLE_R - 6, C.e, 0.2);
    pc(bx - BUBBLE_R * 0.4, by - BUBBLE_R * 0.4, 10, C.g, 0.7); pline(bx - BUBBLE_R * 0.5, by - BUBBLE_R * 0.3, bx - BUBBLE_R * 0.2, by - BUBBLE_R * 0.55, C.g, 0.6, 4);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    bvx += (bx - x > 0 ? 1 : -1) * 340; game.audio.play('se_tap', 0.2);
    for (var k = 0; k < 3; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: bx, y: BUBBLE_Y, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, life: 0.3, col: C.g }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    bobPhase += dt * 3;
    if (state === S.ATTRACT) {
      if (bx === undefined) initGame(); background(); drawBubble();
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
      txt(resultSuccess ? 'SKY HIGH!' : 'POPPED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
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
      alt += CLIMB * dt;
      if (alt >= GOAL) { for (var k = 0; k < 18; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: bx, y: BUBBLE_Y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.8, col: C.c }); } finish(true); return; }
      bx += bvx * dt; bvx *= (1 - 2 * dt);
      if (bx - BUBBLE_R < 0) { bx = BUBBLE_R; bvx = Math.abs(bvx) * 0.6; } if (bx + BUBBLE_R > W) { bx = W - BUBBLE_R; bvx = -Math.abs(bvx) * 0.6; }
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnNeedle(); spawnTimer = 0.6 + Math.random() * 0.5; }
      var by = BUBBLE_Y + Math.sin(bobPhase) * 10;
      for (var ni = needles.length - 1; ni >= 0; ni--) {
        needles[ni].y += needles[ni].speed * dt; var nd = needles[ni];
        if (Math.abs(bx - nd.x) < BUBBLE_R && Math.abs(by - (nd.y + nd.len)) < BUBBLE_R) { pops++; flash = 1; game.audio.play('se_failure', 0.5); for (var k2 = 0; k2 < 12; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: bx, y: by, vx: Math.cos(a2) * 200, vy: Math.sin(a2) * 200, life: 0.6, col: C.e }); } needles.splice(ni, 1); bvx = 0; bx = W / 2; if (pops >= MAX_POPS) { finish(false); return; } continue; }
        if (nd.y > H + 100) needles.splice(ni, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ni2 = 0; ni2 < needles.length; ni2++) { var n2 = needles[ni2]; pline(n2.x, n2.y, n2.x, n2.y + n2.len, C.a, 0.9, 8); pc(n2.x, n2.y + n2.len, 8, C.f, 0.9); }
    drawBubble();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    altBar();
    txt(Math.round(alt) + 'm', W / 2, 96, 44, C.c);
    txt(Math.round(alt) + ' / ' + GOAL + 'm   ' + Math.ceil(timeLeft) + 's', W / 2, 168, 44, C.b);
    for (var pi = 0; pi < MAX_POPS; pi++) game.draw.rect(snap(W / 2 + (pi - (MAX_POPS - 1) / 2) * 56) - 10, 224, 20, 20, pi < pops ? C.a : '#0a1428');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
