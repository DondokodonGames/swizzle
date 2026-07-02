// 252-lava-jump.js
// ラバジャンプ — 迫り上がる溶岩から逃れ、石柱から石柱へ飛び移って高みへ登り続ける
// 操作: タップで上の石柱へジャンプ
// 成功: 高度12m到達  失敗: 溶岩に落ちる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、溶岩洞窟） ──
  var C = { bg:'#0a0300', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LAVA JUMP';
  var HOW_TO_PLAY = 'TAP A PILLAR ABOVE TO LEAP UP';
  var MAX_TIME = 15;
  var TOP = 220, PILLAR_W = 150, GOAL = 12 * 70;
  var COLSX = [W * 0.22, W * 0.5, W * 0.78];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pillars, pp, pjumping, jumpAnim, jfx, jfy, jtx, jty, jtarget, lavaY, lavaSpeed, altitude, timeLeft, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a1000');
  }

  function background() { game.draw.clear(C.bg); }

  function initPillars() {
    pillars = [];
    for (var i = 0; i < 12; i++) { var col = COLSX[i % 3], py = snap(H * 0.72 - i * 150), h = 200 + Math.random() * 180; pillars.push({ cx: snap(col), topY: py, baseY: py + h, h: h }); }
    pp = 0;
  }

  function drawPillar(p) {
    game.draw.rect(snap(p.cx - PILLAR_W / 2), snap(p.topY), PILLAR_W, Math.max(0, p.baseY - p.topY), C.d, 0.8);
    game.draw.rect(snap(p.cx - PILLAR_W / 2) - 8, snap(p.topY), PILLAR_W + 16, 14, C.f, 0.9);
  }

  function initGame() { initPillars(); px(); pjumping = false; jumpAnim = 0; jtarget = -1; lavaY = H * 0.9; lavaSpeed = 40; altitude = 0; timeLeft = MAX_TIME; done = false; particles = []; }
  var playerX, playerY;
  function px() { playerX = pillars[0].cx; playerY = pillars[0].topY - 30; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(timeLeft) * 100) : Math.floor(altitude / 70) * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawLava() { for (var xi = 0; xi < W; xi += 16) game.draw.rect(xi, snap(lavaY + Math.sin(xi * 0.03 + game.time.elapsed * 4) * 12), 16, H - lavaY, C.a, 0.9); game.draw.rect(0, snap(lavaY), W, 8, C.f, 0.9); }
  function drawPlayer() { pc(playerX, playerY, 26, C.c, 0.95); game.draw.rect(snap(playerX) - 8, snap(playerY) - 8, 6, 6, '#000'); game.draw.rect(snap(playerX) + 2, snap(playerY) - 8, 6, 6, '#000'); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || pjumping) return;
    var cur = pillars[pp], target = -1, bestY = Infinity;
    for (var pi = 0; pi < pillars.length; pi++) { if (pi === pp) continue; var p = pillars[pi]; var dy = cur.topY - p.topY; if (dy > 20 && dy < 420 && Math.abs(x - p.cx) < PILLAR_W && dy < bestY) { bestY = dy; target = pi; } }
    if (target < 0) return;
    var tp = pillars[target]; pjumping = true; jumpAnim = 0; jfx = playerX; jfy = playerY; jtx = tp.cx; jty = tp.topY - 30; jtarget = target; game.audio.play('se_tap', 0.4);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!pillars) initGame(); background(); for (var i = 0; i < pillars.length; i++) drawPillar(pillars[i]); drawPlayer(); drawLava();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.80, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.86, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.91, 40, '#664433');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ESCAPED!' : 'MELTED', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      var rise = lavaSpeed * dt; altitude += rise; lavaSpeed = 40 + altitude / GOAL * 50;
      for (var pi2 = 0; pi2 < pillars.length; pi2++) { pillars[pi2].topY += rise * 0.6; pillars[pi2].baseY += rise * 0.6; }
      if (!pjumping) playerY += rise * 0.6; else { jfy += rise * 0.6; jty += rise * 0.6; }
      lavaY += rise * 0.4;
      if (altitude >= GOAL) { finish(true); return; }
      var hi = Infinity; for (var pi3 = 0; pi3 < pillars.length; pi3++) if (pillars[pi3].topY < hi) hi = pillars[pi3].topY;
      while (hi > TOP - 150) { hi -= 150; var col = COLSX[Math.floor(Math.random() * 3)], h = 200 + Math.random() * 180; pillars.push({ cx: snap(col), topY: hi, baseY: hi + h, h: h }); }
      if (pjumping) { jumpAnim += dt / 0.4; if (jumpAnim >= 1) { jumpAnim = 1; pjumping = false; pp = jtarget; game.audio.play('se_tap', 0.3); } var t = jumpAnim, arc = Math.sin(t * Math.PI) * -110; playerX = jfx + (jtx - jfx) * t; playerY = jfy + (jty - jfy) * t + arc; }
      if (playerY > lavaY - 10) { finish(false); return; }
      if (Math.random() < 0.3) particles.push({ x: Math.random() * W, y: lavaY, vx: game.random(-60, 60), vy: -(80 + Math.random() * 100), life: 0.6, size: 8 + Math.random() * 10 });
      for (var pp2 = particles.length - 1; pp2 >= 0; pp2--) { var p = particles[pp2]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp2, 1); }
    }

    // ---- 描画 ----
    background();
    for (var pi4 = 0; pi4 < pillars.length; pi4++) drawPillar(pillars[pi4]);
    drawPlayer();
    for (var pp3 = 0; pp3 < particles.length; pp3++) pc(particles[pp3].x, particles[pp3].y, particles[pp3].size * particles[pp3].life, particles[pp3].life > 0.3 ? C.f : C.a, particles[pp3].life * 1.2);
    drawLava();

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(altitude / 70) + ' / 12m', W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
