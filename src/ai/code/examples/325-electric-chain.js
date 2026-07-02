// 325-electric-chain.js
// エレクトリックチェーン — 光る次のノードを順にタップし、電源Sからゴールへ電流を通す配線パズル
// 操作: 光っている次のノードをタップして電流を伸ばす
// 成功: 3回路つなぐ  失敗: 3回間違える or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、回路盤） ──
  var C = { bg:'#020a06', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#eaffea', wire:'#0a3018' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ELECTRIC CHAIN';
  var HOW_TO_PLAY = 'TAP THE GLOWING NODES FROM S TO G IN ORDER';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 12 → 3
  var MAX_FAIL = 3;          // 修正2: 5 → 3
  var COLS = 4, ROWS = 5, CW = snap(W * 0.8 / COLS), CH = snap(H * 0.52 / ROWS), GLX = snap(W * 0.1), GLY = snap(H * 0.26);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var nodes, path, playerPath, done2, failures, timeLeft, done, particles, okAnim, ngAnim;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a2010');
  }

  function background() { game.draw.clear(C.bg); }

  function nodeAt(c, r) { return r * COLS + c; }

  function generateCircuit() {
    nodes = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) nodes.push({ x: GLX + c * CW + CW / 2, y: GLY + r * CH + CH / 2, visited: false });
    path = []; var col = Math.floor(Math.random() * COLS); path.push(nodeAt(col, 0));
    for (var rr = 1; rr < ROWS; rr++) {
      var moves = [-1, 0, 1]; for (var m = moves.length - 1; m > 0; m--) { var j = Math.floor(Math.random() * (m + 1)); var t = moves[m]; moves[m] = moves[j]; moves[j] = t; }
      for (var mi = 0; mi < moves.length; mi++) { var nc = col + moves[mi]; if (nc >= 0 && nc < COLS) { col = nc; break; } }
      path.push(nodeAt(col, rr));
    }
    playerPath = [];
  }

  function initGame() { generateCircuit(); done2 = 0; failures = 0; timeLeft = MAX_TIME; done = false; particles = []; okAnim = 0; ngAnim = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (done2 * 500 + Math.ceil(timeLeft) * 100) : done2 * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS - 1; c++) { var n1 = nodes[nodeAt(c, r)], n2 = nodes[nodeAt(c + 1, r)]; pline(n1.x, n1.y, n2.x, n2.y, C.wire, 0.7, 4); }
    for (var r2 = 0; r2 < ROWS - 1; r2++) for (var c2 = 0; c2 < COLS; c2++) { var n3 = nodes[nodeAt(c2, r2)], n4 = nodes[nodeAt(c2, r2 + 1)]; pline(n3.x, n3.y, n4.x, n4.y, C.wire, 0.7, 4); }
    for (var pp = 0; pp < playerPath.length - 1; pp++) { var pa = nodes[playerPath[pp]], pb = nodes[playerPath[pp + 1]]; pline(pa.x, pa.y, pb.x, pb.y, C.b, 0.95, 8); }
    var sN = nodes[path[0]], eN = nodes[path[path.length - 1]];
    pc(sN.x, sN.y, 22, C.f, 0.9); txt('S', sN.x, sN.y + 10, 26, '#000');
    pc(eN.x, eN.y, 22, C.c, 0.9); txt('G', eN.x, eN.y + 10, 26, '#000');
    for (var ni = 0; ni < nodes.length; ni++) {
      var node = nodes[ni], next = path[playerPath.length] === ni;
      var col = node.visited ? C.b : (next ? C.e : C.wire);
      pc(node.x, node.y, next ? 22 : 16, col, next ? 0.9 : 0.7);
      if (next) pc(node.x, node.y, 16 + 6 * (Math.floor(game.time.elapsed * 8) % 2), C.g, 0.4);
    }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || okAnim > 0) return;
    var best = -1, bd = 1e9; for (var ni = 0; ni < nodes.length; ni++) { var d = Math.hypot(x - nodes[ni].x, y - nodes[ni].y); if (d < bd) { bd = d; best = ni; } }
    if (best < 0 || bd > CW * 0.7) return;
    if (best === path[playerPath.length]) {
      playerPath.push(best); nodes[best].visited = true; game.audio.play('se_tap', 0.25 + playerPath.length * 0.03);
      if (playerPath.length === path.length) {
        done2++; okAnim = 0.6; game.audio.play('se_success', 0.7);
        for (var k = 0; k < 12; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: nodes[best].x, y: nodes[best].y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 0.6, col: C.b }); }
        if (done2 >= NEEDED) { finish(true); return; }
        setTimeout(function() { if (!done) generateCircuit(); }, 600);
      }
    } else {
      failures++; ngAnim = 0.5; game.audio.play('se_failure', 0.4);
      for (var k2 = 0; k2 < 6; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: nodes[best].x, y: nodes[best].y, vx: Math.cos(a2) * 150, vy: Math.sin(a2) * 150, life: 0.4, col: C.a }); }
      if (failures >= MAX_FAIL) { finish(false); return; }
      for (var ni2 = 0; ni2 < nodes.length; ni2++) nodes[ni2].visited = false; playerPath = [];
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!nodes) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.14, 68, C.b);
      txt(HOW_TO_PLAY, W / 2, H * 0.19, 22, C.e);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'POWERED UP!' : 'SHORT CIRCUIT', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (okAnim > 0) okAnim -= dt; if (ngAnim > 0) ngAnim -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    if (okAnim > 0) game.draw.rect(0, 0, W, H, C.b, okAnim * 0.15);
    if (ngAnim > 0) game.draw.rect(0, 0, W, H, C.a, ngAnim * 0.15);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(done2 + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < failures ? C.a : '#0a2010');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
