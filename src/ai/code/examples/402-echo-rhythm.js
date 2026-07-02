// 402-echo-rhythm.js
// エコーリズム — 光ったビートの順番を記憶し、同じ順にノードをタップして繰り返すサイモン式
// 操作: 光る順番を覚え、消えたら同じ順にノードをタップ
// 成功: 3ラウンド クリア  失敗: 3回 間違える or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、シンセ台） ──
  var C = { bg:'#06040f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ECHO RHYTHM';
  var HOW_TO_PLAY = 'WATCH THE BEATS LIGHT UP · TAP THEM BACK IN ORDER';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 6 → 3
  var MAX_WRONG = 3;
  var NBEATS = 4, BEAT_INT = 0.55, MAX_LEN = 4;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var BEATS, iphase, pattern, input, showIdx, showTimer, pauseTimer, round, wrong, timeLeft, done, particles, flash, flashCol, beatFlash, beatFlashT;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); }

  function initBeats() { BEATS = []; for (var bi = 0; bi < NBEATS; bi++) { var ang = bi / NBEATS * Math.PI * 2 - Math.PI / 2; BEATS.push({ x: snap(W / 2 + Math.cos(ang) * 260), y: snap(H * 0.48 + Math.sin(ang) * 260), id: bi }); } }

  function genPattern() { var len = 2 + Math.min(round, MAX_LEN - 2); pattern = []; for (var i = 0; i < len; i++) pattern.push(Math.floor(Math.random() * NBEATS)); input = []; showIdx = 0; showTimer = BEAT_INT; pauseTimer = 0; iphase = 'showing'; }

  function initGame() { round = 0; wrong = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; beatFlash = -1; beatFlashT = 0; genPattern(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (round * 700 + Math.ceil(timeLeft) * 100) : round * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function checkInput() {
    for (var i = 0; i < input.length; i++) if (input[i] !== pattern[i]) { wrong++; flashCol = C.a; flash = 0.7; game.audio.play('se_failure', 0.4); if (wrong >= MAX_WRONG) { finish(false); return; } input = []; setTimeout(function() { if (!done && state === S.PLAYING) genPattern(); }, 700); return; }
    if (input.length === pattern.length) { round++; flashCol = C.b; flash = 0.6; game.audio.play('se_success', 0.5); for (var p = 0; p < 12; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.48, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.7, col: C.c }); } if (round >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done && state === S.PLAYING) genPattern(); }, 800); }
  }

  function drawBeats() {
    for (var bi = 0; bi < BEATS.length; bi++) { var bt = BEATS[bi], fl = bt.id === beatFlash && beatFlashT > 0; pc(bt.x, bt.y, 52, fl ? C.c : C.d, fl ? 0.95 : 0.5); pc(bt.x, bt.y, 30, C.g, fl ? 0.9 : 0.15); txt((bt.id + 1) + '', bt.x, bt.y + 14, 40, fl ? '#000' : C.g); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'inputting') return;
    var near = -1, nd = 999999;
    for (var bi = 0; bi < BEATS.length; bi++) { var d = Math.hypot(x - BEATS[bi].x, y - BEATS[bi].y); if (d < nd) { nd = d; near = bi; } }
    if (nd > 100) return;
    beatFlash = near; beatFlashT = 0.25; input.push(near); game.audio.play('se_tap', 0.4); checkInput();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!BEATS) { initBeats(); initGame(); } background(); drawBeats();
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN SYNC!' : 'OFF BEAT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2; if (beatFlashT > 0) beatFlashT -= dt;
      if (iphase === 'showing') { showTimer -= dt; if (showTimer <= 0) { if (showIdx < pattern.length) { beatFlash = pattern[showIdx]; beatFlashT = BEAT_INT * 0.6; game.audio.play('se_tap', 0.35); showIdx++; showTimer = BEAT_INT; } else { iphase = 'pause'; pauseTimer = 0.4; } } }
      else if (iphase === 'pause') { pauseTimer -= dt; if (pauseTimer <= 0) { iphase = 'inputting'; input = []; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBeats();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (iphase === 'inputting') for (var di = 0; di < pattern.length; di++) game.draw.rect(snap(W / 2 - (pattern.length - 1) * 30 + di * 60) - (di < input.length ? 14 : 8), snap(H * 0.76), di < input.length ? 28 : 16, di < input.length ? 28 : 16, di < input.length ? C.b : '#445');
    txt(iphase === 'showing' ? 'LISTEN...' : iphase === 'pause' ? '...' : 'ECHO IT!', W / 2, snap(H * 0.82), 50, iphase === 'inputting' ? C.c : C.e);

    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(round + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < MAX_WRONG; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, wi < wrong ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initBeats();
    initGame();
  });
})(game);
