// D-20092012-0029-shard-row-align.js
// シャード・ロウアライン — 一列に並んだ結晶の欠片を指でドラッグして入れ替え、同じ色を3つ並べて割る
// 操作: 欠片を指でつかんで別の位置までドラッグし、別の欠片と入れ替える
// 終わり: 制限時間内に同色3つ並びを作れれば成功。時間切れなら失敗
// @mechanic: drag_sort
// @theme: crystal_shard_row
// 世界観: 台座に一列に並ぶ色違いの結晶の欠片。職人見習いが欠片をドラッグで並べ替え、同色を3つ揃えて共鳴させる
// 残るもの: 正誤(CLEAR/GAME OVER) + 最大連続数
// スタイル: VOXEL BLOCK
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 面ごとに3明度。上面/左面/右面の3明度で立体感、影は落とさない
  var C = {
    bg1: '#2a2440', bg2: '#161428', slot: '#382e54', slotEdge: '#4a3e6c',
    good: '#57e39a', bad: '#ff5a5a', gold: '#ffd23f', white: '#f4f0ff', ink: '#0a0714',
  };
  var GEM_COLORS = ['#4ad2ff', '#ff5fa0', '#8dff5f'];
  var GEM_TOP = ['#a8ecff', '#ffb0d4', '#c8ffb0'];
  var GEM_SIDE = ['#2a8fb8', '#b83a6e', '#5eb83a'];

  var GAME_TITLE = 'SHARD ALIGN';
  var SLOTS = 5;
  var SLOT_Y = H * 0.46;
  var SLOT_W = 150;
  var TIME_LIMIT = 18;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var board, timeLeft, heldIdx, dragX, dragY, bestRun, milestoneShown, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function slotX(i) { return W * 0.5 + (i - (SLOTS - 1) / 2) * SLOT_W; }

  var TRI = ['..#..', '.###.', '#####'];

  function randomBoard() {
    var b = [];
    for (var i = 0; i < SLOTS; i++) b.push(Math.floor(Math.random() * GEM_COLORS.length));
    return b;
  }

  function longestRun(b) {
    var best = 1, cur = 1;
    for (var i = 1; i < b.length; i++) {
      if (b[i] === b[i - 1]) { cur++; best = Math.max(best, cur); } else cur = 1;
    }
    return best;
  }

  function initGame() {
    board = randomBoard();
    // avoid an instant free win at spawn
    while (longestRun(board) >= 3) board = randomBoard();
    timeLeft = TIME_LIMIT; heldIdx = -1; dragX = 0; dragY = 0; bestRun = longestRun(board);
    milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    // continuous ambient pulse (triangle wave, avoids sine's flat zero-slope peak/trough)
    var ph = (game.time.elapsed % 5.3) / 5.3;
    var tri = ph < 0.5 ? ph * 2 : (1 - ph) * 2;
    game.draw.rect(0, 0, W, H, C.gold, 0.05 + tri * 0.11);
  }

  function drawGem(i, x, y, lift) {
    var c = board[i];
    var s = lift ? 30 : 26;
    game.draw.circle(x, y + 60, 46, C.ink, 0.3);
    game.draw.sprite(TRI, { '#': GEM_SIDE[c] }, x + 4, y + 4, s, { anchor: 'center' });
    game.draw.sprite(TRI, { '#': GEM_TOP[c] }, x, y, s, { anchor: 'center' });
  }

  function drawBoard() {
    for (var i = 0; i < SLOTS; i++) {
      var x = slotX(i);
      game.draw.rect(x - SLOT_W / 2 + 10, SLOT_Y - 90, SLOT_W - 20, 180, C.slot);
      game.draw.rect(x - SLOT_W / 2 + 10, SLOT_Y - 90, SLOT_W - 20, 8, C.slotEdge);
      if (i === heldIdx) continue;
      drawGem(i, x, SLOT_Y, false);
    }
    if (heldIdx >= 0) drawGem(heldIdx, dragX, dragY, true);
  }

  function nearestSlot(x) {
    var best = 0, bestD = 1e9;
    for (var i = 0; i < SLOTS; i++) {
      var d = Math.abs(slotX(i) - x);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function resolveMatches() {
    // clear runs of >=3 same color, replace with new random gems, keep going
    var cleared = false;
    var i = 0;
    while (i < board.length) {
      var j = i;
      while (j < board.length && board[j] === board[i]) j++;
      if (j - i >= 3) {
        for (var k = i; k < j; k++) board[k] = Math.floor(Math.random() * GEM_COLORS.length);
        cleared = true;
      }
      i = j;
    }
    return cleared;
  }

  function onPickStart(x, y) {
    if (ready > 0 || finished || done) return;
    if (y < SLOT_Y - 110 || y > SLOT_Y + 110) return;
    heldIdx = nearestSlot(x);
    dragX = x; dragY = y;
    game.audio.play('se_tap', 0.1);
  }
  function onPickMove(x, y) {
    if (heldIdx < 0) return;
    dragX = x; dragY = y;
  }
  function onPickEnd(x, y) {
    if (heldIdx < 0) { game.audio.play('se_tap', 0.02); return; }
    var target = nearestSlot(x);
    if (target !== heldIdx) {
      var tmp = board[target]; board[target] = board[heldIdx]; board[heldIdx] = tmp;
      var run = longestRun(board);
      if (run > bestRun) bestRun = run;
      if (!milestoneShown && run >= 2) {
        milestoneShown = true;
        game.fx.popup('NICE', W * 0.5, SLOT_Y - 200, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.35);
      }
      if (run >= 3) {
        game.feedback.good((slotX(target) + slotX(heldIdx)) / 2, SLOT_Y, { text: 'GOOD', color: C.good, size: 30 });
        game.fx.burst(slotX(target), SLOT_Y, { color: C.gold, count: 18, speed: 320 });
        game.audio.play('se_coin', 0.4);
        resolveMatches();
        ok = true; finished = true; hitStop = 0.1;
        finish();
      } else {
        game.feedback.bad(slotX(target), SLOT_Y, { text: 'MISS', size: 22 });
      }
    } else {
      game.audio.play('se_tap', 0.03);
    }
    heldIdx = -1;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.02); onPickStart(x, y); } });
  game.onMove(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.01); onPickMove(x, y); } });
  game.onRelease(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.02); onPickEnd(x, y); } });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.2;
  }

  var demo = { t: 0, gx: 0, gy: SLOT_Y, press: false, board: null, from: 0, to: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) {
      demo.board = [0, 1, 0, 2, 1];
      board = demo.board;
      demo.from = 3; demo.to = 1;
      demo._done = false;
    }
    board = demo.board;
    if (cyc < 0.7) { demo.gx = slotX(demo.from); demo.gy = SLOT_Y; demo.press = false; }
    else if (cyc < 1.5) { demo.press = true; }
    else if (cyc < 2.2) {
      var p = (cyc - 1.5) / 0.7;
      demo.gx = slotX(demo.from) + (slotX(demo.to) - slotX(demo.from)) * p;
    } else if (!demo._done) {
      demo._done = true;
      var tmp = demo.board[demo.from]; demo.board[demo.from] = demo.board[demo.to]; demo.board[demo.to] = tmp;
      board = demo.board;
      game.feedback.good(slotX(demo.to), SLOT_Y, { text: 'GOOD', color: C.good, size: 30 });
      game.fx.burst(slotX(demo.to), SLOT_Y, { color: C.gold, count: 16, speed: 300 });
      game.audio.play('se_coin', 0.3);
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (board === undefined) initGame();
      bg();
      stepDemo(dt);
      heldIdx = -1;
      drawBoard();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt('MAX ' + bestRun + ' / 3', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, 3 - bestRun) + '!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(bestRun, { bestRun: bestRun }); else game.end.failure({ bestRun: bestRun });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(W * 0.5, SLOT_Y, { text: 'TIME UP' });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoard();

    txt('MAX ' + bestRun + ' / 3', W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 14, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 14, timeLeft < 4 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.3], ['C5', 0.3], ['E5', 0.3], ['A4', 0.3]], { tempo: 128, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
