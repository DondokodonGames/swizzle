// 561-spark-chain.js
// スパークチェーン — 上端のスタートから下端のゴールまで、正しいノードを順にタップして回路を繋ぐ
// 操作: スタート（橙）から隣接ノードを辿ってゴール（緑）へ。正解ルートと一致すればスパーク走行
// 成功: ルート 3回 完成  失敗: 3回 誤配線 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、回路基板） ──
  var C = { bg:'#000810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPARK CHAIN';
  var HOW_TO_PLAY = 'TRACE FROM START (ORANGE) TO GOAL (GREEN) ALONG THE RIGHT ROUTE';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 12 → 3
  var MAX_FAIL = 3;          // 修正2: 10 → 3
  var COLS = 5, ROWS = 6, CELL = 176, NODE_R = 36;
  var OX = snap((W - (COLS - 1) * CELL) / 2), OY = snap(H * 0.20);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var nodes, correctPath, playerPath, selected, sparkPos, sparkPhase, completions, failures, timeLeft, done, particles, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#001830');
  }

  function background() { game.draw.clear(C.bg); }

  function nodeX(i) { return OX + nodes[i].col * CELL; }
  function nodeY(i) { return OY + nodes[i].row * CELL; }

  function generatePuzzle() {
    nodes = []; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) nodes.push({ col: c, row: r, isStart: false, isEnd: false });
    var startCol = Math.floor(Math.random() * COLS), endCol = Math.floor(Math.random() * COLS), startIdx = startCol, endIdx = (ROWS - 1) * COLS + endCol;
    nodes[startIdx].isStart = true; nodes[endIdx].isEnd = true;
    correctPath = [startIdx]; var curRow = 0, curCol = startCol;
    while (curRow < ROWS - 1) {
      curRow++;
      if (curCol !== endCol && Math.random() < 0.6) curCol += endCol > curCol ? 1 : -1;
      var moves = [0, -1, 1]; for (var mi = moves.length - 1; mi > 0; mi--) { var mj = Math.floor(Math.random() * (mi + 1)); var t = moves[mi]; moves[mi] = moves[mj]; moves[mj] = t; }
      for (var mi2 = 0; mi2 < moves.length; mi2++) { var nc = curCol + moves[mi2]; if (nc >= 0 && nc < COLS) { curCol = nc; break; } }
      correctPath.push(curRow * COLS + curCol);
    }
    correctPath[correctPath.length - 1] = endIdx;
    playerPath = []; selected = -1; sparkPhase = 'idle'; sparkPos = 0;
  }

  function initGame() { completions = 0; failures = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; generatePuzzle(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (completions * 1200 + Math.ceil(timeLeft) * 100) : completions * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var i = 0; i < nodes.length; i++) { var n = nodes[i]; if (n.col < COLS - 1) game.draw.line(nodeX(i), nodeY(i), nodeX(i + 1), nodeY(i + 1), '#004488', 4); if (n.row < ROWS - 1) game.draw.line(nodeX(i), nodeY(i), nodeX(i + COLS), nodeY(i + COLS), '#004488', 4); }
    for (var pi = 1; pi < playerPath.length; pi++) { var pa = playerPath[pi - 1], pb = playerPath[pi]; game.draw.line(nodeX(pa), nodeY(pa), nodeX(pb), nodeY(pb), C.e, 8); }
    if (sparkPhase === 'animating' && playerPath.length > 1) { var si = Math.floor(sparkPos), fr = sparkPos - si, sa = playerPath[Math.min(si, playerPath.length - 1)], sb = playerPath[Math.min(si + 1, playerPath.length - 1)], sx = nodeX(sa) + (nodeX(sb) - nodeX(sa)) * fr, sy = nodeY(sa) + (nodeY(sb) - nodeY(sa)) * fr; pc(sx, sy, 22, C.g, 0.9); pc(sx, sy, 36, C.e, 0.3); }
    for (var i2 = 0; i2 < nodes.length; i2++) { var n2 = nodes[i2], inP = playerPath.indexOf(i2) !== -1, col = n2.isStart ? C.f : n2.isEnd ? C.b : (inP ? C.e : C.d); pc(nodeX(i2), nodeY(i2), NODE_R, col, 0.9); if (i2 === selected) pc(nodeX(i2), nodeY(i2), NODE_R + 12, C.g, 0.3 + Math.sin(game.time.elapsed * 6) * 0.1); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || sparkPhase === 'animating') return;
    var tapped = -1;
    for (var i = 0; i < nodes.length; i++) if (Math.hypot(tx - nodeX(i), ty - nodeY(i)) < NODE_R + 20) { tapped = i; break; }
    if (tapped === -1) { selected = -1; playerPath = []; return; }
    var n = nodes[tapped];
    if (n.isStart && playerPath.length === 0) { playerPath = [tapped]; selected = tapped; game.audio.play('se_tap', 0.3); return; }
    if (playerPath.length === 0) { selected = -1; return; }
    var last = nodes[playerPath[playerPath.length - 1]], dr = Math.abs(n.row - last.row), dc = Math.abs(n.col - last.col);
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      if (playerPath.indexOf(tapped) !== -1) { playerPath = playerPath.slice(0, playerPath.indexOf(tapped) + 1); selected = tapped; game.audio.play('se_tap', 0.2); return; }
      playerPath.push(tapped); selected = tapped; game.audio.play('se_tap', 0.3);
      if (n.isEnd) {
        var correct = playerPath.length === correctPath.length;
        if (correct) for (var ci = 0; ci < playerPath.length; ci++) if (playerPath[ci] !== correctPath[ci]) { correct = false; break; }
        if (correct) { sparkPhase = 'animating'; sparkPos = 0; game.audio.play('se_success', 0.7); }
        else { failures++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.4); playerPath = []; selected = -1; if (failures >= MAX_FAIL) { finish(false); return; } }
      }
    } else game.audio.play('se_failure', 0.1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!nodes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.075, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.11, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 52, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 40, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CIRCUIT LIVE!' : 'SHORT CIRCUIT', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      if (sparkPhase === 'animating') {
        sparkPos += dt * 6;
        if (sparkPos >= playerPath.length - 1) {
          sparkPos = playerPath.length - 1; sparkPhase = 'result'; completions++; flash = 0.5; flashCol = C.b; game.audio.play('se_success', 0.9);
          var li = playerPath[playerPath.length - 1]; for (var pi = 0; pi < 14; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: nodeX(li), y: nodeY(li), vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.5, col: C.b }); }
          if (completions >= NEEDED) { finish(true); return; }
          setTimeout(function() { if (!done) generatePuzzle(); }, 800);
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(completions + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < failures ? C.a : '#001830');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
