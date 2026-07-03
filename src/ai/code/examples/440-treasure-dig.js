// 440-treasure-dig.js
// 宝掘り — 熱感知（近いほど赤）を頼りに、限られた回数でマスを掘って埋もれた宝を掘り当てる
// 操作: マスをタップして掘る（掘った跡の色が宝への近さ＝赤いほど近い）
// 成功: 宝2個 発見  失敗: 掘削10回 使い切る or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、発掘現場） ──
  var C = { bg:'#0a0600', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', soil:'#4a2800' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TREASURE DIG';
  var HOW_TO_PLAY = 'DIG WITH THE HEAT SENSOR (RED=CLOSE) · FIND THE TREASURE';
  var MAX_TIME = 20;
  var GRID = 6, TREAS = 2, MAX_DIGS = 10;
  var CELL = snap(W * 0.14), OX = snap((W - GRID * snap(W * 0.14)) / 2), OY = snap((H - GRID * snap(W * 0.14)) / 2);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var cells, treasures, digs, found, timeLeft, done, particles, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1000');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(OX - 10, OY - 10, GRID * CELL + 20, GRID * CELL + 20, '#1a0e00', 0.8); }

  function hintColor(d) { if (d < 1.5) return C.a; if (d < 2.5) return C.f; if (d < 4) return C.c; if (d < 5.5) return C.e; return C.d; }

  function recalc() { for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) { var md = 999; for (var t = 0; t < treasures.length; t++) { if (treasures[t].found) continue; var d = Math.hypot(c - treasures[t].x, r - treasures[t].y); if (d < md) md = d; } cells[r * GRID + c].dist = md; } }

  function initGame() {
    cells = []; for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) cells.push({ dug: false, treasure: false, dist: 999 });
    treasures = []; while (treasures.length < TREAS) { var tx = Math.floor(Math.random() * GRID), ty = Math.floor(Math.random() * GRID), dup = false; for (var i = 0; i < treasures.length; i++) if (treasures[i].x === tx && treasures[i].y === ty) dup = true; if (!dup) { treasures.push({ x: tx, y: ty, found: false }); cells[ty * GRID + tx].treasure = true; } }
    recalc(); digs = 0; found = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.c;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (found * 700 + (MAX_DIGS - digs) * 150 + Math.ceil(timeLeft) * 100) : found * 400;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) { var cell = cells[r * GRID + c], cx = OX + c * CELL, cy = OY + r * CELL; if (cell.dug) { game.draw.rect(cx + 2, cy + 2, CELL - 4, CELL - 4, '#0f0700', 0.95); if (cell.tFound) { pc(cx + CELL / 2, cy + CELL / 2, CELL * 0.3, C.c, 0.9); pc(cx + CELL / 2 - 8, cy + CELL / 2 - 8, CELL * 0.1, C.g, 0.5); } else pc(cx + CELL / 2, cy + CELL / 2, CELL * 0.28, hintColor(cell.dist), 0.7); } else { game.draw.rect(cx + 2, cy + 2, CELL - 4, CELL - 4, C.soil, 0.85); game.draw.rect(cx + 12, cy + 12, 6, 6, '#2a1600', 0.5); } }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var c = Math.floor((x - OX) / CELL), r = Math.floor((y - OY) / CELL); if (c < 0 || c >= GRID || r < 0 || r >= GRID) return;
    var cell = cells[r * GRID + c]; if (cell.dug) return;
    cell.dug = true; digs++; game.audio.play('se_tap', 0.3);
    if (cell.treasure) { found++; cell.tFound = true; flash = 0.8; flashCol = C.c; game.audio.play('se_success', 0.7); for (var k = 0; k < 12; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: OX + c * CELL + CELL / 2, y: OY + r * CELL + CELL / 2, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180 - 100, life: 0.7, col: C.c }); } for (var t = 0; t < treasures.length; t++) if (treasures[t].x === c && treasures[t].y === r) treasures[t].found = true; recalc(); if (found >= TREAS) { finish(true); return; } }
    else { flash = 0.2; flashCol = C.soil; }
    if (digs >= MAX_DIGS) { finish(false); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!cells) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.17, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TREASURE!' : 'DUG DRY', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
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
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    var dl = MAX_DIGS - digs; txt('DIGS LEFT ' + dl, W / 2, snap(H * 0.86), 44, dl <= 3 ? C.a : C.g);
    pc(W * 0.16, H * 0.91, 12, C.a, 0.8); txt('HOT', W * 0.24, H * 0.918, 26, C.a); pc(W * 0.62, H * 0.91, 12, C.e, 0.8); txt('COLD', W * 0.72, H * 0.918, 26, C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(found + ' / ' + TREAS, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
