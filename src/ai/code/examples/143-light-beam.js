// 143-light-beam.js
// ライトビーム — 鏡の向きを変えて、一本の光を的まで通す
// 操作: 鏡をタップして向きを変える(動かない鏡が混ざる)
// 成功: 5つ 的を灯す  失敗: 3回 時間内に通せない or 25秒
// @mechanic: connect
// @theme: custom
// 世界観: 夜の街の設計図。配線図の上で光を折り返し、指定の灯へ届かせる
// variation: フェイント型(回しても向きの変わらない固定鏡が混ざる)
// spice: サドンデス演出(最後の1つは、しくじった時点で終わり)
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 1BIT INK: 白黒2値。中間はディザで作る
  var C = { ink: '#000000', paper: '#f2f2ec', mid: '#9a9a94' };

  var GAME_TITLE = 'LIGHT BEAM';
  var MAX_TIME = 25;
  var NEEDED = 5;
  var MISS_LIMIT = 3;
  var ROUND_TIME = 4.6;

  var COLS = 5, ROWS = 3;
  var CELL = 180;
  var GX = (W - COLS * CELL) / 2;
  var GY = H * 0.36;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var grid, srcRow, goal, lit, misses, score, totalTime, roundLeft, done;
  var ready, hitStop, feedback, feedbackOk, shake, litPulse;

  // 灯(的)のスプライト
  var LAMP = [
    '.PPPP.',
    'PPIIPP',
    'PPIIPP',
    '.PPPP.',
    '..PP..',
  ];
  var LAMP_OFF = { P: C.mid, I: C.ink };
  var LAMP_ON = { P: C.paper, I: C.paper };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.10); }

  // 市松ディザ(1BIT INK の中間調)
  function dither(x, y, w, h, step) {
    for (var dy = 0; dy < h; dy += step) {
      for (var dx = ((dy / step) % 2) * step; dx < w; dx += step * 2) {
        game.draw.rect(x + dx, y + dy, step, step, C.paper, 0.5);
      }
    }
  }

  function blueprintBg() {
    game.draw.gradient(0, H, [[0, '#111111'], [0.5, '#050505'], [1, '#000000']]);
    // 遠景: 設計図の罫線(細線)と枠
    for (var gx = 0; gx <= 16; gx++) game.draw.line(gx / 16 * W, 150, gx / 16 * W, H - 90, '#1b1b19', 2);
    for (var gy = 0; gy < 14; gy++) game.draw.line(0, 150 + gy * 122, W, 150 + gy * 122, '#1b1b19', 2);
    dither(0, H - 150, W, 150, 10);
    game.draw.line(40, 150, W - 40, 150, C.paper, 3);
    game.draw.line(40, H - 90, W - 40, H - 90, C.paper, 3);
  }

  function cellX(c) { return GX + c * CELL + CELL / 2; }
  function cellY(r) { return GY + r * CELL + CELL / 2; }

  function newRound() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid.push([]);
      for (var c = 0; c < COLS; c++) grid[r].push(null);
    }
    srcRow = Math.floor(Math.random() * ROWS);
    // 曲がり角を1つ置き、その先の端を的にする
    var turnCol = 1 + Math.floor(Math.random() * (COLS - 2));
    var goUp = Math.random() < 0.5;
    if (srcRow === 0) goUp = false;
    if (srcRow === ROWS - 1) goUp = true;
    grid[srcRow][turnCol] = { dir: Math.random() < 0.5 ? 0 : 1, fixed: false };
    goal = { col: turnCol, row: goUp ? -1 : ROWS, up: goUp };
    // フェイント型: 回らない固定鏡を1〜2枚まぜる
    var decoys = 1 + Math.floor(Math.random() * 2);
    for (var d = 0; d < decoys; d++) {
      var rr = Math.floor(Math.random() * ROWS), cc = Math.floor(Math.random() * COLS);
      if (grid[rr][cc] || (rr === srcRow && cc === turnCol)) continue;
      if (rr === srcRow && cc < turnCol) continue;   // 光路を塞がない
      grid[rr][cc] = { dir: Math.random() < 0.5 ? 0 : 1, fixed: true };
    }
    roundLeft = ROUND_TIME;
  }

  // 光路を辿る。戻り値は線分の配列と、的に届いたか
  function trace() {
    var pts = [{ x: GX - 60, y: cellY(srcRow) }];
    var c = 0, r = srcRow, dx = 1, dy = 0;
    var guard = 0;
    while (guard++ < 40) {
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) break;
      var m = grid[r][c];
      if (m) {
        pts.push({ x: cellX(c), y: cellY(r) });
        // dir 0 = '/' 、dir 1 = '\'
        if (m.dir === 0) { var t = dx; dx = -dy; dy = -t; }
        else { var t2 = dx; dx = dy; dy = t2; }
      }
      c += dx; r += dy;
    }
    var endX = cellX(Math.max(-1, Math.min(COLS, c)));
    var endY = cellY(Math.max(-1, Math.min(ROWS, r)));
    if (c < 0) endX = GX - 60;
    if (c >= COLS) endX = GX + COLS * CELL + 60;
    if (r < 0) endY = GY - 60;
    if (r >= ROWS) endY = GY + ROWS * CELL + 60;
    pts.push({ x: endX, y: endY });
    var reached = (c === goal.col && ((goal.up && r < 0) || (!goal.up && r >= ROWS)));
    return { pts: pts, reached: reached };
  }

  function initGame() {
    lit = 0; misses = 0; score = 0; totalTime = 0; done = false;
    ready = 0.8; hitStop = 0; feedback = 0; feedbackOk = false; shake = 0; litPulse = 0;
    newRound();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) { game.audio.play('se_success'); }
    else {
      game.audio.play('se_failure');
      hitStop = 0.5; shake = 0.5;
      game.fx.flash(C.paper, 0.2);
    }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function sudden() { return lit >= NEEDED - 1; }

  function onLit() {
    lit++;
    var gain = 100 + Math.round(roundLeft * 40);
    score += gain;
    litPulse = 0.4;
    feedback = 0.3; feedbackOk = true;
    game.feedback.good(cellX(goal.col), goal.up ? GY - 60 : GY + ROWS * CELL + 60, { text: '+' + gain, color: C.paper });
    game.audio.play('se_success', 0.5);
    game.fx.burst(cellX(goal.col), goal.up ? GY - 60 : GY + ROWS * CELL + 60, { color: C.paper, count: 12, speed: 340 });
    if (lit >= NEEDED) { finish(true); return; }
    if (lit === Math.ceil(NEEDED / 2)) {
      game.fx.popup(lit + ' / ' + NEEDED, W / 2, H * 0.26, { color: C.paper, size: 66 });
      game.audio.play('se_milestone', 0.55);
    }
    newRound();
  }

  function onRoundFail() {
    misses++;
    feedback = 0.4; feedbackOk = false;
    hitStop = 0.3; shake = 0.32;
    game.audio.play('se_failure', 0.6);
    game.feedback.bad(W / 2, GY + ROWS * CELL / 2, { text: 'MISS' });
    if (misses >= MISS_LIMIT || sudden()) { finish(false); return; }
    newRound();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    var c = Math.floor((x - GX) / CELL), r = Math.floor((y - GY) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    var m = grid[r][c];
    if (!m) { game.audio.play('se_tap', 0.2); return; }
    if (m.fixed) {
      // フェイント: 固定鏡は回らない。手応えだけ返す
      game.audio.play('se_failure', 0.3);
      game.feedback.bad(cellX(c), cellY(r), { text: 'MISS' });
      feedback = 0.2; feedbackOk = false;
      return;
    }
    m.dir = m.dir === 0 ? 1 : 0;
    game.audio.play('se_tap', 0.45);
  });

  function drawMirror(c, r, m) {
    var x = cellX(c), y = cellY(r), h = CELL * 0.30;
    game.draw.rect(x - CELL / 2 + 10, y - CELL / 2 + 10, CELL - 20, CELL - 20, C.ink);
    if (m.fixed) dither(x - CELL / 2 + 10, y - CELL / 2 + 10, CELL - 20, CELL - 20, 8);
    var col = m.fixed ? C.mid : C.paper;
    if (m.dir === 0) game.draw.line(x - h, y + h, x + h, y - h, col, 12);
    else game.draw.line(x - h, y - h, x + h, y + h, col, 12);
    // 枠。回せる鏡だけ白枠
    if (!m.fixed) {
      game.draw.line(x - CELL / 2 + 10, y - CELL / 2 + 10, x + CELL / 2 - 10, y - CELL / 2 + 10, C.paper, 3);
      game.draw.line(x - CELL / 2 + 10, y + CELL / 2 - 10, x + CELL / 2 - 10, y + CELL / 2 - 10, C.paper, 3);
    }
  }

  function drawBoard(res) {
    // 盤の枠は背景の罫線より明るく。どこが触れる範囲かを線の強さで分ける
    for (var r0 = 0; r0 <= ROWS; r0++) {
      game.draw.line(GX, GY + r0 * CELL, GX + COLS * CELL, GY + r0 * CELL, C.mid, r0 === 0 || r0 === ROWS ? 5 : 3);
    }
    for (var c0 = 0; c0 <= COLS; c0++) {
      game.draw.line(GX + c0 * CELL, GY, GX + c0 * CELL, GY + ROWS * CELL, C.mid, c0 === 0 || c0 === COLS ? 5 : 3);
    }
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (grid[r][c]) drawMirror(c, r, grid[r][c]);
      }
    }
    // 光源
    game.draw.rect(GX - 96, cellY(srcRow) - 26, 60, 52, C.paper);
    // 的(灯)
    var gx2 = cellX(goal.col), gy2 = goal.up ? GY - 70 : GY + ROWS * CELL + 70;
    game.draw.sprite(LAMP, res.reached ? LAMP_ON : LAMP_OFF, gx2, gy2, 14, { anchor: 'center' });
    if (res.reached) game.draw.circle(gx2, gy2, 90, C.paper, 0.25);
    // 光路
    for (var i = 0; i < res.pts.length - 1; i++) {
      game.draw.line(res.pts[i].x, res.pts[i].y, res.pts[i + 1].x, res.pts[i + 1].y, C.paper, res.reached ? 10 : 6);
    }
    // 光の粒が路を走る。静止画の折れ線ではなく「光が流れている」ことを見せる
    drawPacket(res);
  }

  function drawPacket(res) {
    var segs = [], total = 0;
    for (var i = 0; i < res.pts.length - 1; i++) {
      var a = res.pts[i], b = res.pts[i + 1];
      var len = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      if (len <= 0) continue;
      segs.push({ a: a, b: b, len: len });
      total += len;
    }
    if (total <= 0) return;
    var head = (game.time.elapsed * 900) % total;
    for (var k = 0; k < segs.length; k++) {
      if (head > segs[k].len) { head -= segs[k].len; continue; }
      var t = head / segs[k].len;
      var px = segs[k].a.x + (segs[k].b.x - segs[k].a.x) * t;
      var py = segs[k].a.y + (segs[k].b.y - segs[k].a.y) * t;
      game.draw.circle(px, py, 30, C.paper, 0.22);
      game.draw.circle(px, py, 13, C.paper, 1);
      return;
    }
  }

  // ── ATTRACT ゴースト実演: 鏡をタップして向きを変え、光が的へ通る ──
  var demo = { t: 0, dir: 1, gx: W / 2, gy: H * 0.5, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    demo.press = cyc > 1.0 && cyc < 1.25;
    if (cyc > 1.0 && cyc < 1.03) {
      demo.dir = demo.dir === 0 ? 1 : 0;
      if (demo.dir === 0) game.feedback.good(cellX(2), GY - 70, { text: '+220', color: C.paper });
    }
    demo.gx += (cellX(2) - demo.gx) * Math.min(1, dt * 5);
    demo.gy += (cellY(1) - demo.gy) * Math.min(1, dt * 5);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame();
      blueprintBg();
      stepDemo(dt);
      grid[1][2] = { dir: demo.dir, fixed: false };
      srcRow = 1; goal = { col: 2, row: -1, up: true };
      var res0 = trace();
      drawBoard(res0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.paper);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.15, 40, C.mid);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 58, C.paper);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.paper);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 38, C.mid);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      blueprintBg();
      if (hitStop > 0) hitStop -= dt;
      if (shake > 0) shake -= dt;
      drawBoard(trace());
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.82, 92, C.paper);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.89, 54, C.paper);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.94, 42, C.mid);
      scanlines();
      return;
    }

    // ── PLAYING ──
    var res = trace();
    if (!done) {
      if (hitStop > 0) {
        hitStop -= dt;
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap');
      } else {
        totalTime += dt;
        if (totalTime >= MAX_TIME) { finish(lit >= NEEDED); return; }
        if (res.reached) { onLit(); if (done) return; res = trace(); }
        else {
          roundLeft -= dt;
          if (roundLeft <= 0) { onRoundFail(); if (done) return; res = trace(); }
        }
      }
      if (feedback > 0) feedback -= dt;
      if (shake > 0) shake -= dt;
      if (litPulse > 0) litPulse -= dt;
    }

    // draw
    blueprintBg();
    drawBoard(res);

    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 22, '#2a2a28');
    game.draw.rect(60, 40, (W - 120) * frac, 22, sudden() ? C.mid : C.paper);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 42, C.paper);
    txt(lit + ' / ' + NEEDED, W * 0.15, 152, 44, C.paper);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.rect(W * 0.82 + m * 50, 138, 36, 28, m < (MISS_LIMIT - misses) ? C.paper : '#2a2a28');
    }
    // このラウンドの残り(telegraph: 細っていくのが見える)
    game.draw.rect(W * 0.30, H - 130, W * 0.40 * Math.max(0, roundLeft / ROUND_TIME), 14, sudden() ? C.mid : C.paper);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.26, 92, C.paper);
    if (sudden() && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('あと' + (NEEDED - lit) + '個', W / 2, H * 0.22, 50, C.paper);

    scanlines();
  });

  game.onStart(function() {
    // 1BIT INK: 音数を絞った製図室のループ
    game.audio.melody(
      [['A4', 0.5], ['R', 0.5], ['E5', 0.5], ['R', 0.5], ['C5', 0.5], ['R', 1]],
      { tempo: 118, wave: 'square', volume: 0.07, loop: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
