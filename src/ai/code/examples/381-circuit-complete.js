// 381-circuit-complete.js
// 回路完成 — 電源から全ノードへ配線をつなぎ、盤面すべてに電気を通す
// 操作: 隣り合うノード間をスワイプして配線をオン／オフ
// 成功: 3面 完成  失敗: 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、基板） ──
  var C = { bg:'#010803', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff', board:'#0a1408' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CIRCUIT COMPLETE';
  var HOW_TO_PLAY = 'SWIPE BETWEEN NODES TO WIRE POWER TO EVERY NODE';
  var MAX_TIME = 25;
  var LEVELS = 3;            // 修正2: 5 → 3
  var GRID = 3;             // 修正2: 4 → 3
  var CELL = snap(W * 0.28), OX = snap((W - (GRID - 1) * CELL) / 2), OY = snap(H * 0.34);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var nodes, edges, completed, timeLeft, done, particles, okAnim;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a0c');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(snap(W * 0.06), snap(H * 0.26), snap(W * 0.88), snap(H * 0.5), C.board, 0.9); }

  function neighbors(idx) { var r = Math.floor(idx / GRID), c = idx % GRID, nb = []; if (r > 0) nb.push(idx - GRID); if (r < GRID - 1) nb.push(idx + GRID); if (c > 0) nb.push(idx - 1); if (c < GRID - 1) nb.push(idx + 1); return nb; }

  function edgeExists(a, b) { for (var i = 0; i < edges.length; i++) if ((edges[i].a === a && edges[i].b === b) || (edges[i].a === b && edges[i].b === a)) return true; return false; }

  function setupLevel() {
    nodes = []; edges = [];
    for (var i = 0; i < GRID * GRID; i++) { var r = Math.floor(i / GRID), c = i % GRID; nodes.push({ x: OX + c * CELL, y: OY + r * CELL, on: false, source: i === 0 }); }
    nodes[0].on = true;
    var visited = [0], attempts = 0;
    while (visited.length < GRID * GRID && attempts < 1000) { attempts++; var from = visited[Math.floor(Math.random() * visited.length)], nb = neighbors(from), to = nb[Math.floor(Math.random() * nb.length)]; if (visited.indexOf(to) < 0) { visited.push(to); edges.push({ a: from, b: to, connected: false }); } }
    for (var e = 0; e < 2; e++) { var ra = Math.floor(Math.random() * GRID * GRID), nb2 = neighbors(ra), rb = nb2[Math.floor(Math.random() * nb2.length)]; if (ra !== rb && !edgeExists(ra, rb)) edges.push({ a: ra, b: rb, connected: false }); }
    updatePower();
  }

  function updatePower() {
    var on = []; for (var i = 0; i < GRID * GRID; i++) on.push(false); on[0] = true; var q = [0];
    while (q.length) { var cur = q.shift(); for (var e = 0; e < edges.length; e++) { if (!edges[e].connected) continue; var o = edges[e].a === cur ? edges[e].b : edges[e].b === cur ? edges[e].a : -1; if (o >= 0 && !on[o]) { on[o] = true; q.push(o); } } }
    var all = true; for (var n = 0; n < nodes.length; n++) { nodes[n].on = on[n]; if (!on[n]) all = false; }
    return all;
  }

  function nodeAt(x, y) { for (var i = 0; i < nodes.length; i++) if (Math.hypot(x - nodes[i].x, y - nodes[i].y) < 70) return i; return -1; }

  function initGame() { completed = 0; timeLeft = MAX_TIME; done = false; particles = []; okAnim = 0; setupLevel(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (completed * 700 + Math.ceil(timeLeft) * 100) : completed * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    for (var e = 0; e < edges.length; e++) { var na = nodes[edges[e].a], nb = nodes[edges[e].b], both = na.on && nb.on; pline(na.x, na.y, nb.x, nb.y, edges[e].connected ? (both ? C.b : C.d) : '#183018', 0.9, edges[e].connected ? 8 : 4); if (edges[e].connected && both) { var fr = (game.time.elapsed * 3) % 1; pc(na.x + (nb.x - na.x) * fr, na.y + (nb.y - na.y) * fr, 8, C.g, 0.8); } }
    for (var n = 0; n < nodes.length; n++) { var nd = nodes[n], col = nd.on ? (nd.source ? C.c : C.b) : '#2a4a2a'; pc(nd.x, nd.y, 34, col, 0.9); pc(nd.x, nd.y, 20, nd.on ? C.g : '#405040', 0.85); if (nd.source) txt('S', nd.x, nd.y + 10, 26, '#000'); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    var from = nodeAt(x1, y1), to = nodeAt(x2, y2);
    if (from < 0 || to < 0 || from === to || neighbors(from).indexOf(to) < 0) return;
    var found = false;
    for (var e = 0; e < edges.length; e++) { if ((edges[e].a === from && edges[e].b === to) || (edges[e].a === to && edges[e].b === from)) { edges[e].connected = !edges[e].connected; found = true; break; } }
    if (!found) edges.push({ a: from, b: to, connected: true });
    game.audio.play('se_tap', 0.3);
    if (updatePower()) {
      completed++; okAnim = 1.2; game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 16; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: OY + CELL, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.7, col: C.b }); }
      if (completed >= LEVELS) { finish(true); return; }
      setTimeout(function() { if (!done && state === S.PLAYING) { setupLevel(); okAnim = 0; } }, 1200);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!nodes) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.16, 66, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.89, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'POWERED UP!' : 'TIME OUT', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (okAnim > 0) okAnim -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (okAnim > 0) txt('CIRCUIT LIVE!', W / 2, snap(H * 0.72), 52, C.b);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(completed + ' / ' + LEVELS, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
