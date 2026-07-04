// 678-piano.js
// ピアノメモリー — 光る鍵盤の順番を覚え、同じ順にタップしてフレーズを再現する
// 操作: 提示フェーズで点灯順を記憶 → タップフェーズで同じ順に鍵盤を叩く
// 成功: 5フレーズ 再現  失敗: 3ミス or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、鍵盤／鍵色は保持） ──
  var C = { bg:'#050106', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var KEY_COLORS = ['#ff2079', '#ff6600', '#ffe600', '#00ff41', '#00cfff', '#7700ff'];
  var KEY_LABELS = ['DO', 'RE', 'MI', 'FA', 'SO', 'LA'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PIANO MEMORY';
  var HOW_TO_PLAY = 'WATCH THE KEYS LIGHT UP · THEN TAP THEM IN THE SAME ORDER';
  var MAX_TIME = 25;
  var NEEDED   = 5;          // 修正2: 10 → 5
  var MAX_ERR  = 3;          // 修正2: 5 → 3
  var NUM_KEYS = 6, KEY_W = 140, KEY_H = 400, KEY_GAP = 8, SHOW_DUR = 0.45;
  var KEY_Y = snap(H * 0.44), KEYS_TOTAL = NUM_KEYS * KEY_W + (NUM_KEYS - 1) * KEY_GAP, KEY_X0 = snap((W - KEYS_TOTAL) / 2);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sequence, showIdx, showTimer, seqPhase, inputIdx, litKey, tapFlash, phrases, errors, timeLeft, done, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function keyX(i) { return KEY_X0 + i * (KEY_W + KEY_GAP); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0a0112');
  }

  function background() { game.draw.clear(C.bg); }

  function newSequence() {
    var seqLen = Math.min(3 + Math.floor(phrases / 2), 6); sequence = [];
    for (var i = 0; i < seqLen; i++) sequence.push(Math.floor(Math.random() * NUM_KEYS));
    showIdx = 0; showTimer = 0.55; litKey = -1; inputIdx = 0; seqPhase = 'show';
  }

  function initGame() { phrases = 0; errors = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; tapFlash = [0, 0, 0, 0, 0, 0]; newSequence(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (phrases * 600 + Math.ceil(timeLeft) * 80) : phrases * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(W * 0.04, KEY_Y - 50, W * 0.92, KEY_H + 100, '#0d0215', 0.9);
    var pl = seqPhase === 'show' ? 'WATCH' : (seqPhase === 'input' ? 'YOUR TURN' : '...');
    txt(pl, W / 2, KEY_Y - 110, 44, seqPhase === 'input' ? C.b : '#ffffff55');
    for (var si = 0; si < sequence.length; si++) {
      var played = seqPhase === 'input' && si < inputIdx, showing = seqPhase === 'show' && si < showIdx;
      var dr = showing && si === showIdx - 1 ? 22 : 14, dcol = played ? '#334155' : KEY_COLORS[sequence[si]], dx = W / 2 - (sequence.length - 1) * 36 + si * 72;
      pc(dx, KEY_Y - 160, dr, dcol, played ? 0.4 : 0.8);
    }
    for (var ki = 0; ki < NUM_KEYS; ki++) {
      var kx = keyX(ki), isLit = ki === litKey, isTap = tapFlash[ki] > 0, kAlpha = isLit ? 1.0 : (isTap ? 0.85 : 0.3);
      game.draw.rect(kx, KEY_Y, KEY_W, KEY_H, KEY_COLORS[ki], kAlpha);
      if (isLit) game.draw.rect(kx - 6, KEY_Y - 6, KEY_W + 12, KEY_H + 12, KEY_COLORS[ki], 0.15);
      txt(KEY_LABELS[ki], kx + KEY_W / 2, KEY_Y + KEY_H * 0.84, 36, isLit ? C.g : '#ffffff44');
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || seqPhase !== 'input') return;
    var tk = -1;
    for (var i = 0; i < NUM_KEYS; i++) { var kx = keyX(i); if (tx >= kx && tx < kx + KEY_W && ty >= KEY_Y && ty < KEY_Y + KEY_H) { tk = i; break; } }
    if (tk < 0) return;
    tapFlash[tk] = 0.28;
    if (tk === sequence[inputIdx]) {
      inputIdx++; game.audio.play('se_tap', 0.12);
      if (inputIdx >= sequence.length) {
        phrases++; flash = 0.3; flashCol = C.b; resultText = 'PERFECT!'; resultTimer = 0.55; game.audio.play('se_success', 0.65);
        for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: KEY_Y + KEY_H / 2, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: KEY_COLORS[sequence[sequence.length - 1]] }); }
        if (phrases >= NEEDED) { finish(true); return; } seqPhase = 'wait'; setTimeout(newSequence, 800);
      }
    } else { errors++; flash = 0.4; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.55; game.audio.play('se_failure', 0.4); if (errors >= MAX_ERR) { finish(false); return; } seqPhase = 'wait'; setTimeout(newSequence, 800); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!sequence) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.08, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.115, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.955, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'VIRTUOSO!' : 'OFF KEY', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var ti = 0; ti < NUM_KEYS; ti++) if (tapFlash[ti] > 0) tapFlash[ti] -= dt * 4;
      if (seqPhase === 'show') {
        showTimer -= dt;
        if (showTimer <= 0) { if (showIdx < sequence.length) { litKey = sequence[showIdx]; showIdx++; showTimer = SHOW_DUR; } else { litKey = -1; seqPhase = 'input'; } }
        else if (showTimer < 0.12 && showIdx > 0) litKey = -1;
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.90), 64, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(phrases + ' / ' + NEEDED, W / 2, 158, 44, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 210, 20, 20, ei < errors ? C.a : '#0a0112');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
