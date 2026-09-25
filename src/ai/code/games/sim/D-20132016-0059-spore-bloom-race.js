// D-20132016-0059-spore-bloom-race.js
// スポアブルームレース — 光る胞子を隣のマスへ次々広げ、清掃タイマーが尽きる前に規定数まで咲かせる
// 操作: 光っているマス(咲いた胞子の隣)をタップして広げる。無関係なマスに触れると時間が減る
// 終わり: 制限時間内に規定数のマスを咲かせれば成功。時間切れなら失敗
// @mechanic: gap_fit
// @theme: spore_bloom_cleanup
// 世界観: 培養庭の管理者見習いが、光る胞子の苗床を隣接マスへ次々に咲かせて広げ、定期清掃ドローンが庭を均す前に規定の広さまで育てる
// 残るもの: 正誤(CLEAR/GAME OVER) + 咲かせたマス数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒縁+平坦なセルシェード色、ハイライトは一箇所だけ
  var C = {
    bg: '#fff3d6', bg2: '#ffe8b0', outline: '#221806',
    cellOff: '#fff8ea', cellFrontier: '#ffd23f', cellFilled: '#3ddc84', cellFilledDk: '#1fa85c',
    good: '#3ddc84', bad: '#ff5a5f', gold: '#ff9f1c', ink: '#221806', white: '#fffaf0',
  };

  var GAME_TITLE = 'SPORE BLOOM';
  var ROWS = 4, COLS = 4;
  var CELL = 170;
  var GX = (W - COLS * CELL) / 2;
  var GY = H * 0.28;
  var TIME_LIMIT = 13;
  var TARGET = 9;
  var SEED_R = 1, SEED_C = 1;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var filled, filledCount, timeLeft, done, endWait, finished;
  var ready, hitStop, shake, lastTapR, lastTapC, lastTapGood, tapFlash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.outline, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GARDENER = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.sprite(GARDENER, { '#': C.gold }, W * 0.5, H * 0.90, 10, { anchor: 'center' });
  }

  function cellIdx(r, c) { return r * COLS + c; }
  function cellCenter(r, c) { return { x: GX + c * CELL + CELL / 2, y: GY + r * CELL + CELL / 2 }; }

  function isFrontier(r, c) {
    if (filled[cellIdx(r, c)]) return false;
    var nb = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    for (var i = 0; i < nb.length; i++) {
      var nr = nb[i][0], nc = nb[i][1];
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && filled[cellIdx(nr, nc)]) return true;
    }
    return false;
  }

  function drawGrid(bob) {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var pos = cellCenter(r, c);
        var idx = cellIdx(r, c);
        var isFilled = filled[idx];
        var isFront = !isFilled && isFrontier(r, c);
        var col = isFilled ? C.cellFilled : isFront ? C.cellFrontier : C.cellOff;
        game.draw.rect(pos.x - CELL / 2 + 6, pos.y - CELL / 2 + 6, CELL - 12, CELL - 12, C.outline);
        var inset = isFront ? 10 + Math.sin(game.time.elapsed * 6 + idx) * 4 : 10;
        game.draw.rect(pos.x - CELL / 2 + inset, pos.y - CELL / 2 + inset, CELL - inset * 2, CELL - inset * 2, col);
        if (isFilled) game.draw.circle(pos.x - 18, pos.y - 18 + bob, 14, '#ffffff', 0.55);
      }
    }
  }

  function initGame() {
    filled = new Array(ROWS * COLS).fill(false);
    filled[cellIdx(SEED_R, SEED_C)] = true;
    filledCount = 1; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; tapFlash = 0;
  }

  function tryTap(x, y) {
    if (ready > 0 || finished) return;
    var c = Math.floor((x - GX) / CELL);
    var r = Math.floor((y - GY) / CELL);
    tapFlash = 0.15;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) {
      game.feedback.bad(x, y, { text: 'MISS' });
      timeLeft = Math.max(0, timeLeft - 0.5);
      return;
    }
    if (isFrontier(r, c)) {
      filled[cellIdx(r, c)] = true;
      filledCount++;
      var p = cellCenter(r, c);
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.4);
      if (filledCount === Math.ceil(TARGET / 2)) game.fx.popup('HALFWAY!', W * 0.5, GY - 40, { color: C.gold, size: 36 });
      if (filledCount >= TARGET) {
        ok = true; finished = true; hitStop = 0.3;
        game.fx.burst(p.x, p.y, { color: C.gold, count: 20, speed: 380 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.25);
      timeLeft = Math.max(0, timeLeft - 0.5);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function frontierList() {
    var out = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (isFrontier(r, c)) out.push([r, c]);
    return out;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, tapT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) {
      filled = new Array(ROWS * COLS).fill(false);
      filled[cellIdx(SEED_R, SEED_C)] = true;
      filledCount = 1; demo.tapT = 0.5;
    }
    demo.tapT -= dt;
    if (demo.tapT <= 0 && filledCount < 7) {
      var list = frontierList();
      if (list.length > 0) {
        var pick = list[Math.floor(list.length / 2) % list.length];
        filled[cellIdx(pick[0], pick[1])] = true;
        filledCount++;
        var p = cellCenter(pick[0], pick[1]);
        demo.gx = p.x; demo.gy = p.y; demo.press = true;
        game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_coin', 0.2);
        demo.tapT = 0.45;
      }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    var bob = Math.sin(game.time.elapsed * 2.4) * 4;
    if (tapFlash > 0) tapFlash -= dt;

    if (state === S.ATTRACT) {
      if (filled === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGrid(bob);
      game.draw.hand(demo.gx || cellCenter(SEED_R, SEED_C).x, demo.gy || cellCenter(SEED_R, SEED_C).y, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid(bob);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(filledCount + ' / ' + TARGET, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (TARGET - filledCount) + 'マス!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(filledCount, { filled: filledCount, target: TARGET });
        else game.end.failure({ filled: filledCount, target: TARGET });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W * 0.5, GY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGrid(bob);

    txt(filledCount + ' / ' + TARGET, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#f0d9a0', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.25]], { tempo: 160, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
