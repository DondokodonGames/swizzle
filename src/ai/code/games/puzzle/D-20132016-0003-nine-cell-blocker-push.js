// D-20132016-0003-nine-cell-blocker-push.js
// ナインセル・ブロッカープッシュ — 3x3の盤面に居座る岩ブロックへ、育てた結晶をスワイプでぶつけて押し出す
// 操作: 盤面をスワイプすると結晶が滑って重なり合体する。中央の岩に十分育った結晶をぶつけて弾き飛ばす
// 終わり: 規定回数以内に中央の岩を3回ぶつけて押し出せば成功。回数切れ/身動きが取れなくなれば失敗
// @mechanic: push_out
// @theme: crystal_lab_obstacle_drill
// 世界観: 同じ研究ラボの別区画。盤面中央に居座る頑丈な岩ブロックを、育てた結晶の衝突だけで少しずつ弾き出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 岩に与えた衝突数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: くっきりした縁取りと高解像度ドット、彩度の高い差し色
  var STYLE = { bg: ['#1c2230', '#12161f'], main: ['#3ecf8e', '#ffb454'], accent: ['#ff5c6c', '#5adfff'] };
  var C = {
    bg1: '#232b3d', bg2: '#12161f', cellEmpty: '#2b3548',
    t2: '#5adfff', t4: '#3ecf8e', t8: '#ffb454', t16: '#ff8a3d', rock: '#4a4238', rockCrack: '#2a241c',
    mascot: '#3ecf8e', good: '#3ecf8e', bad: '#ff5c6c', gold: '#ffb454', white: '#f4f8ff', ink: '#0c0e14',
  };

  var GAME_TITLE = 'BLOCKER PUSH';
  var N = 3;
  var PUSH_MIN = 4;
  var ROCK_HP_MAX = 3;
  var MOVE_LIMIT = 12;
  var CELL = 230, GAP = 14;
  var BOARD_W = N * CELL + (N - 1) * GAP;
  var BX0 = W * 0.5 - BOARD_W / 2, BY0 = H * 0.32;
  var MASCOT_X = W * 0.5, MASCOT_Y = H * 0.13;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000055', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MASCOT_IDLE = ['.##.', '####', '.##.'];
  var MASCOT_HAPPY = ['#..#', '####', '.##.'];
  var ROCK_SPRITE = ['####', '#..#', '####'];

  function tileColor(v) {
    if (v <= 2) return C.t2; if (v <= 4) return C.t4; if (v <= 8) return C.t8; return C.t16;
  }

  var grid, rockHP, moves, done, endWait, finished, pulse;
  var ready, hitStop, shake, milestoneShown;

  function emptyCells() {
    var arr = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (grid[r][c] === 0 && !(r === 1 && c === 1)) arr.push([r, c]);
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
    grid[1][1] = -1;
    rockHP = ROCK_HP_MAX; moves = 0; done = false; endWait = 0; finished = false; pulse = 0;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    spawnTile(); spawnTile();
  }

  function slideLine(arr) {
    var vals = [];
    for (var i = 0; i < arr.length; i++) if (arr[i] !== 0) vals.push(arr[i]);
    var merged = []; var i2 = 0;
    while (i2 < vals.length) {
      if (i2 + 1 < vals.length && vals[i2] === vals[i2 + 1]) { merged.push(vals[i2] * 2); i2 += 2; }
      else { merged.push(vals[i2]); i2++; }
    }
    while (merged.length < arr.length) merged.push(0);
    return merged;
  }

  function equalArr(a, b) { for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }

  // 壁(岩)を挟んだ3セルを2区画に割ってスライド。真ん中(index1)は不動
  function slideLineWithWall(arr, forward) {
    var a0 = [arr[0]], a2 = [arr[2]];
    var r0 = forward ? slideLine(a0) : slideLine(a0).reverse().reverse();
    var r2 = forward ? slideLine(a2) : slideLine(a2).reverse().reverse();
    return [r0[0], arr[1], r2[0]];
  }

  function hasValidMove() {
    if (emptyCells().length > 0) return true;
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      if (r === 1 && c === 1) continue;
      var v = grid[r][c];
      if (c + 1 < N && !(r === 1 && c === 0) && grid[r][c + 1] === v && v > 0) return true;
      if (r + 1 < N && !(r === 0 && c === 1) && grid[r + 1][c] === v && v > 0) return true;
    }
    return false;
  }

  function tryPush(cellVal, x, y) {
    if (cellVal >= PUSH_MIN && rockHP > 0) {
      rockHP--;
      hitStop = 0.18; shake = 0.2;
      game.feedback.good(x, y, { text: 'GOOD' });
      game.fx.burst(W * 0.5, BY0 + BOARD_W / 2, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_break', 0.4);
      if (!milestoneShown && rockHP === 1) {
        milestoneShown = true;
        game.fx.popup((ROCK_HP_MAX - rockHP) + ' / ' + ROCK_HP_MAX, W * 0.5, BY0 - 40, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      return true;
    }
    return false;
  }

  function doMove(dir) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    var changed = false;
    var r, c, line, res;
    var pushed = false;
    if (dir === 'left' || dir === 'right') {
      for (r = 0; r < N; r++) {
        if (r === 1) {
          var before0 = grid[1][0], before2 = grid[1][2];
          if (dir === 'right' && before0 > 0) { if (tryPush(before0, BX0 + CELL * 1.5, BY0 + CELL * 1.5)) { grid[1][0] = 0; pushed = true; changed = true; } }
          if (dir === 'left' && before2 > 0) { if (tryPush(before2, BX0 + CELL * 1.5, BY0 + CELL * 1.5)) { grid[1][2] = 0; pushed = true; changed = true; } }
          continue;
        }
        line = grid[r].slice();
        res = dir === 'left' ? slideLine(line) : slideLine(line.slice().reverse()).reverse();
        if (!equalArr(grid[r], res)) changed = true;
        grid[r] = res;
      }
    } else {
      for (c = 0; c < N; c++) {
        if (c === 1) {
          var beforeT = grid[0][1], beforeB = grid[2][1];
          if (dir === 'down' && beforeT > 0) { if (tryPush(beforeT, BX0 + CELL * 1.5, BY0 + CELL * 1.5)) { grid[0][1] = 0; pushed = true; changed = true; } }
          if (dir === 'up' && beforeB > 0) { if (tryPush(beforeB, BX0 + CELL * 1.5, BY0 + CELL * 1.5)) { grid[2][1] = 0; pushed = true; changed = true; } }
          continue;
        }
        line = [grid[0][c], grid[1][c], grid[2][c]];
        res = dir === 'up' ? slideLine(line) : slideLine(line.slice().reverse()).reverse();
        if (!equalArr(line, res)) changed = true;
        grid[0][c] = res[0]; grid[1][c] = res[1]; grid[2][c] = res[2];
      }
    }
    game.audio.play('se_tap', 0.15);
    if (!changed) return;
    moves++;
    pulse = 0.25;
    if (!pushed) {
      spawnTile();
      game.feedback.good(W * 0.5, BY0 + BOARD_W * 0.5, { text: 'GOOD', size: 26 });
      game.audio.play('se_good', 0.25);
    }
    if (rockHP <= 0) {
      grid[1][1] = 0;
      ok = true; finished = true; hitStop = 0.15;
      game.feedback.good(W * 0.5, BY0 + BOARD_W * 0.5, { text: 'CLEAR', color: C.gold });
      game.fx.burst(W * 0.5, BY0 + BOARD_W * 0.5, { color: C.gold, count: 24, speed: 380 });
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
    var frame = pulse > 0 ? MASCOT_HAPPY : MASCOT_IDLE;
    var by = MASCOT_Y + Math.sin(elapsed * 2.2) * 6;
    game.draw.sprite(frame, { '#': C.mascot }, MASCOT_X, by, 20, { anchor: 'center' });
  }

  function drawBoard(bob) {
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        var x = BX0 + c * (CELL + GAP), y = BY0 + r * (CELL + GAP);
        var v = grid[r][c];
        if (r === 1 && c === 1) {
          game.draw.rect(x, y, CELL, CELL, C.rock);
          game.draw.sprite(ROCK_SPRITE, { '#': C.rockCrack }, x + CELL / 2, y + CELL / 2, 26, { anchor: 'center' });
          game.draw.rect(x + 14, y + CELL - 30, (CELL - 28) * (rockHP / ROCK_HP_MAX), 14, C.gold);
          continue;
        }
        game.draw.rect(x, y, CELL, CELL, v === 0 ? C.cellEmpty : tileColor(v));
        if (v > 0) txt('' + v, x + CELL / 2, y + CELL / 2 + 16, 56, v >= 8 ? C.white : C.ink);
      }
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.5, press: false, dirIdx: 0 };
  var DIRS = ['down', 'right', 'up', 'left'];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.6;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.dirIdx = 0; }
    var seg = cyc % 1.4;
    var idx = Math.floor(cyc / 1.4) % DIRS.length;
    var dir = DIRS[idx];
    var cx = BX0 + BOARD_W / 2, cy = BY0 + BOARD_W / 2;
    var vx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    var vy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    demo.gx = cx - vx * 160 + vx * seg * 320;
    demo.gy = cy - vy * 160 + vy * seg * 320;
    demo.press = seg < 0.6;
    if (seg > 0.65 && idx !== demo.dirIdx) { demo.dirIdx = idx; doMove(dir); }
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
      txt(GAME_TITLE, W / 2, H * 0.07, 32, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 20, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 24, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(elapsed);
      drawMascot(elapsed);
      drawBoard(elapsed);
      var hits = ROCK_HP_MAX - rockHP;
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.07, 38, ok ? C.good : C.bad);
      txt(hits + ' / ' + ROCK_HP_MAX, W / 2, H * 0.11, 24, C.gold);
      if (!ok) txt('あと' + (ROCK_HP_MAX - hits) + '!', W / 2, H * 0.16, 22, C.white);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var hitsF = ROCK_HP_MAX - rockHP;
        if (ok) game.end.success(hitsF, { hits: hitsF, moves: moves }); else game.end.failure({ hits: hitsF, moves: moves });
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

    txt(moves + ' / ' + MOVE_LIMIT, W / 2, H * 0.90, 24, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (1 - moves / MOVE_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F4', 0.25], ['A4', 0.25], ['D5', 0.5]], { tempo: 138, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
