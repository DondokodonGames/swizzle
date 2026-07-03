// 495-ice-slide.js
// アイススライド — 氷上を滑り出したら壁に当たるまで止まらない。穴を避けてゴールの星へ
// 操作: スワイプ or タップで進む向きを指定（壁で停止・穴に落ちると失敗）
// 成功: 3ステージ クリア  失敗: 3回 落下 or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、氷の洞窟） ──
  var C = { bg:'#020a14', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ICE SLIDE';
  var HOW_TO_PLAY = 'SWIPE TO SLIDE UNTIL YOU HIT A WALL · REACH THE STAR';
  var MAX_TIME = 30;
  var NEEDED    = 3;         // 修正2: 10 → 3
  var MAX_FALLS = 3;
  var GRID = 6, CELL = 148;
  var OX = snap((W - GRID * CELL) / 2), OY = snap(H * 0.22);

  var maps = [
    [0,0,0,1,0,0, 0,1,0,0,0,0, 0,0,0,0,1,0, 0,0,1,0,0,0, 0,0,0,0,0,3, 0,0,0,0,0,0],
    [1,0,0,0,0,0, 0,0,1,0,0,1, 0,0,0,0,0,0, 1,0,0,2,0,0, 0,0,0,0,0,0, 0,0,0,0,0,3],
    [0,0,0,0,1,0, 0,2,0,0,0,0, 0,0,1,0,0,0, 0,0,0,0,2,0, 1,0,0,0,0,0, 0,0,0,3,0,0],
    [0,1,0,0,0,0, 0,0,0,2,0,0, 0,0,0,0,0,1, 0,2,0,0,0,0, 0,0,0,1,0,0, 3,0,0,0,0,0]
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stage, map, pr, pc, sliding, slideProg, fromR, fromC, toR, toC, trail, rounds, falls, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc2(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function star(cx, cy, r, color, alpha) { pc2(cx, cy, r, color, alpha); game.draw.rect(snap(cx) - 3, snap(cy - r - 8), 6, 16, color, alpha); game.draw.rect(snap(cx) - 3, snap(cy + r - 8), 6, 16, color, alpha); game.draw.rect(snap(cx - r - 8), snap(cy) - 3, 16, 6, color, alpha); game.draw.rect(snap(cx + r - 8), snap(cy) - 3, 16, 6, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#041428');
  }

  function background() { game.draw.clear(C.bg); }

  function loadStage(s) {
    var raw = maps[s % maps.length]; map = []; for (var i = 0; i < GRID; i++) map.push(raw.slice(i * GRID, (i + 1) * GRID).slice());
    pr = 0; pc = 0; for (var r = 0; r < GRID; r++) { var found = false; for (var c = 0; c < GRID; c++) if (map[r][c] === 0) { pr = r; pc = c; found = true; break; } if (found) break; }
    trail = [{ r: pr, c: pc }]; sliding = false;
  }

  function cellAt(r, c) { if (r < 0 || r >= GRID || c < 0 || c >= GRID) return 1; return map[r][c]; }

  function startSlide(dir) {
    if (sliding || done) return;
    var dr = dir === 'up' ? -1 : dir === 'down' ? 1 : 0, dc = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    if (cellAt(pr + dr, pc + dc) === 1) return;
    fromR = pr; fromC = pc; toR = pr + dr; toC = pc + dc; sliding = true; slideProg = 0; game.audio.play('se_tap', 0.3);
  }

  function initGame() { stage = 0; rounds = 0; falls = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; loadStage(0); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (rounds * 800 + Math.ceil(timeLeft) * 100) : rounds * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) {
      var gx = OX + c * CELL, gy = OY + r * CELL, v = map[r][c];
      if (v === 1) { game.draw.rect(gx + 3, gy + 3, CELL - 6, CELL - 6, C.d, 0.9); game.draw.rect(gx + 3, gy + 3, CELL - 6, 10, C.e, 0.4); }
      else if (v === 2) { game.draw.rect(gx + 3, gy + 3, CELL - 6, CELL - 6, '#000918', 0.95); pc2(gx + CELL / 2, gy + CELL / 2, CELL * 0.3, '#000000', 0.9); }
      else if (v === 3) { game.draw.rect(gx + 3, gy + 3, CELL - 6, CELL - 6, '#0a2438', 0.6); star(gx + CELL / 2, gy + CELL / 2, CELL * 0.22, C.c, 0.9); }
      else { game.draw.rect(gx + 3, gy + 3, CELL - 6, CELL - 6, '#0a2438', 0.4); game.draw.rect(gx + 3, gy + 3, CELL - 6, 4, C.e, 0.2); }
    }
    for (var ti = 0; ti < trail.length; ti++) pc2(OX + trail[ti].c * CELL + CELL / 2, OY + trail[ti].r * CELL + CELL / 2, 16, C.e, (ti / trail.length) * 0.3);
    var px, py;
    if (sliding) { px = OX + (fromC + (toC - fromC) * slideProg) * CELL + CELL / 2; py = OY + (fromR + (toR - fromR) * slideProg) * CELL + CELL / 2; }
    else { px = OX + pc * CELL + CELL / 2; py = OY + pr * CELL + CELL / 2; }
    pc2(px, py, 36, C.c, 0.9); pc2(px - 10, py - 10, 10, C.g, 0.5);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || sliding) return;
    var cx = OX + pc * CELL + CELL / 2, cy = OY + pr * CELL + CELL / 2, dx = tx - cx, dy = ty - cy;
    if (Math.abs(dx) > Math.abs(dy)) startSlide(dx > 0 ? 'right' : 'left'); else startSlide(dy > 0 ? 'down' : 'up');
  });

  game.onSwipe(function(dir) { if (state === S.PLAYING && !done && !sliding) startSlide(dir); });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!map) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
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
      txt(resultSuccess ? 'ICE CLEAR!' : 'FELL IN', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
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
      if (sliding) {
        slideProg += dt * 6;
        if (slideProg >= 1) {
          slideProg = 1; pr = toR; pc = toC; trail.push({ r: pr, c: pc }); if (trail.length > 12) trail.shift();
          var cell = cellAt(pr, pc);
          if (cell === 2) {
            falls++; sliding = false; flash = 0.7; flashCol = C.a; game.audio.play('se_failure', 0.5);
            for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: OX + pc * CELL + CELL / 2, y: OY + pr * CELL + CELL / 2, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5, col: C.a }); }
            if (falls >= MAX_FALLS) { finish(false); return; } setTimeout(function() { if (!done) loadStage(stage); }, 600);
          } else if (cell === 3) {
            stage++; rounds++; sliding = false; flash = 0.5; flashCol = C.b; game.audio.play('se_success', 0.8);
            for (var pi2 = 0; pi2 < 14; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: OX + pc * CELL + CELL / 2, y: OY + pr * CELL + CELL / 2, vx: Math.cos(a2) * 200, vy: Math.sin(a2) * 200, life: 0.6, col: C.c }); }
            if (rounds >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) loadStage(stage); }, 600);
          } else {
            var dr = toR - fromR, dc = toC - fromC;
            if (cellAt(pr + dr, pc + dc) !== 1) { fromR = pr; fromC = pc; toR = pr + dr; toC = pc + dc; slideProg = 0; } else sliding = false;
          }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(rounds + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FALLS; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FALLS - 1) / 2) * 56) - 10, 224, 20, 20, fi < falls ? C.a : '#041428');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
