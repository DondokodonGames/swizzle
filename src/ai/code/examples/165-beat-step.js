// 165-beat-step.js
// ビートステップ — 音楽のビートが光るタイミングで踏むリズム感ゲーム
// 操作: 光ったパネルをタップ
// 成功: 3回ジャストタイミング  失敗: 8回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ダンスフロア） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BEAT STEP';
  var HOW_TO_PLAY = 'TAP THE GLOWING PANELS';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var NEEDED   = 3;              // 修正2: 30 → 3
  var MAX_MISS = 8;
  var COLS = 4, ROWS = 3, PAD = 12;
  var CELL_W = snap((W - 120) / COLS), CELL_H = 240, GRID_X = snap(60), GRID_Y = snap(300);
  var BPM = 110, BEAT = 60 / 110;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var cells, particles, beatTimer, beatCount, beatFlash, score, misses, timeLeft, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    if (beatFlash > 0) for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(W / 2 + Math.cos(a) * 500) - 6, snap(H / 2 + Math.sin(a) * 500) - 6, 12, 12, C.d, beatFlash * 0.5);
  }

  function drawCell(cell) {
    var cx = cell.x + PAD / 2, cy = cell.y + PAD / 2, cw = CELL_W - PAD, ch = CELL_H - PAD;
    if (cell.hitTimer > 0) { game.draw.rect(cx, cy, cw, ch, C.b, cell.hitTimer * 1.2); txt('!', cx + cw / 2, cy + ch / 2 - 8, 80, C.g); }
    else if (cell.missTimer > 0) game.draw.rect(cx, cy, cw, ch, C.a, cell.missTimer * 1.5);
    else if (cell.lit) {
      var pulse = Math.floor(game.time.elapsed * 8) % 2 === 0 ? 0.95 : 0.7;
      game.draw.rect(cx - 4, cy - 4, cw + 8, ch + 8, C.c, 0.3);
      game.draw.rect(cx, cy, cw, ch, C.f, pulse);
      game.draw.rect(cx, cy, cw, 12, C.c, 0.6);
    } else { game.draw.rect(cx, cy, cw, ch, C.d, 0.4); game.draw.rect(cx, cy, cw, 8, C.d, 0.6); }
  }

  function activateCell() {
    var unlit = cells.filter(function(c) { return !c.lit && c.hitTimer <= 0 && c.missTimer <= 0; });
    if (unlit.length === 0) return;
    var count = Math.min(1 + Math.floor(score / 2), 2);
    for (var i = 0; i < count && unlit.length > 0; i++) {
      var idx = Math.floor(Math.random() * unlit.length);
      unlit[idx].lit = true; unlit[idx].litBeat = beatCount; unlit.splice(idx, 1);
    }
  }

  function deactivateOld() {
    for (var ci = 0; ci < cells.length; ci++) {
      var c = cells[ci];
      if (c.lit && beatCount > c.litBeat + 2) {
        c.lit = false; misses++; c.missTimer = 0.35;
        game.audio.play('se_failure', 0.3);
        if (misses >= MAX_MISS) { finish(false); return; }
      }
    }
  }

  function initGame() {
    cells = []; particles = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) cells.push({ x: GRID_X + c * CELL_W, y: GRID_Y + r * CELL_H, lit: false, hitTimer: 0, missTimer: 0, litBeat: -1 });
    beatTimer = 0; beatCount = 0; beatFlash = 0;
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 30) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var ci = 0; ci < cells.length; ci++) {
      var c = cells[ci];
      if (!c.lit) continue;
      if (x >= c.x && x <= c.x + CELL_W - PAD && y >= c.y && y <= c.y + CELL_H - PAD) {
        c.lit = false; c.hitTimer = 0.4; score++;
        game.audio.play('se_success', 0.8);
        for (var pi = 0; pi < 8; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: c.x + CELL_W / 2, y: c.y + CELL_H / 2, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200 - 80, life: 0.5 }); }
        if (score >= NEEDED) { finish(true); return; }
        return;
      }
    }
    misses++;
    game.audio.play('se_failure', 0.4);
    if (misses >= MAX_MISS) { finish(false); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      for (var ci = 0; ci < 12; ci++) {
        var r = Math.floor(ci / COLS), c = ci % COLS;
        drawCell({ x: GRID_X + c * CELL_W, y: GRID_Y + r * CELL_H, lit: Math.floor(game.time.elapsed * 2) % 12 === ci, hitTimer: 0, missTimer: 0 });
      }
      txt(GAME_TITLE, W / 2, H * 0.14, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN RHYTHM!' : 'GAME OVER', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      beatTimer += dt;
      if (beatTimer >= BEAT) { beatTimer -= BEAT; beatCount++; beatFlash = 0.18; deactivateOld(); if (done) return; if (beatCount % 2 === 0) activateCell(); }
      for (var ci = 0; ci < cells.length; ci++) { if (cells[ci].hitTimer > 0) cells[ci].hitTimer -= dt; if (cells[ci].missTimer > 0) cells[ci].missTimer -= dt; }
    }
    if (beatFlash > 0) beatFlash -= dt;
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 400 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });

    // ---- 描画 ----
    background();
    for (var ci2 = 0; ci2 < cells.length; ci2++) drawCell(cells[ci2]);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.c, particles[pp].life * 2);
    for (var bd = 0; bd < 4; bd++) game.draw.rect(snap(W / 2 + (bd - 1.5) * 64) - 10, H - 100, 20, 20, beatCount % 4 === bd ? C.b : '#2a0a3a');

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 44);
      game.draw.rect(mx - 8, 208, 16, 16, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    state = S.ATTRACT;
    initGame();
  });
})(game);
