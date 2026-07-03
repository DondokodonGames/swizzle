// 475-train-switch.js
// 列車の分岐 — 分岐スイッチをタップで切り替え、列車を色の合うホームへ導く
// 操作: 3つのスイッチ（丸）をタップして進路を切替（色違いのホームに入ると脱線）
// 成功: 5本 正しく到着  失敗: 3本 脱線 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、深夜の操車場） ──
  var C = { bg:'#050810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PLAT_COLS = [C.a, C.e, C.b, C.c];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TRAIN SWITCH';
  var HOW_TO_PLAY = 'TAP THE SWITCHES TO ROUTE EACH TRAIN TO ITS COLOR';
  var MAX_TIME = 25;
  var NEEDED     = 5;        // 修正2: 15 → 5
  var MAX_DERAIL = 3;
  var PX = [W * 0.15, W * 0.38, W * 0.62, W * 0.85];
  var PLAT_Y = H * 0.76, MERGE_Y = H * 0.36, SPLIT_Y = H * 0.56, ENTRY_X = W / 2, ENTRY_Y = H * 0.15;
  var LBX = (W * 0.15 + W * 0.38) / 2, RBX = (W * 0.62 + W * 0.85) / 2;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var swA, swB, swC, trains, derailed, delivered, timeLeft, done, nextSpawn, particles, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1020');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnTrain() { var tp = Math.floor(Math.random() * 4); trains.push({ x: ENTRY_X, y: ENTRY_Y - 60, target: tp, col: PLAT_COLS[tp], speed: 340 + Math.random() * 60 }); }

  function initGame() { swA = 0; swB = 0; swC = 0; trains = []; derailed = 0; delivered = 0; timeLeft = MAX_TIME; done = false; nextSpawn = 1.0; particles = []; flash = 0; flashCol = C.b; spawnTrain(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (delivered * 600 + Math.ceil(timeLeft) * 100) : delivered * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawTracks() {
    pline(ENTRY_X, ENTRY_Y, ENTRY_X, MERGE_Y, '#405060', 0.9, 16);
    pline(ENTRY_X, MERGE_Y, LBX, SPLIT_Y, swA === 0 ? C.b : '#405060', 0.9, 14);
    pline(ENTRY_X, MERGE_Y, RBX, SPLIT_Y, swA === 1 ? C.b : '#405060', 0.9, 14);
    pline(LBX, SPLIT_Y, PX[0], PLAT_Y, swB === 0 ? C.b : '#405060', 0.9, 12);
    pline(LBX, SPLIT_Y, PX[1], PLAT_Y, swB === 1 ? C.b : '#405060', 0.9, 12);
    pline(RBX, SPLIT_Y, PX[2], PLAT_Y, swC === 0 ? C.b : '#405060', 0.9, 12);
    pline(RBX, SPLIT_Y, PX[3], PLAT_Y, swC === 1 ? C.b : '#405060', 0.9, 12);
    for (var pi = 0; pi < 4; pi++) { game.draw.rect(PX[pi] - 70, PLAT_Y, 140, 120, PLAT_COLS[pi], 0.3); game.draw.rect(PX[pi] - 70, PLAT_Y, 140, 10, PLAT_COLS[pi], 0.9); }
    var nodes = [{ x: ENTRY_X, y: MERGE_Y, s: swA }, { x: LBX, y: SPLIT_Y, s: swB }, { x: RBX, y: SPLIT_Y, s: swC }];
    for (var si = 0; si < nodes.length; si++) { var n = nodes[si]; pc(n.x, n.y, 34, C.c, 0.9); txt(n.s === 0 ? 'L' : 'R', n.x, n.y + 14, 40, C.bg); }
  }

  function drawTrains() {
    for (var ti = 0; ti < trains.length; ti++) { var t = trains[ti]; game.draw.rect(snap(t.x) - 44, snap(t.y) - 36, 88, 72, t.col, 0.9); game.draw.rect(snap(t.x) - 44, snap(t.y) - 44, 88, 12, t.col, 0.6); game.draw.rect(snap(t.x) - 32, snap(t.y) - 22, 24, 20, C.g, 0.4); game.draw.rect(snap(t.x) + 8, snap(t.y) - 22, 24, 20, C.g, 0.4); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (Math.abs(tx - ENTRY_X) < 70 && Math.abs(ty - MERGE_Y) < 70) { swA = 1 - swA; game.audio.play('se_tap', 0.4); return; }
    if (Math.abs(tx - LBX) < 70 && Math.abs(ty - SPLIT_Y) < 70) { swB = 1 - swB; game.audio.play('se_tap', 0.4); return; }
    if (Math.abs(tx - RBX) < 70 && Math.abs(ty - SPLIT_Y) < 70) { swC = 1 - swC; game.audio.play('se_tap', 0.4); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!trains) initGame(); background(); drawTracks();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.155, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL ON TIME!' : 'DERAILED', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      nextSpawn -= dt; if (nextSpawn <= 0 && trains.length < 3) { spawnTrain(); nextSpawn = 1.3 + Math.random(); }
      for (var ti = trains.length - 1; ti >= 0; ti--) {
        var t = trains[ti];
        if (t.y < MERGE_Y) { t.y += t.speed * dt; if (t.y >= MERGE_Y) t.y = MERGE_Y; }
        else if (t.y < SPLIT_Y) { var bx = swA === 0 ? LBX : RBX; t.x += (bx - t.x) * dt * 3; t.y += t.speed * dt; if (t.y >= SPLIT_Y) t.y = SPLIT_Y; }
        else {
          var dest = t.x < W / 2 ? (swB === 0 ? 0 : 1) : (swC === 0 ? 2 : 3);
          t.x += (PX[dest] - t.x) * dt * 3; t.y += t.speed * dt;
          if (t.y >= PLAT_Y) {
            if (dest === t.target) { delivered++; game.audio.play('se_tap', 0.5); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: t.x, y: t.y, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100, life: 0.5, col: t.col }); } if (delivered >= NEEDED) { finish(true); return; } }
            else { derailed++; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.5); for (var pi2 = 0; pi2 < 12; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: t.x, y: t.y, vx: Math.cos(a2) * 200, vy: Math.sin(a2) * 200 - 100, life: 0.8, col: C.a }); } if (derailed >= MAX_DERAIL) { finish(false); return; } }
            trains.splice(ti, 1);
          }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawTracks(); drawTrains();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(delivered + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var di = 0; di < MAX_DERAIL; di++) game.draw.rect(snap(W / 2 + (di - (MAX_DERAIL - 1) / 2) * 56) - 10, 224, 20, 20, di < derailed ? C.a : '#0a1020');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
