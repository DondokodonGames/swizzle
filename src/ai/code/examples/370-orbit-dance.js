// 370-orbit-dance.js
// オービットダンス — 軌道を回る惑星をタップ/スワイプで一斉に反転させ、衝突させずに耐える
// 操作: タップまたはスワイプで全惑星の回転方向を反転
// 成功: 10秒 生き延びる  失敗: 惑星同士が衝突

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、宇宙） ──
  var C = { bg:'#020210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PCOL = [C.e, C.a, C.b, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ORBIT DANCE';
  var HOW_TO_PLAY = 'TAP OR SWIPE TO REVERSE ALL ORBITS · AVOID CRASHES';
  var GOAL = 10;             // 修正2: 90秒 → 10秒

  var CX = snap(W / 2), CY = snap(H * 0.46);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var planets, dir, survived, done, particles, stars, flash, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.12) game.draw.rect(snap(cx + Math.cos(a) * r) - 3, snap(cy + Math.sin(a) * r) - 3, 6, 6, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function survBar() {
    var t = Math.ceil(Math.min(1, survived / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#101028');
  }

  function background() {
    game.draw.clear(C.bg);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.2);
    for (var si = 0; si < stars.length; si++) game.draw.rect(stars[si].x, stars[si].y, stars[si].r, stars[si].r, C.g, 0.3 + Math.sin(game.time.elapsed * 2 + si) * 0.2);
  }

  function initStars() { stars = []; for (var i = 0; i < 60; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), r: Math.random() < 0.5 ? 4 : 8 }); }

  function initGame() {
    planets = [
      { r: 180, angle: 0, speed: 1.3, size: 30, col: PCOL[0] },
      { r: 300, angle: Math.PI, speed: 1.0, size: 38, col: PCOL[1] },
      { r: 420, angle: Math.PI / 2, speed: 0.7, size: 32, col: PCOL[2] },
      { r: 520, angle: Math.PI * 1.5, speed: 0.5, size: 26, col: PCOL[3] }
    ];
    dir = 1; survived = 0; done = false; particles = []; flash = 0; fbTimer = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(survived) * 500 + 2000) : Math.round(survived * 200);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function reverse() { dir *= -1; fbTimer = 0.3; game.audio.play('se_tap', 0.4); for (var k = 0; k < 6; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.4, col: C.c }); } }

  function drawScene() {
    // 軌道
    for (var oi = 0; oi < planets.length; oi++) ring(CX, CY, planets[oi].r, '#20203a', 0.7);
    // 太陽
    pc(CX, CY, 48, C.c, 0.9); pc(CX, CY, 30, C.g, 0.8); pc(CX, CY, 60, C.f, 0.12 + Math.sin(game.time.elapsed * 3) * 0.05);
    // 惑星
    for (var pi = 0; pi < planets.length; pi++) {
      var p = planets[pi], px = CX + Math.cos(p.angle) * p.r, py = CY + Math.sin(p.angle) * p.r;
      p.x = px; p.y = py;
      pc(px, py, p.size + 8, p.col, 0.15); pc(px, py, p.size, p.col, 0.95); pc(px - p.size * 0.3, py - p.size * 0.3, p.size * 0.3, C.g, 0.5);
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return; reverse();
  });

  game.onSwipe(function() {
    if (state !== S.PLAYING || done) return; reverse();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!planets) initGame(); background();
      for (var pi = 0; pi < planets.length; pi++) planets[pi].angle += planets[pi].speed * dir * dt * 0.4;
      drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawScene();
      txt(resultSuccess ? 'SURVIVED!' : 'CRASH!', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      survived += dt;
      if (survived >= GOAL) { finish(true); return; }
      if (flash > 0) flash -= dt * 4; if (fbTimer > 0) fbTimer -= dt;
      for (var pi2 = 0; pi2 < planets.length; pi2++) planets[pi2].angle += planets[pi2].speed * dir * dt;
      // 衝突判定
      for (var a = 0; a < planets.length; a++) for (var b = a + 1; b < planets.length; b++) {
        var pa = planets[a], pb = planets[b], pax = CX + Math.cos(pa.angle) * pa.r, pay = CY + Math.sin(pa.angle) * pa.r, pbx = CX + Math.cos(pb.angle) * pb.r, pby = CY + Math.sin(pb.angle) * pb.r;
        if (Math.hypot(pax - pbx, pay - pby) < pa.size + pb.size) {
          flash = 1; game.audio.play('se_failure', 0.8);
          for (var k = 0; k < 18; k++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: (pax + pbx) / 2, y: (pay + pby) / 2, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, life: 0.8, col: C.a }); }
          finish(false); return;
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(dir > 0 ? 'CW >>' : '<< CCW', W / 2, snap(H * 0.80), 48, C.c);

    survBar();
    txt(survived.toFixed(1) + 's', W / 2, 96, 44, C.g);
    txt(survived.toFixed(1) + ' / ' + GOAL + 's', W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initStars();
    initGame();
  });
})(game);
