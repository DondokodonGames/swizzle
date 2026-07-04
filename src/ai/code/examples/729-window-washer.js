// 729-window-washer.js
// ウィンドウウォッシャー — 汚れた窓を拭き、目標の文字が現れたマスをタップする
// 操作: マスをタップして汚れを拭くと文字が見える。目標文字のマスを見つける
// 成功: 6文字 発見  失敗: 3回 ミス or 28秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、窓拭き／文字は保持） ──
  var C = { bg:'#0a0a12', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var WINCOL = '#1a2744', DIRT = '#2d3520', DIRT_HI = '#4a5730', LETTER = '#ffe600';
  var LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ123456789';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WINDOW WASHER';
  var HOW_TO_PLAY = 'WIPE THE DIRTY PANES · TAP THE ONE HIDING THE TARGET LETTER';
  var MAX_TIME = 28;
  var NEEDED   = 6;          // 修正2: 20 → 6
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var WIN_X = 80, WIN_Y = 280, WIN_W = W - 160, WIN_H = H * 0.52, COLS = 4, ROWS = 4;
  var CELL_W = WIN_W / COLS, CELL_H = WIN_H / ROWS;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, targetLetter, cellLetters, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, waitTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0d0d18');
  }

  function background() { game.draw.clear(C.bg); }

  function newPuzzle() {
    targetLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)]; grid = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) grid.push({ row: r, col: c, dirty: true, phase: Math.random() * Math.PI * 2 });
    cellLetters = []; var answerIdx = Math.floor(Math.random() * (COLS * ROWS));
    for (var i = 0; i < COLS * ROWS; i++) {
      if (i === answerIdx) cellLetters.push({ letter: targetLetter, isAnswer: true });
      else { var L = LETTERS[Math.floor(Math.random() * LETTERS.length)]; while (L === targetLetter) L = LETTERS[Math.floor(Math.random() * LETTERS.length)]; cellLetters.push({ letter: L, isAnswer: false }); }
    }
    waitTimer = 0;
  }

  function initGame() { score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; newPuzzle(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 600 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function solved(success) {
    score++; flash = 0.35; flashCol = C.b; resultText = 'FOUND ' + targetLetter + '!'; resultTimer = 0.7; game.audio.play('se_success', 0.6);
    if (score >= NEEDED) { finish(true); return; }
    waitTimer = 0.8; setTimeout(function() { if (!done) newPuzzle(); }, 800);
  }

  function drawScene() {
    txt('FIND', W / 2 - 110, WIN_Y - 56, 44, '#ffffff66'); txt(targetLetter, W / 2 + 60, WIN_Y - 56, 64, LETTER);
    game.draw.rect(WIN_X, WIN_Y, WIN_W, WIN_H, WINCOL, 0.8);
    for (var gi2 = 0; gi2 < grid.length; gi2++) {
      var cell = grid[gi2], cx = WIN_X + cell.col * CELL_W, cy = WIN_Y + cell.row * CELL_H, cw = CELL_W - 4, ch = CELL_H - 4;
      if (cell.dirty) {
        game.draw.rect(cx + 2, cy + 2, cw, ch, DIRT, 0.7 + 0.1 * Math.sin(cell.phase * 2.5));
        pc(cx + 20 + Math.sin(cell.phase) * 20, cy + 20, 12, DIRT_HI, 0.4); pc(cx + cw - 30, cy + ch * 0.6, 8, DIRT_HI, 0.3);
      } else {
        game.draw.rect(cx + 2, cy + 2, cw, ch, C.e, 0.08);
        var cl2 = cellLetters[gi2];
        txt(cl2.letter, cx + CELL_W / 2, cy + CELL_H / 2 + 16, 60, cl2.isAnswer ? LETTER : '#ffffff55');
      }
      game.draw.rect(cx, cy, 2, CELL_H, '#ffffff11', 1); game.draw.rect(cx, cy, CELL_W, 2, '#ffffff11', 1);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || waitTimer > 0) return;
    if (tx < WIN_X || tx > WIN_X + WIN_W || ty < WIN_Y || ty > WIN_Y + WIN_H) return;
    var col = Math.floor((tx - WIN_X) / CELL_W), row = Math.floor((ty - WIN_Y) / CELL_H), idx = row * COLS + col;
    if (idx < 0 || idx >= grid.length) return;
    var cell = grid[idx];
    if (cell.dirty) {
      cell.dirty = false; game.audio.play('se_tap', 0.1);
      if (cellLetters[idx].isAnswer) {
        for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2, cx = WIN_X + col * CELL_W + CELL_W / 2, cy = WIN_Y + row * CELL_H + CELL_H / 2; particles.push({ x: cx, y: cy, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: LETTER }); }
        solved(true);
      }
    } else {
      if (cellLetters[idx].isAnswer) solved(true);
      else { errors++; flash = 0.3; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3); if (errors >= MAX_ERR) { finish(false); return; } }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SPOTLESS!' : 'SMUDGED UP', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) waitTimer -= dt;
      for (var gi = 0; gi < grid.length; gi++) grid[gi].phase += dt * (grid[gi].dirty ? 1.2 : 0.5);
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.86), 50, flashCol);
    else txt('WIPE TO FIND THE LETTER', W / 2, snap(H * 0.80), 32, '#ffffff33');

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0d0d18');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
