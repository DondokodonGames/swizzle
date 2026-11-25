// D-20132016-0002-nine-cell-fusion-race.js
// ナインセル・フュージョンレース — 3x3のセルをスワイプで滑らせ、同じ数の結晶をぶつけて目標数まで合体させる
// 操作: 盤面を上下左右にスワイプすると全セルの結晶が一斉に滑り、同じ数同士が重なると合体して倍になる
// 終わり: 規定回数以内に目標の数の結晶を作れば成功。回数切れ/身動きが取れなくなれば失敗
// @mechanic: swipe_direction
// @theme: crystal_fusion_lab_race
// 世界観: 小さな研究ラボの結晶合成実験。限られた操作回数の中で同じ数の結晶をぶつけ合わせ、目標の数まで一気に育てる
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した最大数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: フラットな面色、影なしの原色パレット
  var STYLE = { bg: ['#eef2f7', '#dfe6ee'], main: ['#4a90d9', '#f5a623'], accent: ['#50c878', '#e94b3c'] };
  var C = {
    bg1: '#eef2f7', bg2: '#dfe6ee', cellEmpty: '#dbe2ea',
    t2: '#a9d4ff', t4: '#7fc0ff', t8: '#4a90d9', t16: '#f5a623', t32: '#e94b3c',
    mascot: '#4a90d9', good: '#50c878', bad: '#e94b3c', gold: '#f5a623', white: '#ffffff', ink: '#1c2a3a',
  };

  var GAME_TITLE = 'NINE-CELL FUSION';
  var N = 3;
  var TARGET = 16;
  var MOVE_LIMIT = 10;
  var CELL = 230, GAP = 14;
  var BOARD_W = N * CELL + (N - 1) * GAP;
  var BX0 = W * 0.5 - BOARD_W / 2, BY0 = H * 0.32;
  var MASCOT_X = W * 0.5, MASCOT_Y = H * 0.13;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000033', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MASCOT_IDLE = ['.##.', '####', '.##.'];
  var MASCOT_HAPPY = ['#..#', '####', '.##.'];

  function tileColor(v) {
    if (v <= 2) return C.t2; if (v <= 4) return C.t4; if (v <= 8) return C.t8;
    if (v <= 16) return C.t16; return C.t32;
  }

  var grid, moves, best, done, endWait, finished, pulse;
  var ready, hitStop, shake, milestoneShown;

  function emptyCells() {
    var arr = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (grid[r][c] === 0) arr.push([r, c]);
    return arr;
  }

  function spawnTile() {
    var ec = emptyCells();
    if (ec.length === 0) return;
    var pos = ec[Math.floor(Math.random() * ec.length)];
    grid[pos[0]][pos[1]] = Math.random() < 0.85 ? 2 : 4;
  }

  function initGame() {
    grid = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    moves = 0; best = 2; done = false; endWait = 0; finished = false; pulse = 0;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    spawnTile(); spawnTile();
  }

  function slideLine(arr) {
    var vals = [];
    for (var i = 0; i < arr.length; i++) if (arr[i] !== 0) vals.push(arr[i]);
    var merged = [];
    var i2 = 0;
    while (i2 < vals.length) {
      if (i2 + 1 < vals.length && vals[i2] === vals[i2 + 1]) { merged.push(vals[i2] * 2); i2 += 2; }
      else { merged.push(vals[i2]); i2++; }
    }
    while (merged.length < arr.length) merged.push(0);
    return merged;
  }

  function equalArr(a, b) { for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }

  function hasValidMove() {
    if (emptyCells().length > 0) return true;
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var v = grid[r][c];
      if (c + 1 < N && grid[r][c + 1] === v) return true;
      if (r + 1 < N && grid[r + 1][c] === v) return true;
    }
    return false;
  }

  function doMove(dir) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    var changed = false;
    var r, c, line, res;
    if (dir === 'left') {
      for (r = 0; r < N; r++) { line = grid[r].slice(); res = slideLine(line); if (!equalArr(line, res)) changed = true; grid[r] = res; }
    } else if (dir === 'right') {
      for (r = 0; r < N; r++) { line = grid[r].slice().reverse(); res = slideLine(line).reverse(); if (!equalArr(grid[r], res)) changed = true; grid[r] = res; }
    } else if (dir === 'up') {
      for (c = 0; c < N; c++) { line = [grid[0][c], grid[1][c], grid[2][c]]; res = slideLine(line); if (!equalArr(line, res)) changed = true; for (r = 0; r < N; r++) grid[r][c] = res[r]; }
    } else if (dir === 'down') {
      for (c = 0; c < N; c++) { line = [grid[2][c], grid[1][c], grid[0][c]]; res = slideLine(line); if (!equalArr(line, res)) changed = true; grid[2][c] = res[0]; grid[1][c] = res[1]; grid[0][c] = res[2]; }
    }
    game.audio.play('se_tap', 0.15);
    if (!changed) {
      return;
    }
    moves++;
    pulse = 0.25;
    spawnTile();
    var maxV = 2;
    for (r = 0; r < N; r++) for (c = 0; c < N; c++) if (grid[r][c] > maxV) maxV = grid[r][c];
    best = Math.max(best, maxV);
    game.feedback.good(W * 0.5, BY0 + BOARD_W * 0.5, { text: 'GOOD', size: 30 });
    game.audio.play('se_good', 0.3);
    if (!milestoneShown && maxV >= TARGET / 2) {
      milestoneShown = true;
      game.fx.popup('' + (TARGET / 2), W * 0.5, BY0 - 40, { color: C.gold, size: 40 });
      game.audio.play('se_milestone', 0.4);
    }
    if (maxV >= TARGET) {
      ok = true; finished = true; hitStop = 0.15;
      game.feedback.good(W * 0.5, BY0 + BOARD_W * 0.5, { text: 'PERFECT', color: C.gold });
      game.fx.burst(W * 0.5, BY0 + BOARD_W * 0.5, { color: C.gold, count: 22, speed: 360 });
      finish();
    } else if (moves >= MOVE_LIMIT || !hasValidMove()) {
      ok = false; finished = true; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(W * 0.5, BY0 + BOARD_W * 0.5, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onSwipe(function(dir) { game.audio.play('se_tap', 0.05); doMove(dir); });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function bg(elapsed) {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.white, 0.02 + 0.02 * Math.sin(elapsed * 1.3));
  }

  function drawMascot(elapsed) {
    var happy = pulse > 0;
    var frame = happy ? MASCOT_HAPPY : MASCOT_IDLE;
    var by = MASCOT_Y + Math.sin(elapsed * 2.2) * 6;
    game.draw.sprite(frame, { '#': C.mascot }, MASCOT_X, by, 20, { anchor: 'center' });
  }

  function drawBoard(bob) {
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        var x = BX0 + c * (CELL + GAP), y = BY0 + r * (CELL + GAP);
        var v = grid[r][c];
        game.draw.rect(x, y, CELL, CELL, v === 0 ? C.cellEmpty : tileColor(v));
        if (v > 0) txt('' + v, x + CELL / 2, y + CELL / 2 + 16, 60, v >= 8 ? C.white : C.ink);
      }
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.5, press: false, dirIdx: 0 };
  var DIRS = ['left', 'up', 'right', 'down'];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.8;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.dirIdx = 0; }
    var seg = cyc % 1.2;
    var idx = Math.floor(cyc / 1.2) % DIRS.length;
    var dir = DIRS[idx];
    var cx = BX0 + BOARD_W / 2, cy = BY0 + BOARD_W / 2;
    var vx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    var vy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    demo.gx = cx - vx * 160 + vx * seg * 320;
    demo.gy = cy - vy * 160 + vy * seg * 320;
    demo.press = seg < 0.5;
    if (seg > 0.55 && idx !== demo.dirIdx) { demo.dirIdx = idx; doMove(dir); }
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    if (pulse > 0) pulse -= dt;
    if (state === S.ATTRACT) {
      bg(elapsed);
      stepDemo(dt);
      drawMascot(elapsed);
      drawBoard(elapsed);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.07, 34, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 20, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 24, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(elapsed);
      drawMascot(elapsed);
      drawBoard(elapsed);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.07, 40, ok ? C.good : C.bad);
      txt(best + ' / ' + TARGET, W / 2, H * 0.11, 26, C.gold);
      if (!ok) txt('あと' + (TARGET - best) + '!', W / 2, H * 0.16, 22, C.ink);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(best, { best: best, moves: moves }); else game.end.failure({ best: best, moves: moves });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;

    bg(elapsed);
    drawMascot(elapsed);
    drawBoard(elapsed);

    txt(moves + ' / ' + MOVE_LIMIT, W / 2, H * 0.90, 26, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * (1 - moves / MOVE_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['B4', 0.25], ['E5', 0.5]], { tempo: 150, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
