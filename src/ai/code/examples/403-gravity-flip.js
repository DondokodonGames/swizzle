// 403-gravity-flip.js
// 重力反転 — タップで重力を上下反転させ、トンネルを流れてくる障害物を避けて走り抜ける
// 操作: タップで重力を反転（上下の壁と障害物に当たると失敗）
// 成功: 800m 走破  失敗: 衝突 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、重力トンネル） ──
  var C = { bg:'#050210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GRAVITY FLIP';
  var HOW_TO_PLAY = 'TAP TO FLIP GRAVITY · DODGE THE PILLARS · RUN 800m';
  var MAX_TIME = 15;
  var GOAL = 800;            // 修正2: 3000 → 800
  var TOP = snap(H * 0.20), BOT = snap(H * 0.82), TH = snap(H * 0.82) - snap(H * 0.20);
  var PX = snap(W * 0.24), PR = 28, GRAV = 1800, SCROLL = 300, GAP = 300;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var py, pvy, gravDir, scrollX, distance, obstacles, nextObX, timeLeft, done, particles, trail, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function distBar() {
    var t = Math.ceil(Math.min(1, distance / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#181030');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, TOP, C.d, 0.6); game.draw.rect(0, BOT, W, H - BOT, C.d, 0.6); game.draw.rect(0, TOP - 4, W, 4, C.e, 0.6); game.draw.rect(0, BOT, W, 4, C.e, 0.6); }

  function spawnObstacle() { var gapY = 80 + Math.random() * (TH - GAP - 80); obstacles.push({ x: nextObX + scrollX, topH: gapY, botH: TH - gapY - GAP }); nextObX += 340 + Math.random() * 160; }

  function initGame() { py = (TOP + BOT) / 2; pvy = 0; gravDir = 1; scrollX = 0; distance = 0; obstacles = []; nextObX = 640; timeLeft = MAX_TIME; done = false; particles = []; trail = []; flash = 0; spawnObstacle(); spawnObstacle(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(distance) * 5 + Math.ceil(timeLeft) * 100) : Math.round(distance) * 3;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function crash() { flash = 0.5; for (var k = 0; k < 14; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: PX, y: py, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: C.a }); } game.audio.play('se_failure', 0.6); finish(false); }

  function drawScene() {
    for (var oi = 0; oi < obstacles.length; oi++) { var o = obstacles[oi], ox = o.x - scrollX; if (ox > W + 100 || ox < -200) continue; game.draw.rect(snap(ox - 36), TOP, 72, snap(o.topH), C.d, 0.9); game.draw.rect(snap(ox - 36), TOP, 72, 6, C.a, 0.6); game.draw.rect(snap(ox - 36), snap(BOT - o.botH), 72, snap(o.botH), C.d, 0.9); game.draw.rect(snap(ox - 36), snap(BOT - o.botH), 72, 6, C.a, 0.6); }
    for (var ti = 0; ti < trail.length; ti++) if (trail[ti].life > 0) pc(trail[ti].x, trail[ti].y, PR * 0.6 * trail[ti].life, C.e, trail[ti].life * 0.5);
    pc(PX, py, PR, C.e, 0.9); pc(PX - PR * 0.3, py - PR * 0.3, PR * 0.3, C.g, 0.7); txt(gravDir > 0 ? 'v' : '^', PX, py + 12, 32, '#000');
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return; gravDir *= -1; pvy *= 0.4; game.audio.play('se_tap', 0.3); for (var k = 0; k < 6; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: PX, y: py, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100, life: 0.4, col: C.g }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!obstacles) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.15, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CLEARED!' : 'CRASH', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
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
      scrollX += SCROLL * dt; distance += SCROLL * dt / 4;
      if (distance >= GOAL) { finish(true); return; }
      pvy += GRAV * gravDir * dt; pvy = Math.max(-1200, Math.min(1200, pvy)); py += pvy * dt;
      if (py - PR < TOP || py + PR > BOT) { crash(); return; }
      while (nextObX < scrollX + W + 200) spawnObstacle();
      trail.push({ x: PX, y: py, life: 0.5 }); if (trail.length > 16) trail.shift(); for (var ti = trail.length - 1; ti >= 0; ti--) trail[ti].life -= dt * 2;
      for (var oi = 0; oi < obstacles.length; oi++) { var o = obstacles[oi], ox = o.x - scrollX; if (ox > W + 100 || ox < -200) continue; if (PX + PR > ox - 36 && PX - PR < ox + 36 && (py - PR < TOP + o.topH || py + PR > BOT - o.botH)) { crash(); return; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.18);

    distBar();
    txt(Math.round(distance) + 'm', W / 2, 96, 44, C.c);
    txt(Math.round(distance) + ' / ' + GOAL + 'm', W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
