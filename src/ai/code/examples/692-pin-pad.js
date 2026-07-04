// 692-pin-pad.js
// PINパッド — 3×3グリッドで光ったマスの順番を記憶して正確に再現する
// 操作: 点灯順を覚え、同じ順にマスをタップ
// 成功: 5問 正解  失敗: 3回 ミス or 28秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、セキュリティパッド） ──
  var C = { bg:'#040210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PIN PAD';
  var HOW_TO_PLAY = 'WATCH THE CELLS LIGHT UP · THEN TAP THEM IN THE SAME ORDER';
  var MAX_TIME = 28;
  var NEEDED   = 5;          // 修正2: 15 → 5
  var MAX_ERR  = 3;          // 修正2: 5 → 3
  var GRID = 3, CELL = 240, GAP = 16, SHOW_DUR = 0.5;
  var GRID_W = GRID * CELL + (GRID - 1) * GAP, GRID_X = snap((W - GRID_W) / 2), GRID_Y = snap(H * 0.35);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pattern, seqLen, showIdx, showTimer, seqPhase, inputSeq, litCell, correct, errors, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, tapFlashCell, tapFlashTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#070415');
  }

  function background() { game.draw.clear(C.bg); }

  function cellX(c) { return GRID_X + c * (CELL + GAP); }
  function cellY(r) { return GRID_Y + r * (CELL + GAP); }

  function newPattern() {
    seqLen = Math.min(3 + Math.floor(correct / 2), 6); pattern = []; var last = -1;
    for (var i = 0; i < seqLen; i++) { var c; do { c = Math.floor(Math.random() * 9); } while (c === last); pattern.push(c); last = c; }
    showIdx = 0; showTimer = 0.5; litCell = -1; inputSeq = []; seqPhase = 'show';
  }

  function initGame() { correct = 0; errors = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; tapFlashCell = -1; tapFlashTimer = 0; newPattern(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 600 + Math.ceil(timeLeft) * 100) : correct * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var phaseStr = seqPhase === 'show' ? 'MEMORIZE' : (seqPhase === 'input' ? 'YOUR TURN' : '...');
    txt(phaseStr, W / 2, GRID_Y - 96, 48, seqPhase === 'input' ? C.b : '#ffffff55');
    for (var si = 0; si < pattern.length; si++) {
      var dotCol2 = '#1e293b';
      if (seqPhase === 'show' && si < showIdx) dotCol2 = C.d;
      else if (seqPhase === 'input' && si < inputSeq.length) dotCol2 = inputSeq[si] === pattern[si] ? C.b : C.a;
      pc(W / 2 - (pattern.length - 1) * 32 + si * 64, GRID_Y - 150, 15, dotCol2, 0.9);
    }
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) {
      var cell2 = r * GRID + c, isLit = cell2 === litCell, isTapFlash = cell2 === tapFlashCell && tapFlashTimer > 0, isInputDone = seqPhase === 'input' && inputSeq.indexOf(cell2) >= 0;
      var cX = cellX(c), cY2 = cellY(r), bCol = isLit ? C.d : (isTapFlash ? '#a78bfa' : (isInputDone ? '#1e1b4b' : '#0d0a24')), bAlpha = isLit ? 1.0 : (isTapFlash ? 0.9 : 0.85);
      game.draw.rect(cX, cY2, CELL, CELL, bCol, bAlpha);
      if (isLit) game.draw.rect(cX - 5, cY2 - 5, CELL + 10, CELL + 10, C.d, 0.2);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || seqPhase !== 'input') return;
    var col = Math.floor((tx - GRID_X) / (CELL + GAP)), row = Math.floor((ty - GRID_Y) / (CELL + GAP));
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    if ((tx - GRID_X) - col * (CELL + GAP) > CELL || (ty - GRID_Y) - row * (CELL + GAP) > CELL) return;
    var cell = row * GRID + col; tapFlashCell = cell; tapFlashTimer = 0.22; inputSeq.push(cell); game.audio.play('se_tap', 0.1);
    var idx = inputSeq.length - 1;
    if (inputSeq[idx] !== pattern[idx]) {
      errors++; flash = 0.4; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.6; game.audio.play('se_failure', 0.4);
      if (errors >= MAX_ERR) { finish(false); return; }
      seqPhase = 'wait'; setTimeout(newPattern, 800);
    } else if (inputSeq.length >= pattern.length) {
      correct++; flash = 0.35; flashCol = C.b; resultText = 'CORRECT!'; resultTimer = 0.6; game.audio.play('se_success', 0.65);
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: GRID_Y + GRID_W / 2, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: '#a78bfa' }); }
      if (correct >= NEEDED) { finish(true); return; }
      seqPhase = 'wait'; setTimeout(newPattern, 700);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!pattern) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ACCESS GRANTED!' : 'ACCESS DENIED', W / 2, H * 0.35, 52, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (tapFlashTimer > 0) tapFlashTimer -= dt * 4;
      if (seqPhase === 'show') {
        showTimer -= dt;
        if (showTimer <= 0) { if (showIdx < pattern.length) { litCell = pattern[showIdx]; showIdx++; showTimer = SHOW_DUR; } else { litCell = -1; seqPhase = 'input'; } }
        else if (showTimer < 0.12 && showIdx > 0) litCell = -1;
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.88), 64, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#070415');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
