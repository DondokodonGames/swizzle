// 698-orbit.js
// オービットキャプチャ — 飛んでくる小惑星をタップして惑星の引力圏に捕獲する
// 操作: 小惑星の近くをタップすると引力で惑星へ引き込まれる。画面外へ逃すとミス
// 成功: 10個 捕獲  失敗: 5個 逃す or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、宇宙） ──
  var C = { bg:'#00020a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PLANET = '#7700ff', PLANET_HI = '#a855f7', AST = '#ff6600', AST_HI = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ORBIT CAPTURE';
  var HOW_TO_PLAY = 'TAP NEAR AN ASTEROID TO PULL IT INTO THE PLANET · DO NOT LET THEM ESCAPE';
  var MAX_TIME = 22;
  var NEEDED     = 10;       // 修正2: 20 → 10
  var MAX_ESCAPE = 5;        // 修正2: 15 → 5
  var CX = W / 2, CY = snap(H * 0.45), PLANET_R = 110, CAPTURE_R = 320, AST_R = 28, SPAWN_RATE = 1.5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var asteroids, spawnTimer, captured, escaped, timeLeft, done, elapsed, particles, flash, flashCol, stars, orbitingDebris;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#02040f');
  }

  function background() { game.draw.clear(C.bg); for (var sti = 0; sti < stars.length; sti++) { var s = stars[sti]; var tw = 0.3 + 0.7 * Math.abs(Math.sin(elapsed * 0.8 + s.bright * 10)); game.draw.rect(snap(s.x), snap(s.y), s.r, s.r, C.g, tw * 0.5); } }

  function spawnAsteroid() {
    var side = Math.floor(Math.random() * 4), sx, sy, speed = 170 + Math.random() * 110 + elapsed * 2;
    if (side === 0) { sx = Math.random() * W; sy = -40; } else if (side === 1) { sx = W + 40; sy = Math.random() * H; } else if (side === 2) { sx = Math.random() * W; sy = H + 40; } else { sx = -40; sy = Math.random() * H; }
    var dx = CX + (Math.random() - 0.5) * 400 - sx, dy = CY + (Math.random() - 0.5) * 400 - sy, dist = Math.sqrt(dx * dx + dy * dy);
    asteroids.push({ x: sx, y: sy, vx: dx / dist * speed, vy: dy / dist * speed, r: AST_R + Math.random() * 16, phase: Math.random() * Math.PI * 2, pulled: false });
  }

  function initGame() { asteroids = []; spawnTimer = 0; captured = 0; escaped = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; orbitingDebris = []; stars = []; for (var si = 0; si < 60; si++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() < 0.7 ? 8 : 16, bright: Math.random() }); spawnAsteroid(); spawnAsteroid(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (captured * 500 + Math.ceil(timeLeft) * 100) : captured * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    ring(CX, CY, CAPTURE_R, C.d, 0.12);
    for (var od2 = 0; od2 < orbitingDebris.length; od2++) { var odb = orbitingDebris[od2]; pc(CX + Math.cos(odb.angle) * odb.r, CY + Math.sin(odb.angle) * odb.r, odb.size, AST_HI, Math.min(1, odb.life) * 0.7); }
    pc(CX, CY, PLANET_R, PLANET, 0.9); pc(CX - PLANET_R * 0.25, CY - PLANET_R * 0.3, PLANET_R * 0.3, PLANET_HI, 0.3);
    for (var ai = 0; ai < asteroids.length; ai++) {
      var ast = asteroids[ai];
      pc(ast.x, ast.y, ast.r, ast.pulled ? C.b : AST, 0.9);
      if (ast.pulled) { var dx3 = CX - ast.x, dy3 = CY - ast.y, td = Math.sqrt(dx3 * dx3 + dy3 * dy3); if (td > 0) game.draw.line(ast.x, ast.y, ast.x + dx3 / td * 60, ast.y + dy3 / td * 60, C.b, 2); }
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var best = -1, bestDist = 160 * 160;
    for (var i = 0; i < asteroids.length; i++) { var a = asteroids[i]; if (a.pulled) continue; var dx = tx - a.x, dy = ty - a.y, d2 = dx * dx + dy * dy; if (d2 < bestDist) { bestDist = d2; best = i; } }
    if (best >= 0) { asteroids[best].pulled = true; game.audio.play('se_tap', 0.12); for (var p = 0; p < 3; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: asteroids[best].x, y: asteroids[best].y, vx: Math.cos(pa) * 100, vy: Math.sin(pa) * 100, life: 0.4, col: AST_HI }); } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!asteroids) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GRAVITY WELL!' : 'THEY DRIFTED OFF', W / 2, H * 0.35, 52, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(captured >= NEEDED); return; }
      if (flash > 0) flash -= dt * 3;
      spawnTimer += dt; var rate = Math.max(0.7, SPAWN_RATE - elapsed * 0.01); if (spawnTimer >= rate) { spawnTimer = 0; spawnAsteroid(); }
      for (var i = asteroids.length - 1; i >= 0; i--) {
        var a = asteroids[i]; a.phase += dt * 2;
        if (a.pulled) { var dx = CX - a.x, dy = CY - a.y, dist = Math.sqrt(dx * dx + dy * dy); if (dist > 0) { var pullStr = 800 / dist; a.vx += dx / dist * pullStr * dt * 60; a.vy += dy / dist * pullStr * dt * 60; } }
        a.x += a.vx * dt; a.y += a.vy * dt;
        var dx2 = a.x - CX, dy2 = a.y - CY, dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (dist2 < PLANET_R + a.r) {
          captured++; flash = 0.25; flashCol = C.b; game.audio.play('se_tap', 0.2);
          orbitingDebris.push({ angle: Math.atan2(dy2, dx2), r: PLANET_R + 30 + Math.random() * 60, speed: 0.5 + Math.random() * 0.8, size: a.r * 0.5, life: 8 });
          for (var p2 = 0; p2 < 5; p2++) { var pa2 = Math.random() * Math.PI * 2; particles.push({ x: a.x, y: a.y, vx: Math.cos(pa2) * 160, vy: Math.sin(pa2) * 160, life: 0.5, col: C.b }); }
          asteroids.splice(i, 1);
          if (captured >= NEEDED) { finish(true); return; }
          continue;
        }
        var offW = 200;
        if (a.x < -offW || a.x > W + offW || a.y < -offW || a.y > H + offW) {
          escaped++; flash = 0.3; flashCol = C.a; asteroids.splice(i, 1);
          if (escaped >= MAX_ESCAPE) { finish(false); return; }
          continue;
        }
      }
      for (var od = orbitingDebris.length - 1; od >= 0; od--) { orbitingDebris[od].angle += orbitingDebris[od].speed * dt; orbitingDebris[od].life -= dt; if (orbitingDebris[od].life <= 0) orbitingDebris.splice(od, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.07);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(captured + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    txt('ESC ' + escaped + '/' + MAX_ESCAPE, W * 0.2, 168, 36, C.a);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    state = S.ATTRACT;
    initGame();
  });
})(game);
