// 764-volt-control.js
// ボルトコントロール — 上昇し続ける電圧をタップで放電し、安全ゾーンに保て
// 操作: タップで電圧を下げる（過放電にも注意）
// 成功: 16秒間 安全ゾーンを維持  失敗: 危険域に3回突入 or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、高電圧） ──
  var C = { bg:'#030814', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var SAFE = '#00ff9f', LOW = '#00cfff', HIGH = '#ff2079';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'VOLT CONTROL';
  var HOW_TO_PLAY = 'TAP TO DISCHARGE · KEEP THE VOLTAGE INSIDE THE SAFE BAND';
  var MAX_TIME    = 24;
  var NEEDED_TIME = 16;       // 修正2: 60 → 16
  var MAX_DANGER  = 3;
  var RISE_RATE   = 0.075;
  var DISCHARGE   = 0.22;
  var SAFE_LO = 0.3, SAFE_HI = 0.75;
  var DANGER_GRACE = 0.45;

  var METER_X = snap(W * 0.15), METER_Y = snap(H * 0.34), METER_W = snap(W * 0.7), METER_H = 72;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var voltage, inDanger, dangerTimer, dangerCount, surviveTime, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer, zap;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0a0f1c');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var gi = 0; gi < 8; gi++) game.draw.rect(0, snap(H * 0.08 + gi * H * 0.12), W, 2, C.d, 0.18);
    for (var gj = 0; gj < 6; gj++) game.draw.rect(snap(gj * W / 5), snap(H * 0.08), 2, snap(H * 0.85), C.d, 0.14);
  }

  function initGame() {
    voltage = 0.3; inDanger = false; dangerTimer = 0; dangerCount = 0; surviveTime = 0;
    done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; zap = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(surviveTime) * 400 + Math.ceil(timeLeft) * 120) : Math.floor(surviveTime) * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    // Meter frame
    game.draw.rect(METER_X - 6, METER_Y - 6, METER_W + 12, METER_H + 12, '#000000', 0.5);
    game.draw.rect(METER_X, METER_Y, METER_W, METER_H, '#0e1626', 1.0);
    // Safe band
    game.draw.rect(METER_X + METER_W * SAFE_LO, METER_Y, METER_W * (SAFE_HI - SAFE_LO), METER_H, SAFE, 0.16);
    game.draw.rect(METER_X + METER_W * SAFE_LO - 4, METER_Y, 8, METER_H, SAFE, 0.8);
    game.draw.rect(METER_X + METER_W * SAFE_HI - 4, METER_Y, 8, METER_H, SAFE, 0.8);
    // Voltage fill
    var fillW = METER_W * voltage;
    var voltColor = voltage < SAFE_LO ? LOW : (voltage > SAFE_HI ? HIGH : SAFE);
    if (fillW > 0) { game.draw.rect(METER_X, METER_Y, fillW, METER_H, voltColor, 0.85); game.draw.rect(METER_X, METER_Y, fillW, 12, C.g, 0.14); }
    game.draw.rect(METER_X + fillW - 4, METER_Y - 10, 8, METER_H + 20, voltColor, zap > 0 ? 1.0 : 0.9);
    // Zap arc
    if (zap > 0) for (var zi = 0; zi < 3; zi++) game.draw.line(METER_X + fillW, METER_Y + METER_H / 2, METER_X + fillW + (Math.random() - 0.5) * 70, METER_Y + Math.random() * METER_H, C.b, 3);
    // Labels
    txt('LOW', METER_X - 20, METER_Y + METER_H / 2 + 12, 28, LOW, 'right');
    txt('HIGH', METER_X + METER_W + 20, METER_Y + METER_H / 2 + 12, 28, HIGH, 'left');
    txt('SAFE', METER_X + METER_W * ((SAFE_LO + SAFE_HI) / 2), METER_Y - 26, 30, SAFE);
    // Percentage
    var pctCol = (voltage >= SAFE_LO && voltage <= SAFE_HI) ? SAFE : HIGH;
    txt(Math.round(voltage * 100) + '%', W / 2, METER_Y + METER_H + 90, 72, pctCol);
    // Survive progress
    var survRatio = Math.min(1, surviveTime / NEEDED_TIME);
    game.draw.rect(snap(W * 0.1), snap(H * 0.56), snap(W * 0.8), 24, '#0e1626', 0.9);
    game.draw.rect(snap(W * 0.1), snap(H * 0.56), snap(W * 0.8 * survRatio), 24, C.b, 0.85);
    txt('HOLD  ' + Math.floor(surviveTime) + ' / ' + NEEDED_TIME + 's', W / 2, snap(H * 0.63), 36, C.g);
    if (state === S.PLAYING) txt('TAP TO DISCHARGE', W / 2, snap(H * 0.70), 34, C.e);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    voltage = Math.max(0, voltage - DISCHARGE); zap = 0.4; game.audio.play('se_tap', 0.09);
    var meterFillW = METER_W * voltage;
    for (var p = 0; p < 5; p++) { var pa = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; particles.push({ x: METER_X + meterFillW, y: METER_Y + METER_H / 2, vx: Math.cos(pa) * 120, vy: Math.sin(pa) * 140 - 60, life: 0.32, col: C.b }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (voltage === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.86, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GRID STABLE!' : 'OVERLOAD', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(surviveTime >= NEEDED_TIME); return; }
      voltage = Math.min(1.0, voltage + RISE_RATE * dt);
      var safe = voltage >= SAFE_LO && voltage <= SAFE_HI;
      var danger = voltage < 0.02 || voltage > 0.98;
      if (safe) { surviveTime += dt; if (surviveTime >= NEEDED_TIME) { finish(true); return; } }
      if (danger) {
        if (!inDanger) { inDanger = true; dangerTimer = 0; }
        else { dangerTimer += dt; if (dangerTimer > DANGER_GRACE) { dangerCount++; dangerTimer = 0; inDanger = false; voltage = SAFE_HI - 0.1; flash = 0.4; flashCol = C.a; resultText = 'DANGER!'; resultTimer = 0.45; game.audio.play('se_failure', 0.35); if (dangerCount >= MAX_DANGER) { finish(false); return; } } }
      } else { inDanger = false; dangerTimer = 0; }
      if (zap > 0) zap -= dt * 3; if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt * 3; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p2 = particles[pp2]; game.draw.rect(snap(p2.x) - 5, snap(p2.y) - 5, 10, 10, p2.col, p2.life * 2.5); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.76), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(surviveTime) + ' / ' + NEEDED_TIME + 's', W / 2, 168, 48, C.b);
    for (var di = 0; di < MAX_DANGER; di++) game.draw.rect(snap(W / 2 + (di - (MAX_DANGER - 1) / 2) * 56) - 10, 224, 20, 20, di < dangerCount ? C.a : '#0a0f1c');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
