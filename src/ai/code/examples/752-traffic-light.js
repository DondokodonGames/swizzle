// 752-traffic-light.js
// トラフィックライト — 信号が青(GREEN)に変わった瞬間だけタップする。赤・黄は禁止
// 操作: GREEN のときだけタップ。RED/YELLOW でタップ、または青を見逃すとミス
// 成功: 12回 GO  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、信号色は保持） ──
  var C = { bg:'#0c0c0c', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var RED = '#ff2079', RED_OFF = '#3d0f0f', YEL = '#ffe600', YEL_OFF = '#3d2e06', GRN = '#00ff41', GRN_OFF = '#0a2e14';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TRAFFIC LIGHT';
  var HOW_TO_PLAY = 'TAP ONLY WHEN THE LIGHT TURNS GREEN · RED AND YELLOW ARE OFF LIMITS';
  var MAX_TIME = 22;
  var NEEDED   = 12;         // 修正2: 40 → 12
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var PHASE_R = 0, PHASE_Y = 1, PHASE_G = 2, PHASE_DURATIONS = [0.9, 0.5, 0.8];
  var CX = W / 2, LIGHT_CY = snap(H * 0.42), LIGHT_R = 72, LIGHT_GAP = 190;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var lightPhase, phaseTimer, answered, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#181818');
  }

  function background() { game.draw.clear(C.bg); }

  function nextPhase() {
    lightPhase = (lightPhase + 1) % 3; var baseDur = PHASE_DURATIONS[lightPhase];
    if (lightPhase === PHASE_G) baseDur = Math.max(0.45, 0.8 - score * 0.02);
    if (lightPhase === PHASE_R) baseDur = Math.max(0.55, 0.9 - score * 0.015);
    phaseTimer = baseDur; answered = false;
  }

  function initGame() { lightPhase = PHASE_R; phaseTimer = 1.0; answered = false; score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var redY = LIGHT_CY - LIGHT_GAP, yellowY = LIGHT_CY, greenY = LIGHT_CY + LIGHT_GAP;
    game.draw.rect(CX - LIGHT_R - 24, redY - LIGHT_R - 20, (LIGHT_R + 24) * 2, LIGHT_GAP * 2 + LIGHT_R * 2 + 40, '#1a1a1a', 0.95);
    if (lightPhase === PHASE_R) pc(CX, redY, LIGHT_R + 24, RED, 0.15 * (0.8 + 0.2 * Math.sin(elapsed * 6)));
    if (lightPhase === PHASE_G) pc(CX, greenY, LIGHT_R + 24, GRN, 0.2 * (0.85 + 0.15 * Math.sin(elapsed * 5)));
    pc(CX, redY, LIGHT_R, lightPhase === PHASE_R ? RED : RED_OFF, 0.9);
    pc(CX, yellowY, LIGHT_R, lightPhase === PHASE_Y ? YEL : YEL_OFF, 0.9);
    pc(CX, greenY, LIGHT_R, lightPhase === PHASE_G ? GRN : GRN_OFF, 0.9);
    var label = lightPhase === PHASE_G ? 'GREEN - TAP!' : (lightPhase === PHASE_R ? 'RED - WAIT' : 'YELLOW - WAIT'), labelCol = lightPhase === PHASE_G ? GRN : (lightPhase === PHASE_R ? RED : YEL);
    txt(label, CX, snap(H * 0.83), lightPhase === PHASE_G ? 56 : 42, labelCol);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || answered) return;
    if (lightPhase === PHASE_G) {
      score++; answered = true; flash = 0.22; flashCol = C.b; resultText = 'GO!'; resultTimer = 0.35; game.audio.play('se_tap', 0.1);
      for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: CX, y: LIGHT_CY + LIGHT_GAP, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.35, col: GRN }); }
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; answered = true; flash = 0.3; flashCol = C.a; resultText = lightPhase === PHASE_R ? 'RED - STOP!' : 'YELLOW!'; resultTimer = 0.42; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (lightPhase === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.06, 74, C.c);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.93, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GREEN MACHINE!' : 'RAN THE LIGHT', W / 2, H * 0.35, 52, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      phaseTimer -= dt;
      if (phaseTimer <= 0) {
        if (lightPhase === PHASE_G && !answered) { errors++; flash = 0.22; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.38; game.audio.play('se_failure', 0.18); if (errors >= MAX_ERR) { finish(false); return; } }
        nextPhase();
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.8; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, CX, snap(H * 0.88), 50, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#181818');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
