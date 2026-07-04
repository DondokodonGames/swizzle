// 704-laser-aim.js
// レーザーエイム — 中心を周回する照準がターゲットに重なった瞬間に発射する
// 操作: タップでレーザー発射。照準の向きにビームが飛び、ターゲットを撃つ
// 成功: 8体 撃破  失敗: 3発 外す or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、射撃場） ──
  var C = { bg:'#020810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LASER AIM';
  var HOW_TO_PLAY = 'THE RETICLE ORBITS THE CORE · TAP TO FIRE WHEN IT LINES UP WITH THE TARGET';
  var MAX_TIME = 22;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var CX = W / 2, CY = snap(H * 0.45), ORBIT_R = 280, RETICLE_R = 60, TARGET_R = 52;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var reticleAngle, reticleSpeed, reticleX, reticleY, target, laserBeam, hits, misses, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, targetFlash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.a : '#04060f');
  }

  function background() { game.draw.clear(C.bg); }

  function placeTarget() { var angle = Math.random() * Math.PI * 2, r = 80 + Math.random() * 180; target.x = CX + Math.cos(angle) * r; target.y = CY + Math.sin(angle) * r; targetFlash = 0; }

  function initGame() { reticleAngle = 0; reticleSpeed = 1.8; reticleX = CX; reticleY = CY; target = { x: CX, y: CY }; laserBeam = null; hits = 0; misses = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; targetFlash = 0; placeTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 500 + Math.ceil(timeLeft) * 100) : hits * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    ring(CX, CY, ORBIT_R, '#ffffff10', 1);
    game.draw.line(0, CY, W, CY, '#ffffff05', 2); game.draw.line(CX, 0, CX, H, '#ffffff05', 2);
    // Target
    pc(target.x, target.y, TARGET_R, C.b, 0.85 + targetFlash * 0.15);
    game.draw.line(target.x - TARGET_R, target.y, target.x + TARGET_R, target.y, C.g, 3); game.draw.line(target.x, target.y - TARGET_R, target.x, target.y + TARGET_R, C.g, 3);
    if (targetFlash > 0) ring(target.x, target.y, TARGET_R + 20, C.b, targetFlash * 0.35);
    if (laserBeam) { game.draw.line(laserBeam.x1, laserBeam.y1, laserBeam.x2, laserBeam.y2, C.a, 4); game.draw.line(laserBeam.x1, laserBeam.y1, laserBeam.x2, laserBeam.y2, C.c, 2); }
    pc(CX, CY, 24, '#334155', 0.9); pc(CX, CY, 12, '#94a3b8', 0.9);
    game.draw.line(CX, CY, reticleX, reticleY, '#ff207922', 2);
    ring(reticleX, reticleY, RETICLE_R, C.a, 0.6);
    game.draw.line(reticleX - RETICLE_R, reticleY, reticleX + RETICLE_R, reticleY, C.a, 4); game.draw.line(reticleX, reticleY - RETICLE_R, reticleX, reticleY + RETICLE_R, C.a, 4);
    pc(reticleX, reticleY, 10, C.c, 0.9);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var dx = reticleX - CX, dy = reticleY - CY, dist = Math.sqrt(dx * dx + dy * dy), dirX = dist > 0 ? dx / dist : 1, dirY = dist > 0 ? dy / dist : 0;
    laserBeam = { x1: CX, y1: CY, x2: CX + dirX * 1200, y2: CY + dirY * 1200, life: 0.25 }; game.audio.play('se_tap', 0.15);
    var tdx = target.x - CX, tdy = target.y - CY, t = tdx * dirX + tdy * dirY, closestX = CX + dirX * t, closestY = CY + dirY * t;
    var perpDist = Math.sqrt((target.x - closestX) * (target.x - closestX) + (target.y - closestY) * (target.y - closestY));
    if (perpDist < TARGET_R + 15 && t > 0) {
      hits++; targetFlash = 0.8; flash = 0.3; flashCol = C.b; resultText = 'HIT!'; resultTimer = 0.5; game.audio.play('se_success', 0.5);
      for (var p = 0; p < 7; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: target.x, y: target.y, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.5, col: C.b }); }
      placeTarget(); reticleSpeed = Math.min(3.8, 1.8 + hits * 0.12);
      if (hits >= NEEDED) { finish(true); return; }
    } else {
      misses++; flash = 0.3; flashCol = C.a; resultText = 'MISS!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!target) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.08, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.115, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARPSHOOTER!' : 'OUT OF AMMO', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (targetFlash > 0) targetFlash -= dt * 3;
      reticleAngle += reticleSpeed * dt; reticleX = CX + Math.cos(reticleAngle) * ORBIT_R; reticleY = CY + Math.sin(reticleAngle) * ORBIT_R;
      if (laserBeam) { laserBeam.life -= dt * 4; if (laserBeam.life <= 0) laserBeam = null; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.87), 64, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#04060f');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
