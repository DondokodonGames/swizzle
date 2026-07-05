// 772-wind-drift.js
// ウィンドドリフト — 風に流される船をセーフゾーンに保ち続けろ
// 操作: タップで船を右へ押す（風は常に左から吹く）
// 成功: 16秒間 ゾーン内を維持  失敗: 3回 ゾーン逸脱 or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、夜の海） ──
  var C = { bg:'#030d1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var SKY = '#0a1420', SEA = '#0c3a52', SEA_HI = '#0e6a80', WAVE = '#00cfff', SHIP = '#f1f5f9', SHIP_DK = '#5a6a7a', SAIL = '#ffe600', SAFE = '#00ff9f';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WIND DRIFT';
  var HOW_TO_PLAY = 'TAP TO PUSH THE SHIP RIGHT · THE WIND BLOWS LEFT · STAY IN THE SAFE ZONE';
  var MAX_TIME    = 24;
  var NEEDED_TIME = 16;      // 修正2: 60 → 16
  var MAX_DRIFT   = 3;
  var SAFE_LEFT = snap(W * 0.25), SAFE_RIGHT = snap(W * 0.75), SHIP_Y = snap(H * 0.52), SHIP_W = 108, SHIP_H = 54;
  var WIND_FORCE = -220, TAP_FORCE = 560, DRAG = 0.88, DANGER_GRACE = 0.6;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var shipX, shipVx, surviveTime, driftCount, inDanger, dangerTimer, done, timeLeft, elapsed, waves, windParticles, wavePhase, flash, flashCol, resultText, resultTimer, stars;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); var st = 12; for (var i = 0; i < size; i += st) { var w = size - i; if (dir === 'right') game.draw.rect(cx + i - size / 2, cy - w / 2, st, w, color, 0.95); else game.draw.rect(cx - i + size / 2 - st, cy - w / 2, st, w, color, 0.95); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#060e14');
  }

  function background() {
    game.draw.clear(SKY); game.draw.rect(0, H * 0.5, W, H * 0.5, SEA, 1.0); game.draw.rect(0, H * 0.5, W, 12, SEA_HI, 0.5);
    for (var sti = 0; sti < stars.length; sti++) { var st = stars[sti]; game.draw.rect(snap(st.x), snap(st.y), 6, 6, C.g, 0.3 + 0.2 * Math.sin(elapsed * 2 + sti)); }
  }

  function initGame() {
    shipX = W / 2; shipVx = 0; surviveTime = 0; driftCount = 0; inDanger = false; dangerTimer = 0;
    done = false; timeLeft = MAX_TIME; elapsed = 0; wavePhase = 0; windParticles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0;
    waves = []; for (var wi = 0; wi < 8; wi++) waves.push({ x: Math.random() * W, speed: 80 + Math.random() * 60, size: 30 + Math.random() * 40 });
    stars = []; for (var si = 0; si < 20; si++) stars.push({ x: Math.random() * W, y: Math.random() * H * 0.45 });
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(surviveTime) * 300 + Math.ceil(timeLeft) * 120) : Math.floor(surviveTime) * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var wpi = 0; wpi < windParticles.length; wpi++) { var wp2 = windParticles[wpi]; game.draw.rect(snap(wp2.x), snap(wp2.y), 40, 4, wp2.col, wp2.life); }
    game.draw.rect(SAFE_LEFT, snap(H * 0.08), SAFE_RIGHT - SAFE_LEFT, snap(H * 0.88), SAFE, 0.05);
    game.draw.rect(SAFE_LEFT - 4, snap(H * 0.08), 8, snap(H * 0.88), SAFE, 0.6); game.draw.rect(SAFE_RIGHT - 4, snap(H * 0.08), 8, snap(H * 0.88), SAFE, 0.6);
    for (var wi2 = 0; wi2 < waves.length; wi2++) { var wv = waves[wi2]; game.draw.rect(snap(wv.x - wv.size), snap(H * 0.5 + Math.sin(wavePhase + wi2) * 8), snap(wv.size * 2), 8, WAVE, 0.18); }
    var sx = shipX, sy = SHIP_Y + Math.sin(wavePhase * 1.3) * 10;
    game.draw.rect(snap(sx - SHIP_W / 2), snap(sy), SHIP_W, SHIP_H, SHIP, 0.9); game.draw.rect(snap(sx - SHIP_W / 2 + 8), snap(sy + SHIP_H), SHIP_W - 16, 18, SHIP_DK, 0.8);
    game.draw.line(sx, sy, sx, sy - SHIP_H * 2.2, SHIP_DK, 8);
    var sailLean = Math.min(0.4, -shipVx / 1500) * 0.6;
    game.draw.rect(snap(sx + sailLean * 40 - 4), snap(sy - SHIP_H * 2.0), 64, snap(SHIP_H * 1.4), SAIL, 0.85);
    if (Math.abs(shipVx) > 30) arrow(sx, sy - SHIP_H * 2.8, 48, shipVx > 0 ? 'right' : 'left', C.e);
    arrow(W * 0.82, snap(H * 0.13), 44, 'left', C.e); txt('WIND', W * 0.9, snap(H * 0.135), 30, C.e, 'left');
    var survRatio = Math.min(1, surviveTime / NEEDED_TIME);
    game.draw.rect(snap(W * 0.1), snap(H * 0.81), snap(W * 0.8), 20, '#0a1420', 0.9); game.draw.rect(snap(W * 0.1), snap(H * 0.81), snap(W * 0.8 * survRatio), 20, C.b, 0.85);
    txt('HOLD  ' + Math.floor(surviveTime) + ' / ' + NEEDED_TIME + 's', W / 2, snap(H * 0.87), 36, C.g);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    shipVx += TAP_FORCE; game.audio.play('se_tap', 0.08);
    for (var p = 0; p < 3; p++) { var pa = -Math.PI * 0.3 + Math.random() * Math.PI * 0.2; windParticles.push({ x: shipX + SHIP_W / 2, y: SHIP_Y - 20 + Math.random() * 40, vx: Math.cos(pa) * 140, vy: Math.sin(pa) * 80, life: 0.35, col: WAVE }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (shipX === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.20, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.245, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.36, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STEADY SAILOR!' : 'BLOWN AWAY', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(surviveTime >= NEEDED_TIME); return; }
      shipVx += WIND_FORCE * dt; shipVx *= Math.pow(DRAG, dt * 60); shipX += shipVx * dt;
      if (shipX < SHIP_W / 2) { shipX = SHIP_W / 2; shipVx = Math.abs(shipVx) * 0.3; }
      if (shipX > W - SHIP_W / 2) { shipX = W - SHIP_W / 2; shipVx = -Math.abs(shipVx) * 0.3; }
      var inSafe = shipX > SAFE_LEFT && shipX < SAFE_RIGHT;
      if (inSafe) { surviveTime += dt; if (surviveTime >= NEEDED_TIME) { finish(true); return; } }
      if (!inSafe) {
        if (!inDanger) { inDanger = true; dangerTimer = 0; }
        else { dangerTimer += dt; if (dangerTimer > DANGER_GRACE) { driftCount++; inDanger = false; dangerTimer = 0; shipVx = shipX < SAFE_LEFT ? 400 : -400; flash = 0.4; flashCol = C.a; resultText = 'DANGER!'; resultTimer = 0.5; game.audio.play('se_failure', 0.35); if (driftCount >= MAX_DRIFT) { finish(false); return; } } }
      } else { inDanger = false; dangerTimer = 0; }
      wavePhase += dt * 1.5;
      for (var wi = 0; wi < waves.length; wi++) { waves[wi].x -= waves[wi].speed * dt; if (waves[wi].x < -waves[wi].size * 2) waves[wi].x = W + waves[wi].size; }
      for (var wp = windParticles.length - 1; wp >= 0; wp--) { windParticles[wp].x += windParticles[wp].vx * dt; windParticles[wp].y += windParticles[wp].vy * dt; windParticles[wp].life -= dt * 3; if (windParticles[wp].life <= 0) windParticles.splice(wp, 1); }
      if (Math.random() < dt * 4) windParticles.push({ x: W + 20, y: SHIP_Y - 100 + Math.random() * 200, vx: -160 - Math.random() * 80, vy: 0, life: 0.8, col: C.e });
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.75), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(surviveTime) + ' / ' + NEEDED_TIME + 's', W / 2, 168, 48, C.b);
    for (var di = 0; di < MAX_DRIFT; di++) game.draw.rect(snap(W / 2 + (di - (MAX_DRIFT - 1) / 2) * 56) - 10, 224, 20, 20, di < driftCount ? C.a : '#060e14');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
