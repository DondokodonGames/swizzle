// J-N6434-0003-depot-shelf-drop.js
// 倉庫の段埋め — 往復する吊り具から木箱を落とし、棚の欠けた段を埋めて1段ずつ出荷する。ずれた箱は積み上がる
// 操作: タップで吊り具の真下へ木箱を落とす。箱はその列の一番上に乗る
// 終わり: 5段出荷すればCLEAR。箱が天井の線を越える/時間切れでGAME OVER
// @mechanic: drop_timing
// @theme: depot_shelf_crate_drop
// 世界観: 夜間の港湾倉庫で天井クレーンの係が、下から迫り上がってくる欠けだらけの棚に吊り荷の木箱を狙って落とし、段がそろった順に出荷して天井まであふれるのを食い止める
// 残るもの: 正誤(CLEAR/GAME OVER) + 出荷した段数と連続出荷
// スタイル: 90s PRE-RENDER

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質、粒状ノイズ、背景は1枚絵として描く
  var PR = {
    dark: '#15171c', steel: '#3a4250', steel2: '#5a6474', light: '#c8d0dc', wood: '#a0703c', wood2: '#704820',
    wood3: '#d0a060', lamp: '#ffd890', amber: '#ffb040', red: '#e04040', green: '#60e090', white: '#ffffff'
  };

  var GAME_TITLE = 'DEPOT DROP';
  var TIME_LIMIT = 15;
  var NEEDED = 5;
  var COLS = 6;
  var CELL = 140;
  var X0 = (W - COLS * CELL) / 2;
  var FLOOR_Y = H * 0.76;
  var DANGER = 7;
  var SHUTTLE_Y = H * 0.19;
  var RISE_EVERY = 4.2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var CRATE = [
    'dddddddd',
    'dwwwwwwd',
    'dwdwwdwd',
    'dwwdwwwd',
    'dwwwdwwd',
    'dwdwwdwd',
    'dwwwwwwd',
    'dddddddd'
  ];
  var CLAW = ['..ss..', '..ss..', 'ssssss', 's....s', 's....s', 'ss..ss'];
  var BOT = [
    ['.gggg.', 'gLggLg', 'gggggg', '.gyyg.', 'gggggg', 'g.gg.g', '.o..o.'],
    ['.gggg.', 'gggggg', 'gLggLg', '.gyyg.', 'gggggg', 'g.gg.g', 'o....o']
  ];

  var grid, clearing, falling, sx, sdir, speed, lines, combo, riseT, riseWarned, timeLeft, ready, hitStop, endWait, done, ok, why, flashCell, nextCrateT;

  function gapRow(nGaps) {
    var row = [1, 1, 1, 1, 1, 1];
    var g1 = Math.floor(game.random(0, COLS));
    row[g1] = 0;
    if (nGaps > 1) row[(g1 + 2 + Math.floor(game.random(0, 3))) % COLS] = 0;
    return row;
  }

  function initBoard() {
    grid = [gapRow(1), gapRow(1), gapRow(1)];
    clearing = []; falling = null; sx = X0 + CELL / 2; sdir = 1; speed = 560;
    lines = 0; combo = 0; riseT = RISE_EVERY; riseWarned = false; flashCell = null; nextCrateT = 0;
  }

  function initGame() {
    initBoard();
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; endWait = 0; done = false; ok = false; why = '';
  }

  function colAt(x) { return Math.max(0, Math.min(COLS - 1, Math.round((x - X0 - CELL / 2) / CELL))); }
  function cellX(c) { return X0 + c * CELL; }
  function cellY(r) { return FLOOR_Y - (r + 1) * CELL; }
  function landRow(c) {
    for (var r = grid.length - 1; r >= 0; r--) if (grid[r][c]) return r + 1;
    return 0;
  }
  function height() {
    for (var r = grid.length - 1; r >= 0; r--) for (var c = 0; c < COLS; c++) if (grid[r][c]) return r + 1;
    return 0;
  }

  function dropCrate() {
    var c = colAt(sx);
    falling = { c: c, y: SHUTTLE_Y + 40, row: landRow(c) };
  }

  // 箱と棚の進行。返り値: 'ship' | 'stack' | 'overflow' | 'warn' | 'rise' | null
  function stepBoard(dt) {
    if (flashCell && (flashCell.t -= dt) <= 0) flashCell = null;
    if (clearing.length) {
      clearing[0].t -= dt;
      if (clearing[0].t <= 0) {
        for (var k = clearing.length - 1; k >= 0; k--) grid.splice(clearing[k].r, 1);
        clearing = [];
      }
      return null;
    }
    sx += sdir * speed * dt;
    if (sx > X0 + COLS * CELL - CELL / 2) { sx = X0 + COLS * CELL - CELL / 2; sdir = -1; }
    if (sx < X0 + CELL / 2) { sx = X0 + CELL / 2; sdir = 1; }
    if (nextCrateT > 0) nextCrateT -= dt;
    riseT -= dt;
    if (!riseWarned && riseT < 0.7) { riseWarned = true; return 'warn'; }
    if (riseT <= 0) {
      riseT = RISE_EVERY; riseWarned = false;
      grid.unshift(gapRow(lines >= 2 ? 2 : 1));
      if (falling) falling.row = landRow(falling.c);
      return height() > DANGER ? 'overflow' : 'rise';
    }
    if (falling) {
      falling.y += 2600 * dt;
      var targetY = cellY(falling.row);
      if (falling.y >= targetY) {
        var r = falling.row, c = falling.c;
        while (grid.length <= r) grid.push([0, 0, 0, 0, 0, 0]);
        grid[r][c] = 1;
        falling = null; nextCrateT = 0.15;
        flashCell = { r: r, c: c, t: 0.2 };
        var full = true;
        for (var i = 0; i < COLS; i++) if (!grid[r][i]) full = false;
        if (full) { clearing = [{ r: r, t: 0.28 }]; return 'ship'; }
        return r + 1 > DANGER ? 'overflow' : 'stack';
      }
    }
    return null;
  }

  function txt(str, x, y, size, color) {
    game.draw.text(str, x + 3, y + 3, { size: size, color: '#000000', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color || PR.light, bold: true, align: 'center' });
  }

  function drawDepot() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#0c0e12'], [0.4, PR.dark], [1, '#22262e']]);
    // 背景1枚絵: 柱・梁・天窓の光
    for (var p = 0; p < 4; p++) game.draw.rect(40 + p * 330, H * 0.1, 40, H * 0.7, PR.steel, 0.6);
    game.draw.rect(0, H * 0.14, W, 24, PR.steel2, 0.8);
    for (var b = 0; b < 3; b++) {
      var bx = 150 + b * 380;
      for (var s = 0; s < 18; s++) game.draw.rect(bx - s * 6, H * 0.15 + s * 40, 120 + s * 12, 40, PR.lamp, 0.018 + 0.008 * Math.sin(t * 1.5 + b));
    }
    // 粒状ノイズ
    for (var n = 0; n < 60; n++) {
      var nx = (n * 7919 + Math.floor(t * 12) * 131) % W;
      var ny = (n * 3571 + Math.floor(t * 12) * 97) % H;
      game.draw.rect(nx, ny, 3, 3, PR.light, 0.08);
    }
    // 床と出荷口(親指ゾーン)
    game.draw.gradient(FLOOR_Y, H, [[0, PR.steel], [1, '#101216']]);
    for (var k = 0; k < 10; k++) game.draw.rect(((k * 120 + t * 90) % (W + 120)) - 120, FLOOR_Y + 70, 70, 16, PR.steel2);
    // 天井の線
    game.draw.rect(X0 - 20, cellY(DANGER - 1) - 8, COLS * CELL + 40, 8, PR.red, 0.5 + 0.3 * Math.sin(t * 6));
  }

  function drawCrate(x, y, size, flash) {
    var pal = flash ? { d: PR.white, w: PR.white } : { d: PR.wood2, w: PR.wood };
    game.draw.sprite(CRATE, pal, x + size / 2, y + size / 2, size / 8, { anchor: 'center' });
    if (!flash) game.draw.rect(x + 6, y + 6, size - 12, 8, PR.wood3, 0.5);
  }

  function drawShelves() {
    var t = game.time.elapsed;
    // 棚枠
    game.draw.rect(X0 - 20, cellY(DANGER - 1), 20, FLOOR_Y - cellY(DANGER - 1), PR.steel2);
    game.draw.rect(X0 + COLS * CELL, cellY(DANGER - 1), 20, FLOOR_Y - cellY(DANGER - 1), PR.steel2);
    var warnBlink = riseWarned && Math.floor(t * 10) % 2 === 0;
    for (var r = 0; r < grid.length; r++) {
      var isClear = clearing.length && clearing[0].r === r;
      for (var c = 0; c < COLS; c++) {
        var x = cellX(c), y = cellY(r);
        if (grid[r][c]) drawCrate(x + 4, y + 4, CELL - 8, isClear || (flashCell && flashCell.r === r && flashCell.c === c));
        else game.draw.rect(x + 10, y + CELL - 16, CELL - 20, 8, PR.amber, 0.35 + 0.25 * Math.sin(t * 5 + c));
      }
      game.draw.rect(X0, y + CELL - 4, COLS * CELL, 6, PR.steel2);
    }
    if (warnBlink) game.draw.rect(X0, FLOOR_Y - 12, COLS * CELL, 16, PR.red);
    // 吊り具とガイド
    var c0 = colAt(sx);
    game.draw.line(0, SHUTTLE_Y - 70, W, SHUTTLE_Y - 70, PR.steel2, 12);
    game.draw.line(sx, SHUTTLE_Y - 70, sx, SHUTTLE_Y - 20, PR.light, 6);
    game.draw.sprite(CLAW, { s: PR.light }, sx, SHUTTLE_Y, 12, { anchor: 'center' });
    if (!falling && nextCrateT <= 0) drawCrate(sx - CELL / 2 + 8, SHUTTLE_Y + 20, CELL - 16, false);
    game.draw.rect(cellX(c0) + CELL / 2 - 3, SHUTTLE_Y + 150, 6, cellY(landRow(c0)) + CELL - SHUTTLE_Y - 150, PR.amber, 0.18);
    if (falling) drawCrate(cellX(falling.c) + 8, falling.y, CELL - 16, false);
    // 倉庫ロボ(常時bob)
    game.draw.sprite(BOT[Math.floor(t * 3) % 2], { g: PR.steel2, L: PR.green, y: PR.amber, o: PR.light }, W * 0.9, FLOOR_Y + 150 + Math.sin(t * 2.5) * 8, 14, { anchor: 'center' });
  }

  function drawHud() {
    for (var i = 0; i < NEEDED; i++) game.draw.rect(W / 2 - 230 + i * 96, 60, 76, 40, i < lines ? PR.amber : PR.steel);
    txt(lines + ' / ' + NEEDED, W * 0.12, 80, 40);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 150, W - 160, 18, PR.steel);
    game.draw.rect(80, 150, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? PR.red : PR.amber);
  }

  // ── ATTRACT: 欠けの真上で落として出荷(成功)→ ずらして落として積み上がる(失敗)を実ロジックで
  var demo = { t: 0, gx: W / 2, gy: H * 0.6, press: 0, wantMiss: false };
  function demoTarget() {
    for (var r = grid.length - 1; r >= 0; r--) {
      for (var c = 0; c < COLS; c++) if (!grid[r][c] && landRow(c) === r) return c;
    }
    return 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { initBoard(); riseT = 99; }
    if (demo.press > 0) demo.press -= dt;
    var r = stepBoard(dt);
    if (r === 'ship') game.fx.popup('GOOD', W / 2, cellY(2), { color: PR.green, size: 50 });
    if (r === 'stack') game.fx.popup('MISS', W / 2, cellY(3), { color: PR.red, size: 50 });
    if (r === 'overflow') initBoard();
    if (!falling && !clearing.length && nextCrateT <= 0) {
      var tc = demoTarget();
      var wantMiss = cyc > 4.2;
      var aligned = Math.abs(sx - (cellX(tc) + CELL / 2)) < 18;
      var misaligned = Math.abs(sx - (cellX((tc + 3) % COLS) + CELL / 2)) < 18;
      if ((!wantMiss && aligned) || (wantMiss && misaligned)) { dropCrate(); demo.press = 0.15; }
    }
    demo.gx = W * 0.5; demo.gy = H * 0.88;
  }

  function lose(reason) { ok = false; why = reason; hitStop = 0.5; game.fx.flash(PR.white, 0.15); }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (done || hitStop > 0 || ready > 0 || falling || clearing.length || nextCrateT > 0) { game.audio.play('se_tap', 0.06); return; }
    dropCrate();
    game.audio.play('se_jump', 0.3);
    game.fx.burst(sx, SHUTTLE_Y + 40, { color: PR.light, count: 4, speed: 120 });
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (grid === undefined) initGame();
      stepDemo(dt);
      drawDepot(); drawShelves();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.05, 76, PR.amber);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.09, 32);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 44, PR.amber);
      else txt('INSERT COIN', W / 2, H * 0.96, 40);
      return;
    }

    if (state === S.RESULT) {
      drawDepot(); drawShelves();
      var score = lines * 100 + combo * 30 + (ok ? Math.ceil(timeLeft) * 10 : 0);
      game.draw.rect(0, H * 0.3, W, H * 0.3, '#000000', 0.7);
      txt(ok ? 'CLEAR' : (why === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 96, ok ? PR.green : PR.red);
      txt(lines + ' / ' + NEEDED, W / 2, H * 0.41, 52);
      txt('SCORE ' + score, W / 2, H * 0.46, 40, PR.lamp);
      if (ok && score > game.best) txt('NEW RECORD', W / 2, H * 0.51, 44, PR.amber);
      else if (!ok) txt('あと' + (NEEDED - lines) + '段!', W / 2, H * 0.51, 44);
      txt('BEST ' + game.best, W / 2, H * 0.55, 30);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 40);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { lines: lines, combo: combo };
        if (ok) game.end.success(lines * 100 + combo * 30 + Math.ceil(timeLeft) * 10, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2; game.audio.stopBgm();
        if (ok) { game.feedback.good(W / 2, FLOOR_Y - CELL, { text: 'CLEAR', color: PR.green, count: 28 }); game.audio.play('se_success', 0.5); }
        else { game.feedback.bad(W / 2, cellY(Math.min(DANGER, height())), { text: why === 'time' ? 'TIME UP' : 'MISS' }); game.audio.play('se_failure', 0.5); }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else {
      timeLeft -= dt;
      var r = stepBoard(dt);
      if (r === 'ship') {
        lines++; combo++; speed += 55;
        game.feedback.good(W / 2, cellY(1), { text: combo >= 3 ? 'PERFECT' : 'GOOD', color: PR.green });
        game.audio.play('se_break', 0.3);
        if (lines === 3) { game.audio.play('se_milestone', 0.4); game.fx.popup('あと2段!', W / 2, H * 0.3, { color: PR.amber, size: 52 }); }
        if (lines >= NEEDED) { ok = true; why = 'clear'; hitStop = 0.45; }
      } else if (r === 'stack') {
        combo = 0;
        game.feedback.bad(W / 2, cellY(height()), { text: 'MISS', shake: 6 });
      } else if (r === 'warn') {
        game.audio.tone('D3', 0.3, { wave: 'sawtooth', volume: 0.05 });
      } else if (r === 'rise') {
        game.fx.shake(6, 0.2);
      } else if (r === 'overflow') {
        lose('overflow');
      } else if (timeLeft <= 0) {
        timeLeft = 0; lose('time');
      }
    }

    drawDepot(); drawShelves(); drawHud();
    if (ready > 0) txt(ready > 0.3 ? 'READY?' : 'GO!', W / 2, H * 0.4, 100, PR.amber);
  });

  game.onStart(function () {
    game.audio.melody(
      [['A3', 0.5], ['C4', 0.5], ['E4', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 0.5], ['D4', 0.5], ['C4', 1], ['B3', 1], ['A3', 1]],
      { tempo: 118, wave: 'sawtooth', volume: 0.04, loop: true, bass: [['A1', 2], ['F1', 2], ['G1', 2], ['E1', 2]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
