// J-N6434-0004-terrace-trough-link.js
// 棚田の樋つなぎ — 板樋のマスを回して湧き水から田んぼまで一本の水路を通す。水が届いたマスが光って進み具合が見える
// 操作: 板樋のマスをタップすると90度回る。つながった所まで水が流れ込む
// 終わり: 2枚の田んぼに水を通せばCLEAR。時間切れでGAME OVER
// @mechanic: connect
// @theme: terrace_irrigation_trough
// 世界観: 山あいの棚田の水番が、崩れて向きのばらばらになった板樋を1枚ずつ回し直し、日が傾く前に湧き水を下の田んぼ2枚へ引き入れる
// 残るもの: 正誤(CLEAR/GAME OVER) + 水を通した田の数と回した回数
// スタイル: 8bit HANDHELD

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 黄緑寄り4階調、低コントラスト、残像、画面枠
  var G4 = { d0: '#0f380f', d1: '#306230', d2: '#8bac0f', d3: '#9bbc0f', bezel: '#50545c', bezel2: '#383c44', red: '#a83838' };

  var GAME_TITLE = 'TROUGH LINK';
  var TIME_LIMIT = 16;
  var FIELD_GOAL = 2;
  var COLS = 4;
  var CELL = 200;
  var GX = (W - COLS * CELL) / 2;
  var GY = H * 0.22;
  var N = 1, E = 2, So = 4, Wd = 8;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var KEEPER = [
    [
      '..dddd..',
      '.dddddd.',
      '..llll..',
      '..l..l..',
      '.dddddd.',
      'l.dddd.l',
      '..d..d..',
      '.dd..dd.'
    ],
    [
      '..dddd..',
      '.dddddd.',
      '..llll..',
      '..l..l..',
      'ldddddd.',
      '..dddd.l',
      '..d..d..',
      '.d....d.'
    ]
  ];
  var SPRING = ['..ll..', '.llll.', 'llddll', 'lddddl', '.dddd.'];
  var PADDY = ['l.l.l.l', 'ddddddd', 'l.l.l.l', 'ddddddd', 'l.l.l.l'];
  var FROG = ['.l.l.', 'lllll', 'ldldl', '.lll.'];

  var rows, mask, sol, sr, er, filled, solvedT, boards, turns, timeLeft, ready, hitStop, endWait, done, ok, why, tapFlash, prevLen;

  function rot(m) { return ((m << 1) | (m >> 3)) & 15; }

  function genBoard(nRows) {
    rows = nRows;
    mask = []; sol = [];
    for (var r = 0; r < rows; r++) { mask.push([0, 0, 0, 0]); sol.push([0, 0, 0, 0]); }
    sr = Math.floor(game.random(0, rows));
    var r0 = sr, enter = Wd, pathCells = [];
    for (var c = 0; c < COLS; c++) {
      var nr = Math.max(0, Math.min(rows - 1, r0 + Math.floor(game.random(-2, 3))));
      var step = nr > r0 ? 1 : -1;
      var r1 = r0;
      for (var g = 0; g < 12; g++) {
        var out = r1 === nr ? E : (step > 0 ? So : N);
        sol[r1][c] = enter | out;
        pathCells.push([r1, c]);
        if (out === E) break;
        r1 += step;
        enter = step > 0 ? N : So;
      }
      enter = Wd; r0 = nr;
    }
    er = r0;
    var decoys = [5, 10, 3, 6, 12, 9];
    for (var rr = 0; rr < rows; rr++) for (var cc = 0; cc < COLS; cc++) {
      if (!sol[rr][cc]) mask[rr][cc] = decoys[Math.floor(game.random(0, 6))];
    }
    var wrong = 0;
    for (var i = 0; i < pathCells.length; i++) {
      var pr = pathCells[i][0], pc = pathCells[i][1];
      var m = sol[pr][pc], k = Math.floor(game.random(0, 4));
      if (i < 2 || Math.random() < 0.3) k = 0;
      for (var j = 0; j < k; j++) m = rot(m);
      if (m !== sol[pr][pc]) wrong++;
      mask[pr][pc] = m;
    }
    if (wrong < 3) {
      for (var q = pathCells.length - 1; q >= 0 && wrong < 3; q--) {
        var a = pathCells[q][0], b = pathCells[q][1];
        if (mask[a][b] === sol[a][b]) { mask[a][b] = rot(mask[a][b]); wrong++; }
      }
    }
    filled = flow(); prevLen = filled.cells.length; solvedT = 0;
  }

  // 湧き水から流れをたどる。{cells:[[r,c]...], done}
  function flow() {
    var r = sr, c = 0, enter = Wd, cells = [];
    for (var guard = 0; guard < 40; guard++) {
      if (r < 0 || r >= rows || c < 0 || c >= COLS) return { cells: cells, done: false };
      var m = mask[r][c];
      if (!(m & enter)) return { cells: cells, done: false };
      cells.push([r, c]);
      var out = m & ~enter;
      if (c === COLS - 1 && out === E && r === er) return { cells: cells, done: true };
      if (out === N) { r--; enter = So; }
      else if (out === E) { c++; enter = Wd; }
      else if (out === So) { r++; enter = N; }
      else { c--; enter = E; }
    }
    return { cells: cells, done: false };
  }

  function isWet(r, c) {
    for (var i = 0; i < filled.cells.length; i++) if (filled.cells[i][0] === r && filled.cells[i][1] === c) return i;
    return -1;
  }

  function initGame() {
    boards = 0; turns = 0; timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; endWait = 0;
    done = false; ok = false; why = ''; tapFlash = null;
    genBoard(4);
  }

  // マスを1回転させ、結果を返す: 'solved' | 'longer' | 'broke' | 'turn'
  function turnCell(r, c) {
    mask[r][c] = rot(mask[r][c]);
    turns++;
    tapFlash = { r: r, c: c, t: 0.15 };
    var before = filled.cells.length;
    filled = flow();
    if (filled.done) { solvedT = 0.8; return 'solved'; }
    if (filled.cells.length > before) return 'longer';
    if (filled.cells.length < before) return 'broke';
    return 'turn';
  }

  function cellAt(x, y) {
    var c = Math.floor((x - GX) / CELL), r = Math.floor((y - GY) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= rows) return null;
    return [r, c];
  }

  function txt(str, x, y, size, color) {
    game.draw.text(str, x, y, { size: size, color: color || G4.d0, bold: true, align: 'center', font: 'monospace' });
  }

  function drawScreen() {
    var t = game.time.elapsed;
    // 本体の枠(ベゼル)
    game.draw.gradient(0, H, [[0, G4.bezel], [1, G4.bezel2]]);
    game.draw.rect(30, 30, W - 60, H * 0.9, G4.d0);
    game.draw.gradient(40, H * 0.9 + 20, [[0, G4.d3], [1, G4.d2]]);
    // 棚田の段(背景)
    for (var i = 0; i < 6; i++) {
      var ty = GY - 40 + i * 190;
      game.draw.rect(40, ty, W - 80, 6, G4.d1, 0.35);
    }
    // 蛙(常時bob)
    game.draw.sprite(FROG, { l: G4.d1, d: G4.d0 }, W * 0.12, H * 0.8 + Math.abs(Math.sin(t * 3)) * -16, 10, { anchor: 'center' });
    // 画面の明滅(環境光)
    game.draw.rect(40, 40, W - 80, H * 0.9 - 20, G4.d3, 0.04 + 0.04 * Math.sin(t * 1.3));
  }

  function drawTile(r, c, m, wetIdx) {
    var x = GX + c * CELL, y = GY + r * CELL;
    var flash = tapFlash && tapFlash.r === r && tapFlash.c === c;
    game.draw.rect(x + 6, y + 6, CELL - 12, CELL - 12, flash ? G4.d3 : G4.d1);
    game.draw.rect(x + 14, y + 14, CELL - 28, CELL - 28, G4.d2, 0.35);
    var cx = x + CELL / 2, cy = y + CELL / 2, hw = 30;
    var wet = wetIdx >= 0;
    var ch = wet ? G4.d3 : G4.d0;
    var ripple = wet ? 0.7 + 0.3 * Math.sin(game.time.elapsed * 8 - wetIdx) : 1;
    if (m & N) game.draw.rect(cx - hw, y + 6, hw * 2, CELL / 2 - 6 + hw, ch, ripple);
    if (m & So) game.draw.rect(cx - hw, cy - hw, hw * 2, CELL / 2 + hw - 6, ch, ripple);
    if (m & E) game.draw.rect(cx - hw, cy - hw, CELL / 2 + hw - 6, hw * 2, ch, ripple);
    if (m & Wd) game.draw.rect(x + 6, cy - hw, CELL / 2 - 6 + hw, hw * 2, ch, ripple);
    if (wet) game.draw.rect(cx - 10, cy - 10, 20, 20, G4.d0, 0.4);
  }

  function drawBoard() {
    for (var r = 0; r < rows; r++) for (var c = 0; c < COLS; c++) drawTile(r, c, mask[r][c], isWet(r, c));
    var t = game.time.elapsed;
    var sy = GY + sr * CELL + CELL / 2, ey = GY + er * CELL + CELL / 2;
    game.draw.sprite(SPRING, { l: G4.d3, d: G4.d0 }, GX - 50, sy + Math.sin(t * 4) * 4, 12, { anchor: 'center' });
    var fillPal = solvedT > 0 || filled.done ? { l: G4.d3, d: G4.d1 } : { l: G4.d1, d: G4.d0 };
    game.draw.sprite(PADDY, fillPal, GX + COLS * CELL + 50, ey, 11, { anchor: 'center' });
  }

  function drawKeeper() {
    var t = game.time.elapsed;
    game.draw.sprite(KEEPER[Math.floor(t * 2.5) % 2], { d: G4.d0, l: G4.d2 }, W * 0.82, H * 0.82 + Math.sin(t * 2) * 6, 16, { anchor: 'center' });
  }

  function drawHud() {
    for (var i = 0; i < FIELD_GOAL; i++) game.draw.sprite(PADDY, i < boards ? { l: G4.d3, d: G4.d0 } : { l: G4.d1, d: G4.d1 }, W * 0.12 + i * 110, 110, 9, { anchor: 'center' });
    txt(boards + ' / ' + FIELD_GOAL, W * 0.5, 110, 48);
    txt(filled.cells.length + '', W * 0.84, 110, 44, G4.d1);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 170, W - 160, 20, G4.d1);
    game.draw.rect(80, 170, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? G4.red : G4.d0);
  }

  // ── ATTRACT: 向きの違う樋を回して水を通す(成功)。途中で水の通ったマスを回して流れが切れる(失敗)も見せる
  var demo = { t: 0, clock: 0.6, gx: W / 2, gy: H * 0.5, press: 0, broke: false, solved: 0 };
  function demoNextCell() {
    if (!demo.broke && filled.cells.length >= 3) {
      demo.broke = true;
      return filled.cells[1];
    }
    for (var r = 0; r < rows; r++) for (var c = 0; c < COLS; c++) if (sol[r][c] && mask[r][c] !== sol[r][c]) {
      return [r, c];
    }
    return null;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { genBoard(4); demo.broke = false; demo.solved = 0; demo.clock = 0.6; }
    if (tapFlash && (tapFlash.t -= dt) <= 0) tapFlash = null;
    if (demo.press > 0) demo.press -= dt;
    if (demo.solved > 0) { demo.solved -= dt; return; }
    demo.clock -= dt;
    var nxt = demoNextCell();
    if (nxt) {
      demo.gx += (GX + nxt[1] * CELL + CELL / 2 - demo.gx) * Math.min(1, dt * 9);
      demo.gy += (GY + nxt[0] * CELL + CELL / 2 - demo.gy) * Math.min(1, dt * 9);
    }
    if (demo.clock <= 0 && nxt) {
      var res = turnCell(nxt[0], nxt[1]);
      demo.press = 0.15; demo.clock = 0.42;
      if (res === 'broke') game.fx.popup('MISS', demo.gx, demo.gy - 90, { color: G4.red, size: 44 });
      if (res === 'solved') { demo.solved = 99; game.fx.popup('CLEAR', W / 2, GY - 40, { color: G4.d0, size: 60 }); }
    }
  }

  function endRound(success, reason) { ok = success; why = reason; hitStop = 0.5; game.fx.flash(G4.d3, 0.15); }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (done || hitStop > 0 || ready > 0 || solvedT > 0) { game.audio.play('se_tap', 0.06); return; }
    var cell = cellAt(x, y);
    if (!cell) { game.fx.burst(x, y, { color: G4.d1, count: 2, speed: 60 }); return; }
    var res = turnCell(cell[0], cell[1]);
    var cx = GX + cell[1] * CELL + CELL / 2, cy = GY + cell[0] * CELL + CELL / 2;
    game.audio.play('se_tap', 0.3);
    if (res === 'solved') {
      boards++;
      game.feedback.good(cx, cy, { text: turns <= 6 * boards ? 'PERFECT' : 'GOOD', color: G4.d0, count: 18 });
      game.audio.play('se_milestone', 0.4);
      game.fx.popup(boards + ' / ' + FIELD_GOAL, W / 2, GY - 50, { color: G4.d0, size: 60 });
    } else if (res === 'longer') {
      game.audio.tone('C5', 0.06, { wave: 'square', volume: 0.05 });
      game.fx.burst(cx, cy, { color: G4.d3, count: 6, speed: 150 });
    } else if (res === 'broke') {
      game.feedback.bad(cx, cy, { text: 'MISS', shake: 5, flashColor: G4.d0 });
    }
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (mask === undefined) initGame();
      stepDemo(dt);
      drawScreen(); drawBoard(); drawKeeper();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.07, 72);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.11, 32, G4.d1);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 44, G4.d3);
      else txt('INSERT COIN', W / 2, H * 0.96, 40, G4.d2);
      return;
    }

    if (state === S.RESULT) {
      drawScreen(); drawBoard();
      var score = boards * 150 + Math.max(0, 60 - turns) * 5 + (ok ? Math.ceil(timeLeft) * 10 : 0);
      game.draw.rect(60, H * 0.3, W - 120, H * 0.3, G4.d3, 0.92);
      txt(ok ? 'CLEAR' : (why === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 96, ok ? G4.d0 : G4.red);
      txt(boards + ' / ' + FIELD_GOAL, W / 2, H * 0.41, 52);
      txt('SCORE ' + score, W / 2, H * 0.46, 40, G4.d1);
      if (ok && score > game.best) txt('NEW RECORD', W / 2, H * 0.51, 44);
      else if (!ok) txt('あと' + (FIELD_GOAL - boards) + '枚!', W / 2, H * 0.51, 44);
      txt('BEST ' + game.best, W / 2, H * 0.55, 30, G4.d1);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 40, G4.d3);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { boards: boards, turns: turns };
        if (ok) game.end.success(boards * 150 + Math.max(0, 60 - turns) * 5 + Math.ceil(timeLeft) * 10, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2; game.audio.stopBgm();
        if (ok) { game.feedback.good(W / 2, GY + 2 * CELL, { text: 'CLEAR', color: G4.d0, count: 26 }); game.audio.play('se_success', 0.5); }
        else { game.feedback.bad(W / 2, GY + 2 * CELL, { text: 'TIME UP', flashColor: G4.d0 }); game.audio.play('se_failure', 0.5); }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else {
      timeLeft -= dt;
      if (tapFlash && (tapFlash.t -= dt) <= 0) tapFlash = null;
      if (solvedT > 0) {
        solvedT -= dt;
        if (solvedT <= 0) {
          if (boards >= FIELD_GOAL) { solvedT = 0.01; endRound(true, 'clear'); }
          else genBoard(5);
        }
      } else if (timeLeft <= 0) {
        timeLeft = 0; endRound(false, 'time');
      }
    }

    drawScreen(); drawBoard(); drawKeeper(); drawHud();
    if (ready > 0) txt(ready > 0.3 ? 'READY?' : 'GO!', W / 2, GY + 2 * CELL, 100, G4.d0);
  });

  game.onStart(function () {
    game.audio.melody(
      [['G4', 0.5], ['A4', 0.5], ['C5', 1], ['A4', 0.5], ['G4', 0.5], ['E4', 1], ['G4', 0.5], ['E4', 0.5], ['D4', 1], ['C4', 2]],
      { tempo: 112, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
