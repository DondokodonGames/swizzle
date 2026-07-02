// 289-voltage-spike.js
// ボルテージスパイク — 電圧グラフに現れる急騰スパイクを素早くタップして電力網を安定させる
// 操作: 流れてくるスパイクをタップして抑える
// 成功: 3個のスパイクを抑える  失敗: 3個見逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、オシロスコープ） ──
  var C = { bg:'#020a04', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#66ff88', f:'#ff6600', g:'#eaffea', grid:'#0a3018' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'VOLTAGE SPIKE';
  var HOW_TO_PLAY = 'TAP THE SPIKES TO STABILIZE THE GRID';
  var MAX_TIME  = 15;
  var NEEDED    = 3;          // 修正2: 25 → 3
  var MAX_MISS  = 3;          // 修正2: 8 → 3
  var BASE_Y = snap(H * 0.46), GRAPH_H = snap(H * 0.32);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var graph, phase, spikes, suppressed, missed, timeLeft, done, spawnTimer, flashes;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.24) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - 4, snap(y1 + dy * i / n) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a2010');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var gy = BASE_Y - GRAPH_H; gy <= BASE_Y + GRAPH_H; gy += 64) game.draw.rect(0, gy, W, 2, C.grid, 0.7);
    for (var gx = 0; gx <= W; gx += 96) game.draw.rect(gx, BASE_Y - GRAPH_H, 2, GRAPH_H * 2, C.grid, 0.5);
    game.draw.rect(0, BASE_Y, W, 3, C.d, 0.6);
  }

  function drawGraph() {
    // オシロ波形を8pxブロックの点で描く
    for (var i = 0; i < graph.length - 1; i++) game.draw.rect(snap(i * 24), snap(graph[i]) - 4, 8, 8, C.b, 0.85);
  }

  function initGame() {
    graph = []; for (var i = 0; i < 46; i++) graph.push(BASE_Y);
    phase = 0; spikes = []; suppressed = 0; missed = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.5; flashes = [];
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (suppressed * 500 + Math.ceil(timeLeft) * 80) : suppressed * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function spawnSpike() {
    var up = Math.random() < 0.5, h = game.random(140, 240);
    spikes.push({ x: W + 60, y: up ? BASE_Y - h : BASE_Y + h, up: up, hit: false });
  }

  function drawSpike(sp) {
    var col = sp.up ? C.a : C.c;
    pline(sp.x, BASE_Y, sp.x, sp.y, col, 0.9);
    ring(sp.x, sp.y, 52 + 8 * (Math.floor(game.time.elapsed * 8) % 2), col, 0.6);
    pc(sp.x, sp.y, 40, col, 0.85);
    txt(sp.up ? 'HI' : 'LO', sp.x, sp.y + 12, 34, '#000');
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var si = spikes.length - 1; si >= 0; si--) {
      var sp = spikes[si]; if (sp.hit) continue;
      var dx = x - sp.x, dy = y - sp.y;
      if (dx * dx + dy * dy < 90 * 90) {
        sp.hit = true; suppressed++; flashes.push({ x: sp.x, y: sp.y, life: 0.4, miss: false });
        game.audio.play('se_success', 0.45);
        if (suppressed >= NEEDED) { finish(true); return; }
        return;
      }
    }
    flashes.push({ x: x, y: y, life: 0.3, miss: true });
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      for (var i = 0; i < graph.length; i++) graph[i] = BASE_Y + Math.sin(i * 0.5 + game.time.elapsed * 2) * 30;
      drawGraph(); drawSpike({ x: W * 0.5, y: BASE_Y - 180, up: true });
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.b);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.e);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GRID STABLE!' : 'BLACKOUT', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      phase += dt * 2;
      graph.push(BASE_Y + Math.sin(phase * 3.7) * 18 + Math.sin(phase * 7.3) * 8 + Math.sin(phase * 1.1) * 30);
      if (graph.length > 46) graph.shift();
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnSpike(); spawnTimer = 1.0 + Math.random() * 0.6; }
      for (var si = spikes.length - 1; si >= 0; si--) {
        var sp = spikes[si]; sp.x -= 200 * dt;
        if (sp.hit) { spikes.splice(si, 1); continue; }
        if (sp.x < -60) { spikes.splice(si, 1); missed++; game.audio.play('se_failure', 0.4); if (missed >= MAX_MISS) { finish(false); return; } }
      }
      for (var tf = flashes.length - 1; tf >= 0; tf--) { flashes[tf].life -= dt; if (flashes[tf].life <= 0) flashes.splice(tf, 1); }
    }

    // ---- 描画 ----
    background(); drawGraph();
    for (var si2 = 0; si2 < spikes.length; si2++) drawSpike(spikes[si2]);
    for (var tf2 = 0; tf2 < flashes.length; tf2++) { var fl = flashes[tf2], a = fl.life / 0.4; ring(fl.x, fl.y, 60 * (1 - a) + 20, fl.miss ? C.a : C.e, a * 0.9); }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(suppressed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#0a2010');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
