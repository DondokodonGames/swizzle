// 279-orbit-sync.js
// オービットシンク — 各惑星の公転速度をタップで切り替え、全惑星を目標マークへ同時に合わせる
// 操作: 惑星をタップで速度を高速/低速に切替
// 成功: 2回全同期  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、天体シミュ） ──
  var C = { bg:'#03010f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ORBIT SYNC';
  var HOW_TO_PLAY = 'TAP PLANETS TO TOGGLE SPEED · ALIGN TO MARKS';
  var MAX_TIME = 15;
  var NEEDED   = 2;           // 修正2: 5 → 2
  var CX = snap(W / 2), CY = snap(H * 0.46), WINDOW = 0.18;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var planets, synced, cooldown, timeLeft, done, flash, particles, stars;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.14) game.draw.rect(snap(cx + Math.cos(a) * r) - 3, snap(cy + Math.sin(a) * r) - 3, 6, 6, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a0a24');
  }

  function background() { game.draw.clear(C.bg); for (var si = 0; si < stars.length; si++) game.draw.rect(stars[si].x, stars[si].y, 4, 4, C.g, 0.2 + 0.15 * (Math.floor(game.time.elapsed * 2 + si) % 2)); }

  function angDiff(a, b) { var d = ((a - b) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; return Math.abs(d); }
  function allSynced() { for (var i = 0; i < planets.length; i++) if (angDiff(planets[i].angle, planets[i].target) > WINDOW) return false; return true; }

  function initGame() {
    planets = [ { orbitR: 130, angle: 0, speeds: [0.8, 1.6], si: 0, r: 24, col: C.e, target: 0 }, { orbitR: 220, angle: Math.PI / 3, speeds: [0.5, 1.0], si: 0, r: 28, col: C.b, target: Math.PI * 1.5 }, { orbitR: 310, angle: Math.PI, speeds: [0.3, 0.6], si: 0, r: 26, col: C.a, target: Math.PI } ];
    synced = 0; cooldown = 0; timeLeft = MAX_TIME; done = false; flash = 0; particles = [];
    stars = []; for (var i = 0; i < 50; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H) });
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (synced * 600 + Math.ceil(timeLeft) * 60) : synced * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawSystem() {
    for (var pi = 0; pi < planets.length; pi++) { var p = planets[pi]; ring(CX, CY, p.orbitR, C.d, 0.4); var tx = CX + Math.cos(p.target) * p.orbitR, ty = CY + Math.sin(p.target) * p.orbitR; ring(tx, ty, p.r + 8, C.c, 0.5 + 0.3 * (Math.floor(game.time.elapsed * 4) % 2)); }
    pc(CX, CY, 44, C.f, 0.9); pc(CX, CY, 22, C.c, 0.8);
    for (var pj = 0; pj < planets.length; pj++) { var p2 = planets[pj], px = CX + Math.cos(p2.angle) * p2.orbitR, py = CY + Math.sin(p2.angle) * p2.orbitR; pc(px, py, p2.r, p2.col, 0.95); txt(p2.si ? 'F' : 'S', px, py + p2.r + 22, 24, p2.col); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var pi = 0; pi < planets.length; pi++) { var p = planets[pi], px = CX + Math.cos(p.angle) * p.orbitR, py = CY + Math.sin(p.angle) * p.orbitR; if ((x - px) * (x - px) + (y - py) * (y - py) < 70 * 70) { p.si = 1 - p.si; game.audio.play('se_tap', 0.3); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); for (var i = 0; i < planets.length; i++) planets[i].angle += planets[i].speeds[0] * dt; drawSystem();
      txt(GAME_TITLE, W / 2, H * 0.12, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.18, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALIGNED!' : 'DRIFTED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (cooldown > 0) cooldown -= dt; if (flash > 0) flash -= dt;
      for (var pi = 0; pi < planets.length; pi++) { var p = planets[pi]; p.angle += p.speeds[p.si] * dt; if (p.angle > Math.PI * 2) p.angle -= Math.PI * 2; }
      if (cooldown <= 0 && allSynced()) { synced++; flash = 0.8; cooldown = 1.2; game.audio.play('se_success', 0.8); for (var pj = 0; pj < planets.length; pj++) { planets[pj].target = Math.random() * Math.PI * 2; var px = CX + Math.cos(planets[pj].angle) * planets[pj].orbitR, py = CY + Math.sin(planets[pj].angle) * planets[pj].orbitR; for (var k = 0; k < 6; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: px, y: py, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: planets[pj].col }); } } if (synced >= NEEDED) { finish(true); return; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var q = particles[pp]; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; if (q.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    if (flash > 0) game.draw.rect(0, 0, W, H, C.c, flash * 0.15);
    drawSystem();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(synced + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    txt('ALIGN ALL TO THE MARKS', W / 2, H - 100, 36, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
