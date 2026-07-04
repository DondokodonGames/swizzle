// 607-photon-bounce.js
// フォトンバウンス — 鏡をタップで回転させて反射角を作り、光子をターゲットへ導く
// 操作: 鏡をタップで回転（スワイプで微調整） → 何もない所をタップ/スワイプで発射
// 成功: 5ターゲット 撃破  失敗: 3回 外れ or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、光学ラボ） ──
  var C = { bg:'#000510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PHOTON BOUNCE';
  var HOW_TO_PLAY = 'TAP MIRRORS TO ROTATE THEM · TAP EMPTY SPACE TO FIRE THE PHOTON';
  var MAX_TIME = 22;
  var NEEDED   = 5;          // 修正2: 12 → 5
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var EMITTER_X = W / 2, EMITTER_Y = snap(H * 0.86), MAX_BOUNCES = 5, PHOTON_SPEED = 620;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var mirrors, target, hits, misses, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, photonFired, photonX, photonY, photonVX, photonVY, photonBounces, photonTrail;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 10) * (r - 10)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1a2a');
  }

  function background() { game.draw.clear(C.bg); }

  function reflect(vx, vy, nx, ny) { var dot = vx * nx + vy * ny; return { vx: vx - 2 * dot * nx, vy: vy - 2 * dot * ny }; }

  function spawnPuzzle() {
    mirrors = []; var num = 2 + Math.floor(hits / 3);
    for (var i = 0; i < num; i++) mirrors.push({ x: snap(120 + Math.random() * (W - 240)), y: snap(H * 0.24 + Math.random() * (H * 0.44)), angle: Math.random() * Math.PI, len: 90 });
    target = { x: snap(100 + Math.random() * (W - 200)), y: snap(H * 0.14 + Math.random() * (H * 0.26)), r: 40, phase: Math.random() * Math.PI * 2 };
    photonFired = false; photonTrail = [];
  }

  function initGame() { hits = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; photonFired = false; photonTrail = []; spawnPuzzle(); }

  function firePhoton() { photonX = EMITTER_X; photonY = EMITTER_Y; var ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.6; photonVX = Math.cos(ang) * PHOTON_SPEED; photonVY = Math.sin(ang) * PHOTON_SPEED; photonFired = true; photonBounces = 0; photonTrail = []; game.audio.play('se_tap', 0.3); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 600 + Math.ceil(timeLeft) * 100) : hits * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    if (target) { var pu = 1 + Math.sin(target.phase) * 0.1; pc(target.x, target.y, target.r * pu, C.f, 0.85); ring(target.x, target.y, target.r * 0.6, C.c, 0.4); pc(target.x, target.y, target.r * 0.2, C.g, 0.7); }
    for (var mi = 0; mi < mirrors.length; mi++) {
      var m = mirrors[mi], cos = Math.cos(m.angle), sin = Math.sin(m.angle), h = m.len / 2;
      pc(m.x, m.y, 18, C.d, 0.25);
      game.draw.line(m.x - cos * h, m.y - sin * h, m.x + cos * h, m.y + sin * h, C.g, 8);
      game.draw.line(m.x - cos * h, m.y - sin * h, m.x + cos * h, m.y + sin * h, C.e, 4);
    }
    for (var tr = 0; tr < photonTrail.length; tr++) { var tp = photonTrail[tr]; pc(tp.x, tp.y, 8 * (tp.life / 0.4), C.e, tp.life * 0.8); }
    if (photonFired) { pc(photonX, photonY, 14, C.g, 0.9); pc(photonX, photonY, 26, C.e, 0.3); }
    ring(EMITTER_X, EMITTER_Y, 24, C.e, 0.7); pc(EMITTER_X, EMITTER_Y, 12, C.e, 0.3 + Math.sin(game.time.elapsed * 4) * 0.1);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || photonFired) return;
    var hitM = -1, best = 80;
    for (var mi = 0; mi < mirrors.length; mi++) { var m = mirrors[mi], dx = tx - m.x, dy = ty - m.y, d = Math.sqrt(dx * dx + dy * dy); if (d < best) { best = d; hitM = mi; } }
    if (hitM >= 0) { mirrors[hitM].angle += Math.PI / 6; game.audio.play('se_tap', 0.2); } else firePhoton();
  });

  game.onSwipe(function(dir, x1, y1) {
    if (state !== S.PLAYING || done || photonFired) return;
    for (var mi = 0; mi < mirrors.length; mi++) { var m = mirrors[mi], dx = x1 - m.x, dy = y1 - m.y; if (dx * dx + dy * dy < 80 * 80) { m.angle += (dir === 'left' || dir === 'up') ? -Math.PI / 10 : Math.PI / 10; game.audio.play('se_tap', 0.15); return; } }
    firePhoton();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!mirrors) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'LIGHT MASTER!' : 'BEAM LOST', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (target) target.phase += dt * 3;
      if (photonFired) {
        var steps = 10, sdt = dt / steps;
        for (var st = 0; st < steps && photonFired; st++) {
          photonTrail.push({ x: photonX, y: photonY, life: 0.4 });
          photonX += photonVX * sdt; photonY += photonVY * sdt;
          if (target) { var dx = photonX - target.x, dy = photonY - target.y; if (dx * dx + dy * dy < target.r * target.r) {
            hits++; flash = 0.3; flashCol = C.b; resultText = 'HIT!'; resultTimer = 0.5; game.audio.play('se_success', 0.8);
            for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: target.x, y: target.y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 0.5, col: C.c }); }
            photonFired = false; if (hits >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) spawnPuzzle(); }, 800); break;
          } }
          for (var mi = 0; mi < mirrors.length; mi++) {
            var m = mirrors[mi], cos = Math.cos(m.angle), sin = Math.sin(m.angle), mx = photonX - m.x, my = photonY - m.y;
            var perp = Math.abs(-sin * mx + cos * my), along = cos * mx + sin * my;
            if (perp < 12 && Math.abs(along) < m.len / 2 && photonBounces < MAX_BOUNCES) { var ref = reflect(photonVX, photonVY, -sin, cos); photonVX = ref.vx; photonVY = ref.vy; photonBounces++; game.audio.play('se_tap', 0.15); break; }
          }
          if (photonX < -50 || photonX > W + 50 || photonY < -50 || photonY > H + 50) {
            misses++; flash = 0.3; flashCol = C.a; resultText = 'MISS'; resultTimer = 0.5; game.audio.play('se_failure', 0.3); photonFired = false;
            if (misses >= MAX_MISS) { finish(false); return; } break;
          }
        }
      }
      for (var tr = photonTrail.length - 1; tr >= 0; tr--) { photonTrail[tr].life -= dt * 3; if (photonTrail[tr].life <= 0) photonTrail.splice(tr, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.80), 56, flashCol);
    else if (!photonFired) txt('TAP EMPTY SPACE TO FIRE', W / 2, snap(H * 0.80), 30, C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi2 = 0; mi2 < MAX_MISS; mi2++) game.draw.rect(snap(W / 2 + (mi2 - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi2 < misses ? C.a : '#0a1a2a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
