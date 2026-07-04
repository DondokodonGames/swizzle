// 721-crystal-crack.js
// クリスタルクラック — クリスタルを周回する弱点を狙ってタップし、叩き割る
// 操作: 光る弱点スポットをタップ。3回当てると1個粉砕。外すとミス
// 成功: 8個 粉砕  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、クリスタル） ──
  var C = { bg:'#020614', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CRYSTAL = '#7700ff', CRYSTAL_HI = '#c7d2fe', WEAK = '#ff6600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CRYSTAL CRACK';
  var HOW_TO_PLAY = 'TAP THE ORBITING WEAK SPOT · THREE HITS SHATTER THE CRYSTAL';
  var MAX_TIME = 22;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var CX = W / 2, CY = snap(H * 0.45), CRYSTAL_W = 220, CRYSTAL_H = 300, WEAK_R = 22, ORBIT_R = 160;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var weakAngle, weakSpeed, crystalHealth, crackLines, shakeX, shakeY, shakeTimer, glowAnim, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#04081c');
  }

  function background() { game.draw.clear(C.bg); }

  function resetCrystal() { crystalHealth = 3; crackLines = []; weakSpeed = Math.min(4.5, 1.8 + score * 0.2); }
  function weakX() { return CX + Math.cos(weakAngle) * ORBIT_R; }
  function weakY() { return CY + Math.sin(weakAngle) * ORBIT_R; }

  function initGame() { weakAngle = 0; weakSpeed = 1.8; score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; shakeX = 0; shakeY = 0; shakeTimer = 0; glowAnim = 0; resetCrystal(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 600 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var cx = CX + shakeX, cy = CY + shakeY, wx = cx + Math.cos(weakAngle) * ORBIT_R, wy = cy + Math.sin(weakAngle) * ORBIT_R;
    var alpha = crystalHealth > 0 ? 0.85 : 0.2;
    game.draw.rect(cx - CRYSTAL_W / 2, cy - CRYSTAL_H / 2, CRYSTAL_W, CRYSTAL_H, CRYSTAL, alpha);
    game.draw.rect(cx - CRYSTAL_W / 2, cy - CRYSTAL_H / 2, CRYSTAL_W, 12, CRYSTAL_HI, 0.35); game.draw.rect(cx - CRYSTAL_W / 2, cy - CRYSTAL_H / 2, 12, CRYSTAL_H, CRYSTAL_HI, 0.2);
    for (var hi = 0; hi < 3; hi++) game.draw.rect(snap(cx - 40 + hi * 40) - 12, snap(cy + CRYSTAL_H / 2 + 30), 24, 24, hi < crystalHealth ? CRYSTAL_HI : '#1e1b4b', 0.9);
    for (var ci = 0; ci < crackLines.length; ci++) { var cl = crackLines[ci]; game.draw.line(cl.x1 + shakeX, cl.y1 + shakeY, cl.x2 + shakeX, cl.y2 + shakeY, CRYSTAL_HI, 3); }
    for (var ti = 1; ti <= 5; ti++) { var ta = weakAngle - ti * 0.25; pc(cx + Math.cos(ta) * ORBIT_R, cy + Math.sin(ta) * ORBIT_R, WEAK_R * (0.3 + ti * 0.06), WEAK, (6 - ti) * 0.05); }
    pc(wx, wy, WEAK_R, WEAK, 0.92); pc(wx - WEAK_R * 0.3, wy - WEAK_R * 0.3, WEAK_R * 0.3, C.g, 0.4);
    if (glowAnim > 0) pc(CX, CY, CRYSTAL_W, CRYSTAL_HI, glowAnim * 0.25);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var wx = weakX(), wy = weakY(), dx = tx - wx, dy = ty - wy;
    if (dx * dx + dy * dy < (WEAK_R + 36) * (WEAK_R + 36)) {
      crystalHealth--; shakeTimer = 0.15; shakeX = (Math.random() - 0.5) * 24; shakeY = (Math.random() - 0.5) * 24; game.audio.play('se_tap', 0.15);
      crackLines.push({ x1: CX + (Math.random() - 0.5) * CRYSTAL_W, y1: CY - CRYSTAL_H / 2, x2: CX + (Math.random() - 0.5) * CRYSTAL_W, y2: CY + CRYSTAL_H / 2 });
      for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: wx, y: wy, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.4, col: WEAK }); }
      if (crystalHealth <= 0) {
        score++; glowAnim = 0.5; flash = 0.35; flashCol = C.b; resultText = 'SHATTER!'; resultTimer = 0.6; game.audio.play('se_success', 0.6);
        for (var p2 = 0; p2 < 10; p2++) { var pa2 = Math.random() * Math.PI * 2, sp = 180 + Math.random() * 200; particles.push({ x: CX, y: CY, vx: Math.cos(pa2) * sp, vy: Math.sin(pa2) * sp, life: 0.55, col: CRYSTAL_HI }); }
        if (score >= NEEDED) { finish(true); return; }
        setTimeout(function() { if (!done) resetCrystal(); }, 400);
      }
    } else {
      errors++; flash = 0.25; flashCol = C.a; resultText = 'MISS!'; resultTimer = 0.45; game.audio.play('se_failure', 0.25);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (crystalHealth === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CRYSTAL BREAKER!' : 'TOO BRITTLE', W / 2, H * 0.35, 52, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      weakAngle += weakSpeed * dt;
      if (shakeTimer > 0) shakeTimer -= dt; else { shakeX *= 0.7; shakeY *= 0.7; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (glowAnim > 0) glowAnim -= dt * 2;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.86), 60, flashCol);
    else txt('HIT THE WEAK SPOT', W / 2, snap(H * 0.80), 36, '#ffffff33');

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#04081c');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
