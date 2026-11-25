// D-20222026-0040-hue-bin-transfer.js
// ヒュービントランスファー — 混ざった色の資材箱を棚から棚へ移し替え、色ごとにまとめ上げる
// 操作: 棚の一番上の資材をドラッグし、同じ色の一番上を持つ別の棚(または空の棚)へ落とす
// 終わり: 規定回数、正しく移し替えられれば成功。時間切れは失敗
// @mechanic: drag_sort
// @theme: hue_bin_transfer
// 世界観: 資材倉庫の仕分け係が、色の混ざった棚から棚へ資材を移し替え、同じ色だけの山へとまとめ上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 移し替えた数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg: '#fbeee0', bg2: '#f4dcc4', bin: '#e8d0b0', binLine: '#c8a878',
    c0: '#ff8a9a', c1: '#8ad0ff', c2: '#a0e090',
    good: '#5ac878', bad: '#ff4d5e', gold: '#f0a038', ink: '#3a2818',
  };
  var COLORS = [C.c0, C.c1, C.c2];

  var GAME_TITLE = 'BIN TRANSFER';
  var MAX_TIME = 20;
  var NEEDED = 5;
  var COLS = 4, CAP = 3;
  var BIN_W = 170, BIN_H = 340;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#20140c', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WORKER_S = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.2);
    game.draw.sprite(WORKER_S, { '#': '#8a6a4a' }, W * 0.5, H * 0.16, 16, { anchor: 'center' });
  }

  var bins, moves, roundClock, halfCalled, dragFrom, trail;
  var done, endWait, finished, ready, hitStop, shake;

  function binX(i) { return W * 0.5 + (i - (COLS - 1) / 2) * (BIN_W + 24); }
  var BIN_Y = H * 0.56;

  function fillBins() {
    var pool = [];
    for (var c = 0; c < 3; c++) for (var k = 0; k < 4; k++) pool.push(c);
    pool.sort(function() { return Math.random() - 0.5; });
    bins = [];
    for (var i = 0; i < COLS; i++) bins.push(pool.slice(i * 3, i * 3 + 3));
  }

  function hasValidMove() {
    for (var i = 0; i < COLS; i++) {
      if (bins[i].length === 0) continue;
      var topC = bins[i][bins[i].length - 1];
      for (var j = 0; j < COLS; j++) {
        if (j === i || bins[j].length >= CAP) continue;
        if (bins[j].length === 0 || bins[j][bins[j].length - 1] === topC) return true;
      }
    }
    return false;
  }

  function reshuffleIfStuck() {
    var guard = 0;
    while (!hasValidMove() && guard < 20) { fillBins(); guard++; }
  }

  function initGame() {
    fillBins();
    reshuffleIfStuck();
    moves = 0; roundClock = 0; halfCalled = false; dragFrom = -1; trail = null;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene() {
    bg();
    for (var i = 0; i < COLS; i++) {
      var bx = binX(i);
      game.draw.rect(bx - BIN_W / 2, BIN_Y - BIN_H / 2, BIN_W, BIN_H, C.bin);
      game.draw.rect(bx - BIN_W / 2, BIN_Y - BIN_H / 2, BIN_W, 8, C.binLine, 0.6);
      for (var s = 0; s < bins[i].length; s++) {
        var sy = BIN_Y + BIN_H / 2 - 40 - s * 96;
        var isTop = s === bins[i].length - 1;
        if (dragFrom === i && isTop) continue;
        game.draw.rect(bx - BIN_W / 2 + 14, sy - 40, BIN_W - 28, 84, COLORS[bins[i][s]]);
      }
    }
    if (dragFrom >= 0 && trail) {
      var c = bins[dragFrom][bins[dragFrom].length - 1];
      game.draw.rect(trail.x - (BIN_W - 28) / 2, trail.y - 40, BIN_W - 28, 84, COLORS[c], 0.9);
    }
  }

  function findBin(x, y) {
    for (var i = 0; i < COLS; i++) {
      var bx = binX(i);
      if (Math.abs(x - bx) < BIN_W / 2 && y > BIN_Y - BIN_H / 2 - 40 && y < BIN_Y + BIN_H / 2 + 40) return i;
    }
    return -1;
  }

  function tryMove(target, x, y) {
    if (dragFrom < 0 || target < 0 || target === dragFrom || bins[dragFrom].length === 0) { dragFrom = -1; return; }
    var c = bins[dragFrom][bins[dragFrom].length - 1];
    var canPlace = bins[target].length < CAP && (bins[target].length === 0 || bins[target][bins[target].length - 1] === c);
    if (!canPlace) {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      dragFrom = -1;
      return;
    }
    bins[dragFrom].pop();
    bins[target].push(c);
    moves += 1;
    var bx = binX(target);
    game.feedback.good(bx, BIN_Y, { text: 'GOOD', color: C.good });
    game.fx.burst(bx, BIN_Y, { color: COLORS[c], count: 16, speed: 300 });
    game.audio.play('se_good', 0.35);
    if (moves === Math.ceil(NEEDED * 0.5)) {
      game.fx.popup('NICE', W * 0.5, H * 0.3, { color: C.gold, size: 30 });
      game.audio.play('se_milestone', 0.3);
    }
    dragFrom = -1;
    if (moves >= NEEDED) {
      finished = true; ok = true; hitStop = 0.3;
      game.audio.play('se_success', 0.5);
      finish();
      return;
    }
    reshuffleIfStuck();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var i = findBin(x, y);
    dragFrom = (i >= 0 && bins[i].length > 0) ? i : -1;
    trail = { x: x, y: y };
    if (dragFrom >= 0) game.audio.play('se_tap', 0.15);
  });
  game.onMove(function(x, y) {
    trail = { x: x, y: y };
    if (state === S.PLAYING && Math.random() < 0.04) game.audio.play('se_tap', 0.02);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) { dragFrom = -1; return; }
    var target = findBin(x, y);
    tryMove(target, x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: binX(0), gy: BIN_Y, press: false };
  function resetDemo() { initGame(); }
  function findMovePair() {
    for (var i = 0; i < COLS; i++) {
      if (bins[i].length === 0) continue;
      var c = bins[i][bins[i].length - 1];
      for (var j = 0; j < COLS; j++) {
        if (j === i || bins[j].length >= CAP) continue;
        if (bins[j].length === 0 || bins[j][bins[j].length - 1] === c) return { a: i, b: j };
      }
    }
    return null;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { resetDemo(); var pr = findMovePair(); demo.pair = pr || { a: 0, b: 1 }; }
    var pr2 = demo.pair;
    var sx = binX(pr2.a), sy = BIN_Y, dx = binX(pr2.b), dy = BIN_Y;
    if (cyc < 0.4) { demo.gx = sx; demo.gy = sy; demo.press = false; }
    else if (cyc < 1.6) {
      var t2 = (cyc - 0.4) / 1.2;
      demo.gx = sx + (dx - sx) * t2; demo.gy = sy;
      demo.press = true;
      if (dragFrom < 0) { dragFrom = pr2.a; trail = { x: sx, y: sy }; }
      trail = { x: demo.gx, y: demo.gy };
    } else if (cyc < 1.8) {
      if (dragFrom >= 0) { tryMove(pr2.b, dx, dy); var pr3 = findMovePair(); demo.pair = pr3 || { a: 0, b: 1 }; }
      demo.press = false;
    } else {
      demo.gx = dx; demo.gy = dy; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (bins === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 34, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 40, ok ? C.good : C.bad);
      txt(moves + ' / ' + NEEDED, W / 2, H * 0.13, 24, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - moves) + '回!', W / 2, H * 0.17, 20, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(moves, { moves: moves, needed: NEEDED });
        else game.end.failure({ moves: moves, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (!halfCalled && roundClock >= MAX_TIME * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', W * 0.5, H * 0.3, { color: C.gold, size: 26 });
        game.audio.play('se_milestone', 0.25);
      }
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W * 0.5, BIN_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    txt(moves + ' / ' + NEEDED, W / 2, H * 0.06, 26, C.ink);
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, C.binLine, 0.5);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.32, 48, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.4]], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
