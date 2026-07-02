// 326-orbit-catch.js
// オービットキャッチ — 軌道を周回する船をタップで内外に乗り換え、同じ軌道のデブリを回収する
// 操作: タップで軌道を切り替える（内→中→外→内）
// 成功: 3個キャッチ  失敗: 3個逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、宇宙ステーション） ──
  var C = { bg:'#020614', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ORBIT CATCH';
  var HOW_TO_PLAY = 'TAP TO SWITCH ORBIT · COLLECT THE DEBRIS';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 25 → 3
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var CX = snap(W / 2), CY = snap(H * 0.48), ORBITS = [snap(W * 0.20), snap(W * 0.32), snap(W * 0.44)];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var shipOrbit, shipAngle, debris, caught, missed, timeLeft, done, spawnTimer, particles, stars, switchAnim;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.16) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1428');
  }

  function background() { game.draw.clear(C.bg); for (var i = 0; i < stars.length; i++) game.draw.rect(stars[i].x, stars[i].y, stars[i].s, stars[i].s, C.g, Math.floor(game.time.elapsed * 3 + i) % 3 === 0 ? 0.7 : 0.25); }

  function spawnDebris() { var oi = Math.floor(Math.random() * 3), dir = Math.random() < 0.5 ? 1 : -1; debris.push({ orbit: oi, angle: Math.random() * Math.PI * 2, speed: (0.8 + Math.random() * 0.6) * dir, age: 0, r: 22 }); }

  function initGame() { shipOrbit = 1; shipAngle = -Math.PI / 2; debris = []; caught = 0; missed = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.4; particles = []; switchAnim = 0; stars = []; for (var i = 0; i < 60; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), s: 8 }); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    pc(CX, CY, 70, C.d, 0.9); pc(CX - 16, CY - 16, 24, C.e, 0.6);
    for (var oi = 0; oi < 3; oi++) ring(CX, CY, ORBITS[oi], oi === shipOrbit ? C.e : '#1a3050', oi === shipOrbit ? 0.5 : 0.3);
    for (var di = 0; di < debris.length; di++) { var d = debris[di], dr = ORBITS[d.orbit], dx = CX + Math.cos(d.angle) * dr, dy = CY + Math.sin(d.angle) * dr; pc(dx, dy, 20, d.orbit === shipOrbit ? C.c : C.f, 0.9); pc(dx - 6, dy - 6, 6, C.g, 0.5); }
    var sr = ORBITS[shipOrbit], sx = CX + Math.cos(shipAngle) * sr, sy = CY + Math.sin(shipAngle) * sr;
    if (switchAnim > 0) ring(sx, sy, 40 + switchAnim * 30, C.g, switchAnim);
    pc(sx, sy, 28, C.b, 0.95); pc(sx - 8, sy - 8, 8, C.g, 0.7);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    shipOrbit = (shipOrbit + 1) % 3; switchAnim = 0.3; game.audio.play('se_tap', 0.25);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); shipAngle += dt * 1.8; drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SALVAGED!' : 'DRIFTED OFF', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (switchAnim > 0) switchAnim -= dt * 2;
      shipAngle += 1.8 * dt;
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnDebris(); spawnTimer = 1.0 - Math.min(0.4, caught * 0.1); }
      var sr = ORBITS[shipOrbit], sx = CX + Math.cos(shipAngle) * sr, sy = CY + Math.sin(shipAngle) * sr;
      for (var di = debris.length - 1; di >= 0; di--) {
        var d = debris[di]; d.angle += d.speed * dt; d.age += dt;
        var dr = ORBITS[d.orbit], dx = CX + Math.cos(d.angle) * dr, dy = CY + Math.sin(d.angle) * dr;
        if (Math.hypot(dx - sx, dy - sy) < 50) { caught++; game.audio.play('se_success', 0.4); for (var k = 0; k < 6; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: dx, y: dy, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.4, col: C.c }); } debris.splice(di, 1); if (caught >= NEEDED) { finish(true); return; } continue; }
        if (d.age > 6) { debris.splice(di, 1); missed++; game.audio.play('se_failure', 0.4); if (missed >= MAX_MISS) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#0a1428');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
