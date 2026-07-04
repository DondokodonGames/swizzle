// 652-orbit-tap.js
// オービットタップ — 周回する衛星が緑の通過ゾーンに重なった瞬間、衛星をタップする
// 操作: 光る軌道の衛星がゾーンに来たらタップ。早すぎ・遅すぎはミス
// 成功: 12回 通過  失敗: 3回 外し or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、軌道管制） ──
  var C = { bg:'#020408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ORBIT TAP';
  var HOW_TO_PLAY = 'TAP THE GLOWING SATELLITE WHEN IT CROSSES THE GREEN ZONE';
  var MAX_TIME = 18;
  var NEEDED   = 12;         // 修正2: 20 → 12
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var CX = W / 2, CY = snap(H * 0.46), ZONE_HALF = 0.24;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var orbits, activeOrbit, correct, misses, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, gameElapsed, stars;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#030609');
  }

  function background() { game.draw.clear(C.bg); for (var st = 0; st < stars.length; st++) { var s = stars[st]; game.draw.rect(snap(s.x), snap(s.y), 8, 8, C.g, 0.2 + Math.sin(gameElapsed * 0.5 + s.p) * 0.1); } }

  function nextOrbit() { activeOrbit = Math.floor(Math.random() * orbits.length); orbits[activeOrbit].zoneAngle = Math.random() * Math.PI * 2; }

  function initGame() {
    orbits = [{ r: 200, speed: 1.2, angle: 0, zoneAngle: 0 }, { r: 330, speed: -0.85, angle: Math.PI * 0.7, zoneAngle: Math.PI * 0.3 }, { r: 450, speed: 0.6, angle: Math.PI * 1.4, zoneAngle: Math.PI * 1.1 }];
    correct = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; gameElapsed = 0; stars = []; for (var i = 0; i < 35; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, p: Math.random() * 6 }); nextOrbit();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 400 + Math.ceil(timeLeft) * 100) : correct * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var orbitCols = [C.d, C.e, C.a];
    for (var oi = 0; oi < orbits.length; oi++) {
      var orb = orbits[oi];
      for (var dot = 0; dot < 36; dot++) { var da = (dot / 36) * Math.PI * 2; game.draw.rect(snap(CX + Math.cos(da) * orb.r) - 3, snap(CY + Math.sin(da) * orb.r) - 3, 6, 6, orbitCols[oi], oi === activeOrbit ? 0.4 : 0.2); }
      if (oi === activeOrbit) for (var za = -10; za <= 10; za++) { var zA = orb.zoneAngle + za * (ZONE_HALF / 10); pc(CX + Math.cos(zA) * orb.r, CY + Math.sin(zA) * orb.r, 12, C.b, 0.35 - Math.abs(za) * 0.03); }
      var sx = CX + Math.cos(orb.angle) * orb.r, sy = CY + Math.sin(orb.angle) * orb.r, act = oi === activeOrbit;
      if (act) { var ad = Math.abs(((orb.angle - orb.zoneAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (ad < ZONE_HALF * 2) pc(sx, sy, 54, C.b, (1 - ad / (ZONE_HALF * 2)) * 0.3); }
      pc(sx, sy, 32, act ? C.c : '#64748b', act ? 0.9 : 0.5); pc(sx - 8, sy - 8, 12, C.g, act ? 0.5 : 0.3);
    }
    pc(CX, CY, 60, C.d, 0.9); pc(CX - 18, CY - 18, 22, C.e, 0.4);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var orb = orbits[activeOrbit], satX = CX + Math.cos(orb.angle) * orb.r, satY = CY + Math.sin(orb.angle) * orb.r;
    var dx = tx - satX, dy = ty - satY, dist = Math.sqrt(dx * dx + dy * dy);
    var ad = Math.abs(((orb.angle - orb.zoneAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI), inZone = ad < ZONE_HALF, onSat = dist < 90;
    if (onSat && inZone) {
      correct++; flash = 0.25; flashCol = C.b; resultText = 'PASS!'; resultTimer = 0.5; game.audio.play('se_success', 0.5);
      for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: satX, y: satY, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.4, col: C.c }); }
      if (correct >= NEEDED) { finish(true); return; } nextOrbit();
    } else if (onSat) { misses++; flash = 0.3; flashCol = C.a; resultText = 'MISTIMED'; resultTimer = 0.5; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!orbits) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.08, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.12, 20, C.b);
      if (Math.floor(gameElapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.94, 40, C.a);
      gameElapsed += dt;
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ORBIT SYNC!' : 'DRIFTED OFF', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(gameElapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      gameElapsed += dt;
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; gameElapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4; if (resultTimer > 0) resultTimer -= dt;
      var sm = 1 + (MAX_TIME - timeLeft) * 0.01;
      for (var i = 0; i < orbits.length; i++) orbits[i].angle += orbits[i].speed * sm * dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.86), 60, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#030609');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
