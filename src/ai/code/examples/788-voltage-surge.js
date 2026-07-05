// 788-voltage-surge.js
// ボルテージサージ — 電圧スパイクの頂点（ピーク）を一撃で叩け
// 操作: タップ — 電圧が最高値（スパイク頂点）に達した瞬間だけ
// 成功: 10回 ヒット  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、オシロスコープ） ──
  var C = { bg:'#020408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var GRID = '#0a1520', LINE = '#1e40af', SPIKE = '#00cfff', PEAK = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'VOLTAGE SURGE';
  var HOW_TO_PLAY = 'TAP ONLY WHEN THE VOLTAGE SPIKE HITS ITS PEAK · TOO EARLY OR LATE MISSES';
  var MAX_TIME = 24;
  var NEEDED   = 10;         // 修正2: 25 → 10
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var HISTORY_LEN = 80, IDLE_V = 0.1, WAIT_DUR = 0.3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var voltageHistory, voltage, spikePhase, spikeTimer, riseD, peakD, fallD, nextSpike, answered, waitTimer, score, errors, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer, hitAnim;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#04060f');
  }

  function background() { game.draw.clear(C.bg); }

  function scheduleNextSpike() { nextSpike = Math.max(0.5, 1.0 + Math.random() * 2.0 - Math.min(0.5, score * 0.06)); spikePhase = 'idle'; voltage = IDLE_V; answered = false; }
  function startSpike() { spikePhase = 'rise'; spikeTimer = 0; riseD = 0.25 + Math.random() * 0.15; peakD = Math.max(0.14, 0.30 - score * 0.012); fallD = 0.35 + Math.random() * 0.15; }

  function initGame() {
    voltageHistory = []; for (var i = 0; i < HISTORY_LEN; i++) voltageHistory.push(IDLE_V);
    voltage = IDLE_V; score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; hitAnim = 0; waitTimer = 0; scheduleNextSpike();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 130) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var oscX = 40, oscY = snap(H * 0.24), oscW = W - 80, oscH = snap(H * 0.42);
    game.draw.rect(oscX, oscY, oscW, oscH, GRID, 0.9);
    for (var gi = 0; gi <= 4; gi++) game.draw.line(oscX, oscY + gi / 4 * oscH, oscX + oscW, oscY + gi / 4 * oscH, '#0f2040', 2);
    for (var gxi = 0; gxi <= 8; gxi++) game.draw.line(oscX + gxi / 8 * oscW, oscY, oscX + gxi / 8 * oscW, oscY + oscH, '#0f2040', 2);
    for (var vi = 1; vi < voltageHistory.length; vi++) { var x2 = oscX + vi / (HISTORY_LEN - 1) * oscW, y2 = oscY + oscH - voltageHistory[vi] * oscH, v = voltageHistory[vi]; game.draw.rect(snap(x2) - 3, snap(y2) - 3, 6, 6, v > 0.85 ? PEAK : (v > 0.5 ? SPIKE : LINE), 0.8); }
    var curX = oscX + oscW, curY = oscY + oscH - voltage * oscH, vCol2 = voltage > 0.85 ? PEAK : SPIKE;
    pc(curX, curY, 14 + hitAnim * 10, vCol2, 0.4); pc(curX, curY, 10, vCol2, 0.95);
    var peakY = oscY + oscH - 0.85 * oscH; game.draw.line(oscX, peakY, oscX + oscW, peakY, PEAK, 2); txt('PEAK', oscX + oscW - 40, peakY - 16, 26, PEAK, 'right');
    txt(Math.round(voltage * 100) + ' V', W / 2, oscY + oscH + 60, 56, voltage > 0.85 ? PEAK : SPIKE);
    if (state === S.PLAYING) {
      if (spikePhase === 'peak' && !answered) { var pulse = 1 + 0.08 * Math.sin(elapsed * 20); txt('NOW!', W / 2, snap(H * 0.73), Math.floor(72 * pulse), PEAK); }
      else if (spikePhase === 'rise') txt('RISING...', W / 2, snap(H * 0.73), 44, SPIKE);
      else if (spikePhase === 'idle') txt('WAIT FOR THE SPIKE', W / 2, snap(H * 0.73), 40, C.g);
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || waitTimer > 0 || answered) return;
    answered = true;
    if (spikePhase === 'peak') {
      score++; hitAnim = 0.5; flash = 0.2; flashCol = C.b; resultText = 'HIT!'; resultTimer = 0.38; game.audio.play('se_success', 0.65);
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.45, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: PEAK }); }
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = spikePhase === 'idle' ? 'TOO EARLY!' : 'TOO LATE!'; resultTimer = 0.4; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
    waitTimer = WAIT_DUR;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!voltageHistory) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.88, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURGE MASTER!' : 'SHORT CIRCUIT', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) scheduleNextSpike(); }
      else {
        if (spikePhase === 'idle') { nextSpike -= dt; voltage = IDLE_V + (Math.random() - 0.5) * 0.04; if (nextSpike <= 0) startSpike(); }
        else if (spikePhase === 'rise') { spikeTimer += dt; voltage = IDLE_V + (1.0 - IDLE_V) * (spikeTimer / riseD); if (spikeTimer >= riseD) { spikePhase = 'peak'; spikeTimer = 0; voltage = 1.0; } }
        else if (spikePhase === 'peak') { spikeTimer += dt; voltage = 1.0; if (spikeTimer >= peakD && !answered) { errors++; flash = 0.28; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.4; game.audio.play('se_failure', 0.28); answered = true; spikePhase = 'fall'; waitTimer = WAIT_DUR; if (errors >= MAX_ERR) { finish(false); return; } } else if (spikeTimer >= peakD) { spikePhase = 'fall'; spikeTimer = 0; } }
        else if (spikePhase === 'fall') { spikeTimer += dt; voltage = 1.0 - (1.0 - IDLE_V) * (spikeTimer / fallD); if (spikeTimer >= fallD) scheduleNextSpike(); }
      }
      voltageHistory.push(voltage); if (voltageHistory.length > HISTORY_LEN) voltageHistory.shift();
      if (hitAnim > 0) hitAnim -= dt * 2.5; if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p3 = particles[pp2]; game.draw.rect(snap(p3.x) - 5, snap(p3.y) - 5, 10, 10, p3.col, p3.life * 2.5); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.84), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#04060f');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
