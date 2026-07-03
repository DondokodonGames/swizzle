// 438-spin-bottle.js
// ボトルスピン — 回るボトルが止まる向きを、周囲8つのゾーンから予測してタップで賭ける
// 操作: 止まると思うゾーンをタップ（ボトルが回転して結果が出る）
// 成功: 3回 的中  失敗: 3回 外す or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、パーティ） ──
  var C = { bg:'#0a0614', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPIN BOTTLE';
  var HOW_TO_PLAY = 'GUESS WHERE THE BOTTLE STOPS · TAP A ZONE';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_MISS = 3;
  var CX = snap(W / 2), CY = snap(H * 0.44), RADIUS = 300, DECEL = 2.2;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var zones, bottleAngle, bottleSpeed, targetAngle, decelTime, iphase, pick, resultTimer, correct, misses, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.12) game.draw.rect(snap(cx + Math.cos(a) * r) - 3, snap(cy + Math.sin(a) * r) - 3, 6, 6, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#181030');
  }

  function background() { game.draw.clear(C.bg); ring(CX, CY, RADIUS + 50, '#2d1a44', 0.6); }

  function initZones() { zones = []; for (var i = 0; i < 8; i++) { var ang = i * Math.PI / 4; zones.push({ angle: ang, x: CX + Math.cos(ang) * RADIUS, y: CY + Math.sin(ang) * RADIUS }); } }

  function nearestZone(angle) { var norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); return Math.round(norm / (Math.PI / 4)) % 8; }

  function startSpin() { targetAngle = Math.floor(Math.random() * 8) * Math.PI / 4 + (Math.random() - 0.5) * 0.1; var extra = 3 + Math.floor(Math.random() * 4), total = ((extra * Math.PI * 2 + targetAngle - bottleAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) + extra * Math.PI * 2; bottleSpeed = total / DECEL * 2; decelTime = 0; iphase = 'spin'; }

  function initGame() { bottleAngle = 0; bottleSpeed = 0; iphase = 'predict'; pick = -1; resultTimer = 0; correct = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 600 + Math.ceil(timeLeft) * 100) : correct * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawTable() {
    for (var zi = 0; zi < 8; zi++) { var z = zones[zi], picked = zi === pick, landed = iphase === 'result' && zi === nearestZone(bottleAngle), col = landed ? (picked ? C.b : C.a) : picked ? C.d : '#334', al = landed || picked ? 0.9 : 0.5; pc(z.x, z.y, 46, col, al); txt((zi + 1) + '', z.x, z.y + 16, 44, C.g); }
    var tip = { x: CX + Math.cos(bottleAngle) * 180, y: CY + Math.sin(bottleAngle) * 180 }, end = { x: CX - Math.cos(bottleAngle) * 90, y: CY - Math.sin(bottleAngle) * 90 };
    pline(end.x, end.y, tip.x, tip.y, C.b, 0.95, 24); pc(tip.x, tip.y, 14, C.f, 0.9); pc(end.x, end.y, 18, C.b, 0.6); pc(CX, CY, 16, C.f, 0.9);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'predict') return;
    var best = -1, bd = 999; for (var zi = 0; zi < 8; zi++) { var d = Math.hypot(x - zones[zi].x, y - zones[zi].y); if (d < bd) { bd = d; best = zi; } }
    if (best >= 0 && bd < 110) { pick = best; game.audio.play('se_tap', 0.4); startSpin(); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!zones) { initZones(); initGame(); } background(); drawTable();
      txt(GAME_TITLE, W / 2, H * 0.80, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.86, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GOOD READ!' : 'UNLUCKY', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      if (iphase === 'spin') { decelTime += dt; var prog = Math.min(1, decelTime / DECEL), ease = 1 - Math.pow(1 - prog, 3); bottleAngle += bottleSpeed * (1 - ease) * dt; if (prog >= 1) { bottleAngle = targetAngle; iphase = 'result'; resultTimer = 0; var lz = nearestZone(bottleAngle); if (lz === pick) { correct++; flash = 0.8; flashCol = C.b; game.audio.play('se_success', 0.7); for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: zones[lz].x, y: zones[lz].y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.6, col: C.c }); } if (correct >= NEEDED) { finish(true); return; } } else { misses++; flash = 0.7; flashCol = C.a; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) { finish(false); return; } } } }
      else if (iphase === 'result') { resultTimer += dt; if (resultTimer > 1.0) { iphase = 'predict'; pick = -1; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawTable();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (iphase === 'predict') txt('PICK A ZONE', W / 2, snap(H * 0.86), 44, C.c);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#181030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initZones();
    initGame();
  });
})(game);
