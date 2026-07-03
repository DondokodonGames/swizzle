// 471-speed-typer.js
// 残像タイパー — 一瞬表示される数字の配置を記憶し、消えた後に1→2→…の順でタップ
// 操作: 記憶した位置を 1 から順にタップ（順番を間違えるとミス）
// 成功: 3ラウンド クリア  失敗: 3ミス or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、記憶テスト） ──
  var C = { bg:'#020310', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPEED TYPER';
  var HOW_TO_PLAY = 'MEMORIZE THE GRID · THEN TAP 1 TO 9 IN ORDER';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var MAX_MISS = 3;
  var GC = 3, GR = 3, CS = 280;    // 修正2: 4x4 → 3x3
  var OX = snap((W - GC * CS) / 2), OY = snap((H - GR * CS) / 2 - 40);
  var SHOW_DUR = 1.8;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var iphase, round, misses, timeLeft, done, particles, flash, flashCol, numbers, nextExpected, showTimer, tapped, wrongAnim, wrongNum;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0d1035');
  }

  function background() { game.draw.clear(C.bg); }

  function startRound() {
    round++; nextExpected = 1; tapped = []; wrongAnim = 0; wrongNum = -1;
    var count = GC * GR, positions = [];
    for (var i = 0; i < count; i++) positions.push(i);
    for (var j = positions.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = positions[j]; positions[j] = positions[k]; positions[k] = t; }
    numbers = [];
    for (var n = 0; n < count; n++) { var pos = positions[n]; numbers.push({ num: n + 1, col: pos % GC, row: Math.floor(pos / GC) }); }
    iphase = 'show'; showTimer = SHOW_DUR;
  }

  function initGame() { round = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; startRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (round * 800 + Math.ceil(timeLeft) * 100) : (round - 1) * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGrid() {
    for (var ni = 0; ni < numbers.length; ni++) {
      var n = numbers[ni], cx = OX + n.col * CS + CS / 2, cy = OY + n.row * CS + CS / 2;
      var isTapped = tapped.indexOf(n.num) >= 0, isWrong = wrongAnim > 0 && wrongNum === n.num;
      game.draw.rect(OX + n.col * CS + 8, OY + n.row * CS + 8, CS - 16, CS - 16, '#0d1035', 0.8);
      if (iphase === 'show') txt(n.num + '', cx, cy + 30, 120, n.num === 1 ? C.c : C.e);
      else if (isTapped) { game.draw.rect(OX + n.col * CS + 8, OY + n.row * CS + 8, CS - 16, CS - 16, C.b, 0.2); txt(n.num + '', cx, cy + 30, 100, C.b); }
      else if (isWrong) { game.draw.rect(OX + n.col * CS + 8, OY + n.row * CS + 8, CS - 16, CS - 16, C.a, wrongAnim * 0.4); txt('X', cx, cy + 30, 100, C.a); }
      else txt('?', cx, cy + 30, 100, '#374151');
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'input') return;
    var col = Math.floor((tx - OX) / CS), row = Math.floor((ty - OY) / CS);
    if (col < 0 || col >= GC || row < 0 || row >= GR) return;
    var found = null;
    for (var i = 0; i < numbers.length; i++) if (numbers[i].col === col && numbers[i].row === row) { found = numbers[i]; break; }
    if (!found) return;
    if (found.num === nextExpected) {
      tapped.push(found.num); nextExpected++; game.audio.play('se_tap', 0.4);
      var cx = OX + found.col * CS + CS / 2, cy = OY + found.row * CS + CS / 2;
      for (var pi = 0; pi < 5; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: cx, y: cy, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100, life: 0.5, col: C.b }); }
      if (nextExpected > GC * GR) {
        flash = 0.5; flashCol = C.b; game.audio.play('se_success', 0.7);
        if (round >= NEEDED) { finish(true); return; }
        iphase = 'wait'; setTimeout(function() { if (!done) startRound(); }, 800);
      }
    } else {
      misses++; wrongAnim = 0.5; wrongNum = found.num; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!numbers) initGame(); background(); drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.155, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MEMORY ACE!' : 'BLANKED OUT', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (wrongAnim > 0) wrongAnim -= dt * 3;
      if (iphase === 'show') { showTimer -= dt; if (showTimer <= 0) iphase = 'input'; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGrid();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (iphase === 'show') txt('MEMORIZE', W / 2, OY - 60, 52, C.c);
    else if (iphase === 'input') txt('TAP ' + nextExpected, W / 2, OY - 60, 52, C.c);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('ROUND ' + round + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0d1035');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
