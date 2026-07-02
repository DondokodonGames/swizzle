// 220-sand-timer.js
// サンドタイマー — 砂時計を見ずに体内時計で5秒を計り、ちょうどでタップして止める時間感覚勝負
// 操作: タップでスタート、5秒経ったと思ったらもう一度タップ
// 成功: 2回±0.5秒以内  失敗: 3回大きくズレる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、砂時計工房） ──
  var C = { bg:'#1a0f08', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7c5a2a', e:'#00cfff', f:'#ff8800', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SAND TIMER';
  var HOW_TO_PLAY = 'FEEL 5 SECONDS · TAP TO START AND STOP';
  var MAX_TIME = 20;
  var TARGET = 5.0, PERFECT_RANGE = 0.5, GOOD_RANGE = 0.9;
  var NEEDED   = 2;           // 修正2: 5 → 2
  var MAX_MISS = 3;
  var CX = snap(W / 2), CY = snap(H * 0.46), GW = 200, GH = 260;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var phase, roundTime, timerStart, sandLevel, successes, misses, timeLeft, done, feedback, feedbackCol, feedbackTimer, judgeTimer, particles, _t;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#2a1808');
  }

  function background() { game.draw.clear(C.bg); }

  function drawHourglass(level, showSand) {
    // 上下バルブ枠
    game.draw.rect(CX - GW / 2, CY - GH, GW, GH, C.d, 0.4);
    game.draw.rect(CX - GW / 2, CY, GW, GH, C.d, 0.4);
    game.draw.rect(CX - GW / 2 - 16, CY - GH - 16, GW + 32, 12, C.d, 0.9);
    game.draw.rect(CX - GW / 2 - 16, CY + GH + 4, GW + 32, 12, C.d, 0.9);
    game.draw.rect(CX - 16, CY - 24, 32, 48, C.d, 0.7);
    if (showSand) {
      var topH = snap(level * (GH - 24));
      if (topH > 0) { game.draw.rect(CX - GW / 2 + 8, CY - topH - 16, GW - 16, topH, C.f, 0.9); game.draw.rect(CX - GW / 2 + 8, CY - topH - 16, GW - 16, 6, C.c, 0.6); }
      var botH = snap((1 - level) * (GH - 24));
      if (botH > 0) game.draw.rect(CX - GW / 2 + 8, CY + GH - botH - 8, GW - 16, botH, C.f, 0.9);
      // 落ちる砂
      if (phase === 'running') game.draw.rect(CX - 4, CY - 16, 8, 40, C.c, 0.8);
    }
  }

  function initGame() { phase = 'waiting'; roundTime = 0; timerStart = 0; sandLevel = 1; successes = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = ''; feedbackCol = C.g; feedbackTimer = 0; judgeTimer = 0; particles = []; _t = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 600 + Math.ceil(timeLeft) * 40) : successes * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function judge() {
    var diff = Math.abs(roundTime - TARGET); phase = 'judged'; judgeTimer = 1.2;
    if (diff <= PERFECT_RANGE) {
      successes++; feedback = 'PERFECT ' + roundTime.toFixed(2) + 's'; feedbackCol = C.b; feedbackTimer = 1.0; game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.6 }); }
      if (successes >= NEEDED) { finish(true); return; }
    } else if (diff <= GOOD_RANGE) { feedback = 'GOOD ' + roundTime.toFixed(2) + 's'; feedbackCol = C.c; feedbackTimer = 0.8; game.audio.play('se_tap', 0.5); }
    else { misses++; feedback = 'MISS ' + roundTime.toFixed(2) + 's'; feedbackCol = C.a; feedbackTimer = 0.8; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) { finish(false); return; } }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (phase === 'waiting') { phase = 'running'; timerStart = _t; roundTime = 0; sandLevel = 1; game.audio.play('se_tap', 0.3); }
    else if (phase === 'running') judge();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); phase = 'waiting'; drawHourglass((Math.sin(game.time.elapsed) + 1) / 2, true);
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.86, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.91, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TIME MASTER!' : 'OUT OF SYNC', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      _t += dt; timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (feedbackTimer > 0) feedbackTimer -= dt;
      if (phase === 'running') { roundTime = _t - timerStart; sandLevel = Math.max(0, 1 - roundTime / 10); }
      if (phase === 'judged') { judgeTimer -= dt; if (judgeTimer <= 0) phase = 'waiting'; }
      for (var pi = particles.length - 1; pi >= 0; pi--) { var p = particles[pi]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi, 1); }
    }

    // ---- 描画 ----
    background();
    // running中は砂を隠して体内時計に頼らせる
    drawHourglass(sandLevel, phase !== 'running');
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.c, particles[pp].life * 1.6);
    if (phase === 'running') txt('...', CX, CY + GH + 80, 72, C.f);
    else if (phase === 'waiting') txt('TAP TO START', CX, CY + GH + 80, 48, C.g);
    if (feedbackTimer > 0) txt(feedback, CX, H * 0.84, 48, feedbackCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, 208, 20, 20, mm < misses ? C.a : '#2a1808');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
