// 406-ice-sculpture.js
// 氷彫刻 — 四角い氷ブロックを上下左右のスワイプで削り、目標シルエットの形に彫り出す
// 操作: スワイプした向きの端から氷を1マス削る（残すべきマスを削ると削りすぎ）
// 成功: 3体 彫り上げる  失敗: 3回 削りすぎ or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、氷の工房） ──
  var C = { bg:'#040b16', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var SHAPES = [
    [[0,1,0],[1,1,1],[0,1,0]],
    [[1,0,0],[1,0,0],[1,1,1]],
    [[1,1,1],[0,1,0],[0,1,0]],
    [[1,1,0],[0,1,0],[0,1,1]],
    [[1,1,1],[1,0,0],[1,0,0]],
    [[1,1,1],[1,0,1],[1,1,1]]
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ICE SCULPTURE';
  var HOW_TO_PLAY = 'SWIPE TO CARVE THE ICE INTO THE TARGET SHAPE';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var MAX_OVER = 3;          // 修正2: 5 → 3
  var GN = 3, CS = snap(W * 0.24), GX = snap(W / 2 - GN * snap(W * 0.24) / 2), GY = snap(H * 0.34);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var iceGrid, targetGrid, sculptIdx, completed, overcuts, timeLeft, done, particles, okFlash, locked;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a2e');
  }

  function background() { game.draw.clear(C.bg); }

  function loadShape(idx) { var sh = SHAPES[idx % SHAPES.length]; targetGrid = []; for (var r = 0; r < GN; r++) targetGrid.push(sh[r].slice()); iceGrid = []; for (var r2 = 0; r2 < GN; r2++) iceGrid.push([1, 1, 1]); locked = false; }

  function checkComplete() { for (var r = 0; r < GN; r++) for (var c = 0; c < GN; c++) if (iceGrid[r][c] !== targetGrid[r][c]) return false; return true; }

  function initGame() { sculptIdx = 0; completed = 0; overcuts = 0; timeLeft = MAX_TIME; done = false; particles = []; okFlash = 0; loadShape(0); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (completed * 700 + Math.ceil(timeLeft) * 100) : completed * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function chip(cx, cy, vx, vy) { particles.push({ x: cx, y: cy, vx: vx, vy: vy, life: 0.6, col: C.e }); }

  function carve(dir) {
    var over = false;
    if (dir === 'right') { for (var r = 0; r < GN; r++) for (var c = GN - 1; c >= 0; c--) if (iceGrid[r][c] === 1) { if (targetGrid[r][c] === 1) over = true; iceGrid[r][c] = 0; chip(GX + (c + 1) * CS, GY + (r + 0.5) * CS, 200, 0); break; } }
    else if (dir === 'left') { for (var r2 = 0; r2 < GN; r2++) for (var c2 = 0; c2 < GN; c2++) if (iceGrid[r2][c2] === 1) { if (targetGrid[r2][c2] === 1) over = true; iceGrid[r2][c2] = 0; chip(GX + c2 * CS, GY + (r2 + 0.5) * CS, -200, 0); break; } }
    else if (dir === 'up') { for (var c3 = 0; c3 < GN; c3++) for (var r3 = 0; r3 < GN; r3++) if (iceGrid[r3][c3] === 1) { if (targetGrid[r3][c3] === 1) over = true; iceGrid[r3][c3] = 0; chip(GX + (c3 + 0.5) * CS, GY + r3 * CS, 0, -200); break; } }
    else if (dir === 'down') { for (var c4 = 0; c4 < GN; c4++) for (var r4 = GN - 1; r4 >= 0; r4--) if (iceGrid[r4][c4] === 1) { if (targetGrid[r4][c4] === 1) over = true; iceGrid[r4][c4] = 0; chip(GX + (c4 + 0.5) * CS, GY + (r4 + 1) * CS, 0, 200); break; } }
    game.audio.play('se_tap', 0.4);
    if (over) { overcuts++; game.audio.play('se_failure', 0.3); if (overcuts >= MAX_OVER) { finish(false); return; } }
    if (checkComplete()) { completed++; okFlash = 0.8; locked = true; game.audio.play('se_success', 0.6); if (completed >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done && state === S.PLAYING) loadShape(++sculptIdx); }, 800); }
  }

  function drawBoard() {
    for (var r = 0; r < GN; r++) for (var c = 0; c < GN; c++) { var cx = GX + c * CS, cy = GY + r * CS; if (targetGrid[r][c] === 1) game.draw.rect(cx + 4, cy + 4, CS - 8, CS - 8, C.b, 0.12); if (iceGrid[r][c] === 1) { game.draw.rect(cx + 2, cy + 2, CS - 4, CS - 4, C.e, 0.7); game.draw.rect(cx + 8, cy + 8, CS / 3, CS / 3, C.g, 0.4); if (targetGrid[r][c] === 1) game.draw.rect(cx + 2, cy + 2, CS - 4, CS - 4, C.b, 0.1); } }
    txt('^', W / 2, GY - 40, 56, C.d); txt('v', W / 2, GY + GN * CS + 56, 56, C.d); txt('<', GX - 40, GY + GN * CS / 2, 56, C.d); txt('>', GX + GN * CS + 40, GY + GN * CS / 2, 56, C.d);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done || locked) return; carve(d);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!iceGrid) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.16, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MASTERPIECE!' : 'CHIPPED AWAY', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (okFlash > 0) okFlash -= dt * 2;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    txt('TARGET', GX + GN * CS + 40, GY - 40, 30, C.b);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (okFlash > 0) game.draw.rect(0, 0, W, H, C.b, okFlash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(completed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var oi = 0; oi < MAX_OVER; oi++) game.draw.rect(snap(W / 2 + (oi - (MAX_OVER - 1) / 2) * 56) - 10, 224, 20, 20, oi < overcuts ? C.a : '#0a1a2e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
