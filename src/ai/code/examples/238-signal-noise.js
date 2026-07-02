// 238-signal-noise.js
// シグナルノイズ — ノイズ波形の中に一瞬現れる規則的な信号を見抜き、その瞬間にタップする知覚勝負
// 操作: 信号が出ている間に波形をタップ
// 成功: 3回検出  失敗: 3回誤検出/見逃し or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、オシロスコープ） ──
  var C = { bg:'#001100', a:'#ff3300', b:'#00ff41', c:'#ccffcc', d:'#009922', e:'#66ff66', f:'#ffcc00', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SIGNAL NOISE';
  var HOW_TO_PLAY = 'TAP THE WAVE WHEN A CLEAN SIGNAL APPEARS';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 15 → 3
  var MAX_WRONG = 3;         // 修正2: 8 → 3
  var ZONE_Y = snap(H * 0.38), ZONE_H = snap(H * 0.34), WAVE_X = 60, WAVE_W = W - 120, PTS = 60;
  var SIGNAL_LIFE = 1.5, NOISE_CYCLE = 0.8;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var wave, signalActive, signalTimer, sigStart, sigDur, noiseTimer, detected, wrongs, timeLeft, done, particles, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#003300');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, ZONE_Y - 8, W, ZONE_H + 16, C.d, 0.2);
    for (var gy = 0; gy <= 4; gy++) game.draw.rect(WAVE_X, ZONE_Y + gy * ZONE_H / 4, WAVE_W, 2, C.d, 0.4);
  }

  function genWave() {
    wave = [];
    for (var i = 0; i < PTS; i++) wave.push((Math.random() - 0.5) * 60);
    if (signalActive) {
      var amp = 80 + Math.random() * 40, freq = 0.3 + Math.random() * 0.4;
      sigStart = Math.floor(PTS * 0.2 + Math.random() * PTS * 0.5); sigDur = 8 + Math.floor(Math.random() * 6);
      for (var si = sigStart; si < Math.min(PTS, sigStart + sigDur); si++) wave[si] = Math.sin((si - sigStart) * freq * Math.PI) * amp;
    }
  }

  function drawWave() {
    var midY = ZONE_Y + ZONE_H / 2;
    for (var i = 0; i < wave.length; i++) {
      var x = WAVE_X + i / PTS * WAVE_W, y = midY + wave[i], isSig = signalActive && i >= sigStart && i < sigStart + sigDur;
      game.draw.rect(snap(x) - 4, snap(y) - 4, 8, 8, isSig ? C.b : C.d, isSig ? 0.95 : 0.6);
    }
  }

  function initGame() { signalActive = false; signalTimer = 0; noiseTimer = 0.5; detected = 0; wrongs = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; genWave(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (detected * 400 + Math.ceil(timeLeft) * 50) : detected * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function addWrong(msg) { wrongs++; fbText = msg; fbCol = C.a; fbTimer = 0.6; game.audio.play('se_failure', 0.4); if (wrongs >= MAX_WRONG) finish(false); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (y < ZONE_Y || y > ZONE_Y + ZONE_H) return;
    if (signalActive && signalTimer > 0) {
      detected++; fbText = 'DETECTED!'; fbCol = C.b; fbTimer = 0.6; game.audio.play('se_success', 0.7); signalActive = false;
      for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: x, y: y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.5 }); }
      if (detected >= NEEDED) { finish(true); return; }
    } else { addWrong('FALSE POSITIVE'); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!wave) initGame(); background(); drawWave();
      txt(GAME_TITLE, W / 2, H * 0.16, 72, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.84, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 58, C.f);
        txt('TAP TO START', W / 2, H * 0.95, 44, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'LOCKED ON!' : 'STATIC', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.e);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      if (signalActive) { signalTimer -= dt; if (signalTimer <= 0) { signalActive = false; addWrong('MISSED SIGNAL'); if (done) return; } }
      noiseTimer -= dt;
      if (noiseTimer <= 0) { genWave(); noiseTimer = NOISE_CYCLE; if (!signalActive && Math.random() < 0.5) { signalActive = true; signalTimer = SIGNAL_LIFE; genWave(); game.audio.play('se_tap', 0.1); } }
      for (var pi = particles.length - 1; pi >= 0; pi--) { var p = particles[pi]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi, 1); }
    }

    // ---- 描画 ----
    background(); drawWave();
    if (signalActive) { game.draw.rect(0, ZONE_Y - 8, W, ZONE_H + 16, C.b, (Math.floor(game.time.elapsed * 8) % 2 ? 0.1 : 0.04)); txt('SIGNAL! TAP!', W / 2, ZONE_Y - 40, 48, C.b); }
    else txt('...NOISE...', W / 2, ZONE_Y - 40, 42, C.d);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.e, particles[pp].life * 2);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.80, 46, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    txt(detected + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_WRONG; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, mm < wrongs ? C.a : '#003300');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
