// 626-shield-bash.js
// シールドバッシュ — スワイプ/タップで盾の向きを変え、四方から迫る岩を弾き返す
// 操作: 上下左右スワイプで盾をその向きへ（タップで時計回りに切替）。岩を盾で受ける
// 成功: 8回 弾き返し  失敗: 3回 被弾 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、防衛戦） ──
  var C = { bg:'#0a0408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SHIELD BASH';
  var HOW_TO_PLAY = 'SWIPE TO POINT THE SHIELD · TAP TO ROTATE · BLOCK THE INCOMING ROCKS';
  var MAX_TIME = 18;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_HITS = 3;          // 修正2: 5 → 3
  var CX = W / 2, CY = snap(H * 0.55);
  var SHIELD_DIRS = ['up', 'right', 'down', 'left'];
  var SHIELD_ANGLES = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI };

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var shieldDir, rocks, blocked, hits, timeLeft, done, particles, flash, flashCol, spawnTimer, shieldGlow;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#1a0a14');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnRock() {
    var ang = Math.random() * Math.PI * 2, sr = 700, rx = CX + Math.cos(ang) * sr, ry = CY + Math.sin(ang) * sr;
    var speed = 260 + Math.random() * 90 + (MAX_TIME - timeLeft) * 5, dx = CX - rx, dy = CY - ry, dist = Math.sqrt(dx * dx + dy * dy);
    rocks.push({ x: rx, y: ry, vx: dx / dist * speed, vy: dy / dist * speed, r: 30 + Math.random() * 16 });
  }

  function initGame() { shieldDir = 'right'; rocks = []; blocked = 0; hits = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; spawnTimer = 0; shieldGlow = 0; spawnRock(); spawnRock(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (blocked * 500 + Math.ceil(timeLeft) * 100) : blocked * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function shieldBounds() {
    var ang = SHIELD_ANGLES[shieldDir], LEN = 140, DIST = 96, sx = CX + Math.cos(ang) * DIST, sy = CY + Math.sin(ang) * DIST, nx = Math.cos(ang + Math.PI / 2) * LEN / 2, ny = Math.sin(ang + Math.PI / 2) * LEN / 2;
    return { x: sx, y: sy, p1x: sx + nx, p1y: sy + ny, p2x: sx - nx, p2y: sy - ny, normalX: Math.cos(ang), normalY: Math.sin(ang) };
  }

  function distToSeg(px, py, ax, ay, bx, by) { var dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy; if (len2 === 0) return Math.sqrt((px - ax) * (px - ax) + (py - ay) * (py - ay)); var t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)), pjx = ax + t * dx, pjy = ay + t * dy; return Math.sqrt((px - pjx) * (px - pjx) + (py - pjy) * (py - pjy)); }

  function drawScene() {
    for (var ri = 0; ri < rocks.length; ri++) { var r = rocks[ri]; pc(r.x, r.y, r.r, '#a8a29e', 0.9); pc(r.x - r.r * 0.3, r.y - r.r * 0.3, r.r * 0.25, C.g, 0.4); }
    pc(CX, CY, 46, C.b, 0.9); pc(CX - 12, CY - 12, 16, C.g, 0.5);
    var sh = shieldBounds();
    game.draw.line(sh.p1x, sh.p1y, sh.p2x, sh.p2y, C.g, 20 + shieldGlow * 10);
    game.draw.line(sh.p1x, sh.p1y, sh.p2x, sh.p2y, C.e, 12);
    pc(sh.x, sh.y, 14, C.g, 0.8);
    for (var di = 0; di < SHIELD_DIRS.length; di++) { var da = SHIELD_ANGLES[SHIELD_DIRS[di]], ax = CX + Math.cos(da) * 170, ay = CY + Math.sin(da) * 170, act = SHIELD_DIRS[di] === shieldDir; pc(ax, ay, act ? 20 : 12, act ? C.e : '#1a0a14', act ? 0.7 : 0.4); }
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (SHIELD_ANGLES[dir] !== undefined) { shieldDir = dir; shieldGlow = 0.3; game.audio.play('se_tap', 0.2); }
  });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var idx = SHIELD_DIRS.indexOf(shieldDir); shieldDir = SHIELD_DIRS[(idx + 1) % SHIELD_DIRS.length]; shieldGlow = 0.2; game.audio.play('se_tap', 0.15);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!rocks) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IMPENETRABLE!' : 'SHATTERED', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 4; if (shieldGlow > 0) shieldGlow -= dt * 2;
      spawnTimer += dt; if (spawnTimer > Math.max(0.7, 1.6 - (MAX_TIME - timeLeft) * 0.04)) { spawnTimer = 0; spawnRock(); }
      var sh = shieldBounds();
      for (var ri = rocks.length - 1; ri >= 0; ri--) {
        var r = rocks[ri]; r.x += r.vx * dt; r.y += r.vy * dt;
        var d = distToSeg(r.x, r.y, sh.p1x, sh.p1y, sh.p2x, sh.p2y);
        if (d < r.r + 10) {
          var dot = r.vx * sh.normalX + r.vy * sh.normalY;
          if (dot < 0) {
            blocked++; shieldGlow = 0.5; flash = 0.2; flashCol = C.b; game.audio.play('se_success', 0.5);
            r.vx -= 2 * dot * sh.normalX; r.vy -= 2 * dot * sh.normalY; r.vx *= 1.2; r.vy *= 1.2;
            for (var p = 0; p < 8; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: r.x, y: r.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.4, col: C.e }); }
            if (blocked >= NEEDED) { finish(true); return; }
          }
        }
        var pdx = r.x - CX, pdy = r.y - CY;
        if (pdx * pdx + pdy * pdy < (r.r + 42) * (r.r + 42)) {
          hits++; rocks.splice(ri, 1); flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.5);
          for (var p2 = 0; p2 < 8; p2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(a2) * 200, vy: Math.sin(a2) * 200, life: 0.4, col: C.b }); }
          if (hits >= MAX_HITS) { finish(false); return; } continue;
        }
        if (r.x < -100 || r.x > W + 100 || r.y < -100 || r.y > H + 100) rocks.splice(ri, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p3 = particles[pp]; p3.x += p3.vx * dt; p3.y += p3.vy * dt; p3.life -= dt * 2; if (p3.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(blocked + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#1a0a14');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
