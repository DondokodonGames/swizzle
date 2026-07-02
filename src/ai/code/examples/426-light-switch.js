// 426-light-switch.js
// 電灯パズル — ライツアウト。タップすると自分と上下左右の灯りが反転。すべて消灯させる
// 操作: マスをタップ（自分と隣接4マスが点灯／消灯を反転する）
// 成功: 全消灯する  失敗: 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、配電盤） ──
  var C = { bg:'#020a04', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LIGHT SWITCH';
  var HOW_TO_PLAY = 'TAP A CELL TO FLIP IT AND ITS NEIGHBORS · TURN ALL OFF';
  var MAX_TIME = 25;
  var GRID = 3;              // 修正2: 4 → 3
  var CELL = snap(W * 0.26), GAP = 20, BW = GRID * snap(W * 0.26) + (GRID - 1) * 20, BX = snap((W - BW) / 2), BY = snap((H - BW) / 2);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var lights, timeLeft, done, flash, tapAnim;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.16) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a0c');
  }

  function background() { game.draw.clear(C.bg); }

  function toggle(idx) { lights[idx] = !lights[idx]; }
  function toggleGroup(idx, silent) { toggle(idx); var r = Math.floor(idx / GRID), c = idx % GRID; if (r > 0) toggle(idx - GRID); if (r < GRID - 1) toggle(idx + GRID); if (c > 0) toggle(idx - 1); if (c < GRID - 1) toggle(idx + 1); if (!silent) { tapAnim.push({ idx: idx, t: 0 }); game.audio.play('se_tap', 0.3); } }
  function allOff() { for (var i = 0; i < lights.length; i++) if (lights[i]) return false; return true; }

  function initPuzzle() { lights = []; for (var i = 0; i < GRID * GRID; i++) lights.push(false); tapAnim = []; var m = 3 + Math.floor(Math.random() * 3); for (var k = 0; k < m; k++) toggleGroup(Math.floor(Math.random() * GRID * GRID), true); if (allOff()) initPuzzle(); }

  function initGame() { timeLeft = MAX_TIME; done = false; flash = 0; initPuzzle(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (2000 + Math.ceil(timeLeft) * 100) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    for (var li = 0; li < GRID * GRID; li++) { var r = Math.floor(li / GRID), c = li % GRID, x = BX + c * (CELL + GAP), y = BY + r * (CELL + GAP), on = lights[li]; if (on) { ring(x + CELL / 2, y + CELL / 2, CELL * 0.6, C.c, 0.2); game.draw.rect(x, y, CELL, CELL, C.c, 0.9); game.draw.rect(x + 8, y + 8, CELL / 3, CELL / 4, C.g, 0.3); } else { game.draw.rect(x, y, CELL, CELL, '#0a1a0c', 0.85); game.draw.rect(x + 8, y + 8, CELL / 3, CELL / 4, C.d, 0.15); } for (var ai = 0; ai < tapAnim.length; ai++) if (tapAnim[ai].idx === li) ring(x + CELL / 2, y + CELL / 2, tapAnim[ai].t * CELL * 0.7, C.g, (1 - tapAnim[ai].t) * 0.3); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var c = Math.floor((x - BX) / (CELL + GAP)), r = Math.floor((y - BY) / (CELL + GAP)); if (c < 0 || c >= GRID || r < 0 || r >= GRID) return;
    toggleGroup(r * GRID + c, false);
    if (allOff()) { flash = 0.9; game.audio.play('se_success', 0.7); finish(true); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!lights) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'LIGHTS OUT!' : 'TIME OUT', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 1.5;
      for (var ai = tapAnim.length - 1; ai >= 0; ai--) { tapAnim[ai].t = Math.min(1, tapAnim[ai].t + dt * 4); if (tapAnim[ai].t >= 1) tapAnim.splice(ai, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.12);

    var onNum = 0; for (var k = 0; k < lights.length; k++) if (lights[k]) onNum++;
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('ON ' + onNum, W / 2, 168, 48, onNum === 0 ? C.b : C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
