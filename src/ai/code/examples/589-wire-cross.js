// 589-wire-cross.js
// ワイヤークロス — 左右に並ぶ端子から同色のペアをタップで選び、交差した配線を繋ぎ直す
// 操作: 端子をタップで選択 → 同じ色の反対側の端子をタップで接続（色違い/同じ側はミス）
// 成功: 回路 3面 完成  失敗: 3回 誤配線 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、配線盤） ──
  var C = { bg:'#050810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PAIR_COLS = [C.a, C.e, C.b, C.c];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WIRE CROSS';
  var HOW_TO_PLAY = 'TAP A TERMINAL THEN ITS SAME-COLOR PARTNER TO WIRE THE CIRCUIT';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_FAIL = 3;          // 修正2: 8 → 3
  var PAIRS = 4, NODE_R = 40;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var nodes, connections, activeNode, puzzlesDone, fails, timeLeft, done, particles, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1020');
  }

  function background() { game.draw.clear(C.bg); }

  function generatePuzzle() {
    nodes = []; connections = []; activeNode = -1;
    var leftX = snap(W * 0.22), rightX = snap(W * 0.78), spacing = (H * 0.6) / (PAIRS + 1), startY = snap(H * 0.24);
    var order = [0, 1, 2, 3]; for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
    for (var pi = 0; pi < PAIRS; pi++) { nodes.push({ x: leftX, y: startY + spacing * (pi + 1), pair: pi, side: 'left', connected: false, col: PAIR_COLS[pi] }); nodes.push({ x: rightX, y: startY + spacing * (order[pi] + 1), pair: pi, side: 'right', connected: false, col: PAIR_COLS[pi] }); }
  }

  function checkComplete() { for (var ni = 0; ni < nodes.length; ni++) if (!nodes[ni].connected) return false; return true; }

  function initGame() { puzzlesDone = 0; fails = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; generatePuzzle(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (puzzlesDone * 1200 + Math.ceil(timeLeft) * 100) : puzzlesDone * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ci = 0; ci < connections.length; ci++) { var cn = connections[ci], mx = W / 2, my = (cn.ay + cn.by) / 2; game.draw.line(cn.ax, cn.ay, mx, my, cn.col, 6); game.draw.line(mx, my, cn.bx, cn.by, cn.col, 6); }
    for (var ni = 0; ni < nodes.length; ni++) {
      var n = nodes[ni];
      if (n.connected) { pc(n.x, n.y, NODE_R, C.b, 0.8); pc(n.x, n.y, NODE_R * 0.5, C.g, 0.5); continue; }
      var isA = ni === activeNode; pc(n.x, n.y, NODE_R, n.col, isA ? 1.0 : 0.85); pc(n.x - NODE_R * 0.25, n.y - NODE_R * 0.25, NODE_R * 0.3, C.g, 0.4);
      if (isA) pc(n.x, n.y, NODE_R + 12 + Math.sin(game.time.elapsed * 8) * 6, n.col, 0.35);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var hit = -1; for (var ni = 0; ni < nodes.length; ni++) { var n = nodes[ni]; if (n.connected) continue; if ((tx - n.x) * (tx - n.x) + (ty - n.y) * (ty - n.y) < (NODE_R + 30) * (NODE_R + 30)) { hit = ni; break; } }
    if (hit === -1) { activeNode = -1; return; }
    if (activeNode < 0) { activeNode = hit; game.audio.play('se_tap', 0.2); return; }
    if (activeNode === hit) { activeNode = -1; return; }
    var a = nodes[activeNode], b = nodes[hit];
    if (a.pair === b.pair && a.side !== b.side) {
      a.connected = true; b.connected = true; connections.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, col: a.col }); activeNode = -1; game.audio.play('se_success', 0.5);
      for (var pi = 0; pi < 6; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, col: a.col }); }
      if (checkComplete()) { puzzlesDone++; flash = 0.4; flashCol = C.b; game.audio.play('se_success', 0.8); if (puzzlesDone >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) generatePuzzle(); }, 800); }
    } else { fails++; flash = 0.3; flashCol = C.a; activeNode = -1; game.audio.play('se_failure', 0.3); if (fails >= MAX_FAIL) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!nodes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CIRCUIT DONE!' : 'CROSSED WIRES', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
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
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(puzzlesDone + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < fails ? C.a : '#0a1020');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
